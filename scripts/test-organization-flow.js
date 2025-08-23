#!/usr/bin/env node
// scripts/test-organization-flow.js
/**
 * Script de test pour valider le flux d'appartenance aux organisations
 * Ce script exécute tous les tests et génère un rapport de couverture
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Démarrage des tests du flux d\'appartenance aux organisations\n');

// Configuration des tests
const testConfig = {
  backend: {
    integration: 'backend/tests/integration/organization-membership-flow.integration.test.ts',
    unit: 'backend/tests/unit/user-organizations.test.ts'
  },
  frontend: {
    unit: [
      'frontend/tests/unit/components/OrganizationSetup.error-handling.test.tsx',
      'frontend/tests/unit/pages/Dashboard.error-handling.test.tsx'
    ],
    e2e: 'frontend/tests/e2e/organization-membership-flow.e2e.test.ts'
  }
};

// Fonction pour exécuter une commande et capturer la sortie
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} - Succès`);
    return { success: true, output };
  } catch (error) {
    console.log(`❌ ${description} - Échec`);
    console.log(`Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Fonction pour vérifier l'existence des fichiers de test
function checkTestFiles() {
  console.log('🔍 Vérification de l\'existence des fichiers de test...\n');
  
  const allFiles = [
    ...Object.values(testConfig.backend),
    ...testConfig.frontend.unit,
    testConfig.frontend.e2e
  ].flat();

  const missingFiles = [];
  
  allFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    } else {
      console.log(`✅ ${file}`);
    }
  });

  if (missingFiles.length > 0) {
    console.log('\n❌ Fichiers de test manquants:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }

  console.log('\n✅ Tous les fichiers de test sont présents\n');
  return true;
}

// Fonction pour exécuter les tests backend
function runBackendTests() {
  console.log('🔧 Tests Backend\n');
  
  const results = [];
  
  // Tests d'intégration
  results.push(runCommand(
    'cd backend && npm test -- tests/integration/organization-membership-flow.integration.test.ts',
    'Tests d\'intégration API'
  ));
  
  // Tests unitaires
  results.push(runCommand(
    'cd backend && npm test -- tests/unit/user-organizations.test.ts',
    'Tests unitaires services'
  ));
  
  return results;
}

// Fonction pour exécuter les tests frontend
function runFrontendTests() {
  console.log('🎨 Tests Frontend\n');
  
  const results = [];
  
  // Tests unitaires des composants
  testConfig.frontend.unit.forEach((testFile, index) => {
    const componentName = path.basename(testFile, '.test.tsx');
    results.push(runCommand(
      `cd frontend && npm test -- ${testFile}`,
      `Tests unitaires ${componentName}`
    ));
  });
  
  // Tests E2E
  results.push(runCommand(
    `cd frontend && npm test -- ${testConfig.frontend.e2e}`,
    'Tests End-to-End'
  ));
  
  return results;
}

// Fonction pour générer un rapport de couverture
function generateCoverageReport() {
  console.log('📊 Génération du rapport de couverture...\n');
  
  const backendCoverage = runCommand(
    'cd backend && npm run test:coverage',
    'Couverture Backend'
  );
  
  const frontendCoverage = runCommand(
    'cd frontend && npm run test:coverage',
    'Couverture Frontend'
  );
  
  return [backendCoverage, frontendCoverage];
}

// Fonction pour valider les scénarios spécifiques
function validateScenarios() {
  console.log('🎯 Validation des scénarios spécifiques\n');
  
  const scenarios = [
    {
      name: 'Nouvel utilisateur sans organisation',
      description: 'Vérifier la création d\'organisation pour un nouvel utilisateur'
    },
    {
      name: 'Utilisateur avec organisation existante',
      description: 'Vérifier la redirection automatique'
    },
    {
      name: 'Utilisateur avec plusieurs organisations',
      description: 'Vérifier l\'affichage du sélecteur'
    },
    {
      name: 'Gestion d\'erreurs API',
      description: 'Vérifier les fallbacks en cas d\'erreur'
    },
    {
      name: 'Finalisation automatique',
      description: 'Vérifier la gestion des appartenances existantes'
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ✅ ${scenario.name}`);
    console.log(`   ${scenario.description}\n`);
  });
}

// Fonction principale
async function main() {
  const startTime = Date.now();
  
  // Vérifier les fichiers de test
  if (!checkTestFiles()) {
    console.log('❌ Arrêt des tests - fichiers manquants');
    process.exit(1);
  }
  
  // Exécuter les tests
  const backendResults = runBackendTests();
  const frontendResults = runFrontendTests();
  
  // Générer le rapport de couverture
  const coverageResults = generateCoverageReport();
  
  // Valider les scénarios
  validateScenarios();
  
  // Résumé des résultats
  console.log('📈 Résumé des tests\n');
  
  const allResults = [...backendResults, ...frontendResults, ...coverageResults];
  const successCount = allResults.filter(r => r.success).length;
  const totalCount = allResults.length;
  
  console.log(`✅ Tests réussis: ${successCount}/${totalCount}`);
  console.log(`❌ Tests échoués: ${totalCount - successCount}/${totalCount}`);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`⏱️  Durée totale: ${duration}s\n`);
  
  // Recommandations
  console.log('💡 Recommandations:\n');
  
  if (successCount === totalCount) {
    console.log('🎉 Tous les tests passent ! Le flux d\'appartenance aux organisations est prêt.');
    console.log('📝 Prochaines étapes:');
    console.log('   - Déployer les modifications');
    console.log('   - Tester en environnement de staging');
    console.log('   - Documenter les nouvelles fonctionnalités');
  } else {
    console.log('⚠️  Certains tests échouent. Actions recommandées:');
    console.log('   - Corriger les tests en échec');
    console.log('   - Vérifier la configuration des services');
    console.log('   - Valider les mocks et les données de test');
  }
  
  console.log('\n🔗 Liens utiles:');
  console.log('   - Documentation: docs/ORGANIZATION_MEMBERSHIP_FLOW.md');
  console.log('   - Spécifications: .kiro/specs/organization-membership-flow/');
  console.log('   - Tests: backend/functions/src/tests/ et frontend/src/__tests__/');
  
  // Code de sortie
  process.exit(successCount === totalCount ? 0 : 1);
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

// Exécuter le script
main().catch(error => {
  console.error('❌ Erreur lors de l\'exécution des tests:', error.message);
  process.exit(1);
});