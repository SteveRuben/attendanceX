#!/usr/bin/env node

/**
 * Script de lancement des tests Cypress pour AttendanceX
 * Usage: node run-cypress-tests.js [options]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  backend: {
    path: './backend/functions',
    command: 'npm run dev',
    port: 5001,
    healthCheck: 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/health'
  },
  frontend: {
    path: './frontend-v2',
    command: 'npm run dev',
    port: 3000,
    healthCheck: 'http://localhost:3000'
  }
};

// Arguments de ligne de commande
const args = process.argv.slice(2);
const options = {
  suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 'all',
  mode: args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'run',
  browser: args.find(arg => arg.startsWith('--browser='))?.split('=')[1] || 'electron',
  env: args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'dev',
  skipSetup: args.includes('--skip-setup'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help')
};

// Aide
if (options.help) {
  console.log(`
🧪 Script de Tests Cypress - AttendanceX

Usage: node run-cypress-tests.js [options]

Options:
  --suite=<name>     Suite de tests à exécuter (all, smoke, auth, projects, organization, events, integration, form-builder)
  --mode=<mode>      Mode d'exécution (run, open) [défaut: run]
  --browser=<name>   Navigateur (electron, chrome, firefox, edge) [défaut: electron]
  --env=<env>        Environnement (dev, staging, prod) [défaut: dev]
  --skip-setup       Ignorer la vérification des services
  --verbose          Logs détaillés
  --help             Afficher cette aide

Exemples:
  node run-cypress-tests.js                                    # Tous les tests en mode headless
  node run-cypress-tests.js --mode=open                        # Interface interactive
  node run-cypress-tests.js --suite=smoke --browser=chrome     # Tests de fumée avec Chrome
  node run-cypress-tests.js --suite=organization --verbose     # Tests d'organisation avec logs
  node run-cypress-tests.js --skip-setup --suite=auth          # Tests d'auth sans vérification
`);
  process.exit(0);
}

// Suites de tests disponibles
const testSuites = {
  all: 'cypress/e2e/**/*.cy.js',
  smoke: 'cypress/e2e/00-app-smoke-test.cy.js',
  auth: 'cypress/e2e/01-authentication.cy.js',
  navigation: 'cypress/e2e/02-navigation-dashboard.cy.js',
  projects: 'cypress/e2e/03-projects.cy.js',
  organization: 'cypress/e2e/04-organization.cy.js',
  events: 'cypress/e2e/05-events.cy.js',
  integration: 'cypress/e2e/06-integration-complete.cy.js',
  'form-builder': 'cypress/e2e/form-builder/*.cy.js'
};

// Utilitaires
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Vert
    warning: '\x1b[33m', // Jaune
    error: '\x1b[31m',   // Rouge
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkService(name, url, maxRetries = 30) {
  log(`Vérification de ${name}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        log(`✅ ${name} est prêt`, 'success');
        return true;
      }
    } catch (error) {
      if (options.verbose) {
        log(`Tentative ${i + 1}/${maxRetries} pour ${name}...`, 'warning');
      }
    }
    await sleep(2000);
  }
  
  log(`❌ ${name} n'est pas accessible après ${maxRetries} tentatives`, 'error');
  return false;
}

async function startService(name, config) {
  log(`Démarrage de ${name}...`);
  
  const process = spawn('npm', ['run', 'dev'], {
    cwd: config.path,
    stdio: options.verbose ? 'inherit' : 'pipe',
    shell: true
  });
  
  process.on('error', (error) => {
    log(`❌ Erreur lors du démarrage de ${name}: ${error.message}`, 'error');
  });
  
  return process;
}

async function setupServices() {
  if (options.skipSetup) {
    log('⏭️ Vérification des services ignorée', 'warning');
    return true;
  }
  
  log('🚀 Vérification des services requis...');
  
  // Vérifier si les services sont déjà démarrés
  const backendReady = await checkService('Backend', config.backend.healthCheck, 3);
  const frontendReady = await checkService('Frontend', config.frontend.healthCheck, 3);
  
  if (backendReady && frontendReady) {
    log('✅ Tous les services sont prêts', 'success');
    return true;
  }
  
  // Démarrer les services manquants
  const processes = [];
  
  if (!backendReady) {
    log('🔧 Démarrage du backend...', 'warning');
    const backendProcess = await startService('Backend', config.backend);
    processes.push(backendProcess);
    
    // Attendre que le backend soit prêt
    const ready = await checkService('Backend', config.backend.healthCheck);
    if (!ready) {
      log('❌ Impossible de démarrer le backend', 'error');
      return false;
    }
  }
  
  if (!frontendReady) {
    log('🔧 Démarrage du frontend...', 'warning');
    const frontendProcess = await startService('Frontend', config.frontend);
    processes.push(frontendProcess);
    
    // Attendre que le frontend soit prêt
    const ready = await checkService('Frontend', config.frontend.healthCheck);
    if (!ready) {
      log('❌ Impossible de démarrer le frontend', 'error');
      return false;
    }
  }
  
  log('✅ Tous les services sont maintenant prêts', 'success');
  return true;
}

async function runCypressTests() {
  const spec = testSuites[options.suite];
  if (!spec) {
    log(`❌ Suite de tests inconnue: ${options.suite}`, 'error');
    log(`Suites disponibles: ${Object.keys(testSuites).join(', ')}`, 'info');
    process.exit(1);
  }
  
  log(`🧪 Exécution des tests: ${options.suite}`);
  log(`📁 Spec: ${spec}`);
  log(`🌐 Navigateur: ${options.browser}`);
  log(`🔧 Mode: ${options.mode}`);
  
  const cypressCommand = options.mode === 'open' ? 'open' : 'run';
  const cypressArgs = [
    'cypress',
    cypressCommand,
    '--spec',
    spec,
    '--browser',
    options.browser
  ];
  
  // Ajouter des options spécifiques selon le mode
  if (options.mode === 'run') {
    cypressArgs.push('--headless');
    if (!options.verbose) {
      cypressArgs.push('--quiet');
    }
  }
  
  // Variables d'environnement selon l'environnement
  const envVars = {
    dev: {
      CYPRESS_baseUrl: 'http://localhost:3000',
      CYPRESS_API_URL: 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1'
    },
    staging: {
      CYPRESS_baseUrl: 'https://staging.attendancex.com',
      CYPRESS_API_URL: 'https://api-staging.attendancex.com/v1'
    },
    prod: {
      CYPRESS_baseUrl: 'https://app.attendancex.com',
      CYPRESS_API_URL: 'https://api.attendancex.com/v1',
      CYPRESS_readOnly: 'true'
    }
  };
  
  const env = envVars[options.env] || envVars.dev;
  
  log('🚀 Lancement de Cypress...');
  
  const cypressProcess = spawn('npx', cypressArgs, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env }
  });
  
  cypressProcess.on('close', (code) => {
    if (code === 0) {
      log('✅ Tests terminés avec succès', 'success');
    } else {
      log(`❌ Tests échoués avec le code: ${code}`, 'error');
    }
    process.exit(code);
  });
  
  cypressProcess.on('error', (error) => {
    log(`❌ Erreur lors de l'exécution de Cypress: ${error.message}`, 'error');
    process.exit(1);
  });
}

async function generateReport() {
  log('📊 Génération du rapport de tests...');
  
  // Vérifier si des résultats existent
  const resultsPath = './cypress/results';
  if (!fs.existsSync(resultsPath)) {
    log('ℹ️ Aucun résultat de test trouvé', 'warning');
    return;
  }
  
  // Générer un rapport HTML simple
  const reportPath = './cypress/reports/test-report.html';
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Rapport de Tests Cypress - AttendanceX</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport de Tests Cypress</h1>
        <p>Suite: ${options.suite}</p>
        <p>Date: ${new Date().toLocaleString()}</p>
        <p>Environnement: ${options.env}</p>
    </div>
    
    <h2>Résultats</h2>
    <p>Consultez les fichiers dans ./cypress/videos et ./cypress/screenshots pour plus de détails.</p>
</body>
</html>
  `;
  
  fs.writeFileSync(reportPath, reportContent);
  log(`📄 Rapport généré: ${reportPath}`, 'success');
}

// Fonction principale
async function main() {
  try {
    log('🎯 Démarrage des tests Cypress pour AttendanceX');
    log(`Suite: ${options.suite} | Mode: ${options.mode} | Env: ${options.env}`);
    
    // Vérifier et démarrer les services
    const servicesReady = await setupServices();
    if (!servicesReady) {
      log('❌ Impossible de démarrer les services requis', 'error');
      process.exit(1);
    }
    
    // Attendre un peu pour que tout soit stable
    await sleep(3000);
    
    // Exécuter les tests
    await runCypressTests();
    
  } catch (error) {
    log(`❌ Erreur inattendue: ${error.message}`, 'error');
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Gestion des signaux pour nettoyer les processus
process.on('SIGINT', () => {
  log('🛑 Arrêt demandé par l\'utilisateur', 'warning');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Arrêt du processus', 'warning');
  process.exit(0);
});

// Lancer le script
main();