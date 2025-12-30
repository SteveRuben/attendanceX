const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function testResolutionWithExistingEvent() {
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

    console.log('\n📅 Step 2: Creating a simple event first...');
    
    // 2. Créer un événement simple avec des permissions minimales
    const eventData = {
      title: 'Simple Test Event',
      description: 'Simple event for testing',
      type: 'meeting',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      location: {
        type: 'physical',
        name: 'Test Room'
      },
      participants: [userId],
      isPublic: true
    };

    // Essayons sans tenant ID d'abord
    const eventResponse = await fetch(`${API_BASE}/v1/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    console.log('Event creation status:', eventResponse.status);
    const eventResult = await eventResponse.text();
    console.log('Event creation response:', eventResult);

    if (eventResponse.ok) {
      const eventData = JSON.parse(eventResult);
      const eventId = eventData.data.id;
      console.log('✅ Event created:', eventId);

      console.log('\n📋 Step 3: Testing resolutions endpoint...');
      
      // 3. Test de l'endpoint des résolutions
      const resolutionsResponse = await fetch(`${API_BASE}/v1/events/${eventId}/resolutions?limit=20`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Resolutions response status:', resolutionsResponse.status);
      const resolutionsResult = await resolutionsResponse.text();
      console.log('Resolutions response:', resolutionsResult);

      if (resolutionsResponse.ok) {
        console.log('✅ Resolutions endpoint working!');
        const parsedResult = JSON.parse(resolutionsResult);
        console.log('Resolutions data:', JSON.stringify(parsedResult, null, 2));
      } else {
        console.log('❌ Resolutions endpoint failed');
      }
    } else {
      console.log('❌ Event creation failed, trying with mock event ID...');
      
      // 4. Test avec un ID d'événement fictif pour voir si la route existe
      console.log('\n🔧 Step 4: Testing with mock event ID...');
      
      const mockEventId = 'test-event-123';
      const resolutionsResponse = await fetch(`${API_BASE}/v1/events/${mockEventId}/resolutions?limit=20`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Mock resolutions response status:', resolutionsResponse.status);
      const resolutionsResult = await resolutionsResponse.text();
      console.log('Mock resolutions response:', resolutionsResult);

      // Si on obtient autre chose qu'une 404, cela signifie que la route existe
      if (resolutionsResponse.status !== 404) {
        console.log('✅ Route exists! Status:', resolutionsResponse.status);
      } else {
        console.log('❌ Route not found (404)');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testResolutionWithExistingEvent();