#!/usr/bin/env node

/**
 * Test direct de l'API d'invitation avec les tokens obtenus
 */

const fetch = require('node-fetch');

// Tokens obtenus de la connexion précédente
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NmJlMGJiNy05YmM4LTQ0OTktODA2My0wZTQ5ZmQzNWQ3YzUiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJzZXNzaW9uSWQiOiI2NzkyNGE5OS04ZDNlLTQ5ODItOWRmYy1iOWMxMzBmOGU2YTMiLCJpYXQiOjE3NjY1NDQ2MDQsImV4cCI6MTc2NjU0ODIwNCwiYXVkIjoiYXR0ZW5kYW5jZS14LXVzZXJzIiwiaXNzIjoiYXR0ZW5kYW5jZS14In0.gI61T7F-iLCl1Agg_50GGolRCcMNcMzfKxyO6JcZIbk';

const API_BASE_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
const TARGET_EMAIL = 'steveruben2015@hotmail.com';

async function getTenants() {
  console.log('🏢 Getting user tenants...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('Tenants response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Tenants data:', JSON.stringify(data, null, 2));
      return data;
    } else {
      const errorText = await response.text();
      console.log('Tenants error:', errorText);
      return null;
    }
  } catch (error) {
    console.log('Tenants fetch error:', error.message);
    return null;
  }
}

async function testInvitationWithTenant(tenantId) {
  console.log('');
  console.log('📤 Testing invitation with tenant:', tenantId || 'EMPTY');
  
  const invitationData = {
    email: TARGET_EMAIL,
    firstName: 'Steve',
    lastName: 'Ruben',
    tenantRole: 'member',
    department: 'Test Department',
    message: 'Test invitation from direct API test'
  };

  const startTime = Date.now();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    };
    
    // Ajouter le tenant ID seulement s'il existe
    if (tenantId && tenantId !== '') {
      headers['X-Tenant-ID'] = tenantId;
    }

    console.log('Request headers:', headers);
    console.log('Request body:', JSON.stringify(invitationData, null, 2));

    const response = await fetch(`${API_BASE_URL}/user-invitations/invite`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(invitationData),
      timeout: 30000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  Request completed in ${duration}ms`);
    console.log('📥 HTTP Status:', response.status);

    const responseText = await response.text();
    console.log('📥 Raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📥 Parsed response:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('❌ Could not parse response as JSON');
      responseData = { error: 'Invalid JSON response', raw: responseText };
    }

    // Analyser les résultats
    if (response.status === 201) {
      console.log('✅ Invitation sent successfully!');
      console.log(`📧 Email should be sent to: ${TARGET_EMAIL}`);
      
      if (duration < 2000) {
        console.log('🚀 Excellent performance:', duration + 'ms');
      } else if (duration < 5000) {
        console.log('⚡ Good performance:', duration + 'ms');
      } else if (duration < 10000) {
        console.log('⚠️  Slow performance:', duration + 'ms');
      } else {
        console.log('🐌 Very slow performance:', duration + 'ms');
      }
      
      return { success: true, duration, response: responseData };
      
    } else {
      console.log('❌ Request failed with status:', response.status);
      
      if (response.status === 401) {
        console.log('🔐 Authentication failed - token might be expired');
      } else if (response.status === 403) {
        console.log('🚫 Authorization failed - check permissions');
      } else if (response.status === 400) {
        console.log('📝 Validation error - check request data');
      } else if (response.status === 409) {
        console.log('👥 User already exists or has pending invitation');
      }
      
      return { success: false, duration, response: responseData };
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ Request failed after ${duration}ms`);
    console.log('Error:', error.message);
    
    return { success: false, duration, error: error.message };
  }
}

async function main() {
  console.log('🧪 Direct Invitation API Test');
  console.log('=============================');
  console.log('');
  
  // Étape 1: Obtenir les tenants
  const tenantsData = await getTenants();
  
  let tenantId = '';
  if (tenantsData && tenantsData.data && tenantsData.data.length > 0) {
    tenantId = tenantsData.data[0].id || tenantsData.data[0].tenantId;
    console.log('✅ Using tenant ID:', tenantId);
  } else {
    console.log('⚠️  No tenants found, trying without tenant ID');
  }
  
  // Étape 2: Tester l'invitation
  const result = await testInvitationWithTenant(tenantId);
  
  // Résumé
  console.log('');
  console.log('📊 Test Summary');
  console.log('===============');
  
  if (result.success) {
    console.log(`✅ Invitation successful: ${result.duration}ms`);
    console.log(`📧 Check ${TARGET_EMAIL} for the invitation email`);
  } else {
    console.log(`❌ Invitation failed: ${result.duration}ms`);
    if (result.error) {
      console.log('Error:', result.error);
    }
  }
  
  // Si pas de tenant, essayer de créer un tenant de test
  if (!tenantId || tenantId === '') {
    console.log('');
    console.log('🔧 No tenant found. This might be why the invitation failed.');
    console.log('   The user needs to be associated with a tenant to send invitations.');
    console.log('   Try creating a tenant first or using a different user account.');
  }
}

main().catch(console.error);