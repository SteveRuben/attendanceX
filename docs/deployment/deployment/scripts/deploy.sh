#!/bin/bash

# Script de déploiement AttendanceX
# Usage: ./deploy.sh [environment] [version]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Vérification des prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js n'est pas installé"
        exit 1
    fi
    
    # Vérifier Firebase CLI
    if ! command -v firebase &> /dev/null; then
        warning "Firebase CLI n'est pas installé. Installation..."
        npm install -g firebase-tools
    fi
    
    success "Prérequis vérifiés"
}

# Chargement des variables d'environnement
load_environment() {
    log "Chargement de l'environnement: $ENVIRONMENT"
    
    ENV_FILE="$PROJECT_ROOT/deployment/environments/$ENVIRONMENT.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Fichier d'environnement non trouvé: $ENV_FILE"
        exit 1
    fi
    
    set -a
    source "$ENV_FILE"
    set +a
    
    success "Variables d'environnement chargées"
}

# Build des images Docker
build_images() {
    log "Construction des images Docker..."
    
    cd "$PROJECT_ROOT"
    
    # Build frontend
    log "Build de l'image frontend..."
    docker build -t attendancex/frontend:$VERSION ./frontend
    
    # Build backend
    log "Build de l'image backend..."
    docker build -t attendancex/backend:$VERSION ./backend
    
    # Build backup service
    log "Build de l'image backup..."
    docker build -t attendancex/backup:$VERSION ./deployment/backup
    
    success "Images Docker construites"
}

# Tests avant déploiement
run_tests() {
    log "Exécution des tests..."
    
    cd "$PROJECT_ROOT"
    
    # Tests frontend
    log "Tests frontend..."
    cd frontend
    npm test -- --coverage --watchAll=false
    cd ..
    
    # Tests backend
    log "Tests backend..."
    cd backend
    npm test
    cd ..
    
    # Tests e2e
    log "Tests end-to-end..."
    npm run test:e2e
    
    success "Tous les tests sont passés"
}

# Déploiement de la base de données
deploy_database() {
    log "Déploiement de la base de données..."
    
    # Firestore indexes
    log "Déploiement des index Firestore..."
    cd "$PROJECT_ROOT/backend"
    firebase deploy --only firestore:indexes --project $FIREBASE_PROJECT_ID
    
    # Firestore rules
    log "Déploiement des règles Firestore..."
    firebase deploy --only firestore:rules --project $FIREBASE_PROJECT_ID
    
    # PostgreSQL migrations (si nécessaire)
    if [ "$ENVIRONMENT" != "production" ]; then
        log "Exécution des migrations PostgreSQL..."
        docker-compose -f "$PROJECT_ROOT/deployment/docker-compose.yml" exec postgres psql -U attendancex -d attendancex -f /docker-entrypoint-initdb.d/migrations.sql
    fi
    
    success "Base de données déployée"
}

# Déploiement des services
deploy_services() {
    log "Déploiement des services..."
    
    cd "$PROJECT_ROOT/deployment"
    
    # Arrêt des services existants
    log "Arrêt des services existants..."
    docker-compose down
    
    # Démarrage des nouveaux services
    log "Démarrage des nouveaux services..."
    docker-compose up -d
    
    # Attendre que les services soient prêts
    log "Attente de la disponibilité des services..."
    sleep 30
    
    # Vérification de la santé des services
    check_services_health
    
    success "Services déployés"
}

# Vérification de la santé des services
check_services_health() {
    log "Vérification de la santé des services..."
    
    # Frontend
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        success "Frontend: OK"
    else
        error "Frontend: KO"
        exit 1
    fi
    
    # Backend
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        success "Backend: OK"
    else
        error "Backend: KO"
        exit 1
    fi
    
    # Redis
    if docker-compose exec redis redis-cli ping | grep -q PONG; then
        success "Redis: OK"
    else
        error "Redis: KO"
        exit 1
    fi
    
    # PostgreSQL
    if docker-compose exec postgres pg_isready -U attendancex > /dev/null 2>&1; then
        success "PostgreSQL: OK"
    else
        error "PostgreSQL: KO"
        exit 1
    fi
    
    success "Tous les services sont en bonne santé"
}

# Configuration du monitoring
setup_monitoring() {
    log "Configuration du monitoring..."
    
    # Import des dashboards Grafana
    log "Import des dashboards Grafana..."
    sleep 10  # Attendre que Grafana soit prêt
    
    for dashboard in "$PROJECT_ROOT/deployment/monitoring/grafana/dashboards"/*.json; do
        if [ -f "$dashboard" ]; then
            log "Import du dashboard: $(basename "$dashboard")"
            curl -X POST \
                -H "Content-Type: application/json" \
                -d @"$dashboard" \
                http://admin:${GRAFANA_PASSWORD}@localhost:3001/api/dashboards/db
        fi
    done
    
    # Configuration des alertes
    log "Configuration des alertes..."
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @"$PROJECT_ROOT/deployment/monitoring/alerts.json" \
        http://admin:${GRAFANA_PASSWORD}@localhost:3001/api/alert-notifications
    
    success "Monitoring configuré"
}

# Backup de sécurité
create_backup() {
    log "Création d'un backup de sécurité..."
    
    BACKUP_DIR="/tmp/attendancex-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup PostgreSQL
    docker-compose exec postgres pg_dump -U attendancex attendancex > "$BACKUP_DIR/postgres.sql"
    
    # Backup Firestore (export)
    firebase firestore:export gs://$FIREBASE_PROJECT_ID-backup/$(date +%Y%m%d-%H%M%S) --project $FIREBASE_PROJECT_ID
    
    # Backup des fichiers de configuration
    cp -r "$PROJECT_ROOT/deployment/environments" "$BACKUP_DIR/"
    
    # Compression
    tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
    rm -rf "$BACKUP_DIR"
    
    success "Backup créé: $BACKUP_DIR.tar.gz"
}

# Rollback en cas d'échec
rollback() {
    error "Échec du déploiement. Rollback en cours..."
    
    # Restaurer la version précédente
    if [ -f "$PROJECT_ROOT/deployment/.last_version" ]; then
        LAST_VERSION=$(cat "$PROJECT_ROOT/deployment/.last_version")
        log "Rollback vers la version: $LAST_VERSION"
        
        # Redéployer l'ancienne version
        docker-compose down
        docker tag attendancex/frontend:$LAST_VERSION attendancex/frontend:latest
        docker tag attendancex/backend:$LAST_VERSION attendancex/backend:latest
        docker-compose up -d
        
        success "Rollback effectué"
    else
        error "Aucune version précédente trouvée pour le rollback"
    fi
}

# Nettoyage post-déploiement
cleanup() {
    log "Nettoyage post-déploiement..."
    
    # Suppression des images Docker inutiles
    docker image prune -f
    
    # Suppression des volumes inutiles
    docker volume prune -f
    
    # Nettoyage des logs anciens
    find /var/log -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    success "Nettoyage terminé"
}

# Notification de fin de déploiement
notify_deployment() {
    log "Notification de fin de déploiement..."
    
    # Slack notification (si configuré)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Déploiement AttendanceX $VERSION réussi sur $ENVIRONMENT\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Email notification (si configuré)
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "Déploiement AttendanceX $VERSION réussi sur $ENVIRONMENT" | \
            mail -s "Déploiement AttendanceX" "$NOTIFICATION_EMAIL"
    fi
    
    success "Notifications envoyées"
}

# Fonction principale
main() {
    log "Début du déploiement AttendanceX"
    log "Environnement: $ENVIRONMENT"
    log "Version: $VERSION"
    
    # Sauvegarde de la version actuelle
    echo "$VERSION" > "$PROJECT_ROOT/deployment/.last_version"
    
    # Trap pour le rollback en cas d'erreur
    trap rollback ERR
    
    # Étapes du déploiement
    check_prerequisites
    load_environment
    
    if [ "$ENVIRONMENT" != "production" ] || [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    create_backup
    build_images
    deploy_database
    deploy_services
    setup_monitoring
    cleanup
    notify_deployment
    
    success "Déploiement terminé avec succès!"
    log "URL de l'application: $APP_URL"
    log "Monitoring: http://localhost:3001 (Grafana)"
    log "Logs: http://localhost:5601 (Kibana)"
}

# Gestion des signaux
trap cleanup EXIT

# Exécution
main "$@"
# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Vérifier les variables d'environnement
    if [ ! -f "$PROJECT_ROOT/deployment/.env.$ENVIRONMENT" ]; then
        log_error "Fichier d'environnement .env.$ENVIRONMENT manquant"
        exit 1
    fi
    
    log_success "Prérequis vérifiés"
}

# Sauvegarde avant déploiement
backup_before_deploy() {
    log_info "Création d'une sauvegarde avant déploiement..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups/pre-deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Sauvegarde de la base de données
    if docker-compose -f "$PROJECT_ROOT/deployment/docker-compose.yml" ps postgres | grep -q "Up"; then
        log_info "Sauvegarde de la base de données..."
        docker-compose -f "$PROJECT_ROOT/deployment/docker-compose.yml" exec -T postgres \
            pg_dump -U attendancex attendancex > "$BACKUP_DIR/database.sql"
        log_success "Base de données sauvegardée"
    fi
    
    # Sauvegarde des volumes
    log_info "Sauvegarde des volumes Docker..."
    docker run --rm -v attendancex_postgres_data:/data -v "$BACKUP_DIR":/backup \
        alpine tar czf /backup/postgres_data.tar.gz -C /data .
    
    log_success "Sauvegarde créée dans $BACKUP_DIR"
}

# Construction des images
build_images() {
    log_info "Construction des images Docker..."
    
    cd "$PROJECT_ROOT"
    
    # Construction du frontend
    log_info "Construction de l'image frontend..."
    docker build -t attendancex/frontend:$VERSION ./frontend
    
    # Construction du backend
    log_info "Construction de l'image backend..."
    docker build -t attendancex/backend:$VERSION ./backend/functions
    
    # Construction des services de monitoring
    log_info "Construction des images de monitoring..."
    docker build -t attendancex/backup:$VERSION ./deployment/backup
    docker build -t attendancex/healthcheck:$VERSION ./deployment/healthcheck
    
    log_success "Images construites avec succès"
}

# Tests de pré-déploiement
run_pre_deploy_tests() {
    log_info "Exécution des tests de pré-déploiement..."
    
    cd "$PROJECT_ROOT"
    
    # Tests unitaires backend
    log_info "Tests unitaires backend..."
    cd backend/functions
    npm test
    cd ../..
    
    # Tests unitaires frontend
    log_info "Tests unitaires frontend..."
    cd frontend
    npm test -- --watchAll=false
    cd ..
    
    # Tests d'intégration
    log_info "Tests d'intégration..."
    npm run test:integration
    
    # Tests de sécurité
    log_info "Audit de sécurité..."
    npm audit --audit-level moderate
    
    log_success "Tous les tests sont passés"
}

# Déploiement
deploy() {
    log_info "Démarrage du déploiement en environnement $ENVIRONMENT..."
    
    cd "$PROJECT_ROOT/deployment"
    
    # Chargement des variables d'environnement
    export $(cat .env.$ENVIRONMENT | xargs)
    
    # Arrêt des services existants
    log_info "Arrêt des services existants..."
    docker-compose down --remove-orphans
    
    # Nettoyage des images obsolètes
    log_info "Nettoyage des images obsolètes..."
    docker image prune -f
    
    # Démarrage des services
    log_info "Démarrage des nouveaux services..."
    docker-compose up -d
    
    # Attendre que les services soient prêts
    log_info "Attente du démarrage des services..."
    sleep 30
    
    # Vérification de la santé des services
    check_services_health
    
    log_success "Déploiement terminé avec succès"
}

# Vérification de la santé des services
check_services_health() {
    log_info "Vérification de la santé des services..."
    
    local services=("frontend:3000" "backend:5000" "postgres:5432" "redis:6379")
    local failed_services=()
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        
        log_info "Vérification de $name sur le port $port..."
        
        if ! docker-compose exec -T healthcheck nc -z "$name" "$port"; then
            log_warning "Service $name non disponible"
            failed_services+=("$name")
        else
            log_success "Service $name opérationnel"
        fi
    done
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "Services en échec: ${failed_services[*]}"
        return 1
    fi
    
    # Test de l'API
    log_info "Test de l'API..."
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        log_success "API opérationnelle"
    else
        log_error "API non accessible"
        return 1
    fi
    
    # Test du frontend
    log_info "Test du frontend..."
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend opérationnel"
    else
        log_error "Frontend non accessible"
        return 1
    fi
    
    log_success "Tous les services sont opérationnels"
}

# Tests post-déploiement
run_post_deploy_tests() {
    log_info "Exécution des tests post-déploiement..."
    
    # Tests de fumée
    log_info "Tests de fumée..."
    
    # Test de connexion à l'API
    if ! curl -f http://localhost:5000/api/health; then
        log_error "Test de l'API échoué"
        return 1
    fi
    
    # Test de la base de données
    if ! docker-compose exec -T postgres pg_isready -U attendancex; then
        log_error "Test de la base de données échoué"
        return 1
    fi
    
    # Test de Redis
    if ! docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        log_error "Test de Redis échoué"
        return 1
    fi
    
    # Tests end-to-end critiques
    log_info "Tests end-to-end critiques..."
    cd "$PROJECT_ROOT"
    npm run test:e2e:critical
    
    log_success "Tests post-déploiement réussis"
}

# Rollback en cas d'échec
rollback() {
    log_warning "Rollback en cours..."
    
    # Arrêter les nouveaux services
    docker-compose down
    
    # Restaurer la sauvegarde
    if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
        log_info "Restauration de la sauvegarde..."
        
        # Restaurer la base de données
        if [ -f "$BACKUP_DIR/database.sql" ]; then
            docker-compose up -d postgres
            sleep 10
            docker-compose exec -T postgres psql -U attendancex -d attendancex < "$BACKUP_DIR/database.sql"
        fi
        
        # Restaurer les volumes
        if [ -f "$BACKUP_DIR/postgres_data.tar.gz" ]; then
            docker run --rm -v attendancex_postgres_data:/data -v "$BACKUP_DIR":/backup \
                alpine tar xzf /backup/postgres_data.tar.gz -C /data
        fi
    fi
    
    log_warning "Rollback terminé"
}

# Nettoyage post-déploiement
cleanup() {
    log_info "Nettoyage post-déploiement..."
    
    # Supprimer les images non utilisées
    docker image prune -f
    
    # Supprimer les volumes orphelins
    docker volume prune -f
    
    # Supprimer les réseaux orphelins
    docker network prune -f
    
    log_success "Nettoyage terminé"
}

# Notification de déploiement
notify_deployment() {
    local status=$1
    local message="Déploiement AttendanceX $ENVIRONMENT $VERSION: $status"
    
    # Slack notification (si configuré)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Email notification (si configuré)
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "Déploiement AttendanceX" "$NOTIFICATION_EMAIL"
    fi
    
    log_info "Notification envoyée: $message"
}

# Fonction principale
main() {
    log_info "=== Déploiement AttendanceX ==="
    log_info "Environnement: $ENVIRONMENT"
    log_info "Version: $VERSION"
    log_info "================================"
    
    # Trap pour gérer les erreurs
    trap 'log_error "Erreur détectée, rollback en cours..."; rollback; notify_deployment "ÉCHEC"; exit 1' ERR
    
    # Étapes du déploiement
    check_prerequisites
    backup_before_deploy
    build_images
    run_pre_deploy_tests
    deploy
    run_post_deploy_tests
    cleanup
    
    # Notification de succès
    notify_deployment "SUCCÈS"
    
    log_success "=== Déploiement terminé avec succès ==="
    log_info "Frontend: http://localhost:3000"
    log_info "API: http://localhost:5000"
    log_info "Monitoring: http://localhost:3001"
    log_info "Logs: http://localhost:5601"
}

# Gestion des arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [environment] [version]"
        echo "  environment: production, staging, development (default: production)"
        echo "  version: version tag (default: latest)"
        echo ""
        echo "Options:"
        echo "  --help, -h    Afficher cette aide"
        echo "  --rollback    Effectuer un rollback"
        echo "  --status      Vérifier le statut des services"
        exit 0
        ;;
    --rollback)
        rollback
        exit 0
        ;;
    --status)
        check_services_health
        exit 0
        ;;
    *)
        main
        ;;
esac