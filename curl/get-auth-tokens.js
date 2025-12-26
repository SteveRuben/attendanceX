#!/usr/bin/env node

/**
 * Script pour aider à obtenir les tokens d'authentification
 * Usage: node get-auth-tokens.js
 */

console.log('🔑 How to get your authentication tokens\n');

console.log('📋 Step-by-step guide:');
console.log('');
console.log('1. 🚀 Start the frontend:');
console.log('   npm run dev:frontend');
console.log('');
console.log('2. 🌐 Open your browser and go to:');
console.log('   http://localhost:3000');
console.log('');
console.log('3. 🔐 Login to your application');
console.log('');
console.log('4. 🛠️  Open Developer Tools (F12)');
console.log('');
console.log('5. 📱 Go to Application tab > Local Storage > http://localhost:3000');
console.log('   Look for keys like:');
console.log('   - "auth_token" or "access_token" or "token"');
console.log('   - "tenant_id" or "tenantId"');
console.log('');
console.log('6. 🌐 Alternative: Go to Network tab');
console.log('   - Refresh the page or make an API call');
console.log('   - Look for requests to the API');
console.log('   - Check the Request Headers:');
console.log('     * Authorization: Bearer YOUR_TOKEN_HERE');
console.log('     * X-Tenant-ID: YOUR_TENANT_ID_HERE');
console.log('');
console.log('7. 📝 Copy the values and update one of these scripts:');
console.log('   - send-test-invitation.js (Node.js)');
console.log('   - send-test-invitation.ps1 (PowerShell)');
console.log('');

console.log('🔍 What to look for:');
console.log('');
console.log('AUTH_TOKEN example:');
console.log('eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzg4...(very long string)');
console.log('');
console.log('TENANT_ID example:');
console.log('abc123def-456-789-ghi-jklmnop456789');
console.log('');

console.log('⚡ Quick test once you have the tokens:');
console.log('');
console.log('Windows PowerShell:');
console.log('.\\send-test-invitation.ps1');
console.log('');
console.log('Node.js:');
console.log('node send-test-invitation.js');
console.log('');

console.log('🎯 This will send an invitation to: steveruben2015@hotmail.com');
console.log('📊 And measure the API performance to identify the bottleneck');
console.log('');

// Fonction pour tester si les émulateurs sont en cours d'exécution
async function checkEmulators() {
  console.log('🔍 Checking if Firebase emulators are running...');
  
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:4000', { timeout: 3000 });
    
    if (response.ok) {
      console.log('✅ Firebase emulators are running at http://localhost:4000');
    } else {
      console.log('⚠️  Firebase emulators might not be fully ready');
    }
  } catch (error) {
    console.log('❌ Firebase emulators are not running');
    console.log('');
    console.log('🚀 To start them:');
    console.log('cd backend');
    console.log('npm run emulators:start');
    console.log('');
  }
}

// Vérifier les émulateurs si node-fetch est disponible
try {
  require('node-fetch');
  checkEmulators().catch(() => {
    console.log('❌ Could not check emulators (node-fetch not available)');
  });
} catch (error) {
  console.log('💡 To install node-fetch for emulator checking:');
  console.log('npm install node-fetch');
}