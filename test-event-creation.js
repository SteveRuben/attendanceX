const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function testEventCreation() {
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
    console.log('User ID:', authData.data?.user?.id);

    const accessToken = authData.data?.token;
    const userId = authData.data?.user?.id;

    console.log('\n📅 Step 2: Creating physical event with address...');
    
    const eventData = {
      title: 'Test Physical Event with Address',
      description: 'Event created to test location display',
      type: 'meeting',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1h
      location: {
        type: 'physical',
        name: 'Salle de Conférence A',
        address: {
          street: '123 Rue de la Paix',
          city: 'Paris',
          country: 'FR',
          postalCode: '75001',
          province: 'Île-de-France'
        }
      },
      participants: [userId],
      isPublic: true,
      requiresRegistration: false,
      tags: ['test', 'physical', 'address']
    };

    console.log('Event data:', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch(`${API_BASE}/v1/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      },
      body: JSON.stringify(eventData)
    });

    console.log('Response status:', eventResponse.status);

    const eventResult = await eventResponse.text();
    console.log('Response body:', eventResult);

    if (eventResponse.ok) {
      console.log('✅ Physical event created successfully!');
      const parsedResult = JSON.parse(eventResult);
      console.log('Event ID:', parsedResult.data.id);
      
      // Test getting the event back
      console.log('\n🔍 Step 3: Retrieving event to verify location data...');
      const getResponse = await fetch(`${API_BASE}/v1/events/${parsedResult.data.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
        }
      });
      
      if (getResponse.ok) {
        const eventDetails = await getResponse.json();
        console.log('✅ Event retrieved successfully!');
        console.log('Location data:', JSON.stringify(eventDetails.data.location, null, 2));
      } else {
        console.log('❌ Failed to retrieve event');
      }
    } else {
      console.log('❌ Event creation failed');
      try {
        const errorData = JSON.parse(eventResult);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Raw error:', eventResult);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testEventCreation();