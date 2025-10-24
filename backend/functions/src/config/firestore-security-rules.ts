/**
 * Règles de sécurité Firestore pour l'isolation multi-tenant
 * Ces règles garantissent que chaque tenant ne peut accéder qu'à ses propres données
 */

export const multiTenantSecurityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions for tenant isolation
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserId() {
      return request.auth.uid;
    }
    
    function getTenantId() {
      return request.auth.token.tenantId;
    }
    
    function isTenantMember(tenantId) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/tenant_memberships/$(getUserId() + '_' + tenantId)) &&
             get(/databases/$(database)/documents/tenant_memberships/$(getUserId() + '_' + tenantId)).data.isActive == true;
    }
    
    function isTenantOwner(tenantId) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/tenant_memberships/$(getUserId() + '_' + tenantId)) &&
             get(/databases/$(database)/documents/tenant_memberships/$(getUserId() + '_' + tenantId)).data.role == 'owner';
    }
    
    function isTenantAdmin(tenantId) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/tenant_memberships/$(getUserId() + '_' + tenantId)) &&
             get(/databases/$(database)/documents/tenant_memberships/$(getUserId() + '_' + tenantId)).data.role in ['owner', 'admin'];
    }
    
    // Tenant collection - only tenant members can read, only owners can write
    match /tenants/{tenantId} {
      allow read: if isTenantMember(tenantId);
      allow write: if isTenantOwner(tenantId);
    }
    
    // Tenant memberships - members can read their own, admins can manage
    match /tenant_memberships/{membershipId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == getUserId() || 
                      isTenantAdmin(resource.data.tenantId));
      allow create: if isAuthenticated() && 
                       isTenantAdmin(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       (resource.data.userId == getUserId() || 
                        isTenantAdmin(resource.data.tenantId));
      allow delete: if isAuthenticated() && 
                       isTenantAdmin(resource.data.tenantId);
    }
    
    // Tenant branding - only tenant admins can manage
    match /tenant_branding/{tenantId} {
      allow read: if isTenantMember(tenantId);
      allow write: if isTenantAdmin(tenantId);
    }
    
    // Subscription plans - read-only for all authenticated users
    match /subscription_plans/{planId} {
      allow read: if isAuthenticated();
      allow write: if false; // Only server can write
    }
    
    // Users - tenant-scoped access
    match /users/{userId} {
      allow read: if isAuthenticated() && 
                     (userId == getUserId() || 
                      isTenantMember(resource.data.tenantId));
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId != null &&
                       isTenantMember(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       (userId == getUserId() || 
                        isTenantAdmin(resource.data.tenantId)) &&
                       request.resource.data.tenantId == resource.data.tenantId;
      allow delete: if isAuthenticated() && 
                       isTenantAdmin(resource.data.tenantId);
    }
    
    // Events - tenant-scoped access
    match /events/{eventId} {
      allow read: if isAuthenticated() && 
                     isTenantMember(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId != null &&
                       isTenantMember(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       isTenantMember(resource.data.tenantId) &&
                       request.resource.data.tenantId == resource.data.tenantId;
      allow delete: if isAuthenticated() && 
                       isTenantAdmin(resource.data.tenantId);
    }
    
    // Attendances - tenant-scoped access
    match /attendances/{attendanceId} {
      allow read: if isAuthenticated() && 
                     isTenantMember(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId != null &&
                       isTenantMember(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       isTenantMember(resource.data.tenantId) &&
                       request.resource.data.tenantId == resource.data.tenantId;
      allow delete: if isAuthenticated() && 
                       isTenantAdmin(resource.data.tenantId);
    }
    
    // Notifications - tenant-scoped access
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
                     (resource.data.userId == getUserId() || 
                      isTenantMember(resource.data.tenantId));
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId != null &&
                       isTenantMember(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       resource.data.userId == getUserId();
      allow delete: if isAuthenticated() && 
                       (resource.data.userId == getUserId() || 
                        isTenantAdmin(resource.data.tenantId));
    }
    
    // Reports - tenant-scoped access
    match /reports/{reportId} {
      allow read: if isAuthenticated() && 
                     isTenantMember(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId != null &&
                       isTenantMember(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       isTenantMember(resource.data.tenantId) &&
                       request.resource.data.tenantId == resource.data.tenantId;
      allow delete: if isAuthenticated() && 
                       isTenantAdmin(resource.data.tenantId);
    }
    
    // Audit logs - read-only for tenant admins
    match /audit_logs/{logId} {
      allow read: if isAuthenticated() && 
                     isTenantAdmin(resource.data.tenantId);
      allow write: if false; // Only server can write
    }
    
    // Email campaigns - tenant-scoped access
    match /email_campaigns/{campaignId} {
      allow read: if isAuthenticated() && 
                     isTenantMember(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId != null &&
                       isTenantMember(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       isTenantMember(resource.data.tenantId) &&
                       request.resource.data.tenantId == resource.data.tenantId;
      allow delete: if isAuthenticated() && 
                       isTenantAdmin(resource.data.tenantId);
    }
    
    // Teams - tenant-scoped access
    match /teams/{teamId} {
      allow read: if isAuthenticated() && 
                     isTenantMember(resource.data.tenantId);
      allow create: if isAuthenticated() && 
                       request.resource.data.tenantId != null &&
                       isTenantMember(request.resource.data.tenantId);
      allow update: if isAuthenticated() && 
                       isTenantMember(resource.data.tenantId) &&
                       request.resource.data.tenantId == resource.data.tenantId;
      allow delete: if isAuthenticated() && 
                       isTenantAdmin(resource.data.tenantId);
    }
    
    // Default deny rule for any other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

export const firestoreIndexes = [
  // Indexes for tenant-scoped queries
  {
    collectionGroup: 'users',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'events',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'startTime', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'events',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'startTime', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'attendances',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'eventId', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'attendances',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'tenant_memberships',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'isActive', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'tenant_memberships',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'isActive', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'notifications',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'reports',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'audit_logs',
    fields: [
      { fieldPath: 'tenantId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  }
];

export default {
  multiTenantSecurityRules,
  firestoreIndexes
};