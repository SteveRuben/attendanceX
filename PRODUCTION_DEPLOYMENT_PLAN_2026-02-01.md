# Production Deployment Plan - February 1, 2026

## 🚨 CRITICAL ISSUE

**Production API is DOWN** - Returning 500 Internal Server Error on all endpoints:
- `/v1/events` → 500 error
- `/v1/users` → 500 error
- Root cause: Rate limit middleware bug (`field.toLowerCase is not a function`)

## ✅ Fixes Ready for Deployment

### 1. Backend - Rate Limit Middleware Fix (CRITICAL)
**File**: `backend/functions/src/middleware/rateLimit.memory.ts`
**Issue**: `res.set({ headers })` conflicts with Express CORS middleware
**Fix**: Changed to `res.setHeader(name, value)` for individual headers
**Lines**: 111-126, 138-152
**Status**: ✅ Fixed locally, ❌ NOT in production

### 2. Frontend - Onboarding Infinite Loop Fix
**File**: `frontend/src/pages/onboarding/setup.tsx`
**Issue**: 25+ repetitive API calls due to useEffect dependency loop
**Fix**: 
- Wrapped `fetchTenantData` and `fetchOnboardingStatus` in `useCallback`
- Added `useRef` (`isFetchingRef`) to prevent duplicate calls
- Fixed useEffect dependencies
**Status**: ✅ Fixed locally, ❌ NOT in production

### 3. Frontend - Dashboard Scroll Fix
**File**: `frontend/src/components/layout/AppShell.tsx`
**Issue**: No vertical scrolling on dashboard
**Fix**: Added `overflow-y-auto` to main content area
**Status**: ✅ Fixed locally, ❌ NOT in production

### 4. Frontend - Design System Updates
**Files**: Multiple onboarding components
**Changes**: 
- Updated colors from `neutral-*` to `slate-*`
- Applied Solstice gradients
- Updated to Polaris standards (2px borders, proper spacing)
**Status**: ✅ Fixed locally, ❌ NOT in production

## 📋 Deployment Steps

### STEP 1: Deploy Backend (HIGHEST PRIORITY)

This will fix the 500 errors and restore API functionality.

```bash
# Navigate to backend functions
cd backend/functions

# Verify dependencies are installed
npm install

# Build TypeScript to JavaScript
npm run build

# Verify build succeeded
ls -la lib/middleware/rateLimit.memory.js

# Return to project root
cd ../..

# Deploy to Firebase
firebase deploy --only functions

# Alternative: Deploy only the API function (faster)
firebase deploy --only functions:api
```

**Expected Duration**: 5-10 minutes

**Verification**:
```bash
# Monitor logs
firebase functions:log --only api --follow

# Test health endpoint
curl https://api-rvnxjp7idq-bq.a.run.app/v1/health

# Test events endpoint
curl https://api-rvnxjp7idq-bq.a.run.app/v1/events?page=1&limit=15
```

### STEP 2: Deploy Frontend

Once backend is stable, deploy frontend with all UI fixes.

```bash
# Navigate to frontend
cd frontend

# Verify environment variables
cat .env.production

# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod

# OR deploy to Firebase Hosting
cd ..
firebase deploy --only hosting
```

**Expected Duration**: 3-5 minutes

**Verification**:
- Visit production URL
- Test login flow
- Test onboarding (should see only 2-3 API calls instead of 25+)
- Test dashboard scroll
- Verify design updates

### STEP 3: Monitor Production

```bash
# Watch backend logs
firebase functions:log --only api --follow

# Watch for errors
firebase functions:log --only api --limit 100 | grep ERROR
```

**Monitor for**: 15-30 minutes after deployment

## 🎯 Success Criteria

### Backend
- [ ] Deployment completes without errors
- [ ] Health check endpoint responds: `GET /v1/health` → 200 OK
- [ ] Events endpoint works: `GET /v1/events` → 200 OK with data
- [ ] Users endpoint works: `GET /v1/users` → 200 OK with data
- [ ] No rate limit errors in logs
- [ ] No 500 errors in logs

### Frontend
- [ ] Build completes without errors
- [ ] Deployment succeeds
- [ ] Homepage loads correctly
- [ ] Login/register works
- [ ] Dashboard scrolls properly
- [ ] Onboarding shows 2-3 API calls (not 25+)
- [ ] Design updates visible (slate colors, gradients)

## 🔄 Rollback Plan

If deployment causes issues:

### Backend Rollback
```bash
# View previous versions
firebase functions:list

# Rollback to previous version
firebase functions:delete api
# Then redeploy from previous Git commit
git checkout <previous-commit>
cd backend/functions && npm run build && cd ../..
firebase deploy --only functions
```

### Frontend Rollback
```bash
# Vercel
vercel rollback

# Firebase Hosting
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION TARGET_SITE_ID
```

## ⚠️ Pre-Deployment Checklist

### Backend
- [x] Code compiles without errors
- [x] Rate limit fix verified in code
- [x] No TypeScript errors
- [x] Firebase CLI authenticated
- [ ] Backup of current production version noted

### Frontend
- [x] Code compiles without errors
- [x] Onboarding fix verified in code
- [x] AppShell scroll fix verified
- [x] Design updates verified
- [x] No TypeScript errors
- [x] Environment variables configured

## 📊 Current Production Status

### API Endpoints
| Endpoint | Status | Error |
|----------|--------|-------|
| `/v1/health` | ❌ | Unknown (not tested) |
| `/v1/events` | ❌ | 500 Internal Server Error |
| `/v1/users` | ❌ | 500 Internal Server Error |
| `/v1/attendances` | ❌ | Rate limit middleware crash |

### Error Logs
```
Error: Rate limit middleware error - bypassing
field.toLowerCase is not a function
```

### Root Cause
The rate limit middleware is using `res.set({ headers })` which conflicts with Express CORS middleware. The fix changes this to individual `res.setHeader(name, value)` calls.

## 🚀 Deployment Command Summary

```bash
# BACKEND (CRITICAL - DO THIS FIRST)
cd backend/functions && npm run build && cd ../.. && firebase deploy --only functions

# FRONTEND (AFTER BACKEND IS STABLE)
cd frontend && npm run build && vercel --prod

# MONITORING
firebase functions:log --only api --follow
```

## 📝 Post-Deployment Tasks

1. **Immediate** (0-15 min):
   - Monitor logs for errors
   - Test all critical endpoints
   - Verify user flows work

2. **Short-term** (15-60 min):
   - Continue monitoring logs
   - Test complete user journeys
   - Check error rates in monitoring

3. **Follow-up** (1-24 hours):
   - Review error logs
   - Check performance metrics
   - Gather user feedback

## 🎯 Priority Order

1. **URGENT**: Deploy backend (fixes 500 errors)
2. **HIGH**: Verify backend stability (15 min monitoring)
3. **MEDIUM**: Deploy frontend (UI improvements)
4. **LOW**: Extended monitoring (30 min)

---

**Created**: February 1, 2026
**Status**: Ready for execution
**Risk Level**: Low (all fixes tested locally)
**Estimated Total Time**: 20-30 minutes
