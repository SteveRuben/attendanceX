# Complete Deployment & Testing Guide - AttendanceX

This guide covers everything you need to deploy locally, deploy to production, and run tests.

---

## 📋 Prerequisites

Before starting, ensure you have:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check Firebase CLI
firebase --version

# If Firebase CLI not installed:
npm install -g firebase-tools

# Login to Firebase
firebase login
```

---

## 🏠 Part 1: Local Deployment (Emulators)

### Step 1: Build Backend

```bash
# Navigate to backend functions
cd backend/functions

# Install dependencies (if needed)
npm install

# Build the project
npm run build

# Go back to project root
cd ../..
```

**Expected output:**
```
✔ Compiled successfully
```

### Step 2: Start Firebase Emulators

```bash
# Navigate to backend folder
cd backend

# Start emulators (functions, firestore, auth)
firebase emulators:start --only functions,firestore,auth
```

**Expected output:**
```
✔  functions[africa-south1-api]: http function initialized 
   (http://127.0.0.1:5001/attendance-management-syst/africa-south1/api)
✔  All emulators ready! It is now safe to connect your app.
```

**Your API is now available at:**
```
http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1
```

### Step 3: Test Local API

Open a **new terminal** and test:

```bash
# Test health endpoint
curl http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1/health

# Or in PowerShell:
Invoke-WebRequest -Uri "http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1/health"
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T..."
}
```

### Troubleshooting Local Deployment

#### Problem: "PORT: Expected number, received nan"
**Solution:** Already fixed! The environment.ts file now has PORT as optional.

#### Problem: "Port 5001 already in use"
```bash
# Kill existing emulators
firebase emulators:kill

# Or find and kill the process (Windows)
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

#### Problem: "Build failed"
```bash
cd backend/functions
rm -rf lib node_modules
npm install
npm run build
cd ../..
```

#### Problem: "Firebase project not found"
```bash
# Check current project
firebase use

# List available projects
firebase projects:list

# Select your project
firebase use attendance-management-syst
```

---

## 🚀 Part 2: Production Deployment

### Step 1: Verify Configuration

```bash
# Check which project you're deploying to
firebase use

# Should show: attendance-management-syst
```

### Step 2: Build Backend

```bash
cd backend/functions
npm run build
cd ../..
```

### Step 3: Deploy to Firebase

#### Option A: Deploy Everything
```bash
cd backend
firebase deploy
cd ..
```

#### Option B: Deploy Only Functions
```bash
cd backend
firebase deploy --only functions
cd ..
```

#### Option C: Deploy Only Hosting (Frontend)
```bash
cd backend
firebase deploy --only hosting
cd ..
```

**Expected output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/attendance-management-syst/overview
Hosting URL: https://attendance-management-syst.web.app
```

### Step 4: Verify Production Deployment

```bash
# Test production API
curl https://africa-south1-attendance-management-syst.cloudfunctions.net/api/v1/health

# Or visit in browser:
# https://africa-south1-attendance-management-syst.cloudfunctions.net/api/v1/health
```

### Troubleshooting Production Deployment

#### Problem: "Insufficient permissions"
```bash
# Re-login to Firebase
firebase login --reauth

# Check your permissions in Firebase Console
# https://console.firebase.google.com/project/attendance-management-syst/settings/iam
```

#### Problem: "Build fails before deployment"
```bash
cd backend/functions
npm run clean
npm install
npm run build
cd ../..
```

#### Problem: "Deployment timeout"
```bash
# Deploy with increased timeout
cd backend
firebase deploy --only functions --force
cd ..
```

#### Problem: "Environment variables not set"
```bash
# Set environment variables in Firebase
firebase functions:config:set \
  jwt.secret="your-jwt-secret" \
  email.provider="resend" \
  email.api_key="your-api-key"

# Or use .env file (already configured in your project)
```

---

## 🧪 Part 3: Running Tests

### Prerequisites for Tests

```bash
# Install Cypress (if not already installed)
npm install

# Verify Cypress is installed
npx cypress --version
```

### Option A: Automated Test Script (Recommended)

```bash
# Make script executable (first time only)
chmod +x test-backend-auth.sh

# Run all tests
./test-backend-auth.sh
```

**What this script does:**
1. Builds backend functions
2. Starts Firebase emulators
3. Runs Cypress tests
4. Stops emulators
5. Reports results

### Option B: Manual Testing

#### Terminal 1: Start Emulators
```bash
cd backend
firebase emulators:start --only functions,firestore,auth
```

Wait for: `✔  All emulators ready!`

#### Terminal 2: Run Tests
```bash
# Run tests in headless mode
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js"

# OR run with Cypress UI (for debugging)
npx cypress open
```

### Option C: Test Specific Endpoints Manually

```bash
# 1. Start emulators (Terminal 1)
cd backend
firebase emulators:start --only functions,firestore,auth

# 2. Test registration (Terminal 2)
curl -X POST http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456",
    "firstName": "Test",
    "lastName": "User"
  }'

# 3. Test login
curl -X POST http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }'

# 4. Test health check
curl http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1/health
```

### Troubleshooting Tests

#### Problem: "Cypress not found"
```bash
npm install cypress --save-dev
```

#### Problem: "Tests fail with 404"
**Check:**
1. Emulators are running
2. API URL is correct: `africa-south1` not `europe-west1`
3. Backend is built: `cd backend/functions && npm run build`

#### Problem: "Tests timeout"
```bash
# Increase timeout in cypress.config.js
# Already set to 10000ms (10 seconds)
```

#### Problem: "Connection refused"
**Solution:** Emulators not running. Start them first:
```bash
cd backend
firebase emulators:start --only functions,firestore,auth
```

---

## 📊 Complete Workflow Examples

### Workflow 1: Local Development & Testing

```bash
# 1. Build backend
cd backend/functions && npm run build && cd ../..

# 2. Start emulators (Terminal 1)
cd backend && firebase emulators:start --only functions,firestore,auth

# 3. Run tests (Terminal 2)
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js"

# 4. Stop emulators (Terminal 1)
# Press Ctrl+C
```

### Workflow 2: Deploy to Production

```bash
# 1. Build backend
cd backend/functions && npm run build && cd ../..

# 2. Test locally first
cd backend && firebase emulators:start --only functions,firestore,auth
# Test in browser or with curl
# Press Ctrl+C to stop

# 3. Deploy to production
firebase deploy --only functions

# 4. Test production
curl https://africa-south1-attendance-management-syst.cloudfunctions.net/api/v1/health
```

### Workflow 3: Quick Test Run

```bash
# One command to rule them all
chmod +x test-backend-auth.sh && ./test-backend-auth.sh
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "Cannot find module"
```bash
cd backend/functions
rm -rf node_modules package-lock.json
npm install
npm run build
cd ../..
```

### Issue 2: "Firebase project not initialized"
```bash
# Initialize Firebase in backend folder
cd backend
firebase init

# Select:
# - Functions
# - Firestore
# - Hosting (if needed)

cd ..
```

### Issue 3: "Emulators won't start"
```bash
# Kill all Firebase processes
firebase emulators:kill

# Clear emulator data
rm -rf ~/.cache/firebase/emulators

# Try again
cd backend
firebase emulators:start --only functions,firestore,auth
```

### Issue 4: "Tests pass locally but fail in production"
**Reasons:**
1. Environment variables not set in production
2. Firestore rules different
3. CORS configuration

**Solution:**
```bash
# Check production logs
firebase functions:log

# Set environment variables
firebase functions:config:set key="value"

# Update Firestore rules
firebase deploy --only firestore:rules
```

---

## 📝 Quick Reference Commands

### Local Development
```bash
# Build
cd backend/functions && npm run build && cd ../..

# Start emulators
cd backend && firebase emulators:start --only functions,firestore,auth

# Run tests
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js"
```

### Production Deployment
```bash
# Deploy everything
cd backend && firebase deploy

# Deploy only functions
cd backend && firebase deploy --only functions

# View logs
firebase functions:log
```

### Testing
```bash
# Automated
./test-backend-auth.sh

# Manual
npx cypress open

# Specific test
npx cypress run --spec "cypress/e2e/backend-auth-api.cy.js"
```

---

## 🎯 Success Checklist

### Local Deployment ✓
- [ ] Backend builds without errors
- [ ] Emulators start successfully
- [ ] API responds to health check
- [ ] Can register a user
- [ ] Can login with credentials

### Production Deployment ✓
- [ ] Build succeeds
- [ ] Deployment completes
- [ ] Production API responds
- [ ] Environment variables set
- [ ] CORS configured correctly

### Testing ✓
- [ ] Cypress installed
- [ ] Emulators running
- [ ] All 16 tests pass
- [ ] No timeout errors
- [ ] API URLs correct

---

## 🆘 Still Having Issues?

### Check These Files:
1. `backend/functions/.env` - Environment variables
2. `backend/firebase.json` - Firebase configuration
3. `cypress.config.js` - Test configuration
4. `backend/functions/src/config/environment.ts` - Environment validation

### Get Help:
1. Check Firebase Console: https://console.firebase.google.com/project/attendance-management-syst
2. View function logs: `firebase functions:log`
3. Check emulator UI: http://127.0.0.1:4000

---

**Need more specific help? Tell me which step is failing and I'll provide detailed troubleshooting!**
