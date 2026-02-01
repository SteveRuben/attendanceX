# 🚀 DEPLOY NOW - February 1, 2026

## ⚠️ CRITICAL: Production API is DOWN

**Current Status**: All API endpoints returning 500 errors
**Root Cause**: Rate limit middleware bug
**Fix Status**: ✅ Built and ready to deploy

## 🎯 Quick Deployment Commands

### 1️⃣ Deploy Backend (CRITICAL - 5 minutes)

```bash
# From project root
firebase deploy --only functions
```

**What this does**:
- Deploys the fixed rate limit middleware
- Restores API functionality
- Fixes 500 errors on `/v1/events`, `/v1/users`, etc.

**Expected output**:
```
✔  functions: Finished running predeploy script.
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
i  functions: preparing functions directory for uploading...
i  functions: packaged functions (X MB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: updating Node.js 18 function api(us-central1)...
✔  functions[api(us-central1)]: Successful update operation.
✔  Deploy complete!
```

### 2️⃣ Verify Backend (2 minutes)

```bash
# Test health endpoint
curl https://api-rvnxjp7idq-bq.a.run.app/v1/health

# Expected: {"success":true,"message":"API is healthy"}

# Test events endpoint
curl https://api-rvnxjp7idq-bq.a.run.app/v1/events?page=1&limit=5

# Expected: {"success":true,"data":[...]}
```

### 3️⃣ Deploy Frontend (3 minutes)

```bash
# From project root
cd frontend
npm run build
vercel --prod
```

**What this does**:
- Deploys onboarding infinite loop fix
- Deploys dashboard scroll fix
- Deploys design system updates (Evelya/Polaris/Solstice)

### 4️⃣ Monitor (15 minutes)

```bash
# Watch logs
firebase functions:log --only api --follow

# Look for:
# ✅ No "field.toLowerCase" errors
# ✅ No 500 errors
# ✅ Successful API requests
```

## 📊 What Gets Fixed

### Backend
| Issue | Status | Impact |
|-------|--------|--------|
| Rate limit crash | ✅ Fixed | API works again |
| 500 errors | ✅ Fixed | All endpoints functional |
| CORS conflicts | ✅ Fixed | Headers work correctly |

### Frontend
| Issue | Status | Impact |
|-------|--------|--------|
| Onboarding loop | ✅ Fixed | 25+ calls → 2-3 calls |
| Dashboard scroll | ✅ Fixed | Scrolling works |
| Design updates | ✅ Fixed | Evelya/Polaris/Solstice |

## ⏱️ Timeline

- **T+0**: Start backend deployment
- **T+5**: Backend deployed, start verification
- **T+7**: Backend verified, start frontend deployment
- **T+10**: Frontend deployed
- **T+10-25**: Monitor for stability

**Total time**: ~25 minutes

## ✅ Success Indicators

### Immediate (T+5)
- [ ] Backend deployment completes without errors
- [ ] Health endpoint returns 200 OK
- [ ] Events endpoint returns data (not 500)

### Short-term (T+15)
- [ ] No rate limit errors in logs
- [ ] No 500 errors in logs
- [ ] Frontend loads correctly

### Verification (T+25)
- [ ] Complete user flow works (login → dashboard → events)
- [ ] Onboarding shows reduced API calls
- [ ] Dashboard scrolls properly

## 🔴 If Something Goes Wrong

### Backend Issues
```bash
# Check logs
firebase functions:log --only api --limit 50

# If needed, rollback
firebase functions:delete api
# Then redeploy previous version from Git
```

### Frontend Issues
```bash
# Rollback Vercel
vercel rollback

# Check what went wrong
vercel logs
```

## 📝 Pre-Flight Checklist

- [x] Backend builds successfully (`npm run build`)
- [x] Rate limit fix verified in compiled code
- [x] Frontend builds successfully
- [x] All fixes tested locally
- [x] Firebase CLI authenticated
- [x] Deployment plan documented

## 🎯 Ready to Deploy?

**YES** - All checks passed, fixes are ready

**Command to run**:
```bash
firebase deploy --only functions
```

---

**Created**: February 1, 2026, 03:30 UTC
**Priority**: 🔴 CRITICAL
**Risk**: Low (all fixes tested)
**Estimated Time**: 25 minutes
