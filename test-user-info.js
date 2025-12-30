const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function testUserInfo() {
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
    console.log('Auth data:', JSON.stringify(authData, null, 2));

    const accessToken = authData.data?.token;

    console.log('\n👤 Step 2: Getting user profile...');
    
    // 2. Get user profile to see tenant info
    const profileResponse = await fetch(`${API_BASE}/v1/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Profile response status:', profileResponse.status);
    const profileResult = await profileResponse.text();
    console.log('Profile response:', profileResult);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testUserInfo();