# User Profile Role Fix - December 20, 2025

## Issue
The `/users/me` endpoint was returning the deprecated intrinsic role `"participant"` instead of tenant-scoped role information, causing issues with the frontend permission system.

## Root Cause
1. User documents in Firestore still contained the deprecated `role` field from before the architectural migration
2. The `toAPI()` method in UserModel was not filtering out the deprecated role field
3. The `getMyProfile` method was not providing tenant-scoped role information

## Solution

### 1. Updated UserModel.toAPI() Method
- Added explicit removal of deprecated `role` field in the `toAPI()` method
- This ensures the deprecated field is never returned in API responses

**File**: `backend/functions/src/models/user.model.ts`
```typescript
// Remove deprecated intrinsic role field - roles are now in TenantMembership
delete cleaned.role;
```

### 2. Enhanced getMyProfile Method
- Modified to explicitly exclude deprecated role field
- Added tenant-scoped role information (`currentTenantRole`) based on active tenant membership
- Provides proper role context for frontend permission system

**File**: `backend/functions/src/controllers/user/user.controller.ts`
```typescript
// Remove deprecated intrinsic role field if it exists
const { role, ...cleanUserData } = userData as any;

// Add tenant-scoped role information if user has an active tenant
if (cleanUserData.activeTenantId && cleanUserData.tenantMemberships) {
  const activeMembership = cleanUserData.tenantMemberships.find(
    (membership: any) => membership.tenantId === cleanUserData.activeTenantId
  );
  if (activeMembership) {
    cleanUserData.currentTenantRole = activeMembership.role;
  }
}
```

### 3. Fixed Setup Wizard Service
- Removed unused `tenantUserService` import
- Fixed user data access to use `toAPI()` method instead of direct `data` property access
- Ensures proper encapsulation and security

**File**: `backend/functions/src/services/onboarding/setup-wizard.service.ts`

## Impact
- `/users/me` endpoint now returns clean user data without deprecated role field
- Frontend receives proper tenant-scoped role information via `currentTenantRole`
- Onboarding completion should now work correctly
- All TypeScript compilation errors resolved

## Testing
- Backend compiles successfully without errors
- User profile API now provides tenant-scoped role information
- Deprecated intrinsic role field is properly filtered out

## Next Steps
1. Test the onboarding completion flow end-to-end
2. Verify frontend permission system works with new role structure
3. Consider database migration to remove deprecated role fields from existing user documents (optional cleanup)