const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://127.0.0.1:5001/attendance-management-syst/europe-west1/api';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = '123Abc@cbA123';

async function fixUserPermissions() {
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

    console.log('\n👤 Step 2: Checking user profile...');
    
    // 2. Vérifier le profil utilisateur
    const profileResponse = await fetch(`${API_BASE}/v1/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      }
    });

    console.log('Profile response status:', profileResponse.status);
    const profileResult = await profileResponse.text();
    console.log('Profile response:', profileResult);

    if (profileResponse.ok) {
      const profile = JSON.parse(profileResult);
      console.log('✅ User profile:', JSON.stringify(profile, null, 2));
    }

    console.log('\n🏢 Step 3: Checking tenant membership...');
    
    // 3. Vérifier l'appartenance au tenant
    const tenantResponse = await fetch(`${API_BASE}/v1/tenants/4uJXznWbY7TzBdSykg5K/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      }
    });

    console.log('Tenant users response status:', tenantResponse.status);
    const tenantResult = await tenantResponse.text();
    console.log('Tenant users response:', tenantResult);

    console.log('\n🔑 Step 4: Trying to add user to tenant as owner...');
    
    // 4. Essayer d'ajouter l'utilisateur au tenant avec le rôle owner
    const addUserData = {
      email: TEST_EMAIL,
      role: 'owner',
      firstName: 'Test',
      lastName: 'User'
    };

    const addUserResponse = await fetch(`${API_BASE}/v1/tenants/4uJXznWbY7TzBdSykg5K/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '4uJXznWbY7TzBdSykg5K'
      },
      body: JSON.stringify(addUserData)
    });

    console.log('Add user response status:', addUserResponse.status);
    const addUserResult = await addUserResponse.text();
    console.log('Add user response:', addUserResult);

    // Alternative: essayer de créer un nouveau tenant avec cet utilisateur
    console.log('\n🏗️ Step 5: Creating new tenant for test user...');
    
    const newTenantData = {
      organizationName: 'Test Organization for Resolutions',
      adminEmail: TEST_EMAIL,
      adminFirstName: 'Test',
      adminLastName: 'User',
      adminPassword: TEST_PASSWORD,
      selectedPlan: 'free',
      billingCycle: 'monthly',
      timezone: 'Europe/Paris',
      language: 'fr',
      currency: 'EUR',
      termsAccepted: 'true',
      privacyAccepted: 'true'
    };

    const createTenantResponse = await fetch(`${API_BASE}/public/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTenantData)
    });

    console.log('Create tenant response status:', createTenantResponse.status);
    const createTenantResult = await createTenantResponse.text();
    console.log('Create tenant response:', createTenantResult);

    if (createTenantResponse.ok) {
      const tenantData = JSON.parse(createTenantResult);
      console.log('✅ New tenant created:', tenantData.data?.tenantId);
      console.log('🎯 Use this tenant ID for testing:', tenantData.data?.tenantId);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
fixUserPermissions();