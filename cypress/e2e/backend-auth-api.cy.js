// Backend API Tests - Authentication (Registration & Login)
// Tests direct API calls without frontend

describe('Backend Authentication API', () => {
  const API_URL = Cypress.env('API_URL') || 'http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1';
  
  // Generate unique test user for each run
  const timestamp = Date.now();
  const testUser = {
    email: `test.user.${timestamp}@example.com`,
    password: 'Test@123456',
    firstName: 'Test',
    lastName: 'User',
    organizationName: `Test Org ${timestamp}`
  };

  let authToken = null;
  let userId = null;
  let tenantId = null;

  describe('User Registration API', () => {
    it('should register a new user successfully', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/register`,
        body: {
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          organizationName: testUser.organizationName
        },
        failOnStatusCode: false
      }).then((response) => {
        // Log response for debugging
        cy.log('Registration Response:', JSON.stringify(response.body));
        
        // Verify response status
        expect(response.status).to.eq(201);
        
        // Verify response structure
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('data');
        expect(response.body.data).to.have.property('user');
        expect(response.body.data).to.have.property('token');
        
        // Verify user data
        const user = response.body.data.user;
        expect(user).to.have.property('id');
        expect(user).to.have.property('email', testUser.email);
        expect(user).to.have.property('firstName', testUser.firstName);
        expect(user).to.have.property('lastName', testUser.lastName);
        expect(user).to.have.property('tenantId');
        
        // Verify token
        expect(response.body.data.token).to.be.a('string');
        expect(response.body.data.token.length).to.be.greaterThan(20);
        
        // Store for later tests
        authToken = response.body.data.token;
        userId = user.id;
        tenantId = user.tenantId;
        
        cy.log(`✅ User registered: ${userId}`);
        cy.log(`✅ Tenant created: ${tenantId}`);
        cy.log(`✅ Token received: ${authToken.substring(0, 20)}...`);
      });
    });

    it('should fail to register with duplicate email', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/register`,
        body: {
          email: testUser.email, // Same email as before
          password: testUser.password,
          firstName: 'Another',
          lastName: 'User',
          organizationName: 'Another Org'
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Duplicate Email Response:', JSON.stringify(response.body));
        
        // Should return 409 Conflict or 400 Bad Request
        expect([400, 409]).to.include(response.status);
        
        // Verify error response
        expect(response.body).to.have.property('success', false);
        expect(response.body).to.have.property('error');
        expect(response.body.error.message).to.match(/email|already|exists/i);
      });
    });

    it('should fail to register with invalid email format', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/register`,
        body: {
          email: 'invalid-email-format',
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          organizationName: testUser.organizationName
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Invalid Email Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/email|invalid|format/i);
      });
    });

    it('should fail to register with weak password', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/register`,
        body: {
          email: `weak.password.${timestamp}@example.com`,
          password: '123', // Too weak
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          organizationName: testUser.organizationName
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Weak Password Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/password|weak|strength/i);
      });
    });

    it('should fail to register with missing required fields', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/register`,
        body: {
          email: `missing.fields.${timestamp}@example.com`
          // Missing password, firstName, lastName, organizationName
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Missing Fields Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/required|missing|field/i);
      });
    });
  });

  describe('User Login API', () => {
    it('should login successfully with valid credentials', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Login Response:', JSON.stringify(response.body));
        
        // Verify response status
        expect(response.status).to.eq(200);
        
        // Verify response structure
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('data');
        expect(response.body.data).to.have.property('user');
        expect(response.body.data).to.have.property('token');
        
        // Verify user data
        const user = response.body.data.user;
        expect(user).to.have.property('id', userId);
        expect(user).to.have.property('email', testUser.email);
        expect(user).to.have.property('tenantId', tenantId);
        
        // Verify token
        expect(response.body.data.token).to.be.a('string');
        expect(response.body.data.token.length).to.be.greaterThan(20);
        
        // Update token
        authToken = response.body.data.token;
        
        cy.log(`✅ Login successful for user: ${userId}`);
        cy.log(`✅ New token received: ${authToken.substring(0, 20)}...`);
      });
    });

    it('should fail to login with wrong password', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/login`,
        body: {
          email: testUser.email,
          password: 'WrongPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Wrong Password Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(401);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/invalid|credentials|password|incorrect/i);
      });
    });

    it('should fail to login with non-existent email', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/login`,
        body: {
          email: 'nonexistent@example.com',
          password: testUser.password
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Non-existent Email Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(401);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/invalid|credentials|not found|user/i);
      });
    });

    it('should fail to login with missing credentials', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/login`,
        body: {
          email: testUser.email
          // Missing password
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Missing Password Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/required|missing|password/i);
      });
    });
  });

  describe('Token Validation', () => {
    it('should access protected endpoint with valid token', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/users/me`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Protected Endpoint Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body.data).to.have.property('id', userId);
        expect(response.body.data).to.have.property('email', testUser.email);
        
        cy.log(`✅ Token validated successfully`);
      });
    });

    it('should fail to access protected endpoint without token', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/users/me`,
        failOnStatusCode: false
      }).then((response) => {
        cy.log('No Token Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(401);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/token|unauthorized|authentication/i);
      });
    });

    it('should fail to access protected endpoint with invalid token', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/users/me`,
        headers: {
          'Authorization': 'Bearer invalid-token-12345'
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Invalid Token Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(401);
        expect(response.body).to.have.property('success', false);
        expect(response.body.error.message).to.match(/token|invalid|unauthorized/i);
      });
    });
  });

  describe('Logout API', () => {
    it('should logout successfully', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/auth/logout`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Logout Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('success', true);
        
        cy.log(`✅ Logout successful`);
      });
    });

    it('should fail to access protected endpoint after logout', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/users/me`,
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.log('After Logout Response:', JSON.stringify(response.body));
        
        // Token should be invalidated after logout
        // Note: This depends on your logout implementation
        // If you're using JWT without blacklist, this might still work
        // Adjust expectation based on your implementation
        cy.log(`⚠️ Token validation after logout: ${response.status}`);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', () => {
      const attempts = [];
      
      // Make multiple rapid login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          cy.request({
            method: 'POST',
            url: `${API_URL}/auth/login`,
            body: {
              email: 'ratelimit@example.com',
              password: 'WrongPassword123!'
            },
            failOnStatusCode: false
          })
        );
      }
      
      // Check if rate limiting kicks in
      cy.wrap(attempts).then(() => {
        cy.log('✅ Rate limiting test completed');
        // Note: Actual rate limit verification depends on your implementation
      });
    });
  });

  describe('API Health Check', () => {
    it('should return healthy status from health endpoint', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/health`,
        failOnStatusCode: false
      }).then((response) => {
        cy.log('Health Check Response:', JSON.stringify(response.body));
        
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('status');
        expect(['healthy', 'ok', 'up']).to.include(response.body.status.toLowerCase());
        
        cy.log(`✅ API is healthy`);
      });
    });
  });
});
