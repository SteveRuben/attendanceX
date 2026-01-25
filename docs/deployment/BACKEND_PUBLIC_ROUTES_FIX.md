# Backend Public Routes Fix

## Issue
The `/public/plans` endpoint was returning 401 Unauthorized because the public tenant registration routes were not registered in the main routes file.

## Root Cause
The `tenant-registration.routes.ts` file in `backend/functions/src/routes/public/` contained the `/public/plans` endpoint, but it was never imported or registered in the main `routes/index.ts` file.

## Solution Applied (Commit 5d78b78)

### 1. Import Public Routes
Added import in `backend/functions/src/routes/index.ts`:
```typescript
import publicTenantRegistrationRoutes from "./public/tenant-registration.routes";
```

### 2. Register Public Routes
Added route registration:
```typescript
router.use("/public", publicTenantRegistrationRoutes);
```

This makes the following endpoints available:
- `POST /api/public/register` - Register new tenant
- `POST /api/public/verify-email` - Verify email
- `POST /api/public/resend-verification` - Resend verification email
- `GET /api/public/check-slug/:slug` - Check slug availability
- **`GET /api/public/plans`** - Get subscription plans (NO AUTH REQUIRED)

### 3. Update API Documentation
Updated the API info endpoint to document public endpoints.

## Backend Deployment Required

⚠️ **IMPORTANT**: The backend needs to be redeployed for this fix to take effect.

### TypeScript Build Errors
There are currently 14 TypeScript errors in the backend that need to be fixed before deployment:
- `attendance.controller.ts` - 1 error
- `api-key.controller.ts` - 6 errors  
- `event.controller.ts` - 2 errors
- `activity-code.controller.ts` - 5 errors

These errors are related to `string | string[]` type mismatches from Express route parameters.

### Quick Fix for TypeScript Errors
The errors can be fixed by ensuring proper type casting:
```typescript
// Before (causes error)
const userId = req.params.userId;

// After (fixes error)
const userId = Array.isArray(req.params.userId) 
  ? req.params.userId[0] 
  : req.params.userId;
```

## Testing After Deployment

Once the backend is deployed, test the endpoint:

```bash
# Should return 200 OK with plans data (no auth required)
curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/plans
```

Expected response:
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "Free",
        "price": { "monthly": 0, "yearly": 0 },
        ...
      },
      ...
    ],
    "currency": "EUR",
    "billingCycles": ["monthly", "yearly"]
  }
}
```

## Frontend Impact

Once the backend is deployed, the frontend pricing page will work correctly:
- Homepage pricing section will load plans
- `/pricing` page will display all plans
- No authentication required

## Next Steps

1. ✅ Routes registered (commit 5d78b78)
2. ⏳ Fix TypeScript errors in controllers
3. ⏳ Build backend: `npm run build`
4. ⏳ Deploy backend: `firebase deploy --only functions`
5. ⏳ Test `/public/plans` endpoint
6. ⏳ Verify frontend pricing page works

## Related Files

- `backend/functions/src/routes/index.ts` - Main routes file (updated)
- `backend/functions/src/routes/public/tenant-registration.routes.ts` - Public routes definition
- `frontend-v2/src/services/plansService.ts` - Frontend service calling the endpoint
- `frontend-v2/src/pages/pricing.tsx` - Pricing page using the plans

---

**Date**: January 25, 2026  
**Commit**: 5d78b78  
**Status**: ⏳ Awaiting backend deployment
