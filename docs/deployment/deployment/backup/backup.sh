#!/bin/bash

# Script de sauvegarde automatique AttendanceX
# Usage: ./backup.sh [type] [retention_days]

set -e

# Configuration
BACKUP_TYPE=${1:-full}
RETENTION_DAYS=${2:-30}
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup_$TIMESTAMP.log"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    # Vérifier les variables d'environnement
    if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
        error "Variables d'environnement PostgreSQL manquantes"
        exit 1
    fi
    
    if [ -z "$FIREBASE_PROJECT_ID" ]; then
        error "FIREBASE_PROJECT_ID non défini"
        exit 1
    fi
    
    # Créer le répertoire de sauvegarde
    mkdir -p "$BACKUP_DIR"
    
    # Vérifier l'espace disque
    AVAILABLE_SPACE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then  # 1GB en KB
        warning "Espace disque faible: $(($AVAILABLE_SPACE / 1024))MB disponibles"
    fi
    
    success "Prérequis vérifiés"
}

# Sauvegarde PostgreSQL
backup_postgresql() {
    log "Sauvegarde PostgreSQL..."
    
    local backup_file="$BACKUP_DIR/postgres_$TIMESTAMP.sql"
    local compressed_file="$backup_file.gz"
    
    # Dump de la base de données
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-owner \
        --no-privileges \
        > "$backup_file" 2>> "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        # Compression
        gzip "$backup_file"
        
        local file_size=$(du -h "$compressed_file" | cut -f1)
        success "Sauvegarde PostgreSQL terminée: $compressed_file ($file_size)"
        
        # Upload vers S3 si configuré
        if [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$compressed_file" "postgres/"
        fi
    else
        error "Échec de la sauvegarde PostgreSQL"
        return 1
    fi
}

# Sauvegarde Firestore
backup_firestore() {
    log "Sauvegarde Firestore..."
    
    local backup_path="gs://$FIREBASE_PROJECT_ID-backup/firestore/$TIMESTAMP"
    
    # Export Firestore
    firebase firestore:export "$backup_path" \
        --project "$FIREBASE_PROJECT_ID" \
        >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        success "Sauvegarde Firestore terminée: $backup_path"
        
        # Créer un fichier de métadonnées local
        echo "{
            \"timestamp\": \"$TIMESTAMP\",
            \"project\": \"$FIREBASE_PROJECT_ID\",
            \"path\": \"$backup_path\",
            \"type\": \"firestore\"
        }" > "$BACKUP_DIR/firestore_$TIMESTAMP.json"
    else
        error "Échec de la sauvegarde Firestore"
        return 1
    fi
}

# Sauvegarde des fichiers de configuration
backup_config() {
    log "Sauvegarde des configurations..."
    
    local config_backup="$BACKUP_DIR/config_$TIMESTAMP.tar.gz"
    
    # Créer une archive des configurations
    tar -czf "$config_backup" \
        -C /app \
        deployment/environments \
        deployment/nginx \
        deployment/monitoring \
        2>> "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        local file_size=$(du -h "$config_backup" | cut -f1)
        success "Sauvegarde des configurations terminée: $config_backup ($file_size)"
        
        if [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$config_backup" "config/"
        fi
    else
        error "Échec de la sauvegarde des configurations"
        return 1
    fi
}

# Sauvegarde des logs
backup_logs() {
    log "Sauvegarde des logs..."
    
    local logs_backup="$BACKUP_DIR/logs_$TIMESTAMP.tar.gz"
    
    # Archiver les logs des 7 derniers jours
    find /var/log -name "*.log" -mtime -7 -type f | \
        tar -czf "$logs_backup" -T - 2>> "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        local file_size=$(du -h "$logs_backup" | cut -f1)
        success "Sauvegarde des logs terminée: $logs_backup ($file_size)"
        
        if [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$logs_backup" "logs/"
        fi
    else
        warning "Échec de la sauvegarde des logs (non critique)"
    fi
}

# Upload vers S3
upload_to_s3() {
    local file_path="$1"
    local s3_prefix="$2"
    local file_name=$(basename "$file_path")
    
    log "Upload vers S3: $file_name"
    
    aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_prefix$file_name" \
        --storage-class STANDARD_IA \
        >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        success "Upload S3 réussi: s3://$S3_BUCKET/$s3_prefix$file_name"
    else
        error "Échec de l'upload S3: $file_name"
    fi
}

# Nettoyage des anciennes sauvegardes
cleanup_old_backups() {
    log "Nettoyage des anciennes sauvegardes (> $RETENTION_DAYS jours)..."
    
    # Nettoyage local
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.log" -mtime +$RETENTION_DAYS -delete
    
    # Nettoyage S3 si configuré
    if [ -n "$S3_BUCKET" ]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        aws s3 ls "s3://$S3_BUCKET/" --recursive | \
        awk '{print $4}' | \
        while read file; do
            if [[ "$file" =~ [0-9]{8}_[0-9]{6} ]]; then
                file_date=$(echo "$file" | grep -o '[0-9]\{8\}')
                if [ "$file_date" -lt "$cutoff_date" ]; then
                    aws s3 rm "s3://$S3_BUCKET/$file"
                    log "Supprimé de S3: $file"
                fi
            fi
        done
    fi
    
    success "Nettoyage terminé"
}

# Vérification de l'intégrité des sauvegardes
verify_backups() {
    log "Vérification de l'intégrité des sauvegardes..."
    
    local errors=0
    
    # Vérifier les fichiers PostgreSQL
    for file in "$BACKUP_DIR"/postgres_*.sql.gz; do
        if [ -f "$file" ]; then
            if gzip -t "$file" 2>/dev/null; then
                log "✓ $file: OK"
            else
                error "✗ $file: Corrompu"
                ((errors++))
            fi
        fi
    done
    
    # Vérifier les fichiers de configuration
    for file in "$BACKUP_DIR"/config_*.tar.gz; do
        if [ -f "$file" ]; then
            if tar -tzf "$file" >/dev/null 2>&1; then
                log "✓ $file: OK"
            else
                error "✗ $file: Corrompu"
                ((errors++))
            fi
        fi
    done
    
    if [ $errors -eq 0 ]; then
        success "Toutes les sauvegardes sont intègres"
    else
        error "$errors sauvegarde(s) corrompue(s) détectée(s)"
        return 1
    fi
}

# Génération du rapport de sauvegarde
generate_report() {
    log "Génération du rapport de sauvegarde..."
    
    local report_file="$BACKUP_DIR/backup_report_$TIMESTAMP.json"
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local file_count=$(find "$BACKUP_DIR" -name "*$TIMESTAMP*" -type f | wc -l)
    
    cat > "$report_file" << EOF
{
    "timestamp": "$TIMESTAMP",
    "type": "$BACKUP_TYPE",
    "status": "completed",
    "duration": $(($(date +%s) - START_TIME)),
    "files": {
        "count": $file_count,
        "total_size": "$total_size"
    },
    "components": {
        "postgresql": $([ -f "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz" ] && echo "true" || echo "false"),
        "firestore": $([ -f "$BACKUP_DIR/firestore_$TIMESTAMP.json" ] && echo "true" || echo "false"),
        "config": $([ -f "$BACKUP_DIR/config_$TIMESTAMP.tar.gz" ] && echo "true" || echo "false"),
        "logs": $([ -f "$BACKUP_DIR/logs_$TIMESTAMP.tar.gz" ] && echo "true" || echo "false")
    },
    "s3_upload": $([ -n "$S3_BUCKET" ] && echo "true" || echo "false"),
    "retention_days": $RETENTION_DAYS
}
EOF
    
    success "Rapport généré: $report_file"
}

# Notification de fin de sauvegarde
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji=$([ "$status" = "success" ] && echo ":white_check_mark:" || echo ":x:")
        local color=$([ "$status" = "success" ] && echo "good" || echo "danger")
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Sauvegarde AttendanceX\",
                    \"text\": \"$emoji $message\",
                    \"fields\": [
                        {\"title\": \"Type\", \"value\": \"$BACKUP_TYPE\", \"short\": true},
                        {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true}
                    ]
                }]
            }" \
            "$SLACK_WEBHOOK_URL" >> "$LOG_FILE" 2>&1
    fi
    
    # Email notification
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "Sauvegarde AttendanceX - $status" "$NOTIFICATION_EMAIL"
    fi
}

# Fonction principale
main() {
    local START_TIME=$(date +%s)
    
    log "Début de la sauvegarde AttendanceX"
    log "Type: $BACKUP_TYPE"
    log "Rétention: $RETENTION_DAYS jours"
    
    # Trap pour les erreurs
    trap 'error "Sauvegarde interrompue"; send_notification "error" "Sauvegarde interrompue par une erreur"; exit 1' ERR
    
    check_prerequisites
    
    case "$BACKUP_TYPE" in
        "full")
            backup_postgresql
            backup_firestore
            backup_config
            backup_logs
            ;;
        "data")
            backup_postgresql
            backup_firestore
            ;;
        "config")
            backup_config
            ;;
        *)
            error "Type de sauvegarde non reconnu: $BACKUP_TYPE"
            exit 1
            ;;
    esac
    
    verify_backups
    cleanup_old_backups
    generate_report
    
    local duration=$(($(date +%s) - START_TIME))
    success "Sauvegarde terminée en ${duration}s"
    
    send_notification "success" "Sauvegarde $BACKUP_TYPE terminée avec succès en ${duration}s"
}

# Exécution
main "$@"#!/bin/bash

# Script de sauvegarde automatique pour AttendanceX
# Ce script sauvegarde la base de données et les volumes Docker

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${RETENTION_DAYS:-30}
S3_BUCKET=${S3_BUCKET:-""}
POSTGRES_HOST=${POSTGRES_HOST:-"postgres"}
POSTGRES_DB=${POSTGRES_DB:-"attendancex"}
POSTGRES_USER=${POSTGRES_USER:-"attendancex"}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Création du répertoire de sauvegarde
create_backup_dir() {
    local backup_path="$BACKUP_DIR/$TIMESTAMP"
    mkdir -p "$backup_path"
    echo "$backup_path"
}

# Sauvegarde de la base de données PostgreSQL
backup_database() {
    local backup_path=$1
    local db_backup_file="$backup_path/database.sql"
    
    log_info "Sauvegarde de la base de données PostgreSQL..."
    
    # Test de connexion
    if ! pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
        log_error "Impossible de se connecter à PostgreSQL"
        return 1
    fi
    
    # Sauvegarde avec pg_dump
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-owner \
        --no-privileges \
        --format=custom \
        --file="$db_backup_file.custom"; then
        
        log_success "Sauvegarde de la base de données terminée"
        
        # Création d'une version SQL lisible
        PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
            --no-owner \
            --no-privileges \
            --format=plain \
            "$db_backup_file.custom" > "$db_backup_file"
        
        # Compression
        gzip "$db_backup_file"
        
        # Informations sur la sauvegarde
        local db_size=$(stat -f%z "$db_backup_file.custom" 2>/dev/null || stat -c%s "$db_backup_file.custom" 2>/dev/null || echo "0")
        log_info "Taille de la sauvegarde DB: $(numfmt --to=iec $db_size)"
        
        return 0
    else
        log_error "Échec de la sauvegarde de la base de données"
        return 1
    fi
}

# Sauvegarde des volumes Docker
backup_volumes() {
    local backup_path=$1
    
    log_info "Sauvegarde des volumes Docker..."
    
    # Liste des volumes à sauvegarder
    local volumes=(
        "attendancex_postgres_data"
        "attendancex_redis_data"
        "attendancex_grafana_data"
        "attendancex_prometheus_data"
    )
    
    for volume in "${volumes[@]}"; do
        if docker volume inspect "$volume" > /dev/null 2>&1; then
            log_info "Sauvegarde du volume $volume..."
            
            docker run --rm \
                -v "$volume":/data:ro \
                -v "$backup_path":/backup \
                alpine:latest \
                tar czf "/backup/${volume}.tar.gz" -C /data .
            
            if [ $? -eq 0 ]; then
                local volume_size=$(stat -f%z "$backup_path/${volume}.tar.gz" 2>/dev/null || stat -c%s "$backup_path/${volume}.tar.gz" 2>/dev/null || echo "0")
                log_success "Volume $volume sauvegardé ($(numfmt --to=iec $volume_size))"
            else
                log_error "Échec de la sauvegarde du volume $volume"
            fi
        else
            log_warning "Volume $volume non trouvé"
        fi
    done
}

# Sauvegarde des fichiers de configuration
backup_configs() {
    local backup_path=$1
    
    log_info "Sauvegarde des fichiers de configuration..."
    
    # Répertoires de configuration à sauvegarder
    local config_dirs=(
        "/app/deployment"
        "/app/docs"
    )
    
    for config_dir in "${config_dirs[@]}"; do
        if [ -d "$config_dir" ]; then
            local dir_name=$(basename "$config_dir")
            tar czf "$backup_path/config_${dir_name}.tar.gz" -C "$(dirname "$config_dir")" "$dir_name"
            log_success "Configuration $dir_name sauvegardée"
        fi
    done
}

# Création d'un manifeste de sauvegarde
create_manifest() {
    local backup_path=$1
    local manifest_file="$backup_path/manifest.json"
    
    log_info "Création du manifeste de sauvegarde..."
    
    cat > "$manifest_file" << EOF
{
  "backup_timestamp": "$TIMESTAMP",
  "backup_date": "$(date -Iseconds)",
  "backup_type": "full",
  "version": "1.0",
  "components": {
    "database": {
      "type": "postgresql",
      "host": "$POSTGRES_HOST",
      "database": "$POSTGRES_DB",
      "files": ["database.sql.custom", "database.sql.gz"]
    },
    "volumes": {
      "docker_volumes": [
        "attendancex_postgres_data",
        "attendancex_redis_data",
        "attendancex_grafana_data",
        "attendancex_prometheus_data"
      ]
    },
    "configs": {
      "deployment": "config_deployment.tar.gz",
      "documentation": "config_docs.tar.gz"
    }
  },
  "system_info": {
    "hostname": "$(hostname)",
    "docker_version": "$(docker --version)",
    "backup_script_version": "1.0"
  }
}
EOF
    
    log_success "Manifeste créé"
}

# Upload vers S3 (si configuré)
upload_to_s3() {
    local backup_path=$1
    
    if [ -z "$S3_BUCKET" ]; then
        log_info "Pas de bucket S3 configuré, sauvegarde locale uniquement"
        return 0
    fi
    
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI non installé, impossible d'uploader vers S3"
        return 1
    fi
    
    log_info "Upload vers S3 bucket: $S3_BUCKET"
    
    # Création d'une archive complète
    local archive_name="attendancex_backup_$TIMESTAMP.tar.gz"
    local archive_path="$BACKUP_DIR/$archive_name"
    
    tar czf "$archive_path" -C "$BACKUP_DIR" "$TIMESTAMP"
    
    # Upload vers S3
    if aws s3 cp "$archive_path" "s3://$S3_BUCKET/backups/$archive_name"; then
        log_success "Sauvegarde uploadée vers S3"
        
        # Suppression de l'archive locale après upload réussi
        rm -f "$archive_path"
    else
        log_error "Échec de l'upload vers S3"
        return 1
    fi
}

# Nettoyage des anciennes sauvegardes
cleanup_old_backups() {
    log_info "Nettoyage des sauvegardes anciennes (> $RETENTION_DAYS jours)..."
    
    # Nettoyage local
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;
    
    # Nettoyage S3 (si configuré)
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        aws s3 ls "s3://$S3_BUCKET/backups/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $4}' | grep -o '[0-9]\{8\}' | head -1)
            if [ -n "$file_date" ] && [ "$file_date" -lt "$cutoff_date" ]; then
                local file_name=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://$S3_BUCKET/backups/$file_name"
                log_info "Suppression S3: $file_name"
            fi
        done
    fi
    
    log_success "Nettoyage terminé"
}

# Vérification de l'intégrité de la sauvegarde
verify_backup() {
    local backup_path=$1
    
    log_info "Vérification de l'intégrité de la sauvegarde..."
    
    local errors=0
    
    # Vérification des fichiers essentiels
    local required_files=(
        "manifest.json"
        "database.sql.custom"
        "database.sql.gz"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$backup_path/$file" ]; then
            log_error "Fichier manquant: $file"
            ((errors++))
        fi
    done
    
    # Vérification de la base de données
    if [ -f "$backup_path/database.sql.custom" ]; then
        if ! pg_restore --list "$backup_path/database.sql.custom" > /dev/null 2>&1; then
            log_error "Fichier de sauvegarde DB corrompu"
            ((errors++))
        fi
    fi
    
    # Vérification des archives
    for archive in "$backup_path"/*.tar.gz; do
        if [ -f "$archive" ]; then
            if ! tar tzf "$archive" > /dev/null 2>&1; then
                log_error "Archive corrompue: $(basename "$archive")"
                ((errors++))
            fi
        fi
    done
    
    if [ $errors -eq 0 ]; then
        log_success "Sauvegarde vérifiée avec succès"
        return 0
    else
        log_error "Sauvegarde corrompue ($errors erreurs)"
        return 1
    fi
}

# Envoi de notification
send_notification() {
    local status=$1
    local backup_path=$2
    
    local backup_size=$(du -sh "$backup_path" 2>/dev/null | cut -f1 || echo "unknown")
    local message="Sauvegarde AttendanceX $status - Taille: $backup_size - Timestamp: $TIMESTAMP"
    
    # Slack notification (si configuré)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        [ "$status" != "SUCCESS" ] && color="danger"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi
    
    # Email notification (si configuré)
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "Sauvegarde AttendanceX" "$NOTIFICATION_EMAIL"
    fi
    
    log_info "Notification envoyée: $message"
}

# Fonction principale
main() {
    log_info "=== Début de la sauvegarde AttendanceX ==="
    
    local backup_path
    local backup_success=true
    
    # Création du répertoire de sauvegarde
    backup_path=$(create_backup_dir)
    log_info "Répertoire de sauvegarde: $backup_path"
    
    # Sauvegarde de la base de données
    if ! backup_database "$backup_path"; then
        backup_success=false
    fi
    
    # Sauvegarde des volumes
    backup_volumes "$backup_path"
    
    # Sauvegarde des configurations
    backup_configs "$backup_path"
    
    # Création du manifeste
    create_manifest "$backup_path"
    
    # Vérification de l'intégrité
    if ! verify_backup "$backup_path"; then
        backup_success=false
    fi
    
    # Upload vers S3
    if [ "$backup_success" = true ]; then
        upload_to_s3 "$backup_path"
    fi
    
    # Nettoyage des anciennes sauvegardes
    cleanup_old_backups
    
    # Notification
    if [ "$backup_success" = true ]; then
        send_notification "SUCCESS" "$backup_path"
        log_success "=== Sauvegarde terminée avec succès ==="
    else
        send_notification "FAILED" "$backup_path"
        log_error "=== Sauvegarde terminée avec des erreurs ==="
        exit 1
    fi
}

# Gestion des signaux
trap 'log_error "Sauvegarde interrompue"; exit 1' INT TERM

# Exécution
main "$@"