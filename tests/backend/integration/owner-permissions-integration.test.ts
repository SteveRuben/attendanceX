import { UserModel } from '../../../backend/functions/src/models/user.model';
import { PermissionService } from '../../../backend/functions/src/services/permission.service';
import { OrganizationRole, UserRole, UserStatus } from '@attendance-x/shared';

describe('Owner Permissions Integration Tests', () => {
  describe('Real-world scenarios', () => {
    let ownerUser: UserModel;
    let adminUser: UserModel;
    let memberUser: UserModel;

    beforeEach(() => {
      // Créer des utilisateurs avec des données réalistes
      ownerUser = new UserModel({
        id: 'owner-123',
        email: 'owner@company.com',
        name: 'John Owner',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        organizationId: 'company-org',
        organizationRole: OrganizationRole.OWNER,
        isActive: true,
        organizationPermissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      adminUser = new UserModel({
        id: 'admin-456',
        email: 'admin@company.com',
        name: 'Jane Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        organizationId: 'company-org',
        organizationRole: OrganizationRole.ADMIN,
        isActive: true,
        organizationPermissions: ['VIEW_ORGANIZATION', 'MANAGE_MEMBERS'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      memberUser = new UserModel({
        id: 'member-789',
        email: 'member@company.com',
        name: 'Bob Member',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        organizationId: 'company-org',
        organizationRole: OrganizationRole.MEMBER,
        isActive: true,
        organizationPermissions: ['VIEW_ORGANIZATION'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    test('Owner can perform critical organization actions', () => {
      // Actions que seul le owner peut faire
      expect(ownerUser.canPerformOrganizationAction('DELETE_ORGANIZATION')).toBe(true);
      expect(ownerUser.canPerformOrganizationAction('TRANSFER_OWNERSHIP')).toBe(true);
      expect(ownerUser.canPerformOrganizationAction('MANAGE_BILLING')).toBe(true);

      // Vérifier que les autres ne peuvent pas
      expect(adminUser.canPerformOrganizationAction('DELETE_ORGANIZATION')).toBe(false);
      expect(memberUser.canPerformOrganizationAction('DELETE_ORGANIZATION')).toBe(false);
    });

    test('Owner can manage all users in organization', () => {
      // Le owner peut gérer tout le monde
      expect(PermissionService.canManageUser(ownerUser, adminUser)).toBe(true);
      expect(PermissionService.canManageUser(ownerUser, memberUser)).toBe(true);

      // L'admin ne peut pas gérer le owner
      expect(PermissionService.canManageUser(adminUser, ownerUser)).toBe(false);
      
      // Mais peut gérer les members
      expect(PermissionService.canManageUser(adminUser, memberUser)).toBe(true);
    });

    test('Owner can assign any role including owner', () => {
      const allRoles = [
        OrganizationRole.OWNER,
        OrganizationRole.ADMIN,
        OrganizationRole.MANAGER,
        OrganizationRole.MEMBER,
        OrganizationRole.VIEWER
      ];

      // Le owner peut assigner tous les rôles
      allRoles.forEach(role => {
        expect(PermissionService.canAssignRole(ownerUser, role)).toBe(true);
      });

      // L'admin ne peut pas assigner le rôle owner
      expect(PermissionService.canAssignRole(adminUser, OrganizationRole.OWNER)).toBe(false);
      expect(PermissionService.canAssignRole(adminUser, OrganizationRole.ADMIN)).toBe(true);
    });

    test('Owner has comprehensive permission summary', () => {
      const ownerSummary = PermissionService.getPermissionSummary(ownerUser);
      const adminSummary = PermissionService.getPermissionSummary(adminUser);

      // Vérifications owner
      expect(ownerSummary.isOwner).toBe(true);
      expect(ownerSummary.canManageUsers).toBe(true);
      expect(ownerSummary.canManageOrganization).toBe(true);
      expect(ownerSummary.canViewAnalytics).toBe(true);
      expect(ownerSummary.canExportData).toBe(true);
      expect(ownerSummary.canManageBilling).toBe(true);

      // Vérifications admin (limitations)
      expect(adminSummary.isOwner).toBe(false);
      expect(adminSummary.canManageBilling).toBe(false); // Seul le owner peut
    });

    test('Owner permissions work with inactive users', () => {
      // Même inactif, le owner garde ses droits de propriété
      const inactiveOwner = new UserModel({
        ...ownerUser.toUser(),
        isActive: false
      });

      // Les actions organisationnelles nécessitent d'être actif
      expect(inactiveOwner.canPerformOrganizationAction('DELETE_ORGANIZATION')).toBe(false);
      
      // Mais le statut owner reste
      expect(inactiveOwner.isOrganizationOwner()).toBe(true);
    });

    test('Owner unlimited access verification', () => {
      expect(ownerUser.hasUnlimitedAccess()).toBe(true);
      expect(PermissionService.hasUnlimitedAccess(ownerUser)).toBe(true);
      
      expect(adminUser.hasUnlimitedAccess()).toBe(false);
      expect(PermissionService.hasUnlimitedAccess(adminUser)).toBe(false);
      
      expect(memberUser.hasUnlimitedAccess()).toBe(false);
      expect(PermissionService.hasUnlimitedAccess(memberUser)).toBe(false);
    });

    test('Owner can access sensitive data', () => {
      expect(PermissionService.canViewSensitiveData(ownerUser)).toBe(true);
      expect(PermissionService.canViewSensitiveData(adminUser)).toBe(true); // Admin aussi
      expect(PermissionService.canViewSensitiveData(memberUser)).toBe(false);
    });
  });
});