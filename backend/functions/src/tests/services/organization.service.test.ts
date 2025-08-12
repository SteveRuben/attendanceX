import { OrganizationService } from '../../services/organization.service';
import { OrganizationSector, OrganizationRole } from '@attendance-x/shared';
import { collections } from '../../config';

// Mock Firestore
jest.mock('../../config', () => ({
  collections: {
    organizations: {
      add: jest.fn(),
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      where: jest.fn(() => ({
        get: jest.fn()
      }))
    },
    users: {
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn()
      })),
      where: jest.fn(() => ({
        get: jest.fn()
      }))
    },
    user_invitations: {
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn()
      }))
    }
  }
}));

// Mock notification service
jest.mock('../../services/notification', () => ({
  notificationService: {
    sendNotification: jest.fn()
  }
}));

describe('OrganizationService', () => {
  let organizationService: OrganizationService;

  beforeEach(() => {
    organizationService = OrganizationService.getInstance();
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create organization successfully', async () => {
      const mockOrgDoc = { id: 'org123' };
      const mockUserDoc = {
        exists: true,
        data: () => ({
          id: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe'
        })
      };

      (collections.organizations.add as jest.Mock).mockResolvedValue(mockOrgDoc);
      (collections.users.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
        update: jest.fn().mockResolvedValue(undefined)
      });

      const result = await organizationService.createOrganization({
        name: 'Test Organization',
        description: 'Test Description',
        sector: OrganizationSector.TECHNOLOGY,
        website: 'https://test.com',
        address: {
          street: '123 Test St',
          city: 'Test City',
          postalCode: '12345',
          country: 'Test Country'
        }
      }, 'user123');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Organization');
      expect(result.sector).toBe(OrganizationSector.TECHNOLOGY);
      expect(collections.organizations.add).toHaveBeenCalled();
      expect(collections.users.doc).toHaveBeenCalledWith('user123');
    });

    it('should throw error if user not found', async () => {
      const mockUserDoc = { exists: false };

      (collections.users.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc)
      });

      await expect(organizationService.createOrganization({
        name: 'Test Organization',
        sector: OrganizationSector.TECHNOLOGY
      }, 'nonexistent')).rejects.toThrow('Utilisateur non trouvé');
    });
  });

  describe('addMember', () => {
    it('should add member successfully', async () => {
      const mockOrgDoc = {
        exists: true,
        data: () => ({
          id: 'org123',
          name: 'Test Organization',
          memberCount: 1,
          ownerId: 'owner123'
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({
          id: 'user123',
          email: 'test@example.com',
          organizationId: null
        })
      };

      (collections.organizations.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockOrgDoc),
        update: jest.fn().mockResolvedValue(undefined)
      });

      (collections.users.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc),
        update: jest.fn().mockResolvedValue(undefined)
      });

      await organizationService.addMember('org123', 'user123', OrganizationRole.MEMBER, 'owner123');

      expect(collections.organizations.doc).toHaveBeenCalledWith('org123');
      expect(collections.users.doc).toHaveBeenCalledWith('user123');
    });

    it('should throw error if user already in organization', async () => {
      const mockOrgDoc = {
        exists: true,
        data: () => ({
          id: 'org123',
          name: 'Test Organization',
          memberCount: 1
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({
          id: 'user123',
          email: 'test@example.com',
          organizationId: 'other-org'
        })
      };

      (collections.organizations.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockOrgDoc)
      });

      (collections.users.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUserDoc)
      });

      await expect(organizationService.addMember(
        'org123', 
        'user123', 
        OrganizationRole.MEMBER, 
        'owner123'
      )).rejects.toThrow('L\'utilisateur appartient déjà à une organisation');
    });
  });

  describe('sendInvitation', () => {
    it('should send invitation successfully', async () => {
      const mockOrgDoc = {
        exists: true,
        data: () => ({
          id: 'org123',
          name: 'Test Organization',
          ownerId: 'owner123'
        })
      };

      const mockExistingUserQuery = {
        empty: true,
        docs: []
      };

      const mockExistingInvitationQuery = {
        empty: true,
        docs: []
      };

      (collections.organizations.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockOrgDoc)
      });

      (collections.users.where as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockExistingUserQuery)
      });

      (collections.user_invitations.where as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockExistingInvitationQuery)
      });

      (collections.user_invitations.add as jest.Mock).mockResolvedValue({ id: 'invitation123' });

      const result = await organizationService.sendInvitation(
        'org123',
        'newuser@example.com',
        OrganizationRole.MEMBER,
        'owner123'
      );

      expect(result).toBeDefined();
      expect(result.email).toBe('newuser@example.com');
      expect(result.role).toBe(OrganizationRole.MEMBER);
      expect(collections.user_invitations.add).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const mockOrgDoc = {
        exists: true,
        data: () => ({
          id: 'org123',
          name: 'Test Organization'
        })
      };

      const mockExistingUserQuery = {
        empty: false,
        docs: [{ id: 'existing-user' }]
      };

      (collections.organizations.doc as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockOrgDoc)
      });

      (collections.users.where as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockExistingUserQuery)
      });

      await expect(organizationService.sendInvitation(
        'org123',
        'existing@example.com',
        OrganizationRole.MEMBER,
        'owner123'
      )).rejects.toThrow('Un utilisateur avec cet email existe déjà');
    });
  });

  describe('getOrganizationStats', () => {
    it('should return organization statistics', async () => {
      const mockMembersQuery = {
        size: 5,
        docs: [
          { data: () => ({ lastLoginAt: new Date() }) },
          { data: () => ({ lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }) },
          { data: () => ({ lastLoginAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }) },
          { data: () => ({ lastLoginAt: null }) },
          { data: () => ({ lastLoginAt: new Date() }) }
        ]
      };

      const mockInvitationsQuery = {
        size: 2
      };

      (collections.users.where as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockMembersQuery)
      });

      (collections.user_invitations.where as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValue(mockInvitationsQuery)
      });

      const stats = await organizationService.getOrganizationStats('org123');

      expect(stats).toBeDefined();
      expect(stats.totalMembers).toBe(5);
      expect(stats.activeMembers).toBe(2); // Last 7 days
      expect(stats.pendingInvitations).toBe(2);
      expect(stats.inactiveMembers).toBe(3);
    });
  });
});