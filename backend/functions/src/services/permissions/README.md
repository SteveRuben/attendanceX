# Tenant-Scoped Permission System

## Overview

This permission system provides comprehensive access control for multi-tenant applications, combining role-based permissions with feature-specific overrides and resource-level access control.

## Architecture

### 🏗️ **Three-Layer Permission Model**

1. **Role-Based Permissions** (Primary layer)
   - Hierarchical roles: OWNER > ADMIN > MANAGER > MEMBER > VIEWER
   - Each role has predefined permissions
   - Fast permission checks

2. **Feature-Specific Overrides** (Secondary layer)
   - Custom permissions per user via `TenantMembership.featurePermissions`
   - Override role-based restrictions
   - Granular control

3. **Resource-Level Access** (Tertiary layer)
   - "Can edit THIS specific event"
   - Ownership-based permissions
   - Team-based access control

### 🎯 **Permission Categories**

```typescript
// User Management
MANAGE_USERS, VIEW_ALL_USERS, INVITE_USERS, CHANGE_USER_ROLES

// Event Management  
CREATE_EVENTS, MANAGE_ALL_EVENTS, MANAGE_OWN_EVENTS, VIEW_ALL_EVENTS, DELETE_EVENTS

// Attendance & Check-in
RECORD_ATTENDANCE, VIEW_ALL_ATTENDANCE, VIEW_OWN_ATTENDANCE, MANAGE_CHECKIN_SETTINGS, VALIDATE_ATTENDANCE

// Reporting & Analytics
VIEW_REPORTS, EXPORT_DATA, VIEW_ANALYTICS

// Tenant Settings
MANAGE_TENANT_SETTINGS, MANAGE_ATTENDANCE_POLICY

// Integrations
MANAGE_INTEGRATIONS, VIEW_INTEGRATIONS

// Teams & Departments
MANAGE_TEAMS, VIEW_TEAMS, MANAGE_TEAM_MEMBERS

// Notifications
MANAGE_NOTIFICATIONS, SEND_NOTIFICATIONS
```

## Usage

### 🚀 **Basic Permission Check**

```typescript
import { tenantPermissionService } from '../services/permissions/tenant-permission.service';

// Check if user can manage users in a tenant
const canManageUsers = await tenantPermissionService.hasPermission(
  { userId: 'user123', tenantId: 'tenant456' },
  'manage_users'
);
```

### 🔍 **Detailed Permission Check**

```typescript
// Get detailed information about why permission was granted/denied
const result = await tenantPermissionService.checkPermission(
  { userId: 'user123', tenantId: 'tenant456' },
  'manage_users'
);

console.log(result);
// {
//   granted: true,
//   reason: "Permission granted by role: ADMIN",
//   source: 'role'
// }
```

### 🎛️ **Multiple Permission Checks**

```typescript
// Check if user has ANY of these permissions
const hasAnyPermission = await tenantPermissionService.hasAnyPermission(
  { userId: 'user123', tenantId: 'tenant456' },
  ['manage_users', 'view_all_users']
);

// Check if user has ALL of these permissions
const hasAllPermissions = await tenantPermissionService.hasAllPermissions(
  { userId: 'user123', tenantId: 'tenant456' },
  ['create_events', 'manage_own_events']
);
```

### 📋 **Get User Permissions**

```typescript
// Get all permissions for a user in a tenant
const permissions = await tenantPermissionService.getUserPermissions(
  'user123', 
  'tenant456'
);
// Returns: ['manage_users', 'create_events', 'view_reports', ...]
```

## Middleware Integration

### 🛡️ **Route Protection**

```typescript
import { requireTenantPermission } from '../../middleware/auth';

// Protect route with specific permission
router.post('/events', 
  requireTenantPermission('create_events'),
  createEvent
);

// Auto-detect tenant from URL params
router.put('/tenants/:tenantId/users/:userId/role',
  requireTenantPermission('change_user_roles'),
  changeUserRole
);
```

### 🔄 **Auth Service Integration**

```typescript
import { authService } from '../services/auth/auth.service';

// Check permission with tenant context
const hasPermission = await authService.hasPermission(
  userId, 
  'manage_users', 
  tenantId
);

// Get all user permissions
const permissions = await authService.getUserPermissions(userId, tenantId);
```

## Role Hierarchy

### 👑 **OWNER**
- All permissions (wildcard access)
- Can manage tenant settings
- Can change user roles
- Full administrative access

### 🔧 **ADMIN**
- User management (except changing roles to OWNER)
- Full event management
- All attendance features
- Reports and analytics
- Integration management
- Team management
- Notification management

### 👥 **MANAGER**
- Limited user management (view, invite)
- Event management (own events + view all)
- Attendance validation
- Reports viewing
- Team member management
- Send notifications

### 👤 **MEMBER**
- Create and manage own events
- Record own attendance
- Basic viewing permissions

### 👁️ **VIEWER**
- Read-only access
- View events and own attendance
- No management capabilities

## Advanced Features

### 🎯 **Resource-Level Permissions**

```typescript
// Check permission for specific resource
const canEditEvent = await tenantPermissionService.hasPermission(
  { 
    userId: 'user123', 
    tenantId: 'tenant456',
    resourceId: 'event789',
    resourceType: 'event',
    resourceOwnerId: 'user123'  // User owns this event
  },
  'manage_own_events'
);
```

### ⚡ **Performance Optimization**

- **Caching**: Tenant memberships are cached for 5 minutes
- **Batch Operations**: Check multiple permissions in parallel
- **Fast Role Checks**: Role-based permissions checked first (fastest)

### 🧹 **Cache Management**

```typescript
// Clear cache for specific user/tenant
tenantPermissionService.clearCache('user123', 'tenant456');

// Clear all cache for user
tenantPermissionService.clearCache('user123');

// Clear all cache
tenantPermissionService.clearCache();
```

## Migration Guide

### 🔄 **From Old Permission System**

1. **Update Route Middleware**:
   ```typescript
   // Old
   requirePermission('manage_users')
   
   // New
   requireTenantPermission('manage_users')
   ```

2. **Update Permission Checks**:
   ```typescript
   // Old
   await authService.hasPermission(userId, permission)
   
   // New
   await authService.hasPermission(userId, permission, tenantId)
   ```

3. **Update Role References**:
   - Remove `UserRole` references
   - Use `TenantRole` from `TenantMembership`
   - Update permission constants

## Best Practices

### ✅ **Do's**

- Always include tenant context in permission checks
- Use specific permission names (not generic ones)
- Cache permission results for repeated checks
- Use middleware for route protection
- Log permission denials for security monitoring

### ❌ **Don'ts**

- Don't bypass permission checks for "admin" users
- Don't hardcode role names in business logic
- Don't forget to clear cache when roles change
- Don't use basic permissions for tenant-specific actions

## Testing

### 🧪 **Unit Tests**

```typescript
describe('TenantPermissionService', () => {
  it('should grant permission for valid role', async () => {
    const result = await tenantPermissionService.hasPermission(
      { userId: 'admin-user', tenantId: 'test-tenant' },
      'manage_users'
    );
    expect(result).toBe(true);
  });
  
  it('should deny permission for insufficient role', async () => {
    const result = await tenantPermissionService.hasPermission(
      { userId: 'viewer-user', tenantId: 'test-tenant' },
      'manage_users'
    );
    expect(result).toBe(false);
  });
});
```

## Troubleshooting

### 🐛 **Common Issues**

1. **Permission Always Denied**
   - Check if user has active TenantMembership
   - Verify tenantId is correct
   - Check role hierarchy

2. **Cache Issues**
   - Clear cache after role changes
   - Check cache expiry settings
   - Monitor cache hit rates

3. **Performance Issues**
   - Use batch permission checks
   - Implement proper caching strategy
   - Monitor database queries

### 📊 **Monitoring**

- Permission check logs include tenant context
- Failed permission attempts are logged
- Cache performance metrics available
- Role change audit trail maintained

## Future Enhancements

- [ ] Team-based permissions
- [ ] Time-based permissions (temporary access)
- [ ] Permission inheritance
- [ ] Advanced resource-level permissions
- [ ] Permission analytics dashboard