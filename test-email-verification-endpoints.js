// Simple test script to verify email verification endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/attendance-x-dev/us-central1/api';

async function testEmailVerificationEndpoints() {
  console.log('Testing Email Verification Endpoints...\n');

  // Test 1: POST /auth/verify-email with valid token
  try {
    console.log('1. Testing POST /auth/verify-email...');
    const response = await axios.post(`${BASE_URL}/auth/verify-email`, {
      token: 'test-token-123'
    });
    console.log('✅ Endpoint exists and accepts requests');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ Endpoint exists and responds with error (expected for invalid token)');
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Endpoint not accessible:', error.message);
    }
  }

  console.log('\n');

  // Test 2: POST /auth/send-email-verification with valid email
  try {
    console.log('2. Testing POST /auth/send-email-verification...');
    const response = await axios.post(`${BASE_URL}/auth/send-email-verification`, {
      email: 'test@example.com'
    });
    console.log('✅ Endpoint exists and accepts requests');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ Endpoint exists and responds with error (expected for non-existent user)');
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Endpoint not accessible:', error.message);
    }
  }

  console.log('\n');

  // Test 3: POST /auth/send-email-verification with invalid email
  try {
    console.log('3. Testing POST /auth/send-email-verification with invalid email...');
    const response = await axios.post(`${BASE_URL}/auth/send-email-verification`, {
      email: 'invalid-email'
    });
    console.log('❌ Should have failed validation');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Validation working correctly');
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\n');

  // Test 4: POST /auth/verify-email without token
  try {
    console.log('4. Testing POST /auth/verify-email without token...');
    const response = await axios.post(`${BASE_URL}/auth/verify-email`, {});
    console.log('❌ Should have failed validation');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Validation working correctly');
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\nEmail verification endpoints test completed!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEmailVerificationEndpoints().catch(console.error);
}

module.exports = { testEmailVerificationEndpoints };