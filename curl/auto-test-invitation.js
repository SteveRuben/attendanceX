#!/usr/bin/env node

/**
 * Script automatisé pour tester l'API d'invitation
 * Se connecte automatiquement et envoie une invitation à steveruben2015@hotmail.com
 */

const fetch = require('node-fetch');

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
const TARGET_EMAIL = 'steveruben2015@hotmail.com';

// Identifiants de test
const TEST_CREDENTIALS = {
  email: 'test@test.com',
  password: '123Abc@cbA123'
};

async function loginAndGetTokens() {
  console.log('🔐 Logging in with test credentials...');
  console.log('Email:', TEST_CREDENTIALS.email);
  
  try {
    // Étape 1: Connexion pour obtenir le token
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS),
      timeout: 10000
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed with status:', loginResponse.status);
      const errorText = await loginResponse.text();
      console.log('Error response:', errorText);
      return null;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    
    // Extraire les tokens de la réponse
    const authToken = loginData.data?.token || loginData.token || loginData.data?.accessToken || loginData.accessToken;
    let tenantId = loginData.data?.user?.tenantId || loginData.user?.tenantId || loginData.tenantId || loginData.data?.user?.activeTenantId;
    
    if (!authToken) {
      console.log('❌ No auth token found in login response');
      console.log('Login response:', JSON.stringify(loginData, null, 2));
      return null;
    }

    // Si pas de tenantId, essayer de le récupérer via une autre API
    if (!tenantId || tenantId === '') {
      console.log('⚠️  No tenant ID in login response, trying to get user tenants...');
      
      try {
        const tenantsResponse = await fetch(`${API_BASE_URL}/tenants/user-tenants`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json();
          console.log('Tenants response:', JSON.stringify(tenantsData, null, 2));
          
          // Prendre le premier tenant disponible
          if (tenantsData.data && tenantsData.data.length > 0) {
            tenantId = tenantsData.data[0].id || tenantsData.data[0].tenantId;
            console.log('✅ Found tenant ID from tenants API:', tenantId);
          }
        }
      } catch (error) {
        console.log('⚠️  Could not fetch tenants:', error.message);
      }
    }

    if (!tenantId || tenantId === '') {
      console.log('❌ No tenant ID found - user might not be associated with any tenant');
      console.log('Login response:', JSON.stringify(loginData, null, 2));
      
      // Essayer quand même avec un tenant ID vide ou par défaut
      console.log('⚠️  Trying with empty tenant ID...');
      tenantId = '';
    }

    console.log('🔑 Auth token obtained:', authToken.substring(0, 20) + '...');
    console.log('🏢 Tenant ID:', tenantId);
    
    return { authToken, tenantId };

  } catch (error) {
    console.log('❌ Login error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔧 Connection refused. Make sure:');
      console.log('1. Backend emulators are running: cd backend && npm run emulators:start');
      console.log('2. Frontend is running: npm run dev:frontend');
    }
    
    return null;
  }
}

async function sendInvitation(authToken, tenantId) {
  console.log('');
  console.log('📤 Sending invitation to:', TARGET_EMAIL);
  
  const invitationData = {
    email: TARGET_EMAIL,
    firstName: 'Steve',
    lastName: 'Ruben',
    tenantRole: 'member',
    department: 'Test Department',
    message: 'Welcome! This is an automated test invitation to measure API performance.'
  };

  console.log('📋 Invitation data:', JSON.stringify(invitationData, null, 2));
  
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/user-invitations/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify(invitationData),
      timeout: 30000 // 30 secondes
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('');
    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log('📥 HTTP Status:', response.status);

    const responseData = await response.json();
    console.log('📥 Response:', JSON.stringify(responseData, null, 2));

    // Analyser les résultats
    if (response.status === 201) {
      console.log('');
      console.log('✅ Invitation sent successfully!');
      console.log(`📧 Email should be sent to: ${TARGET_EMAIL}`);
      
      // Analyser la performance
      if (duration < 2000) {
        console.log('🚀 Excellent performance:', duration + 'ms');
      } else if (duration < 5000) {
        console.log('⚡ Good performance:', duration + 'ms');
      } else if (duration < 10000) {
        console.log('⚠️  Slow performance:', duration + 'ms');
        console.log('   This might cause timeout issues in the frontend');
      } else {
        console.log('🐌 Very slow performance:', duration + 'ms');
        console.log('   This explains why the frontend is timing out!');
      }
      
      return { success: true, duration, response: responseData };
      
    } else if (response.status === 409) {
      console.log('');
      console.log('👥 User already exists or has pending invitation');
      console.log('   This is normal if you\'ve already sent an invitation to this email');
      return { success: true, duration, response: responseData, duplicate: true };
      
    } else {
      console.log('');
      console.log('❌ Request failed with status:', response.status);
      
      if (response.status === 401) {
        console.log('🔐 Authentication failed - token might be expired');
      } else if (response.status === 403) {
        console.log('🚫 Authorization failed - check permissions');
      } else if (response.status === 400) {
        console.log('📝 Validation error - check request data');
      }
      
      return { success: false, duration, response: responseData };
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('');
    console.log(`❌ Request failed after ${duration}ms`);
    console.log('Error:', error.message);
    
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('');
      console.log('⏰ Request timed out after 30 seconds!');
      console.log('   This confirms there is a serious performance issue');
      console.log('   The API is taking too long to respond');
    }
    
    return { success: false, duration, error: error.message };
  }
}

async function testMultipleInvitations(authToken, tenantId) {
  console.log('');
  console.log('🔄 Testing bulk invitation performance...');
  
  const bulkData = {
    invitations: [
      {
        email: `bulk-test-1-${Date.now()}@example.com`,
        firstName: 'Bulk',
        lastName: 'Test1',
        tenantRole: 'member',
        isOnboardingInvitation: true
      },
      {
        email: `bulk-test-2-${Date.now()}@example.com`,
        firstName: 'Bulk',
        lastName: 'Test2',
        tenantRole: 'member',
        isOnboardingInvitation: true
      }
    ],
    customMessage: 'Bulk test invitation for performance testing'
  };

  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/user-invitations/bulk-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify(bulkData),
      timeout: 20000 // 20 secondes pour bulk
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Bulk request completed in ${duration}ms`);
    console.log('📥 Bulk HTTP Status:', response.status);

    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Bulk invitation successful');
      console.log('📊 Summary:', responseData.data?.summary);
      
      if (duration > 10000) {
        console.log('⚠️  Bulk invitation is slow - this affects onboarding performance');
      }
    } else {
      console.log('❌ Bulk invitation failed');
    }

    return { duration, success: response.ok };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ Bulk request failed after ${duration}ms`);
    console.log('Bulk error:', error.message);
    
    return { duration, success: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 Automated Invitation API Performance Test');
  console.log('===========================================');
  console.log('');
  
  // Étape 1: Se connecter et obtenir les tokens
  const tokens = await loginAndGetTokens();
  
  if (!tokens) {
    console.log('');
    console.log('❌ Could not obtain authentication tokens');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure Firebase emulators are running:');
    console.log('   cd backend && npm run emulators:start');
    console.log('2. Make sure the test user exists with correct credentials');
    console.log('3. Check the login endpoint is working');
    process.exit(1);
  }

  // Étape 2: Tester l'invitation unique
  console.log('');
  console.log('📋 Test 1: Single Invitation Performance');
  console.log('========================================');
  
  const singleResult = await sendInvitation(tokens.authToken, tokens.tenantId);
  
  // Étape 3: Tester les invitations en lot
  console.log('');
  console.log('📋 Test 2: Bulk Invitation Performance');
  console.log('======================================');
  
  const bulkResult = await testMultipleInvitations(tokens.authToken, tokens.tenantId);
  
  // Résumé final
  console.log('');
  console.log('📊 Performance Summary');
  console.log('=====================');
  console.log('');
  
  if (singleResult.success) {
    console.log(`✅ Single invitation: ${singleResult.duration}ms`);
    if (singleResult.duplicate) {
      console.log('   (User already existed - normal behavior)');
    }
  } else {
    console.log(`❌ Single invitation failed: ${singleResult.duration}ms`);
  }
  
  if (bulkResult.success) {
    console.log(`✅ Bulk invitation (2 users): ${bulkResult.duration}ms`);
  } else {
    console.log(`❌ Bulk invitation failed: ${bulkResult.duration}ms`);
  }
  
  console.log('');
  
  // Recommandations
  const maxDuration = Math.max(singleResult.duration, bulkResult.duration);
  
  if (maxDuration > 10000) {
    console.log('🚨 CRITICAL: API is very slow (>10s)');
    console.log('   This explains frontend timeouts');
    console.log('   Recommended actions:');
    console.log('   1. Check email service performance');
    console.log('   2. Optimize database queries');
    console.log('   3. Implement async email sending');
  } else if (maxDuration > 5000) {
    console.log('⚠️  WARNING: API is slow (>5s)');
    console.log('   This may cause user experience issues');
    console.log('   Consider optimizing the invitation process');
  } else {
    console.log('✅ API performance is acceptable');
  }
  
  console.log('');
  console.log('🎯 Target email for manual verification:', TARGET_EMAIL);
  console.log('📧 Check the email inbox to confirm delivery');
}

// Exécuter le script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { loginAndGetTokens, sendInvitation };