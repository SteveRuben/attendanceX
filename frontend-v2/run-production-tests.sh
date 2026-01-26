#!/bin/bash

# Script pour exécuter les tests E2E contre la production
# Usage: ./run-production-tests.sh [test-type]
# test-type: all, smoke, performance, journey (default: all)

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL de production
PRODUCTION_URL="https://attendance-x.vercel.app"

# Type de test (par défaut: all)
TEST_TYPE="${1:-all}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AttendanceX - Tests E2E Production                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📍 URL de production: ${PRODUCTION_URL}${NC}"
echo -e "${YELLOW}🎯 Type de test: ${TEST_TYPE}${NC}"
echo ""

# Vérifier que l'URL est accessible
echo -e "${BLUE}🔍 Vérification de l'accessibilité de la production...${NC}"
if curl -s --head --request GET "${PRODUCTION_URL}" | grep "200\|301\|302" > /dev/null; then
  echo -e "${GREEN}✅ Production accessible${NC}"
else
  echo -e "${RED}❌ Production non accessible${NC}"
  exit 1
fi

echo ""

# Fonction pour exécuter les tests
run_tests() {
  local test_file=$1
  local test_name=$2
  
  echo -e "${BLUE}🧪 Exécution des tests: ${test_name}${NC}"
  echo ""
  
  if PLAYWRIGHT_BASE_URL="${PRODUCTION_URL}" npx playwright test "${test_file}" --reporter=html; then
    echo ""
    echo -e "${GREEN}✅ Tests ${test_name} réussis${NC}"
    return 0
  else
    echo ""
    echo -e "${RED}❌ Tests ${test_name} échoués${NC}"
    return 1
  fi
}

# Compteurs de résultats
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Exécuter les tests selon le type
case "${TEST_TYPE}" in
  smoke)
    echo -e "${YELLOW}🔥 Exécution des tests de fumée...${NC}"
    echo ""
    TOTAL_TESTS=1
    if run_tests "tests/e2e/smoke.spec.ts" "Smoke"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
    
  performance)
    echo -e "${YELLOW}⚡ Exécution des tests de performance...${NC}"
    echo ""
    TOTAL_TESTS=1
    if run_tests "tests/e2e/performance.spec.ts" "Performance"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
    
  journey)
    echo -e "${YELLOW}🚶 Exécution des tests de parcours utilisateur...${NC}"
    echo ""
    TOTAL_TESTS=1
    if run_tests "tests/e2e/user-journey.spec.ts" "User Journey"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
    
  public-events)
    echo -e "${YELLOW}🎉 Exécution des tests des pages publiques...${NC}"
    echo ""
    TOTAL_TESTS=1
    if run_tests "tests/e2e/public-events.spec.ts" "Public Events"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
    
  all)
    echo -e "${YELLOW}🎯 Exécution de tous les tests...${NC}"
    echo ""
    TOTAL_TESTS=4
    
    # Tests de fumée
    if run_tests "tests/e2e/smoke.spec.ts" "Smoke"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    # Tests des pages publiques
    if run_tests "tests/e2e/public-events.spec.ts" "Public Events"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    # Tests de parcours utilisateur
    if run_tests "tests/e2e/user-journey.spec.ts" "User Journey"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    # Tests de performance
    if run_tests "tests/e2e/performance.spec.ts" "Performance"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
    
  *)
    echo -e "${RED}❌ Type de test invalide: ${TEST_TYPE}${NC}"
    echo -e "${YELLOW}Types valides: all, smoke, performance, journey, public-events${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Résumé des Tests                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📊 Total: ${TOTAL_TESTS} suites de tests${NC}"
echo -e "${GREEN}✅ Réussis: ${PASSED_TESTS}${NC}"
echo -e "${RED}❌ Échoués: ${FAILED_TESTS}${NC}"
echo ""

# Ouvrir le rapport HTML
echo -e "${BLUE}📄 Génération du rapport HTML...${NC}"
npx playwright show-report

# Code de sortie
if [ ${FAILED_TESTS} -eq 0 ]; then
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ Tous les tests sont passés avec succès !              ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ Certains tests ont échoué                             ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
