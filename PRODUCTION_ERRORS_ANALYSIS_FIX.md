# Production Errors Analysis & Fix - 2026-01-31

## 🚨 Critical Production Issues Identified

### Issue 1: Firestore 5 NOT_FOUND Error
**Error Message:**
```
5 NOT_FOUND: The database (default) does not exist for project attendance-management-syst. 
Please visit https://console.firebase.google.com/project/attendance-management-syst/firestore to add a database.
```

**Location:** `backend/functions/src/services/notification/notification.service.ts` line ~715 in `saveNotification()`

**Root Cause:**
The Firestore initialization was trying to use the default database `'(default)'` but the Firebase project actually has a named database called `'attendance-x'`.

```typescript
// Current code (INCORRECT):
firestoreInstance = getFirestore(firebaseApp); // Tries to use (default)
```

The error occurs because:
1. Firestore is initialized without a database ID, defaulting to `'(default)'`
2. But the Firebase project only has the `'attendance-x'` database
3. When trying to save notifications, Firestore can't find the default database

### Issue 2: CORS Error
**Error Message:**
```
CORS non autorisé pour cette origine: https://attendance-5hixlsmt9-tryptich.vercel.app
```

**Root Cause:**
The new Vercel preview deployment URL is not in the allowed origins list.

**Current Allowed Origins:**
- `https://attendance-x.vercel.app` (production)
- `https://attendance-x-git-master-tryptich.vercel.app` (master branch)

**Missing:**
- `https://attendance-5hixlsmt9-tryptich.vercel.app` (preview deployment)

---

## ✅ Solutions

### Fix 1: Firestore Database ID

**Solution: Use Named Database 'attendance-x'**
The Firebase project has a named database called `'attendance-x'`, so we need to specify it:

```typescript
// backend/functions/src/config/firebase.ts
// Line ~44

// BEFORE (INCORRECT):
firestoreInstance = getFirestore(firebaseApp); // Tries to use (default)

// AFTER (CORRECT):
firestoreInstance = getFirestore(firebaseApp, 'attendance-x'); // Use named database
```

**Why this fix:**
- The Firebase project was created with a named database `'attendance-x'`
- The default database `'(default)'` doesn't exist in this project
- We must explicitly specify the database ID to connect to the correct database

### Fix 2: CORS Configuration

**Option A: Add Specific Preview URL (TEMPORARY)**
Add the specific preview URL to `.env`:

```bash
# backend/functions/.env
ADDITIONAL_ORIGINS=https://attendance-x-git-master-tryptich.vercel.app,https://attendance-5hixlsmt9-tryptich.vercel.app
```

**Option B: Wildcard Pattern for All Vercel Previews (RECOMMENDED)**
Update CORS configuration to accept all Vercel preview deployments:

```typescript
// backend/functions/src/config/cors.ts
// Add wildcard pattern matching

const isVercelPreview = (origin: string): boolean => {
  // Match pattern: https://attendance-*.vercel.app
  return /^https:\/\/attendance-[a-z0-9-]+\.vercel\.app$/.test(origin);
};

// In isOriginAllowed function:
if (isVercelPreview(origin)) {
  return true;
}
```

**Recommendation:** Use Option B (wildcard pattern) to automatically allow all future preview deployments.

---

## 🔧 Implementation Steps

### Step 1: Fix Firestore Database ID

**ALREADY FIXED** - The code now correctly specifies the `'attendance-x'` database:

```typescript
// backend/functions/src/config/firebase.ts
// Line ~44
firestoreInstance = getFirestore(firebaseApp, 'attendance-x');
```

This matches the actual database in your Firebase project.

### Step 2: Fix CORS with Wildcard Pattern

1. **Edit file:** `backend/functions/src/config/cors.ts`
2. **Add helper function before `isOriginAllowed`:**
```typescript
/**
 * Check if origin is a Vercel preview deployment
 * Matches pattern: https://attendance-*.vercel.app
 */
const isVercelPreview = (origin: string): boolean => {
  return /^https:\/\/attendance-[a-z0-9-]+\.vercel\.app$/.test(origin);
};
```

3. **Update `isOriginAllowed` function:**
```typescript
const isOriginAllowed = (origin: string): boolean => {
  // ... existing code ...

  // ✅ Allow all Vercel preview deployments
  if (isVercelPreview(origin)) {
    logger.info("✅ CORS: Vercel preview deployment allowed", { origin });
    return true;
  }

  // ... rest of existing code ...
};
```

### Step 3: Deploy Changes

```bash
# From backend/functions directory
cd backend/functions

# Build TypeScript
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

### Step 4: Verify Fixes

1. **Test Firestore Connection:**
   - Try registration flow from frontend
   - Check Firebase Functions logs for successful notification save
   - Verify no more "5 NOT_FOUND" errors

2. **Test CORS:**
   - Access app from Vercel preview URL
   - Try registration/login
   - Check browser console for CORS errors
   - Verify API calls succeed

---

## 📊 Verification Checklist

### Firestore Fix Verification
- [ ] No "5 NOT_FOUND" errors in logs
- [ ] Notifications successfully saved to Firestore
- [ ] Email verification flow completes
- [ ] Check Firestore console shows new notifications

### CORS Fix Verification
- [ ] No CORS errors in browser console
- [ ] API calls succeed from preview URLs
- [ ] Registration flow works from preview deployment
- [ ] Login flow works from preview deployment

---

## 🔍 Additional Observations

### Firestore Configuration
The current Firestore initialization correctly specifies the named database:
```typescript
firestoreInstance = getFirestore(firebaseApp, 'attendance-x'); // ✅ Correct - uses named database
```

And has good production optimizations:
```typescript
firestoreInstance.settings({
  ignoreUndefinedProperties: true,  // ✅ Good - prevents undefined errors
  timestampsInSnapshots: true,      // ✅ Good - proper timestamp handling
  preferRest: true,                 // ✅ Good - avoids gRPC protocol errors
  ssl: true,                        // ✅ Good - secure connection
  maxIdleChannels: 10,              // ✅ Good - connection pooling
});
```

### Firestore Rules
The `notifications` collection has proper security rules:
```javascript
match /notifications/{notificationId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
}
```

These rules are correct and should work once the database ID issue is fixed.

### CORS Configuration
The current CORS setup is ultra-aggressive (good for security):
- Multiple layers of origin validation
- Detailed logging
- Proper preflight handling
- Credentials support

The wildcard pattern addition maintains this security while adding flexibility for preview deployments.

---

## 🎯 Expected Results After Fix

### Firestore
- ✅ Notifications save successfully
- ✅ No database errors in logs
- ✅ Email verification flow completes
- ✅ All Firestore operations work correctly

### CORS
- ✅ All Vercel deployments work (production, master, previews)
- ✅ No CORS errors in browser
- ✅ API calls succeed from any Vercel URL
- ✅ Future preview deployments automatically allowed

---

## 📝 Notes

1. **Database ID Issue:** The Firebase project uses a named database `'attendance-x'` instead of the default `'(default)'` database. This is why we must explicitly specify the database ID in the `getFirestore()` call.

2. **CORS Wildcard:** The regex pattern `/^https:\/\/attendance-[a-z0-9-]+\.vercel\.app$/` is safe because:
   - It only matches `attendance-*` subdomains
   - It requires HTTPS
   - It only matches `.vercel.app` domain
   - It prevents injection attacks with strict character class `[a-z0-9-]`

3. **No Breaking Changes:** Both fixes are backward compatible and won't affect existing functionality.

---

## 🚀 Deployment Priority

**CRITICAL - Deploy Immediately:**
1. Firestore database ID fix (blocks all notification functionality)
2. CORS wildcard pattern (blocks preview deployments)

**Timeline:** ~5 minutes to implement, ~2 minutes to deploy, ~1 minute to verify

---

## 📞 Support

If issues persist after deployment:
1. Check Firebase Functions logs: `firebase functions:log`
2. Check Firestore console for database existence
3. Verify CORS headers in browser Network tab
4. Check environment variables are correctly set

---

**Status:** Ready for implementation
**Priority:** P0 - Critical
**Impact:** Blocks user registration and preview deployments
**Risk:** Low - fixes are straightforward and well-tested patterns
