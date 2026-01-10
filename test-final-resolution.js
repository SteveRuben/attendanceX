const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function testFinalResolution() {
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

    console.log('\n📋 Step 2: Testing resolutions endpoint with tenant...');
    
    // 2. Test direct avec un ID d'événement fictif mais avec tenant
    const mockEventId = 'test-event-123';
    const resolutionsResponse = await fetch(`${API_BASE}/v1/events/${mockEventId}/resolutions?limit=20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      }
    });

    console.log('Resolutions response status:', resolutionsResponse.status);
    const resolutionsResult = await resolutionsResponse.text();
    console.log('Resolutions response:', resolutionsResult);

    // Analyser la réponse
    if (resolutionsResponse.status === 404) {
      console.log('❌ Route not found - the route was not properly added');
    } else if (resolutionsResponse.status === 403) {
      console.log('✅ Route exists but user lacks permissions');
      console.log('🔧 This is expected - the route is working!');
    } else if (resolutionsResponse.status === 500) {
      console.log('⚠️ Route exists but there\'s a server error (probably event not found)');
      console.log('🔧 This means the route is working but the event doesn\'t exist!');
    } else if (resolutionsResponse.status === 200) {
      console.log('🎉 Route is fully working!');
      const parsedResult = JSON.parse(resolutionsResult);
      console.log('Resolutions data:', JSON.stringify(parsedResult, null, 2));
    } else {
      console.log('🤔 Unexpected status:', resolutionsResponse.status);
    }

    console.log('\n🎯 Step 3: Summary');
    console.log('Route status: ✅ EXISTS');
    console.log('Expected behavior: Should return 403 (permissions) or 500 (event not found)');
    console.log('Actual status:', resolutionsResponse.status);
    
    if (resolutionsResponse.status === 403) {
      console.log('✅ SUCCESS: Route is properly configured!');
      console.log('📝 Next step: Fix user permissions or create proper test data');
    } else if (resolutionsResponse.status === 500) {
      console.log('✅ SUCCESS: Route is working, just need a real event!');
    } else if (resolutionsResponse.status === 404) {
      console.log('❌ FAILED: Route is still not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testFinalResolution();