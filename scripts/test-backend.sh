#!/bin/bash

# scripts/test-backend.sh - Script de lancement des tests backend

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage
print_step() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  unit                 Exécuter les tests unitaires"
    echo "  integration          Exécuter les tests d'intégration"
    echo "  all                  Exécuter tous les tests backend"
    echo "  coverage             Exécuter les tests avec couverture"
    echo "  watch                Exécuter les tests en mode watch"
    echo "  setup                Configurer l'environnement de test"
    echo "  clean                Nettoyer les fichiers de test"
    echo "  help                 Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 unit              # Tests unitaires seulement"
    echo "  $0 coverage          # Tests avec rapport de couverture"
    echo "  $0 setup             # Configuration initiale"
}

# Vérification des prérequis
check_prerequisites() {
    print_step "Vérification des prérequis..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé"
        exit 1
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        print_error "npm n'est pas installé"
        exit 1
    fi
    
    # Vérifier que nous sommes à la racine du projet
    if [ ! -f "package.json" ]; then
        print_error "Ce script doit être exécuté depuis la racine du projet"
        exit 1
    fi
    
    print_success "Prérequis vérifiés"
}

# Configuration de l'environnement
setup_environment() {
    print_step "Configuration de l'environnement de test..."
    
    # Installer les dépendances si nécessaire
    if [ ! -d "node_modules" ]; then
        print_step "Installation des dépendances principales..."
        npm install
    fi
    
    # Installer les dépendances backend
    if [ ! -d "backend/functions/node_modules" ]; then
        print_step "Installation des dépendances backend..."
        cd backend/functions
        npm install
        cd ../..
    fi
    
    # Créer les dossiers de rapports si nécessaire
    mkdir -p tests/reports/coverage
    mkdir -p tests/reports/junit
    
    # Vérifier la configuration Jest
    if [ ! -f "tests/config/jest.backend.config.js" ]; then
        print_error "Configuration Jest backend manquante"
        exit 1
    fi
    
    print_success "Environnement configuré"
}

# Nettoyage
clean_test_files() {
    print_step "Nettoyage des fichiers de test..."
    
    # Supprimer les rapports précédents
    rm -rf tests/reports/coverage/*
    rm -rf tests/reports/junit/*
    
    # Supprimer les fichiers temporaires
    find . -name "*.log" -type f -delete 2>/dev/null || true
    find . -name ".nyc_output" -type d -exec rm -rf {} + 2>/dev/null || true
    
    print_success "Nettoyage terminé"
}

# Tests unitaires
run_unit_tests() {
    print_step "Exécution des tests unitaires backend..."
    
    npm run test:backend:unit
    
    if [ $? -eq 0 ]; then
        print_success "Tests unitaires réussis"
    else
        print_error "Échec des tests unitaires"
        exit 1
    fi
}

# Tests d'intégration
run_integration_tests() {
    print_step "Exécution des tests d'intégration backend..."
    
    npm run test:backend:integration
    
    if [ $? -eq 0 ]; then
        print_success "Tests d'intégration réussis"
    else
        print_error "Échec des tests d'intégration"
        exit 1
    fi
}

# Tous les tests
run_all_tests() {
    print_step "Exécution de tous les tests backend..."
    
    npm run test:backend
    
    if [ $? -eq 0 ]; then
        print_success "Tous les tests réussis"
    else
        print_error "Échec des tests"
        exit 1
    fi
}

# Tests avec couverture
run_coverage_tests() {
    print_step "Exécution des tests avec couverture..."
    
    npm run test:backend:coverage
    
    if [ $? -eq 0 ]; then
        print_success "Tests avec couverture réussis"
        print_step "Rapport de couverture disponible dans tests/reports/coverage/"
        
        # Ouvrir le rapport HTML si possible
        if command -v xdg-open &> /dev/null; then
            xdg-open tests/reports/coverage/lcov-report/index.html 2>/dev/null || true
        elif command -v open &> /dev/null; then
            open tests/reports/coverage/lcov-report/index.html 2>/dev/null || true
        fi
    else
        print_error "Échec des tests de couverture"
        exit 1
    fi
}

# Tests en mode watch
run_watch_tests() {
    print_step "Démarrage des tests en mode watch..."
    print_warning "Appuyez sur Ctrl+C pour arrêter"
    
    npm run test:backend:watch
}

# Démarrage des émulateurs Firebase (optionnel)
start_emulators() {
    print_step "Vérification des émulateurs Firebase..."
    
    if command -v firebase &> /dev/null; then
        print_step "Démarrage des émulateurs Firebase..."
        firebase emulators:start --only firestore,auth &
        EMULATOR_PID=$!
        
        # Attendre que les émulateurs démarrent
        sleep 5
        
        print_success "Émulateurs Firebase démarrés (PID: $EMULATOR_PID)"
        echo $EMULATOR_PID > .emulator.pid
    else
        print_warning "Firebase CLI non installé, émulateurs non démarrés"
    fi
}

# Arrêt des émulateurs
stop_emulators() {
    if [ -f ".emulator.pid" ]; then
        EMULATOR_PID=$(cat .emulator.pid)
        if ps -p $EMULATOR_PID > /dev/null; then
            print_step "Arrêt des émulateurs Firebase..."
            kill $EMULATOR_PID
            rm .emulator.pid
            print_success "Émulateurs arrêtés"
        fi
    fi
}

# Gestion des signaux pour nettoyer à la sortie
cleanup() {
    print_step "Nettoyage en cours..."
    stop_emulators
    exit 0
}

trap cleanup SIGINT SIGTERM

# Fonction principale
main() {
    case "${1:-help}" in
        "unit")
            check_prerequisites
            setup_environment
            run_unit_tests
            ;;
        "integration")
            check_prerequisites
            setup_environment
            start_emulators
            run_integration_tests
            stop_emulators
            ;;
        "all")
            check_prerequisites
            setup_environment
            start_emulators
            run_all_tests
            stop_emulators
            ;;
        "coverage")
            check_prerequisites
            setup_environment
            start_emulators
            run_coverage_tests
            stop_emulators
            ;;
        "watch")
            check_prerequisites
            setup_environment
            run_watch_tests
            ;;
        "setup")
            check_prerequisites
            setup_environment
            print_success "Configuration terminée"
            ;;
        "clean")
            clean_test_files
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Exécution
main "$@"