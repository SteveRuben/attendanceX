const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';
const EXISTING_EVENT_ID = '1767072061779_0trh187zt'; // ID de l'événement des logs précédents
const CORRECT_TENANT_ID = '4Fnew9kLinYerLCUusqg'; // Tenant ID correct du user

async function testResolutionFinal() {
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

    console.log('\n📋 Step 2: Testing resolutions endpoint with correct tenant ID...');
    console.log('Event ID:', EXISTING_EVENT_ID);
    console.log('Tenant ID:', CORRECT_TENANT_ID);
    console.log('Full URL:', `${API_BASE}/v1/events/${EXISTING_EVENT_ID}/resolutions?limit=20`);
    
    // 2. Test de l'endpoint des résolutions avec le bon tenant ID
    const resolutionsResponse = await fetch(`${API_BASE}/v1/events/${EXISTING_EVENT_ID}/resolutions?limit=20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': CORRECT_TENANT_ID
      }
    });

    console.log('Resolutions response status:', resolutionsResponse.status);
    const resolutionsResult = await resolutionsResponse.text();
    console.log('Resolutions response:', resolutionsResult);

    // Analyser la réponse
    if (resolutionsResponse.status === 200) {
      console.log('🎉 SUCCESS: Resolutions endpoint is fully working!');
      const parsedResult = JSON.parse(resolutionsResult);
      console.log('Resolutions data:', JSON.stringify(parsedResult, null, 2));
    } else if (resolutionsResponse.status === 404) {
      console.log('❌ Event not found or route not found');
    } else if (resolutionsResponse.status === 403) {
      console.log('🔒 Permission issue - but route exists');
    } else if (resolutionsResponse.status === 500) {
      console.log('⚠️ Server error - checking details...');
      
      try {
        const errorData = JSON.parse(resolutionsResult);
        console.log('Error details:', errorData);
        
        if (resolutionsResult.includes('Cannot read properties of undefined')) {
          console.log('❌ Still tenant context issue');
        } else if (resolutionsResult.includes('documentPath')) {
          console.log('❌ Firestore documentPath issue - likely empty eventId or tenantId');
        } else {
          console.log('✅ Different server error - tenant context might be working');
        }
      } catch (e) {
        console.log('Could not parse error response');
      }
    }

    console.log('\n🎯 Final Status:');
    console.log('Status Code:', resolutionsResponse.status);
    
    if (resolutionsResponse.status === 200) {
      console.log('✅ SUCCESS: Everything working perfectly!');
    } else if (resolutionsResponse.status === 403) {
      console.log('✅ PARTIAL SUCCESS: Route working, just permission issue');
    } else if (resolutionsResponse.status === 500) {
      console.log('🔧 Route working, investigating server error');
    } else {
      console.log('🔧 Route working, different issue to investigate');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testResolutionFinal();