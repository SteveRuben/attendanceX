const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';
const CORRECT_TENANT_ID = '4Fnew9kLinYerLCUusqg';

async function testTenantMembership() {
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
    
    console.log('User ID:', userId);
    console.log('User tenant info from auth:', {
      tenantId: authData.data?.user?.tenantId,
      activeTenantId: authData.data?.user?.activeTenantId
    });

    console.log('\n🏢 Step 2: Getting user tenants...');
    
    // 2. Get user tenants to verify membership
    const tenantsResponse = await fetch(`${API_BASE}/v1/tenants`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Tenants response status:', tenantsResponse.status);
    if (tenantsResponse.status === 200) {
      const tenantsData = await tenantsResponse.json();
      console.log('User tenants:', JSON.stringify(tenantsData.data, null, 2));
      
      // Check if the user has access to the correct tenant
      const hasCorrectTenant = tenantsData.data.some(tenant => tenant.id === CORRECT_TENANT_ID);
      console.log(`User has access to tenant ${CORRECT_TENANT_ID}:`, hasCorrectTenant);
      
      if (hasCorrectTenant) {
        const correctTenant = tenantsData.data.find(tenant => tenant.id === CORRECT_TENANT_ID);
        console.log('Correct tenant details:', JSON.stringify(correctTenant, null, 2));
      }
    } else {
      const errorText = await tenantsResponse.text();
      console.log('Tenants error:', errorText);
    }

    console.log('\n🔍 Step 3: Testing resolution endpoint with detailed headers...');
    
    // 3. Test resolution endpoint with all possible headers
    const resolutionResponse = await fetch(`${API_BASE}/v1/events/1767072061779_0trh187zt/resolutions?limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': CORRECT_TENANT_ID,
        'X-Tenant-ID': CORRECT_TENANT_ID, // Try uppercase version
        'tenantId': CORRECT_TENANT_ID,    // Try without x- prefix
        'User-Agent': 'test-client'
      }
    });

    console.log('Resolution response status:', resolutionResponse.status);
    const resolutionText = await resolutionResponse.text();
    console.log('Resolution response:', resolutionText);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testTenantMembership();