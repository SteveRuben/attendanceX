# Database Migration Quick Start Guide

**TL;DR**: Replace `database.ts` content with bridge code, deploy, monitor. Zero code changes needed elsewhere.

---

## 🎯 Goal

Migrate from `database.ts` to `database.improved.ts` with **zero downtime** and **zero code changes** in consuming files.

---

## 📋 Prerequisites

- [ ] Read `DATABASE_MIGRATION_PLAN.md` (full details)
- [ ] Read `DATABASE_IMPORT_AUDIT.md` (impact analysis)
- [ ] Have production deployment access
- [ ] Have monitoring dashboard access

---

## 🚀 Quick Migration Steps

### Step 1: Prepare (5 minutes)

```bash
# 1. Ensure you're on latest main branch
git checkout main
git pull origin main

# 2. Create migration branch
git checkout -b feat/database-config-migration

# 3. Backup current database.ts
cp backend/functions/src/config/database.ts backend/functions/src/config/database.ts.backup
```

### Step 2: Implement Bridge (2 minutes)

Replace the **entire content** of `backend/functions/src/config/database.ts` with:

```typescript
// backend/functions/src/config/database.ts
// MIGRATION BRIDGE - Re-exports from database.improved.ts

import { logger } from "firebase-functions";

logger.info("🔄 Database configuration migration: Using improved configuration");

// Re-export everything from the improved configuration
export * from "./database.improved";

// Maintain backward compatibility
import {
  db as improvedDb,
  collections as improvedCollections,
  typedCollection as improvedTypedCollection,
  databaseConfig as improvedDatabaseConfig,
  cacheKeys as improvedCacheKeys,
  documentTypes as improvedDocumentTypes,
  collectionNames as improvedCollectionNames,
  generateId as improvedGenerateId
} from "./database.improved";

// Re-export with original names for compatibility
export const db = improvedDb;
export const collections = improvedCollections;
export const typedCollection = improvedTypedCollection;
export const databaseConfig = improvedDatabaseConfig;
export const cacheKeys = improvedCacheKeys;
export const documentTypes = improvedDocumentTypes;
export const collectionNames = improvedCollectionNames;
export const generateId = improvedGenerateId;

// Default export for compatibility
export default {
  collections: improvedCollections,
  typedCollection: improvedTypedCollection,
  databaseConfig: improvedDatabaseConfig,
  cacheKeys: improvedCacheKeys,
  documentTypes: improvedDocumentTypes,
  collectionNames: improvedCollectionNames,
  generateId: improvedGenerateId,
};

logger.info("✅ Database configuration migration bridge active");
```

### Step 3: Test Locally (10 minutes)

```bash
# 1. Build
cd backend/functions
npm run build

# 2. Start emulators
cd ..
npm run dev

# 3. Test health endpoint
curl http://localhost:5001/your-project/europe-west1/api/v1/health

# 4. Check logs for migration message
# Look for: "🔄 Database configuration migration: Using improved configuration"
# Look for: "✅ Database configuration migration bridge active"
```

### Step 4: Commit & Push (2 minutes)

```bash
git add backend/functions/src/config/database.ts
git commit -m "feat: migrate to improved database configuration with bridge

- Implement bridge pattern for zero-downtime migration
- All imports automatically use improved configuration
- No breaking changes to consuming files
- Enhanced error handling and production optimizations

Related: DATABASE_MIGRATION_PLAN.md"

git push origin feat/database-config-migration
```

### Step 5: Deploy to Production (5 minutes)

```bash
# 1. Switch to production project
firebase use production

# 2. Build
cd backend/functions
npm run build

# 3. Deploy
cd ../..
firebase deploy --only functions

# 4. Monitor deployment
firebase functions:log --only api
```

### Step 6: Monitor (48 hours)

**Immediate Checks** (First 5 minutes):
```bash
# 1. Test health endpoint
curl https://your-api.com/v1/health

# 2. Check logs for migration messages
firebase functions:log --only api | grep "Database configuration"

# Expected logs:
# ✅ "🔄 Database configuration migration: Using improved configuration"
# ✅ "✅ Database configuration migration bridge active"
# ✅ "🚀 Firestore configured for PRODUCTION"
```

**Ongoing Monitoring** (Next 48 hours):
- [ ] Check error rates every 4 hours
- [ ] Monitor response times
- [ ] Watch for Firestore timeout errors
- [ ] Verify tenant operations working
- [ ] Confirm billing operations functioning

---

## 🔍 What to Look For

### ✅ Success Indicators

**In Logs:**
```
✅ "Database configuration migration bridge active"
✅ "Firestore configured for PRODUCTION"
✅ "Collection validation passed" (if validation added)
```

**In Metrics:**
- Response times: Stable or improved
- Error rates: No increase
- Firestore operations: Working normally
- Cold starts: Potentially faster

### ⚠️ Warning Signs

**In Logs:**
```
⚠️ "Firestore settings configuration" (should be rare)
⚠️ Any errors mentioning "database" or "collections"
⚠️ Import errors or module not found
```

**In Metrics:**
- Sudden increase in error rates
- Firestore timeout errors
- Failed health checks
- Broken tenant operations

---

## 🚨 Rollback Procedure

If you see warning signs:

```bash
# 1. Immediate rollback
git revert HEAD
cd backend/functions
npm run build
cd ../..
firebase deploy --only functions

# 2. Verify rollback
curl https://your-api.com/v1/health
firebase functions:log --only api

# 3. Investigate
# - Review error logs
# - Check what went wrong
# - Fix issues in database.improved.ts
# - Retry migration
```

---

## 📊 Success Criteria

### After 24 Hours
- [ ] Zero increase in error rates
- [ ] All health checks passing
- [ ] No Firestore timeout errors
- [ ] Tenant operations working
- [ ] User operations working
- [ ] Billing operations working

### After 48 Hours
- [ ] Sustained stable operation
- [ ] Performance metrics stable or improved
- [ ] No unexpected errors
- [ ] Ready to proceed to cleanup phase

---

## 🎓 Understanding the Bridge

**What it does:**
- Re-exports everything from `database.improved.ts`
- Maintains exact same API as old `database.ts`
- Zero changes needed in consuming files
- All 100+ importing files automatically use improved config

**What it doesn't do:**
- Doesn't change any APIs
- Doesn't break any imports
- Doesn't require code changes elsewhere
- Doesn't cause downtime

**Why it's safe:**
- Same exports, same names
- Same TypeScript types
- Same function signatures
- Same collection structure
- Backward compatible 100%

---

## 📚 Full Documentation

For complete details, see:
- `DATABASE_MIGRATION_PLAN.md` - Complete migration strategy
- `DATABASE_IMPORT_AUDIT.md` - All affected files
- `database.improved.ts` - New configuration with improvements

---

## 🆘 Need Help?

**Common Issues:**

1. **Build fails after bridge implementation**
   - Check TypeScript errors
   - Ensure `database.improved.ts` exists
   - Verify all exports are present

2. **Functions won't start**
   - Check Firebase Functions logs
   - Look for import errors
   - Verify environment variables

3. **Health check fails**
   - Check if Firestore is accessible
   - Verify credentials are correct
   - Look for timeout errors

4. **Unexpected errors in production**
   - Rollback immediately (see above)
   - Review error logs
   - Contact team for assistance

---

## ✅ Checklist

### Pre-Deployment
- [ ] Backed up current `database.ts`
- [ ] Implemented bridge code
- [ ] Tested locally with emulators
- [ ] Verified build succeeds
- [ ] Reviewed migration plan

### Deployment
- [ ] Deployed to production
- [ ] Verified deployment succeeded
- [ ] Checked immediate logs
- [ ] Tested health endpoint
- [ ] Confirmed migration messages in logs

### Post-Deployment
- [ ] Monitoring error rates
- [ ] Watching response times
- [ ] Checking Firestore operations
- [ ] Verifying critical paths
- [ ] Ready to rollback if needed

---

**Estimated Total Time**: 30 minutes active work + 48 hours monitoring  
**Risk Level**: 🟢 LOW (bridge approach, zero breaking changes)  
**Rollback Time**: < 5 minutes  
**Confidence**: HIGH
