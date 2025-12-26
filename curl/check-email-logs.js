const fetch = require('node-fetch');

const API_BASE_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
const TEST_EMAIL = 'test@test.com';

async function testForgotPasswordWithLogs() {
  console.log('🔍 Testing Forgot Password with Email Logs');
  console.log('==========================================');
  console.log(`📧 Test email: ${TEST_EMAIL}`);
  console.log('');
  
  console.log('⚠️  IMPORTANT: Watch the Firebase emulator console for email logs!');
  console.log('🔍 Look for these log messages:');
  console.log('   - "📧 EMAIL SIMULATION MODE - Email not actually sent!"');
  console.log('   - "📧 Email details:"');
  console.log('   - "📧 Email content preview:"');
  console.log('   - Reset link with token');
  console.log('');

  try {
    // Wait a bit to let rate limit reset
    console.log('⏳ Waiting 5 seconds for rate limit to reset...');
    await new Promise(resolve => setTimeout(resolve, 5000));

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
      console.log('');
      console.log('🔍 NOW CHECK THE FIREBASE EMULATOR CONSOLE:');
      console.log('   1. Open the terminal where you ran "npm run dev:backend"');
      console.log('   2. Look for email simulation logs');
      console.log('   3. Find the reset token in the logs');
      console.log('   4. Use the token to test the reset password page');
      console.log('');
      console.log('💡 The email is simulated in development mode');
      console.log('💡 In production, real emails would be sent via SendGrid/Mailgun');
      
    } else if (response.status === 429) {
      console.log('❌ Still rate limited. Try again in a few minutes.');
      console.log('💡 Or restart the Firebase emulators to reset rate limits');
      
    } else {
      console.log('❌ API call failed');
      console.log('Error:', responseData.error || responseData.message);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testForgotPasswordWithLogs();