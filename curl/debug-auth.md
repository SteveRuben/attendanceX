# User Invitations 404 Error - Debug Analysis

## Problem Summary
The frontend is getting a 404 error when calling `/v1/user-invitations`, but the actual issue is a 401 authentication error.

## Root Cause Analysis

### 1. Backend Status ✅
- Backend is running and healthy (confirmed via health check)
- Routes are properly mounted at `/v1/user-invitations`
- User invitation controller and service exist and are properly configured

### 2. Route Configuration ✅
- Main routes file (`backend/functions/src/routes/index.ts`) properly mounts user-invitations routes at line 133
- User invitations routes file exists with proper GET route at `/` path
- Authentication and tenant context middleware are properly configured

### 3. Authentication Issue ❌
When testing the endpoint directly, we get:
```json
{
  "success": false,
  "error": "INVALID_TOKEN", 
  "message": "Token d'authentification requis"
}
```

This indicates the route exists but authentication is failing.

## Authentication Flow Analysis

### NextAuth Configuration ✅
- NextAuth is properly configured with JWT strategy
- Access tokens are stored in session and refreshed automatically
- Backend login/refresh endpoints are properly configured

### API Client Configuration ✅
- API client properly extracts access token from session
- Adds `Authorization: Bearer <token>` header when `withAuth: true`
- Adds tenant context via `X-Tenant-ID` header

### Potential Issues

1. **Session State**: User might not be properly authenticated
2. **Token Expiry**: Access token might be expired and refresh failing
3. **Tenant Context**: Missing or invalid tenant ID
4. **Permission Issues**: User might not have required permissions

## Debugging Steps

### Step 1: Check Authentication Status
The user should verify they are properly logged in and have a valid session.

### Step 2: Check Tenant Context
The request requires a valid tenant ID. The error might be occurring because:
- No tenant ID is provided in the request
- The tenant ID is invalid
- The user doesn't have access to the specified tenant

### Step 3: Check User Permissions
The route requires `view_all_users` permission. The user might not have this permission.

## Recommended Solution

1. **Verify Authentication**: Check if the user is properly logged in
2. **Check Tenant Access**: Ensure the user has access to tenant `t5st3kJGjWKFEqsbLFfY`
3. **Verify Permissions**: Ensure the user has `view_all_users` permission
4. **Test with Valid Auth**: Try the request with proper authentication headers

## Next Steps

The user should:
1. Check their login status in the browser dev tools
2. Verify the session contains a valid access token
3. Ensure they have access to the tenant they're trying to query
4. Check if they have the required permissions for viewing user invitations