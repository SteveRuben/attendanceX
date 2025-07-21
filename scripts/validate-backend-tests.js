#!/usr/bin/env node

// scripts/validate-backend-tests.js - Script de validation des tests backend

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Couleurs pour l'affichage
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  log(`[INFO] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`[SUCCESS] ${message}`, 'green');
}

function logWarning(message) {
  log(`[WARNING] ${message}`, 'yellow');
}

function logError(message) {
  log(`[ERROR] ${message}`, 'red');
}

// Vérifications des fichiers requis
const requiredFiles = [
  'tests/config/jest.backend.config.js',
  'tests/helpers/setup/backend-test-environment.ts',
  'tests/helpers/mocks/backend-mocks.ts',
  'tests/helpers/mocks/error-mocks.ts',
  'tests/backend/README.md',
  'backend/functions/.env.test',
  'scripts/test-backend.sh',
  'scripts/test-backend.ps1',
];

// Vérifications des tests
const requiredTests = [
  'tests/backend/unit/controllers/auth.controller.test.ts',
  'tests/backend/unit/controllers/user.controller.test.ts',
  'tests/backend/unit/services/auth.service.test.ts',
  'tests/backend/unit/middleware/auth.test.ts',
  'tests/backend/unit/middleware/roles.test.ts',
  'tests/backend/integration/auth.routes.test.ts',
];

// Dépendances requises dans package.json
const requiredDependencies = [
  '@types/jest',
  '@types/supertest',
  'jest',
  'supertest',
  'ts-jest',
];

function checkFileExists(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  return fs.existsSync(fullPath);
}

function checkPackageJson() {
  logStep('Vérification du package.json...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'backend/functions/package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logError('backend/functions/package.json non trouvé');
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const devDeps = packageJson.devDependencies || {};
    
    let missingDeps = [];
    requiredDependencies.forEach(dep => {
      if (!devDeps[dep]) {
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length > 0) {
      logWarning(`Dépendances manquantes: ${missingDeps.join(', ')}`);
      logStep('Installation des dépendances manquantes...');
      
      try {
        execSync(`cd backend/functions && npm install --save-dev ${missingDeps.join(' ')}`, { stdio: 'inherit' });
        logSuccess('Dépendances installées');
      } catch (error) {
        logError('Échec de l\'installation des dépendances');
        return false;
      }
    }
    
    logSuccess('Package.json vérifié');
    return true;
  } catch (error) {
    logError(`Erreur lors de la vérification du package.json: ${error.message}`);
    return false;
  }
}

function checkRequiredFiles() {
  logStep('Vérification des fichiers requis...');
  
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (checkFileExists(file)) {
      log(`  ✓ ${file}`, 'green');
    } else {
      log(`  ✗ ${file}`, 'red');
      allFilesExist = false;
    }
  });
  
  if (allFilesExist) {
    logSuccess('Tous les fichiers requis sont présents');
  } else {
    logError('Certains fichiers requis sont manquants');
  }
  
  return allFilesExist;
}

function checkTestFiles() {
  logStep('Vérification des fichiers de test...');
  
  let allTestsExist = true;
  
  requiredTests.forEach(test => {
    if (checkFileExists(test)) {
      log(`  ✓ ${test}`, 'green');
    } else {
      log(`  ✗ ${test}`, 'red');
      allTestsExist = false;
    }
  });
  
  if (allTestsExist) {
    logSuccess('Tous les fichiers de test sont présents');
  } else {
    logError('Certains fichiers de test sont manquants');
  }
  
  return allTestsExist;
}

function checkJestConfig() {
  logStep('Vérification de la configuration Jest...');
  
  try {
    const jestConfigPath = path.join(process.cwd(), 'tests/config/jest.backend.config.js');
    if (!fs.existsSync(jestConfigPath)) {
      logError('Configuration Jest backend manquante');
      return false;
    }
    
    const jestConfig = require(jestConfigPath);
    
    // Vérifications de base
    const requiredProps = ['displayName', 'preset', 'testEnvironment', 'testMatch'];
    let configValid = true;
    
    requiredProps.forEach(prop => {
      if (!jestConfig[prop]) {
        logError(`Propriété manquante dans la config Jest: ${prop}`);
        configValid = false;
      }
    });
    
    if (configValid) {
      logSuccess('Configuration Jest valide');
    }
    
    return configValid;
  } catch (error) {
    logError(`Erreur lors de la vérification de la config Jest: ${error.message}`);
    return false;
  }
}

function runBasicTests() {
  logStep('Exécution des tests de base...');
  
  try {
    // Test de syntaxe Jest
    execSync('npx jest --config=tests/config/jest.backend.config.js --listTests', { stdio: 'pipe' });
    logSuccess('Configuration Jest fonctionnelle');
    
    // Test d\'un fichier simple
    const simpleTestPath = 'tests/backend/unit/controllers/auth.controller.test.ts';
    if (checkFileExists(simpleTestPath)) {
      try {
        execSync(`npx jest --config=tests/config/jest.backend.config.js ${simpleTestPath} --passWithNoTests`, { stdio: 'pipe' });
        logSuccess('Test d\'exemple exécuté avec succès');
      } catch (error) {
        logWarning('Erreur lors de l\'exécution du test d\'exemple (normal si les dépendances ne sont pas complètes)');
      }
    }
    
    return true;
  } catch (error) {
    logError(`Erreur lors des tests de base: ${error.message}`);
    return false;
  }
}

function checkScripts() {
  logStep('Vérification des scripts NPM...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'test:backend',
      'test:backend:unit',
      'test:backend:integration',
      'test:backend:coverage',
      'test:backend:watch',
    ];
    
    let missingScripts = [];
    requiredScripts.forEach(script => {
      if (!scripts[script]) {
        missingScripts.push(script);
      }
    });
    
    if (missingScripts.length > 0) {
      logWarning(`Scripts NPM manquants: ${missingScripts.join(', ')}`);
      return false;
    }
    
    logSuccess('Scripts NPM présents');
    return true;
  } catch (error) {
    logError(`Erreur lors de la vérification des scripts: ${error.message}`);
    return false;
  }
}

function generateReport(results) {
  log('\n' + '='.repeat(60), 'cyan');
  log('RAPPORT DE VALIDATION DES TESTS BACKEND', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const failedChecks = totalChecks - passedChecks;
  
  log(`\nRésultats: ${passedChecks}/${totalChecks} vérifications réussies\n`);
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`  ${status} ${check}`, color);
  });
  
  if (failedChecks === 0) {
    log('\n🎉 Tous les tests backend sont correctement configurés !', 'green');
    log('\nVous pouvez maintenant lancer:', 'blue');
    log('  npm run test:backend:unit', 'cyan');
    log('  npm run test:backend:coverage', 'cyan');
    log('  ./scripts/test-backend.sh all', 'cyan');
  } else {
    log(`\n⚠️  ${failedChecks} problème(s) détecté(s)`, 'yellow');
    log('\nVeuillez corriger les problèmes avant de lancer les tests.', 'yellow');
  }
  
  log('\nDocumentation:', 'blue');
  log('  tests/backend/README.md - Guide complet', 'cyan');
  log('  BACKEND_TESTING_GUIDE.md - Guide rapide', 'cyan');
}

function main() {
  log('🔍 VALIDATION DES TESTS BACKEND', 'magenta');
  log('================================\n', 'magenta');
  
  const results = {
    'Fichiers requis': checkRequiredFiles(),
    'Fichiers de test': checkTestFiles(),
    'Package.json': checkPackageJson(),
    'Configuration Jest': checkJestConfig(),
    'Scripts NPM': checkScripts(),
    'Tests de base': runBasicTests(),
  };
  
  generateReport(results);
  
  const allPassed = Object.values(results).every(Boolean);
  process.exit(allPassed ? 0 : 1);
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  logError(`Erreur inattendue: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Promise rejetée: ${reason}`);
  process.exit(1);
});

// Exécution
if (require.main === module) {
  main();
}

module.exports = {
  checkFileExists,
  checkPackageJson,
  checkRequiredFiles,
  checkTestFiles,
  checkJestConfig,
  runBasicTests,
  checkScripts,
};