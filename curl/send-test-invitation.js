#!/usr/bin/env node

/**
 * Script pour envoyer une invitation de test à steveruben2015@hotmail.com
 * Usage: node send-test-invitation.js
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/user-invitations/invite';
const TARGET_EMAIL = 'steveruben2015@hotmail.com';

// REMPLACER CES VALEURS PAR VOS VRAIS TOKENS
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE';  // Copier depuis DevTools > Local Storage ou Network headers
const TENANT_ID = 'YOUR_TENANT_ID_HERE';    // Copier depuis DevTools > Local Storage ou Network headers

async function sendInvitation() {
  console.log('🚀 Sending invitation to:', TARGET_EMAIL);
  console.log('📍 API URL:', API_URL);
  console.log('');

  // Données de l'invitation
  const invitationData = {
    email: TARGET_EMAIL,
    firstName: 'Steve',
    lastName: 'Ruben',
    tenantRole: 'member',
    department: 'Test Department',
    message: 'Welcome! This is a test invitation from the performance testing script.'
  };

  console.log('📤 Invitation data:', JSON.stringify(invitationData, null, 2));
  console.log('');

  // Vérifier les tokens
  if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE' || TENANT_ID === 'YOUR_TENANT_ID_HERE') {
    console.log('❌ Please update the AUTH_TOKEN and TENANT_ID in the script');
    console.log('');
    console.log('🔧 To get these values:');
    console.log('1. Start the frontend: npm run dev:frontend');
    console.log('2. Login to your app');
    console.log('3. Open browser DevTools > Application > Local Storage');
    console.log('4. Find the auth token and tenant ID');
    console.log('5. Update this script with the real values');
    return;
  }

  const startTime = Date.now();

  try {
    console.log('⏱️  Starting request...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'X-Tenant-ID': TENANT_ID
      },
      body: JSON.stringify(invitationData),
      timeout: 30000 // 30 secondes de timeout
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log('📥 HTTP Status:', response.status);
    console.log('');

    const responseData = await response.json();
    console.log('📥 Response body:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('');

    // Analyser les résultats
    if (response.status === 201) {
      console.log('✅ Invitation sent successfully!');
      console.log(`📧 Email sent to: ${TARGET_EMAIL}`);
      
      // Analyser la performance
      if (duration < 2000) {
        console.log('🚀 Excellent performance:', duration + 'ms');
      } else if (duration < 5000) {
        console.log('⚡ Good performance:', duration + 'ms');
      } else if (duration < 10000) {
        console.log('⚠️  Slow performance:', duration + 'ms');
      } else {
        console.log('🐌 Very slow performance:', duration + 'ms');
        console.log('   This explains why the frontend is timing out!');
      }
      
    } else if (response.status === 401) {
      console.log('🔐 Authentication failed');
      console.log('   Please check your AUTH_TOKEN');
      
    } else if (response.status === 403) {
      console.log('🚫 Authorization failed');
      console.log('   Please check your permissions and TENANT_ID');
      
    } else if (response.status === 400) {
      console.log('📝 Validation error');
      console.log('   Check the request data format');
      
    } else if (response.status === 409) {
      console.log('👥 User already exists or has pending invitation');
      console.log('   This is normal if you\'ve already sent an invitation');
      
    } else {
      console.log('❌ Request failed with status:', response.status);
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ Request failed after ${duration}ms`);
    console.log('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 Connection refused - make sure:');
      console.log('1. Firebase emulators are running: cd backend && npm run emulators:start');
      console.log('2. The API is accessible at:', API_URL);
    } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('');
      console.log('⏰ Request timed out - this confirms the performance issue!');
      console.log('   The API is taking more than 30 seconds to respond');
    }
  }
}

// Fonction pour obtenir les tokens depuis le localStorage (si disponible)
function getTokensFromBrowser() {
  console.log('🔧 To get your tokens:');
  console.log('');
  console.log('1. Start the frontend: npm run dev:frontend');
  console.log('2. Open http://localhost:3000 and login');
  console.log('3. Open DevTools (F12) > Application tab > Local Storage');
  console.log('4. Look for keys like "auth_token", "access_token", or "token"');
  console.log('5. Look for "tenant_id" or similar');
  console.log('6. Copy these values and update this script');
  console.log('');
  console.log('Alternative: Check the Network tab in DevTools');
  console.log('- Look for API requests');
  console.log('- Check the Authorization header');
  console.log('- Check the X-Tenant-ID header');
}

// Exécuter le script
if (require.main === module) {
  sendInvitation().catch(console.error);
}