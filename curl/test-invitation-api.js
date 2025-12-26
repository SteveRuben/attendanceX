#!/usr/bin/env node

/**
 * Script pour tester l'API d'invitation qui pose problème dans le frontend
 * Usage: node test-invitation-api.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Invitation API Performance...\n');

// Configuration du test
const testFile = 'tests/backend/api-invitation-performance.test.ts';
const jestConfig = 'tests/backend/jest.config.js';

// Commande Jest - Windows compatible
const isWindows = process.platform === 'win32';
const jestCommand = isWindows ? 'npm' : 'npx';
const jestArgs = isWindows ? [
  'run', 'test:backend', '--',
  testFile,
  '--config', jestConfig,
  '--verbose',
  '--detectOpenHandles',
  '--forceExit',
  '--runInBand',
  '--testTimeout=60000'
] : [
  'jest',
  testFile,
  '--config', jestConfig,
  '--verbose',
  '--detectOpenHandles',
  '--forceExit',
  '--runInBand',
  '--testTimeout=60000'
];

console.log('📋 Running command:');
console.log(`${jestCommand} ${jestArgs.join(' ')}\n`);

// Exécuter le test
const testProcess = spawn(jestCommand, jestArgs, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099'
  }
});

testProcess.on('close', (code) => {
  console.log(`\n🏁 Test process exited with code ${code}`);
  
  if (code === 0) {
    console.log('✅ All tests passed!');
    console.log('\n📊 Performance Analysis:');
    console.log('- Check the console output above for timing information');
    console.log('- Look for warnings about slow operations');
    console.log('- Single invitations should complete in < 5 seconds');
    console.log('- Bulk invitations (5 users) should complete in < 15 seconds');
  } else {
    console.log('❌ Tests failed or encountered errors');
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Make sure Firebase emulators are running:');
    console.log('   cd backend && npm run emulators:start');
    console.log('2. Check if the backend functions are deployed locally');
    console.log('3. Verify the test environment configuration');
  }
  
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});