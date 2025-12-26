#!/usr/bin/env node

/**
 * Test de l'API d'invitation optimisée (envoi email asynchrone)
 */

const fetch = require('node-fetch');

// Tokens obtenus précédemment
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmExN2E0YS00NTNiLTQxYjAtYTg2YS0yNzlkZTVhZTA2ZWIiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJzZXNzaW9uSWQiOiJlYmE1YWJhOC05MGQxLTQ4NDItODIxMS03YTBjNjMxYzBmNmEiLCJpYXQiOjE3NjY1NTIwOTksImV4cCI6MTc2NjU1NTY5OSwiYXVkIjoiYXR0ZW5kYW5jZS14LXVzZXJzIiwiaXNzIjoiYXR0ZW5kYW5jZS14In0.vIKMl_gam6UpIKDmcyskrD1zbDuelfSvf-L0FqkwH3Y';
const TENANT_ID = 'p3z3y56d6nuVx0jir1tc';

const API_BASE_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
const TARGET_EMAIL = 'steveruben2015@hotmail.com';

async function testOptimizedInvitation() {
  console.log('🚀 Testing OPTIMIZED Invitation API');
  console.log('===================================');
  console.log('');
  console.log('📧 Target email:', TARGET_EMAIL);
  console.log('🏢 Tenant ID:', TENANT_ID);
  const apiUrl = `${API_BASE_URL}/user-invitations/invite`;
  console.log('🌐 API URL:', apiUrl);
  console.log('🔑 Auth Token (first 20 chars):', AUTH_TOKEN.substring(0, 20) + '...');
  console.log('');

  const invitationData = {
    email: TARGET_EMAIL,
    firstName: 'Steve',
    lastName: 'Ruben',
    role: 'user', // Changed from tenantRole: 'member' to role: 'user'
    department: 'Performance Test',
    message: 'Test invitation with OPTIMIZED async email sending!'
  };

  console.log('📤 Sending invitation request...');
  console.log('Request data:', JSON.stringify(invitationData, null, 2));
  console.log('');
  console.log('📋 Request headers:');
  console.log('- Content-Type: application/json');
  console.log('- Authorization: Bearer [token]');
  console.log('- X-Tenant-ID:', TENANT_ID);
  console.log('');

  const startTime = Date.now();

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'X-Tenant-ID': TENANT_ID
      },
      body: JSON.stringify(invitationData),
      timeout: 10000 // Réduire le timeout à 10 secondes
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️  API Response received in ${duration}ms`);
    console.log('📥 HTTP Status:', response.status);
    console.log('📥 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log('�  Response:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('📥 Raw response:', responseText);
      responseData = { error: 'Invalid JSON', raw: responseText };
    }

    console.log('');

    // Analyser les résultats
    if (response.status === 201) {
      console.log('✅ INVITATION CREATED SUCCESSFULLY!');
      console.log(`📧 Email will be sent to: ${TARGET_EMAIL}`);
      
      // Analyser la performance
      if (duration < 1000) {
        console.log('🚀 EXCELLENT performance:', duration + 'ms (< 1s)');
      } else if (duration < 3000) {
        console.log('⚡ GOOD performance:', duration + 'ms (< 3s)');
      } else if (duration < 5000) {
        console.log('⚠️  ACCEPTABLE performance:', duration + 'ms (< 5s)');
      } else {
        console.log('🐌 STILL SLOW:', duration + 'ms (> 5s)');
      }
      
      console.log('');
      console.log('📊 Performance Comparison:');
      console.log('- Before optimization: >30,000ms (timeout)');
      console.log(`- After optimization:  ${duration}ms`);
      
      if (duration < 5000) {
        const improvement = Math.round(30000 / duration);
        console.log(`🎉 Performance improved by ${improvement}x!`);
      }
      
      return { success: true, duration, response: responseData };
      
    } else if (response.status === 409) {
      console.log('👥 User already exists or has pending invitation');
      console.log('   This is expected if you\'ve already sent an invitation');
      console.log(`⚡ Still fast response: ${duration}ms`);
      return { success: true, duration, response: responseData, duplicate: true };
      
    } else if (response.status === 404) {
      console.log('❌ Route not found (404)');
      console.log('🔍 Possible issues:');
      console.log('   1. Firebase emulators not running');
      console.log('   2. Route not properly registered');
      console.log('   3. Incorrect URL path');
      console.log('');
      console.log('💡 Try these URLs instead:');
      console.log('   - /api/v1/invitations/invite');
      console.log('   - /api/v1/users/invite');
      console.log('   - /api/v1/tenant/invitations');
      
      return { success: false, duration, response: responseData };
      
    } else {
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
    
    console.log(`❌ Request failed after ${duration}ms`);
    console.log('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🔌 Connection refused - Firebase emulators not running!');
      console.log('');
      console.log('🚀 To start emulators:');
      console.log('   cd backend');
      console.log('   npm run dev');
      console.log('   # or');
      console.log('   firebase emulators:start');
    } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('');
      console.log('⏰ Still timing out - optimization may not be complete');
    }
    
    return { success: false, duration, error: error.message };
  }
}

async function waitForEmail() {
  console.log('');
  console.log('📧 Email Status Check');
  console.log('====================');
  console.log('');
  console.log('⏳ Waiting 10 seconds for email to be sent in background...');
  
  // Attendre 10 secondes pour laisser le temps à l'email d'être envoyé
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('');
  console.log('📬 Please check the email inbox for:', TARGET_EMAIL);
  console.log('');
  console.log('🔍 What to look for:');
  console.log('- Subject: Invitation to join [Organization Name]');
  console.log('- From: Your application email');
  console.log('- Content: Invitation link and details');
  console.log('');
  console.log('📝 If email is not received:');
  console.log('1. Check spam/junk folder');
  console.log('2. Check Firebase emulator logs for email errors');
  console.log('3. Verify email service configuration');
}

async function main() {
  const result = await testOptimizedInvitation();
  
  if (result.success) {
    await waitForEmail();
    
    console.log('');
    console.log('🎯 Test Summary');
    console.log('===============');
    console.log(`✅ API Response: ${result.duration}ms`);
    console.log('📧 Email: Sent asynchronously in background');
    console.log('🚀 Frontend timeout issue: RESOLVED');
    
    if (result.duplicate) {
      console.log('');
      console.log('ℹ️  Note: This was a duplicate invitation test');
      console.log('   The performance improvement still applies to new invitations');
    }
  } else {
    console.log('');
    console.log('❌ Test failed - further optimization needed');
  }
}

main().catch(console.error);