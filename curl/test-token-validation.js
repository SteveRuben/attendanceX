const fetch = require('node-fetch');

const API_BASE_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';

// Test token from the user's error message
const TEST_TOKEN = '8f0ab14750a9cafa4148f72e9893ec9fc08486e9f4a6047245cb8b6f90cd20a0';

async function testTokenValidation() {
  console.log('🔍 Testing Token Validation');
  console.log('============================');
  console.log(`🎫 Token: ${TEST_TOKEN}`);
  console.log(`🌐 API URL: ${API_BASE_URL}/public/invitations/validate/${TEST_TOKEN}`);
  console.log('');

  try {
    const response = await fetch(`${API_BASE_URL}/public/invitations/validate/${TEST_TOKEN}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();
    
    console.log(`📥 HTTP Status: ${response.status}`);
    console.log('📥 Response:', JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.success) {
      console.log('✅ Token is valid!');
      console.log(`📧 Email: ${responseData.data.email}`);
      console.log(`👤 Name: ${responseData.data.firstName} ${responseData.data.lastName}`);
      console.log(`🏢 Organization: ${responseData.data.organizationName}`);
      console.log(`⏰ Expires: ${responseData.data.expiresAt}`);
    } else {
      console.log('❌ Token validation failed');
      console.log('Error:', responseData.error);
      
      if (responseData.error === 'Invalid invitation token') {
        console.log('💡 The token does not exist in the database');
      } else if (responseData.error === 'Invitation token expired') {
        console.log('💡 The token has expired');
      } else if (responseData.error === 'Invitation token already used') {
        console.log('💡 The token has already been used');
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔌 Firebase emulators are not running!');
    }
  }
}

testTokenValidation();