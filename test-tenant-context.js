const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';
const CORRECT_TENANT_ID = '4Fnew9kLinYerLCUusqg';

async function testTenantContext() {
  try {
    console.log('🔐 Step 1: Authenticating user...');
    
    // 1. Authentification
    const authResponse = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status} ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    console.log('✅ Authentication successful');

    const accessToken = authData.data?.token;

    console.log('\n🏢 Step 2: Testing tenant context with events endpoint...');
    
    // 2. Test tenant context with events endpoint (which works)
    const eventsResponse = await fetch(`${API_BASE}/v1/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': CORRECT_TENANT_ID
      }
    });

    console.log('Events response status:', eventsResponse.status);
    if (eventsResponse.status === 200) {
      console.log('✅ Events endpoint works with tenant context');
    } else {
      console.log('❌ Events endpoint failed with tenant context');
      const errorText = await eventsResponse.text();
      console.log('Error:', errorText);
    }

    console.log('\n🔍 Step 3: Testing a simple endpoint that requires tenant context...');
    
    // 3. Test with a simpler endpoint that uses tenant context
    const usersResponse = await fetch(`${API_BASE}/v1/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': CORRECT_TENANT_ID
      }
    });

    console.log('Users response status:', usersResponse.status);
    if (usersResponse.status === 200) {
      console.log('✅ Users endpoint works with tenant context');
    } else {
      console.log('❌ Users endpoint failed with tenant context');
      const errorText = await usersResponse.text();
      console.log('Error:', errorText);
    }

    console.log('\n🎯 Step 4: Testing without tenant header...');
    
    // 4. Test without tenant header to see what happens
    const noTenantResponse = await fetch(`${API_BASE}/v1/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('No tenant header response status:', noTenantResponse.status);
    if (noTenantResponse.status === 200) {
      console.log('✅ Events work without tenant header (not using tenant middleware)');
    } else {
      console.log('❌ Events require tenant header');
      const errorText = await noTenantResponse.text();
      console.log('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testTenantContext();