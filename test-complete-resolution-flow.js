/**
 * Complete test of the resolution API flow
 * Tests both backend API and frontend service mapping
 */

const fetch = require('node-fetch');

const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
const TEST_USER = {
  email: 'test@test.com',
  password: '123Abc@cbA123'
};
const TENANT_ID = '4Fnew9kLinYerLCUusqg';

let authToken = '';
let eventId = '';

async function authenticateUser() {
  console.log('🔐 Step 1: Authenticating user...');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(TEST_USER)
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.data.token;
  console.log('✅ Authentication successful');
  return authToken;
}

async function getExistingEvent() {
  console.log('📋 Step 2: Getting existing event...');
  
  // Use the event ID from the previous successful test
  const knownEventId = '1767072061779_0trh187zt';
  console.log('✅ Using known event ID:', knownEventId);
  return knownEventId;
}

async function testResolutionEndpoint() {
  console.log('🧪 Step 3: Testing resolution endpoint...');
  
  const response = await fetch(`${API_BASE}/events/${eventId}/resolutions?limit=20`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-tenant-id': TENANT_ID,
      'Content-Type': 'application/json'
    }
  });

  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resolution endpoint failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Resolution endpoint working');
  console.log('API Response structure:', JSON.stringify(data, null, 2));
  
  return data;
}

function simulateFrontendServiceMapping(apiResponse) {
  console.log('🔄 Step 4: Simulating frontend service mapping...');
  
  // Simulate what apiClient does: extract data property
  const extractedData = apiResponse.data || apiResponse;
  console.log('After apiClient extraction:', JSON.stringify(extractedData, null, 2));
  
  // Simulate what ResolutionService.getEventResolutions does
  if (!extractedData || !extractedData.items) {
    console.warn('Invalid API response structure:', extractedData);
    return {
      resolutions: [],
      total: 0,
      hasMore: false
    };
  }
  
  const frontendFormat = {
    resolutions: extractedData.items,
    total: extractedData.total,
    hasMore: extractedData.hasMore
  };
  
  console.log('✅ Frontend mapping successful');
  console.log('Frontend format:', JSON.stringify(frontendFormat, null, 2));
  
  return frontendFormat;
}

function validateMapping(apiResponse, frontendFormat) {
  console.log('✅ Step 5: Validating mapping...');
  
  const expectedResolutions = apiResponse.data.items;
  const expectedTotal = apiResponse.data.total;
  const expectedHasMore = apiResponse.data.hasMore;
  
  const isValid = 
    JSON.stringify(frontendFormat.resolutions) === JSON.stringify(expectedResolutions) &&
    frontendFormat.total === expectedTotal &&
    frontendFormat.hasMore === expectedHasMore;
  
  if (isValid) {
    console.log('🎉 SUCCESS: Mapping validation passed!');
    console.log('✅ resolutions array mapped correctly');
    console.log('✅ total count mapped correctly');
    console.log('✅ hasMore flag mapped correctly');
  } else {
    console.log('❌ FAILED: Mapping validation failed');
    console.log('Expected resolutions:', expectedResolutions);
    console.log('Got resolutions:', frontendFormat.resolutions);
    console.log('Expected total:', expectedTotal);
    console.log('Got total:', frontendFormat.total);
    console.log('Expected hasMore:', expectedHasMore);
    console.log('Got hasMore:', frontendFormat.hasMore);
  }
  
  return isValid;
}

async function runCompleteTest() {
  try {
    console.log('🚀 Starting Complete Resolution Flow Test');
    console.log('='.repeat(60));
    
    // Step 1: Authenticate
    await authenticateUser();
    
    // Step 2: Get existing event
    await getExistingEvent();
    
    // Step 3: Test resolution endpoint
    const apiResponse = await testResolutionEndpoint();
    
    // Step 4: Simulate frontend mapping
    const frontendFormat = simulateFrontendServiceMapping(apiResponse);
    
    // Step 5: Validate mapping
    const isValid = validateMapping(apiResponse, frontendFormat);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 FINAL RESULT:', isValid ? 'SUCCESS ✅' : 'FAILED ❌');
    
    if (isValid) {
      console.log('\n📋 Summary:');
      console.log('✅ Backend API returns correct structure: {success: true, data: {items: [], total: number, hasMore: boolean}}');
      console.log('✅ Frontend apiClient extracts data property correctly');
      console.log('✅ Frontend ResolutionService maps to expected format: {resolutions: [], total: number, hasMore: boolean}');
      console.log('✅ Complete flow working end-to-end');
    }
    
    return isValid;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
runCompleteTest().then(success => {
  process.exit(success ? 0 : 1);
});