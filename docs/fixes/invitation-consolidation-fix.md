# Invitation Routes Consolidation - December 20, 2025

## Changes Made

### 1. **Mounted Timesheet Routes at `/timesheets`**
**Before:** `router.use("/", timesheetRoutes);` (root level)
**After:** `router.use("/timesheets", timesheetRoutes);` (dedicated path)

**Impact:**
- Timesheet routes now properly namespaced at `/api/timesheets/*`
- No more conflicts with other root-level routes
- Clear API structure with dedicated timesheet endpoints

### 2. **Removed Tenant Invitation Routes**
**Removed from `tenant.routes.ts`:**
- `POST /:tenantId/invitations/bulk` - Bulk invite during onboarding
- `GET /:tenantId/user-invitations` - List tenant invitations
- `DELETE /:tenantId/user-invitations/:invitationId` - Delete invitation
- `POST /:tenantId/user-invitations/:invitationId/resend` - Resend invitation

**Reason:** As you mentioned, invitations have tenant IDs, so they can be handled in the single user-invitations file without needing tenant-scoped routes.

## Final Route Structure

### **Timesheet Routes** (`/api/timesheets`)
- `GET /api/timesheets/` - List timesheets
- `POST /api/timesheets/` - Create timesheet
- `GET /api/timesheets/my-timesheets` - User's timesheets
- `GET /api/timesheets/search` - Search timesheets
- `POST /api/timesheets/automatic` - Auto-create timesheets
- All other timesheet operations under `/api/timesheets/*`

### **Time Entry Routes** (`/api/time-entries`)
- All time entry operations under `/api/time-entries/*`

### **Project Routes** (`/api/projects`)
- All project operations under `/api/projects/*`

### **Activity Code Routes** (`/api/activity-codes`)
- All activity code operations under `/api/activity-codes/*`

### **User Invitation Routes** (`/api/user-invitations`) - **SINGLE SOURCE**
**Authenticated Routes:**
- `POST /invite` - Single user invitation
- `POST /bulk-invite` - Bulk invitations (handles onboarding bulk invites)
- `POST /csv-import` - CSV import invitations
- `GET /` - List invitations (can filter by tenant ID)
- `GET /stats` - Invitation statistics
- `POST /:invitationId/resend` - Resend invitation
- `DELETE /:invitationId` - Cancel invitation

**Public Routes:**
- `GET /public/invitations/validate/:token` - Validate invitation token
- `POST /public/invitations/accept` - Accept invitation
- `POST /public/invitations/decline` - Decline invitation

### **Tenant Routes** (`/api/tenants`)
- **No longer contains invitation routes**
- Focus on tenant management, settings, and configuration
- Teams, users, and other tenant-specific resources

## Benefits

### ✅ **Single Source of Truth for Invitations**
- All invitation logic in one place: `user-invitations.routes.ts`
- No more scattered invitation functionality
- Easier to maintain and extend

### ✅ **Clean API Structure**
- Each module has its own dedicated namespace
- No route conflicts or overlapping patterns
- Predictable URL patterns

### ✅ **Simplified Onboarding**
- Onboarding bulk invitations now use the same endpoint as regular bulk invitations
- Consistent invitation flow regardless of context
- Single invitation service handles all scenarios

### ✅ **Better Organization**
- Timesheet functionality properly namespaced
- Invitation functionality consolidated
- Clear separation of concerns

## Migration Notes

### **Frontend Updates Needed:**
1. **Timesheet API calls** - Update from `/api/timesheets/*` to `/api/timesheets/*` (no change needed if already using correct paths)
2. **Onboarding invitations** - Change from `/api/tenants/:id/invitations/bulk` to `/api/user-invitations/bulk-invite`
3. **Invitation management** - Use `/api/user-invitations/*` for all invitation operations

### **Backend Controller Updates:**
- Tenant controller methods for invitations can be removed or moved to user-invitation controller
- Bulk invite logic can be consolidated in the user-invitation service

## Files Modified
- `backend/functions/src/routes/index.ts` - Updated route mounting
- `backend/functions/src/routes/tenant/tenant.routes.ts` - Removed invitation routes
- API documentation updated to reflect new structure

This consolidation creates a much cleaner and more maintainable API structure with single sources of truth for each functional area.