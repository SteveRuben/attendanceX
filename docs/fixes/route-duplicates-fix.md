# Route Duplicates Fix - December 20, 2025

## Issue Found
**CRITICAL**: Route conflicts discovered in the backend routing system causing potential 404 errors and unpredictable behavior.

## Root Cause
Two route groups were mounted at the same root level (`"/"`) in `backend/functions/src/routes/index.ts`:

```typescript
router.use("/", timesheetRoutes);    // Line 154
router.use("/", resolutionRoutes);   // Line 155 - CONFLICT!
```

This created overlapping route patterns and potential conflicts between:
- Timesheet routes: `/timesheets/*`, `/time-entries/*`, `/projects/*`, `/activity-codes/*`
- Resolution routes: `/resolutions/*`, `/events/:eventId/resolutions`

## Solution Applied

### 1. Fixed Route Mounting
**Before:**
```typescript
router.use("/", timesheetRoutes);
router.use("/", resolutionRoutes);  // Conflict!
```

**After:**
```typescript
router.use("/", timesheetRoutes);
router.use("/resolutions", resolutionRoutes);  // Fixed!
```

### 2. Updated Resolution Route Paths
Since resolution routes are now mounted at `/resolutions`, removed the redundant `/resolutions` prefix from individual routes:

**Before:**
- `GET /resolutions/:resolutionId` 
- `PUT /resolutions/:resolutionId/status`
- `DELETE /resolutions/:resolutionId`
- `GET /resolutions/my-tasks`
- `GET /resolutions/stats`

**After:**
- `GET /:resolutionId` (becomes `/api/resolutions/:resolutionId`)
- `PUT /:resolutionId/status` (becomes `/api/resolutions/:resolutionId/status`)
- `DELETE /:resolutionId` (becomes `/api/resolutions/:resolutionId`)
- `GET /my-tasks` (becomes `/api/resolutions/my-tasks`)
- `GET /stats` (becomes `/api/resolutions/stats`)

### 3. Updated API Documentation
Added resolution endpoints to the API documentation in the main routes index.

## Final Route Structure

### Timesheet Routes (mounted at `/`)
- `/api/timesheets/*` - Timesheet management
- `/api/time-entries/*` - Time entry operations
- `/api/projects/*` - Project management
- `/api/activity-codes/*` - Activity code management

### Resolution Routes (mounted at `/resolutions`)
- `/api/resolutions/:resolutionId` - Individual resolution operations
- `/api/resolutions/my-tasks` - User's assigned tasks
- `/api/resolutions/stats` - Resolution statistics
- `/api/events/:eventId/resolutions` - Event-specific resolutions

## Impact
- ✅ **Eliminated route conflicts** - No more overlapping patterns
- ✅ **Clear API structure** - Each module has its own namespace
- ✅ **Predictable routing** - No more ambiguous route matching
- ✅ **Better organization** - Logical grouping of related endpoints

## Testing Required
1. **Resolution API endpoints** - All resolution routes now have `/api/resolutions` prefix
2. **Frontend integration** - Update any frontend calls to resolution endpoints
3. **Documentation** - API docs now reflect correct endpoint paths

## Files Modified
- `backend/functions/src/routes/index.ts` - Fixed route mounting
- `backend/functions/src/routes/resolution/resolution.routes.ts` - Updated route paths
- API documentation updated with new resolution endpoints

## Breaking Changes
⚠️ **Frontend Impact**: Any frontend code calling resolution endpoints will need to update URLs:
- Old: `/api/resolutions/my-tasks` 
- New: `/api/resolutions/my-tasks` (same, but now properly routed)

The actual URLs remain the same for end users, but the internal routing is now conflict-free.