const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function testUserTenantInfo() {
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
    const userId = authData.data?.user?.id;

    console.log('User ID:', userId);
    console.log('User tenant info:', {
      tenantId: authData.data?.user?.tenantId,
      activeTenantId: authData.data?.user?.activeTenantId,
      tenantMemberships: authData.data?.user?.tenantMemberships
    });

    console.log('\n🏢 Step 2: Trying to get tenant info...');
    
    // 2. Try to get tenant info
    const tenantResponse = await fetch(`${API_BASE}/v1/tenants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Tenant response status:', tenantResponse.status);
    const tenantResult = await tenantResponse.text();
    console.log('Tenant response:', tenantResult);

    console.log('\n📋 Step 3: Trying to get event details to see tenant info...');
    
    // 3. Get event details to see what tenant it belongs to
    const eventResponse = await fetch(`${API_BASE}/v1/events/1767072061779_0trh187zt`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Event response status:', eventResponse.status);
    const eventResult = await eventResponse.text();
    console.log('Event response:', eventResult);

    // Try to parse and extract tenant info
    if (eventResponse.status === 200) {
      try {
        const eventData = JSON.parse(eventResult);
        console.log('\n🎯 Event tenant info:');
        console.log('Event tenantId:', eventData.data?.tenantId);
        console.log('Event organizerId:', eventData.data?.organizerId);
      } catch (e) {
        console.log('Could not parse event data');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testUserTenantInfo();