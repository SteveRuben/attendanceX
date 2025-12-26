const fetch = require('node-fetch');

const API_BASE_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
const TEST_EMAIL = 'test@test.com'; // Email existant dans le système

async function testForgotPassword() {
  console.log('🔍 Testing Forgot Password API');
  console.log('===============================');
  console.log(`📧 Test email: ${TEST_EMAIL}`);
  console.log(`🌐 API URL: ${API_BASE_URL}/auth/forgot-password`);
  console.log('');

  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_EMAIL
      })
    });

    const responseData = await response.json();
    
    console.log(`📥 HTTP Status: ${response.status}`);
    console.log('📥 Response:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ API call successful!');
      console.log('📧 Check if email was sent...');
      
      // Vérifier les logs des émulateurs pour voir si l'email a été traité
      console.log('');
      console.log('🔍 Next steps to debug:');
      console.log('1. Check Firebase emulator logs for email processing');
      console.log('2. Check if email service is configured correctly');
      console.log('3. Verify email templates exist');
      console.log('4. Check notification service logs');
      
    } else {
      console.log('❌ API call failed');
      console.log('Error:', responseData.error || responseData.message);
      
      if (response.status === 429) {
        console.log('💡 Rate limited - too many requests');
      } else if (response.status === 400) {
        console.log('💡 Bad request - check email format');
      } else if (response.status === 404) {
        console.log('💡 Endpoint not found - check route configuration');
      }
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔌 Firebase emulators are not running!');
      console.log('Start them with: npm run dev:backend');
    }
  }
}

testForgotPassword();