const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function testResolutionsWithNewEvent() {
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

    console.log('\n📅 Step 2: Creating a new event...');
    
    // 2. Créer un nouvel événement
    const eventData = {
      title: 'Test Event for Resolutions',
      description: 'Event created to test resolutions functionality',
      type: 'meeting', // Important: doit être un meeting pour les résolutions
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      location: {
        type: 'physical',
        name: 'Meeting Room',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          country: 'FR'
        }
      },
      participants: [userId],
      isPublic: true,
      tags: ['test', 'resolutions']
    };

    const eventResponse = await fetch(`${API_BASE}/v1/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      },
      body: JSON.stringify(eventData)
    });

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      console.log('❌ Event creation failed:', errorText);
      return;
    }

    const eventResult = await eventResponse.json();
    const eventId = eventResult.data.id;
    console.log('✅ Event created:', eventId);

    console.log('\n📋 Step 3: Testing resolutions endpoint...');
    
    // 3. Test de l'endpoint des résolutions
    const resolutionsResponse = await fetch(`${API_BASE}/v1/events/${eventId}/resolutions?limit=20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      }
    });

    console.log('Resolutions response status:', resolutionsResponse.status);

    const resolutionsResult = await resolutionsResponse.text();
    console.log('Resolutions response body:', resolutionsResult);

    if (resolutionsResponse.ok) {
      console.log('✅ Resolutions endpoint working!');
      const parsedResult = JSON.parse(resolutionsResult);
      console.log('Resolutions count:', parsedResult.data?.length || 0);
    } else {
      console.log('❌ Resolutions endpoint failed');
      
      if (resolutionsResponse.status === 403) {
        console.log('🔒 Permission issue - user may not have view_resolutions permission');
        
        // Test de création d'une résolution pour voir si on a create_resolutions
        console.log('\n📝 Step 4: Testing resolution creation...');
        
        const createResolutionData = {
          title: 'Test Resolution',
          description: 'This is a test resolution to verify the endpoint works',
          assignedTo: [userId],
          priority: 'medium',
          tags: ['test']
        };

        const createResponse = await fetch(`${API_BASE}/v1/events/${eventId}/resolutions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
          },
          body: JSON.stringify(createResolutionData)
        });

        console.log('Create resolution status:', createResponse.status);
        const createResult = await createResponse.text();
        console.log('Create resolution response:', createResult);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testResolutionsWithNewEvent();