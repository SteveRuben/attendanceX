const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';

async function testSimpleResolution() {
  try {
    console.log('🔍 Step 1: Testing available routes...');
    
    // 1. Test des routes disponibles
    const routesResponse = await fetch(`${API_BASE}/v1/`, {
      method: 'GET'
    });

    console.log('Routes response status:', routesResponse.status);
    const routesResult = await routesResponse.text();
    console.log('Routes response:', routesResult);

    console.log('\n📋 Step 2: Testing resolutions route directly...');
    
    // 2. Test direct de la route résolutions (sans auth pour voir si elle existe)
    const resolutionsResponse = await fetch(`${API_BASE}/v1/resolutions/stats`, {
      method: 'GET'
    });

    console.log('Resolutions stats response status:', resolutionsResponse.status);
    const resolutionsResult = await resolutionsResponse.text();
    console.log('Resolutions stats response:', resolutionsResult);

    console.log('\n🎯 Step 3: Testing events route structure...');
    
    // 3. Test de la structure des routes d'événements
    const eventsResponse = await fetch(`${API_BASE}/v1/events`, {
      method: 'GET'
    });

    console.log('Events response status:', eventsResponse.status);
    const eventsResult = await eventsResponse.text();
    console.log('Events response (first 500 chars):', eventsResult.substring(0, 500));

    console.log('\n🔧 Step 4: Testing specific event resolutions route...');
    
    // 4. Test direct de la route résolutions d'événement (sans auth)
    const eventResolutionsResponse = await fetch(`${API_BASE}/v1/events/test-id/resolutions`, {
      method: 'GET'
    });

    console.log('Event resolutions response status:', eventResolutionsResponse.status);
    const eventResolutionsResult = await eventResolutionsResponse.text();
    console.log('Event resolutions response:', eventResolutionsResult);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testSimpleResolution();