#!/bin/bash

# Script pour exécuter les tests complets du backend AttendanceX
# Usage: ./run-backend-tests.sh [option]
# Options:
#   --comprehensive  : Exécuter tous les tests complets (défaut)
#   --auth          : Tests d'authentification uniquement
#   --invitations   : Tests d'invitations uniquement
#   --tenants       : Tests de tenants uniquement
#   --events        : Tests d'événements uniquement
#   --integration   : Tests d'intégration uniquement
#   --coverage      : Exécuter avec rapport de couverture
#   --watch         : Mode watch pour développement
#   --ci            : Mode CI/CD
#   --help          : Afficher cette aide

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'aide
show_help() {
    echo -e "${BLUE}🧪 Script de Tests Backend AttendanceX${NC}"
    echo ""
    echo "Usage: $0 [option]"
    echo ""
    echo "Options disponibles:"
    echo "  --comprehensive    Exécuter tous les tests complets (défaut)"
    echo "  --auth            Tests d'authentification uniquement"
    echo "  --invitations     Tests d'invitations utilisateurs uniquement"
    echo "  --tenants         Tests de gestion des tenants uniquement"
    echo "  --events          Tests d'événements et présence uniquement"
    echo "  --integration     Tests d'intégration API uniquement"
    echo "  --unit            Tests unitaires uniquement"
    echo "  --e2e             Tests end-to-end uniquement"
    echo "  --coverage        Exécuter avec rapport de couverture détaillé"
    echo "  --watch           Mode watch pour développement"
    echo "  --ci              Mode CI/CD (sans watch, avec rapports)"
    echo "  --debug           Mode debug avec logs détaillés"
    echo "  --clean           Nettoyer les rapports et cache avant les tests"
    echo "  --help            Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0                    # Tous les tests complets"
    echo "  $0 --auth            # Tests d'authentification seulement"
    echo "  $0 --coverage        # Avec rapport de couverture"
    echo "  $0 --watch           # Mode développement"
    echo ""
}

# Fonction de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé"
        exit 1
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        log_error "npm n'est pas installé"
        exit 1
    fi
    
    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -f "package.json" ]; then
        log_error "Ce script doit être exécuté depuis la racine du projet"
        exit 1
    fi
    
    # Vérifier que le dossier tests/backend existe
    if [ ! -d "tests/backend" ]; then
        log_error "Le dossier tests/backend n'existe pas"
        exit 1
    fi
    
    log_success "Prérequis vérifiés"
}

# Installer les dépendances si nécessaire
install_dependencies() {
    log_info "Vérification des dépendances..."
    
    # Dépendances principales
    if [ ! -d "node_modules" ]; then
        log_info "Installation des dépendances principales..."
        npm install
    fi
    
    # Dépendances des tests
    if [ ! -d "tests/backend/node_modules" ]; then
        log_info "Installation des dépendances de test..."
        cd tests/backend
        npm install
        cd ../..
    fi
    
    log_success "Dépendances installées"
}

# Nettoyer les fichiers temporaires
clean_temp_files() {
    log_info "Nettoyage des fichiers temporaires..."
    
    # Nettoyer les rapports précédents
    rm -rf test-results/backend/*
    rm -rf coverage/backend/*
    rm -rf tests/backend/coverage/*
    
    # Nettoyer le cache Jest
    if [ -d "tests/backend/node_modules/.cache" ]; then
        rm -rf tests/backend/node_modules/.cache
    fi
    
    log_success "Nettoyage terminé"
}

# Démarrer l'émulateur Firebase si nécessaire
start_firebase_emulator() {
    log_info "Vérification de l'émulateur Firebase..."
    
    # Vérifier si l'émulateur est déjà en cours d'exécution
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        log_success "Émulateur Firebase déjà en cours d'exécution"
        return 0
    fi
    
    # Démarrer l'émulateur en arrière-plan
    log_info "Démarrage de l'émulateur Firebase..."
    cd backend
    
    # Vérifier si firebase-tools est installé
    if ! command -v firebase &> /dev/null; then
        log_warning "Firebase CLI n'est pas installé globalement"
        log_info "Installation locale de firebase-tools..."
        npm install firebase-tools
        npx firebase emulators:start --only firestore,auth &
    else
        firebase emulators:start --only firestore,auth &
    fi
    
    FIREBASE_PID=$!
    cd ..
    
    # Attendre que l'émulateur soit prêt
    log_info "Attente du démarrage de l'émulateur..."
    for i in {1..30}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            log_success "Émulateur Firebase prêt"
            return 0
        fi
        sleep 2
    done
    
    log_error "Impossible de démarrer l'émulateur Firebase"
    return 1
}

# Arrêter l'émulateur Firebase
stop_firebase_emulator() {
    if [ ! -z "$FIREBASE_PID" ]; then
        log_info "Arrêt de l'émulateur Firebase..."
        kill $FIREBASE_PID 2>/dev/null || true
        wait $FIREBASE_PID 2>/dev/null || true
        log_success "Émulateur Firebase arrêté"
    fi
}

# Exécuter les tests
run_tests() {
    local test_type="$1"
    local additional_args="$2"
    
    cd tests/backend
    
    case $test_type in
        "comprehensive")
            log_info "Exécution de tous les tests complets..."
            npm run test:comprehensive $additional_args
            ;;
        "auth")
            log_info "Exécution des tests d'authentification..."
            npm run test:auth $additional_args
            ;;
        "invitations")
            log_info "Exécution des tests d'invitations..."
            npm run test:invitations $additional_args
            ;;
        "tenants")
            log_info "Exécution des tests de tenants..."
            npm run test:tenants $additional_args
            ;;
        "events")
            log_info "Exécution des tests d'événements..."
            npm run test:events $additional_args
            ;;
        "integration")
            log_info "Exécution des tests d'intégration..."
            npm run test:integration $additional_args
            ;;
        "unit")
            log_info "Exécution des tests unitaires..."
            npm run test:unit $additional_args
            ;;
        "e2e")
            log_info "Exécution des tests end-to-end..."
            npm run test:e2e $additional_args
            ;;
        "coverage")
            log_info "Exécution avec rapport de couverture..."
            npm run test:coverage $additional_args
            ;;
        "watch")
            log_info "Démarrage en mode watch..."
            npm run test:watch $additional_args
            ;;
        "ci")
            log_info "Exécution en mode CI/CD..."
            npm run test:ci $additional_args
            ;;
        *)
            log_error "Type de test non reconnu: $test_type"
            cd ../..
            return 1
            ;;
    esac
    
    local exit_code=$?
    cd ../..
    return $exit_code
}

# Générer le rapport final
generate_report() {
    log_info "Génération du rapport final..."
    
    # Créer le dossier de rapports s'il n'existe pas
    mkdir -p test-results/backend
    
    # Copier les rapports depuis le dossier des tests
    if [ -d "tests/backend/coverage" ]; then
        cp -r tests/backend/coverage/* test-results/backend/ 2>/dev/null || true
    fi
    
    # Afficher le résumé
    if [ -f "test-results/backend/comprehensive-test-report.json" ]; then
        log_success "Rapport détaillé disponible dans: test-results/backend/"
        log_info "Rapport HTML: test-results/backend/comprehensive-test-report.html"
        log_info "Rapport JSON: test-results/backend/comprehensive-test-report.json"
    fi
    
    if [ -d "test-results/backend/lcov-report" ]; then
        log_info "Rapport de couverture: test-results/backend/lcov-report/index.html"
    fi
}

# Fonction de nettoyage à la sortie
cleanup() {
    log_info "Nettoyage en cours..."
    stop_firebase_emulator
    
    # Tuer tous les processus Node.js liés aux tests si nécessaire
    pkill -f "jest" 2>/dev/null || true
    
    log_success "Nettoyage terminé"
}

# Configurer le nettoyage automatique
trap cleanup EXIT INT TERM

# Fonction principale
main() {
    local test_type="comprehensive"
    local additional_args=""
    local clean_before=false
    local start_emulator=true
    
    # Parser les arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --comprehensive)
                test_type="comprehensive"
                shift
                ;;
            --auth)
                test_type="auth"
                shift
                ;;
            --invitations)
                test_type="invitations"
                shift
                ;;
            --tenants)
                test_type="tenants"
                shift
                ;;
            --events)
                test_type="events"
                shift
                ;;
            --integration)
                test_type="integration"
                shift
                ;;
            --unit)
                test_type="unit"
                shift
                ;;
            --e2e)
                test_type="e2e"
                shift
                ;;
            --coverage)
                test_type="coverage"
                shift
                ;;
            --watch)
                test_type="watch"
                start_emulator=false  # En mode watch, on assume que l'émulateur est déjà démarré
                shift
                ;;
            --ci)
                test_type="ci"
                shift
                ;;
            --debug)
                additional_args="$additional_args --verbose --detectOpenHandles"
                export DEBUG="*"
                shift
                ;;
            --clean)
                clean_before=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Option inconnue: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Afficher le header
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🧪 Tests Backend AttendanceX              ║"
    echo "║                                                              ║"
    echo "║  Suite de tests complète pour le backend                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Exécuter les étapes
    check_prerequisites
    install_dependencies
    
    if [ "$clean_before" = true ]; then
        clean_temp_files
    fi
    
    if [ "$start_emulator" = true ]; then
        start_firebase_emulator
    fi
    
    # Exécuter les tests
    log_info "Démarrage des tests: $test_type"
    if run_tests "$test_type" "$additional_args"; then
        log_success "Tests terminés avec succès!"
        generate_report
        exit 0
    else
        log_error "Certains tests ont échoué"
        generate_report
        exit 1
    fi
}

# Exécuter le script principal
main "$@"