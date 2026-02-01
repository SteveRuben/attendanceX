# 🚀 Run Backend Tests Now - Quick Commands

## ✅ Fix Applied

The PORT environment variable issue has been fixed. You can now run the tests!

---

## Quick Start (3 Commands)

### 1. Rebuild Backend
```bash
cd backend/functions && npm run build && cd ../..
```

### 2. Make Test Script Executable
```bash
chmod +x test-backend-auth.sh
```

### 3. Run Tests
```bash
./test-backend-auth.sh
```

---

## What Was Fixed

1. **PORT Variable**: Made optional in environment validation
2. **API URL**: Updated to `africa-south1` region (your emulator region)
3. **Test Configuration**: Updated Cypress config with correct URL

---

## Expected Output

```
🚀 Starting Backend Authentication Tests
========================================

📦 Building backend functions...
✅ Build successful

🔥 Starting Firebase emulators...
⏳ Waiting for emulators to be ready...
✅ Emulators started (PID: 12345)

🧪 Running Cypress tests...

  Backend Authentication API
    User Registration API
      ✓ should register a new user successfully
      ✓ should fail to register with duplicate email
      ✓ should fail to register with invalid email format
      ✓ should fail to register with weak password
      ✓ should fail to register with missing required fields
    
    User Login API
      ✓ should login successfully with valid credentials
      ✓ should fail to login with wrong password
      ✓ should fail to login with non-existent email
      ✓ should fail to login with missing credentials
    
    Token Validation
      ✓ should access protected endpoint with valid token
      ✓ should fail to access protected endpoint without token
      ✓ should fail to access protected endpoint with invalid token
    
    Logout API
      ✓ should logout successfully
      ✓ should fail to access protected endpoint after logout
    
    Rate Limiting
      ✓ should enforce rate limiting on login attempts
    
    API Health Check
      ✓ should return healthy status from health endpoint

  16 passing (8s)

🛑 Stopping emulators...
✅ Emulators stopped

========================================
✅ All tests passed!
========================================
```

---

## If You Get Errors

### "Build failed"
```bash
cd backend/functions
rm -rf lib node_modules
npm install
npm run build
cd ../..
```

### "Port already in use"
```bash
firebase emulators:kill
```

### "Permission denied"
```bash
chmod +x test-backend-auth.sh
```

---

## Manual Testing (Alternative)

If you prefer to run things manually:

### Terminal 1: Start Emulators
```bash
cd backend
firebase emulators:start --only functions,firestore,auth
```

### Terminal 2: Run Tests
```bash
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js"
```

---

## API Endpoint

Your backend API is now available at:
```
http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1
```

Test it manually:
```bash
curl http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1/health
```

---

## Files Modified

1. ✅ `backend/functions/src/config/environment.ts` - PORT now optional
2. ✅ `cypress.config.js` - Updated API URL
3. ✅ `cypress/e2e/backend-auth-api.cy.js` - Updated API URL

---

## Ready? Let's Go! 🎉

```bash
cd backend/functions && npm run build && cd ../.. && chmod +x test-backend-auth.sh && ./test-backend-auth.sh
```

Copy and paste this single command to do everything at once!
