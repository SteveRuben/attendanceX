import { UserModel } from '../../../backend/functions/src/models/user.model';
import { PermissionService } from '../../../backend/functions/src/services/permission.service';
import { OrganizationRole, UserRole, UserStatus } from '@attendance-x/shared';

describe('Owner Permissions Tests', () => {
  let ownerUser: UserModel;
  let adminUser: UserModel;
  let memberUser: UserModel;

  beforeEach(() => {
    // Créer un utilisateur owner
    ownerUser = new UserModel({
      id: 'owner-1',
      email: 'owner@test.com',
      name: 'Owner User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: 'org-1',
      organizationRole: OrganizationRole.OWNER,
      isActive: true,
      organizationPermissions: []
    });

    // Créer un utilisateur admin
    adminUser = new UserModel({
      id: 'admin-1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: 'org-1',
      organizationRole: OrganizationRole.ADMIN,
      isActive: true,
      organizationPermissions: ['VIEW_ORGANIZATION', 'MANAGE_MEMBERS']
    });

    // Créer un utilisateur member
    memberUser = new UserModel({
      id: 'member-1',
      email: 'member@test.com',
      name: 'Member User',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      organizationId: 'org-1',
      organizationRole: OrganizationRole.MEMBER,
      isActive: true,
      organizationPermissions: ['VIEW_ORGANIZATION']
    });
  });

  describe('Owner Access Rights', () => {
    test('Owner should have unlimited access', () => {
      expect(ownerUser.hasUnlimitedAccess()).toBe(true);
      expect(PermissionService.hasUnlimitedAccess(ownerUser)).toBe(true);
    });

    test('Owner should have all permissions', () => {
      // Tester quelques permissions critiques
      const criticalPermissions = [
        'DELETE_ORGANIZATION',
        'MANAGE_BILLING',
        'VIEW_ANALYTICS',
        'MANAGE_MEMBERS',
        'CREATE_EVENTS',
        'EXPORT_DATA'
      ];

      criticalPermissions.forEach(permission => {
        expect(PermissionService.hasPermission(ownerUser, permission)).toBe(true);
        expect(ownerUser.hasOrganizationPermission(permission)).toBe(true);
      });
    });

    test('Owner can perform any organization action', () => {
      const criticalActions = [
        'DELETE_ORGANIZATION',
        'TRANSFER_OWNERSHIP',
        'MANAGE_BILLING',
        'CHANGE_ORGANIZATION_SETTINGS',
        'REMOVE_ADMIN',
        'EXPORT_ALL_DATA'
      ];

      criticalActions.forEach(action => {
        expect(ownerUser.canPerformOrganizationAction(action)).toBe(true);
      });
    });

    test('Owner can manage any user', () => {
      expect(PermissionService.canManageUser(ownerUser, adminUser)).toBe(true);
      expect(PermissionService.canManageUser(ownerUser, memberUser)).toBe(true);
    });

    test('Owner can assign any role', () => {
      const allRoles = Object.values(OrganizationRole);
      
      allRoles.forEach(role => {
        expect(PermissionService.canAssignRole(ownerUser, role)).toBe(true);
      });
    });

    test('Owner can access sensitive data', () => {
      expect(PermissionService.canViewSensitiveData(ownerUser)).toBe(true);
    });
  });

  describe('Non-Owner Limitations', () => {
    test('Admin should not have unlimited access', () => {
      expect(adminUser.hasUnlimitedAccess()).toBe(false);
      expect(PermissionService.hasUnlimitedAccess(adminUser)).toBe(false);
    });

    test('Member should not have unlimited access', () => {
      expect(memberUser.hasUnlimitedAccess()).toBe(false);
      expect(PermissionService.hasUnlimitedAccess(memberUser)).toBe(false);
    });

    test('Admin cannot assign owner role', () => {
      expect(PermissionService.canAssignRole(adminUser, OrganizationRole.OWNER)).toBe(false);
    });

    test('Member has limited permissions', () => {
      expect(PermissionService.hasPermission(memberUser, 'DELETE_ORGANIZATION')).toBe(false);
      expect(PermissionService.hasPermission(memberUser, 'REMOVE_MEMBERS')).toBe(false);
    });
  });

  describe('Permission Summary', () => {
    test('Owner permission summary should reflect unlimited access', () => {
      const summary = PermissionService.getPermissionSummary(ownerUser);
      
      expect(summary.isOwner).toBe(true);
      expect(summary.canManageUsers).toBe(true);
      expect(summary.canManageOrganization).toBe(true);
      expect(summary.canViewAnalytics).toBe(true);
      expect(summary.canExportData).toBe(true);
      expect(summary.canManageBilling).toBe(true);
      expect(summary.permissions.length).toBeGreaterThan(0);
    });

    test('Non-owner permission summary should show limitations', () => {
      const memberSummary = PermissionService.getPermissionSummary(memberUser);
      
      expect(memberSummary.isOwner).toBe(false);
      expect(memberSummary.canManageBilling).toBe(false);
      expect(memberSummary.permissions.length).toBeLessThan(ownerUser.getEffectivePermissions().length);
    });
  });
});