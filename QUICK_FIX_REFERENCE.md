# Quick Fix Reference - Production Errors

## 🚨 Two Critical Fixes Applied

### 1️⃣ Firestore Database ID Fix
**File:** `backend/functions/src/config/firebase.ts` (line ~44)
**Change:** Explicitly specify the `'attendance-x'` database (already correct in code)
```typescript
firestoreInstance = getFirestore(firebaseApp, 'attendance-x'); // ✅ Correct
```

### 2️⃣ CORS Wildcard for Vercel Previews
**File:** `backend/functions/src/config/cors.ts`
**Change:** Added regex pattern to allow all Vercel preview deployments
```typescript
const isVercelPreview = (origin: string): boolean => {
  return /^https:\/\/attendance-[a-z0-9-]+\.vercel\.app$/.test(origin);
};
```

---

## 🚀 Deploy Now

```bash
cd backend/functions
npm run build
firebase deploy --only functions
```

---

## ✅ Quick Test

1. **Open:** https://attendance-5hixlsmt9-tryptich.vercel.app
2. **Try:** Register a new user
3. **Check:** 
   - ✅ No CORS errors in console
   - ✅ Email received
   - ✅ No Firestore errors in logs

---

## 📊 What Was Fixed

| Error | Root Cause | Fix |
|-------|-----------|-----|
| `5 NOT_FOUND: database (default) does not exist` | Code tried to use default database, but project has named database | Specify 'attendance-x' database ID |
| `CORS non autorisé pour cette origine` | Preview URLs not in allowed list | Wildcard pattern for all previews |

---

## 🎯 Expected Results

- ✅ Notifications save successfully
- ✅ Email verification works
- ✅ All Vercel URLs work (production, master, previews)
- ✅ No CORS errors
- ✅ No Firestore errors

---

**Status:** Ready to deploy
**Time:** ~5 minutes
**Risk:** Low (fixes bugs, no breaking changes)

See `PRODUCTION_FIXES_APPLIED.md` for detailed documentation.
