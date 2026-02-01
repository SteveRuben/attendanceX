# Quick Guide: Run Backend Authentication Tests

## 🚀 Quick Start (3 Steps)

### Step 1: Make Script Executable
```bash
chmod +x test-backend-auth.sh
```

### Step 2: Run Tests
```bash
./test-backend-auth.sh
```

### Step 3: Check Results
- ✅ Green output = All tests passed
- ❌ Red output = Some tests failed (check logs)

---

## 📋 What the Script Does

1. **Builds** backend functions (`npm run build`)
2. **Starts** Firebase emulators (functions, firestore, auth)
3. **Runs** Cypress tests against local API
4. **Stops** emulators automatically
5. **Reports** test results

---

## 🔍 Manual Testing (Alternative)

If you prefer to run tests manually:

### Terminal 1: Start Emulators
```bash
cd backend
firebase emulators:start --only functions,firestore,auth
```

Wait for: `✔  All emulators ready!`

### Terminal 2: Run Tests
```bash
# Headless mode (CI/CD)
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js"

# Interactive mode (debugging)
npx cypress open
```

---

## 🧪 Test Endpoints

The tests will verify these endpoints:

| Method | Endpoint | Test |
|--------|----------|------|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/users/me` | Protected endpoint |
| GET | `/api/v1/health` | Health check |

**Base URL**: `http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1`

---

## ✅ Expected Results

### Successful Test Run
```
  Backend Authentication API
    User Registration API
      ✓ should register a new user successfully (1234ms)
      ✓ should fail to register with duplicate email (567ms)
      ✓ should fail to register with invalid email format (234ms)
      ✓ should fail to register with weak password (345ms)
      ✓ should fail to register with missing required fields (123ms)
    
    User Login API
      ✓ should login successfully with valid credentials (890ms)
      ✓ should fail to login with wrong password (456ms)
      ✓ should fail to login with non-existent email (345ms)
      ✓ should fail to login with missing credentials (234ms)
    
    Token Validation
      ✓ should access protected endpoint with valid token (567ms)
      ✓ should fail to access protected endpoint without token (234ms)
      ✓ should fail to access protected endpoint with invalid token (345ms)
    
    Logout API
      ✓ should logout successfully (456ms)
      ✓ should fail to access protected endpoint after logout (234ms)
    
    Rate Limiting
      ✓ should enforce rate limiting on login attempts (2345ms)
    
    API Health Check
      ✓ should return healthy status from health endpoint (123ms)

  16 passing (8s)
```

---

## 🐛 Troubleshooting

### Problem: "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Problem: "Port 5001 already in use"
```bash
# Kill existing emulators
firebase emulators:kill

# Or find and kill the process
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

### Problem: "Build failed"
```bash
cd backend/functions
npm run clean
npm install
npm run build
cd ../..
```

### Problem: "Cypress not found"
```bash
npm install
```

### Problem: Tests failing with 404
- Check if emulators are running
- Verify API URL in `cypress.config.js`
- Check backend logs for errors

### Problem: Tests failing with 500
- Check backend/functions logs
- Verify `.env` configuration
- Ensure Firestore database is 'attendance-x'

---

## 📊 Test Coverage

- ✅ User Registration (5 tests)
- ✅ User Login (4 tests)
- ✅ Token Validation (3 tests)
- ✅ Logout (2 tests)
- ✅ Rate Limiting (1 test)
- ✅ Health Check (1 test)

**Total**: 16 tests

---

## 🔧 Configuration Files

- **Test File**: `cypress/e2e/backend-auth-api.cy.js`
- **Test Script**: `test-backend-auth.sh`
- **Cypress Config**: `cypress.config.js`
- **Backend Env**: `backend/functions/.env`

---

## 📝 Notes

- Tests use **unique users** per run (timestamp-based)
- Tests run against **local emulators** (not production)
- Tests are **independent** (can run in any order)
- **No cleanup needed** (emulators reset on restart)

---

## 🎯 Next Steps After Tests Pass

1. ✅ Verify all 16 tests pass
2. 📝 Review test logs for any warnings
3. 🔄 Run tests multiple times to ensure consistency
4. 🚀 Integrate into CI/CD pipeline
5. 📊 Add more test scenarios as needed

---

**Ready to test?** Run: `./test-backend-auth.sh`
