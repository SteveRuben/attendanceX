const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function testListEvents() {
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

    console.log('\n📋 Step 2: Trying to list events without tenant header...');
    
    // 2. Try to list events without tenant header
    const eventsResponse = await fetch(`${API_BASE}/v1/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Events response status:', eventsResponse.status);
    const eventsResult = await eventsResponse.text();
    console.log('Events response:', eventsResult);

    console.log('\n📋 Step 3: Trying to list events with tenant header...');
    
    // 3. Try with the tenant header
    const eventsResponse2 = await fetch(`${API_BASE}/v1/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      }
    });

    console.log('Events response status (with tenant):', eventsResponse2.status);
    const eventsResult2 = await eventsResponse2.text();
    console.log('Events response (with tenant):', eventsResult2);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testListEvents();