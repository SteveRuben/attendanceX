# Permission Middleware Fix - December 20, 2025

## Issue
Multiple API endpoints were returning "Tenant ID requis" (Tenant ID required) errors because they were using `requireTenantPermission` middleware but being called without tenant ID parameters in the URL path.

## Root Cause
The `requireTenantPermission` middleware expects a `:tenantId` parameter in the route path (e.g., `/tenants/:tenantId/timesheets/my-timesheets`), but many routes were mounted at paths without tenant ID parameters (e.g., `/timesheets/my-timesheets`, `/attendances`).

## Affected Endpoints
- `/v1/timesheets/my-timesheets` - 400 Bad Request: "Tenant ID requis"
- `/v1/attendances` - 400 Bad Request: "Tenant ID requis"
- All other timesheet and attendance routes using `requireTenantPermission`

## Solution
Changed routes from `requireTenantPermission` to `requirePermission` for endpoints that don't have `:tenantId` in their path. The `requirePermission` middleware gets tenant context from the authenticated user's active tenant.

### Fixed Routes

#### Timesheet Routes (`backend/functions/src/routes/timesheet/timesheet.routes.ts`)
- `POST /` - create timesheet
- `GET /search` - search timesheets  
- `POST /automatic` - create automatic timesheets
- `GET /my-timesheets` - get user's timesheets
- `GET /stats` - get timesheet stats
- `GET /` - get tenant timesheets
- `GET /:id` - get timesheet by ID
- `PUT /:id` - update timesheet
- `DELETE /:id` - delete timesheet
- All status management routes (`/:id/submit`, `/:id/approve`, etc.)
- All utility routes (`/:id/calculate-totals`, `/:id/validate`)
- All time entry routes (`/:id/entries`, `/:id/entries/bulk`)
- Employee routes (`/employee/:employeeId`)

#### Attendance Routes (`backend/functions/src/routes/attendance/attendances.routes.ts`)
- `GET /` - list attendances
- `POST /export` - export attendances
- `GET /:id` - get attendance by ID
- `POST /:id/validate` - validate attendance
- `POST /bulk-validate` - bulk validate attendances
- `POST /bulk-mark` - bulk mark attendance
- All event-specific routes (`/events/:eventId/*`)
- User-specific routes (`/users/:userId/report`)
- Settings routes (`/settings`)

## Key Changes
1. **Import Update**: Removed unused `requireTenantPermission` imports
2. **Middleware Change**: `requireTenantPermission('permission')` → `requirePermission('permission')`
3. **Tenant Context**: `requirePermission` automatically uses user's active tenant context

## Impact
- All timesheet and attendance endpoints now work correctly
- No breaking changes to API contracts
- Proper tenant-scoped permission checking maintained
- Frontend can now successfully call these endpoints

## Testing
- Backend compiles without errors
- Routes no longer require explicit tenant ID parameters
- Permission system still enforces tenant-scoped access control

## Architecture Note
- `requireTenantPermission` should only be used for routes with `:tenantId` parameters
- `requirePermission` should be used for routes that rely on user's active tenant context
- Both middleware functions provide proper tenant-scoped security