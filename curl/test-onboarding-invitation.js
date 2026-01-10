const fetch = require('node-fetch');

const API_BASE_URL = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1';
const TEST_EMAIL = 'onboarding-test@example.com';
const TENANT_ID = 'p3z3y56d6nuVx0jir1tc'; // Using working tenant ID from test script
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmExN2E0YS00NTNiLTQxYjAtYTg2YS0yNzlkZTVhZTA2ZWIiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJzZXNzaW9uSWQiOiJlYmE1YWJhOC05MGQxLTQ4NDItODIxMS03YTBjNjMxYzBmNmEiLCJpYXQiOjE3NjY1NTIwOTksImV4cCI6MTc2NjU1NTY5OSwiYXVkIjoiYXR0ZW5kYW5jZS14LXVzZXJzIiwiaXNzIjoiYXR0ZW5kYW5jZS14In0.vIKMl_gam6UpIKDmcyskrD1zbDuelfSvf-L0FqkwH3Y'; // Working token from test script

async function testOnboardingInvitation() {
  console.log('🚀 Testing Onboarding Invitation Fix');
  console.log('=====================================');
  console.log(`📧 Target email: ${TEST_EMAIL}`);
  console.log(`🏢 Tenant ID: ${TENANT_ID}`);
  console.log(`🌐 API URL: ${API_BASE_URL}/user-invitations/bulk-invite`);
  
  const requestData = {
    invitations: [{
      email: TEST_EMAIL,
      firstName: TEST_EMAIL.split('@')[0] || 'User',
      lastName: 'User', // Proper lastName for onboarding
      role: 'user',
      tenantId: TENANT_ID,
      isOnboardingInvitation: true
    }],
    sendWelcomeEmail: true
  };

  console.log('📤 Sending onboarding invitation...');
  console.log('Request data:', JSON.stringify(requestData, null, 2));

  try {
    const response = await fetch(`${API_BASE_URL}/user-invitations/bulk-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'X-Tenant-ID': TENANT_ID
      },
      body: JSON.stringify(requestData)
    });

    const responseData = await response.json();
    
    console.log(`📥 HTTP Status: ${response.status}`);
    console.log('📥 Response:', JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.success) {
      console.log('✅ Onboarding invitation sent successfully!');
      console.log(`📊 Summary: ${responseData.data.summary.successful} successful, ${responseData.data.summary.failed} failed`);
    } else {
      console.log('❌ Onboarding invitation failed');
      console.log('Error:', responseData.error);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testOnboardingInvitation();