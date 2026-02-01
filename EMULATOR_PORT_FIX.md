# Firebase Emulator PORT Environment Variable Fix

## Problem

Firebase emulators were failing to start with this error:

```
Error: ❌ Invalid environment configuration:PORT: Expected number, received nan
```

## Root Cause

The environment validation schema in `backend/functions/src/config/environment.ts` was trying to parse the `PORT` environment variable as a required number with a default value:

```typescript
PORT: z.coerce.number().default(3000),
```

However, in Firebase Functions:
1. The `PORT` variable should NOT be set (Firebase manages it automatically)
2. The `.env` file has `# PORT=3000` commented out (correct)
3. When `process.env.PORT` is `undefined`, `z.coerce.number()` converts it to `NaN`
4. This causes validation to fail

## Solution

Changed the PORT validation to be optional:

```typescript
PORT: z.coerce.number().optional(), // Optional - Firebase manages this
```

## Additional Fixes

### 1. Updated API URL for Tests

The emulator is running on `africa-south1` region, not `europe-west1`. Updated:

**File**: `cypress.config.js`
```javascript
API_URL: 'http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1'
```

**File**: `cypress/e2e/backend-auth-api.cy.js`
```javascript
const API_URL = Cypress.env('API_URL') || 'http://127.0.0.1:5001/attendance-management-syst/africa-south1/api/v1';
```

## Files Modified

1. ✅ `backend/functions/src/config/environment.ts` - Made PORT optional
2. ✅ `cypress.config.js` - Updated API URL to africa-south1
3. ✅ `cypress/e2e/backend-auth-api.cy.js` - Updated API URL to africa-south1

## How to Test

### Step 1: Rebuild Backend
```bash
cd backend/functions
npm run build
cd ../..
```

### Step 2: Start Emulators
```bash
cd backend
firebase emulators:start --only functions,firestore,auth
```

You should now see:
```
✔  functions[africa-south1-api]: http function initialized 
   (http://127.0.0.1:5001/attendance-management-syst/africa-south1/api).
✔  All emulators ready!
```

### Step 3: Run Tests
```bash
# In a new terminal
chmod +x test-backend-auth.sh
./test-backend-auth.sh
```

## Expected Behavior

### Before Fix
- ❌ Emulators fail to start
- ❌ Error: "PORT: Expected number, received nan"
- ❌ Tests cannot run

### After Fix
- ✅ Emulators start successfully
- ✅ API available at `http://127.0.0.1:5001/attendance-management-syst/africa-south1/api`
- ✅ Tests can connect to API
- ✅ All 16 tests should pass

## Why This Happened

Firebase Functions automatically manages the PORT variable in production. The environment validation was too strict and didn't account for this Firebase-specific behavior. By making PORT optional, we allow Firebase to manage it while still supporting local development scenarios where PORT might be explicitly set.

## Related Configuration

The `.env` file correctly has PORT commented out:
```env
# PORT=3000                        # Reserved by Firebase - Do not set
```

This is the correct configuration for Firebase Functions.

---

**Status**: Fixed ✅
**Date**: 2026-01-31
**Impact**: Emulators can now start, tests can run
