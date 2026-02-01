# Cypress Backend Authentication Tests - Ready to Run

## ✅ Test Setup Complete

### Files Created
1. **`cypress/e2e/backend-auth-api.cy.js`** - Comprehensive backend API tests
2. **`test-backend-auth.sh`** - Automated test execution script

### Test Coverage

#### 1. User Registration API Tests
- ✅ Successful registration with all required fields
- ✅ Duplicate email rejection (409 Conflict)
- ✅ Invalid email format validation (400 Bad Request)
- ✅ Weak password rejection (400 Bad Request)
- ✅ Missing required fields validation (400 Bad Request)

#### 2. User Login API Tests
- ✅ Successful login with valid credentials
- ✅ Wrong password rejection (401 Unauthorized)
- ✅ Non-existent email rejection (401 Unauthorized)
- ✅ Missing credentials validation (400 Bad Request)

#### 3. Token Validation Tests
- ✅ Access protected endpoint with valid token
- ✅ Reject access without token (401 Unauthorized)
- ✅ Reject access with invalid token (401 Unauthorized)

#### 4. Logout API Tests
- ✅ Successful logout
- ✅ Token invalidation after logout

#### 5. Rate Limiting Tests
- ✅ Rate limiting enforcement on login attempts

#### 6. API Health Check Tests
- ✅ Health endpoint returns healthy status

### API Endpoints Tested

Based on the backend routes analysis:

```
POST /api/v1/auth/register     - User registration
POST /api/v1/auth/login        - User login
POST /api/v1/auth/logout       - User logout
POST /api/v1/auth/refresh-token - Token refresh
GET  /api/v1/users/me          - Get current user (protected)
GET  /api/v1/health            - Health check
```

### Test Configuration

**API URL**: `http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1`

**Firebase Emulators**:
- Functions: Port 5001
- Firestore: Port 8080
- Auth: Port 9099

**Unique Test Data**: Each test run generates unique users with timestamp to avoid conflicts

### How to Run Tests

#### Option 1: Using the Shell Script (Recommended)

```bash
# Make the script executable (first time only)
chmod +x test-backend-auth.sh

# Run the tests
./test-backend-auth.sh
```

The script will:
1. Build backend functions
2. Start Firebase emulators
3. Run Cypress tests
4. Stop emulators
5. Report results

#### Option 2: Manual Execution

```bash
# Terminal 1: Start Firebase emulators
cd backend
firebase emulators:start --only functions,firestore,auth

# Terminal 2: Run Cypress tests
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js" --headless

# Or with Cypress UI
npx cypress open
```

### Expected Test Results

All tests should pass with the following validations:

1. **Registration**:
   - Returns 201 status
   - Includes user object with id, email, firstName, lastName, tenantId
   - Includes JWT token
   - Creates tenant automatically

2. **Login**:
   - Returns 200 status
   - Includes user object matching registration
   - Includes new JWT token
   - Validates credentials correctly

3. **Token Validation**:
   - Protected endpoints require valid token
   - Invalid/missing tokens return 401
   - Token format validated

4. **Logout**:
   - Returns 200 status
   - Invalidates session (implementation dependent)

### Test Data Structure

```javascript
{
  email: "test.user.{timestamp}@example.com",
  password: "Test@123456",
  firstName: "Test",
  lastName: "User",
  organizationName: "Test Org {timestamp}"
}
```

### Troubleshooting

#### Emulators Won't Start
```bash
# Kill any existing emulator processes
firebase emulators:kill

# Try starting again
cd backend
firebase emulators:start --only functions,firestore,auth
```

#### Build Errors
```bash
cd backend/functions
npm run clean
npm install
npm run build
```

#### Port Already in Use
```bash
# Check what's using port 5001
netstat -ano | findstr :5001

# Kill the process (Windows)
taskkill /PID <PID> /F
```

#### Tests Failing
1. Check emulator logs for errors
2. Verify API URL in cypress.config.js
3. Check backend/functions/.env configuration
4. Ensure Firestore database is 'attendance-x' (not default)

### Next Steps

1. **Run the tests**: `./test-backend-auth.sh`
2. **Review results**: Check Cypress output for any failures
3. **Fix issues**: Address any failing tests based on actual API responses
4. **Iterate**: Adjust test expectations if needed based on actual backend behavior

### Notes

- Tests use Firebase emulators, not production
- Each test run creates unique users to avoid conflicts
- Tests are independent and can run in any order
- Rate limiting tests may need adjustment based on actual limits
- Logout token invalidation depends on backend implementation (JWT vs session-based)

### Backend Configuration Verified

✅ Resend.com configured as primary email provider
✅ SMTP configured as fallback
✅ Firestore database: 'attendance-x'
✅ JWT authentication enabled
✅ Rate limiting configured
✅ CORS configured for Vercel deployments

---

**Status**: Ready to run tests
**Last Updated**: 2026-01-31
