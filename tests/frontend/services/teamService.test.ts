import { teamService } from '../../../frontend/src/services/teamService';
import { apiService } from '../../../frontend/src/services/apiService';
import { Team, CreateTeamRequest, TeamRole } from '@attendance-x/shared';

// Mock apiService
jest.mock('../../../frontend/src/services/apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('TeamService', () => {
  const organizationId = 'org-123';
  const teamId = 'team-456';
  const userId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTeam', () => {
    it('should create a team successfully', async () => {
      const createRequest: CreateTeamRequest = {
        name: 'Development Team',
        description: 'Software development team',
        department: 'IT',
        managerId: userId,
        settings: {
          canValidateAttendance: true,
          canCreateEvents: true,
          canInviteParticipants: false,
          canViewAllEvents: false,
          canExportData: false
        }
      };

      const mockTeam: Team = {
        id: teamId,
        organizationId,
        name: 'Development Team',
        description: 'Software development team',
        department: 'IT',
        managerId: userId,
        members: [],
        permissions: [],
        settings: createRequest.settings,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockTeam
      });

      const result = await teamService.createTeam(organizationId, createRequest);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/teams`,
        createRequest
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTeam);
    });

    it('should handle creation errors', async () => {
      const createRequest: CreateTeamRequest = {
        name: 'Test Team',
        managerId: userId,
        settings: {
          canValidateAttendance: true,
          canCreateEvents: false,
          canInviteParticipants: false,
          canViewAllEvents: false,
          canExportData: false
        }
      };

      mockApiService.post.mockRejectedValue(new Error('Creation failed'));

      await expect(teamService.createTeam(organizationId, createRequest))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('getTeams', () => {
    it('should fetch teams with filters', async () => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Team 1',
          department: 'IT',
          members: ['user-1'],
          isActive: true
        },
        {
          id: 'team-2',
          name: 'Team 2',
          department: 'HR',
          members: ['user-2'],
          isActive: true
        }
      ];

      mockApiService.get.mockResolvedValue({
        success: true,
        data: {
          data: mockTeams,
          total: 2,
          page: 1,
          limit: 10
        }
      });

      const filters = { department: 'IT', isActive: true };
      const result = await teamService.getTeams(organizationId, filters);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/teams`,
        { params: filters }
      );
      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockTeams);
    });
  });

  describe('addTeamMember', () => {
    it('should add a member to team successfully', async () => {
      const mockTeamMember = {
        id: 'member-123',
        teamId,
        userId,
        role: TeamRole.MEMBER,
        joinedAt: new Date(),
        isActive: true,
        permissions: []
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockTeamMember
      });

      const result = await teamService.addTeamMember(organizationId, teamId, userId, 'member');

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/teams/${teamId}/members`,
        { userId, role: 'member' }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTeamMember);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a member from team successfully', async () => {
      mockApiService.delete.mockResolvedValue({
        success: true,
        data: null
      });

      const result = await teamService.removeTeamMember(organizationId, teamId, userId);

      expect(mockApiService.delete).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/teams/${teamId}/members/${userId}`
      );
      expect(result.success).toBe(true);
    });
  });

  describe('assignUserToTeams', () => {
    it('should assign user to multiple teams', async () => {
      const teamIds = ['team-1', 'team-2', 'team-3'];
      
      mockApiService.post.mockResolvedValue({
        success: true,
        data: { assigned: 3, failed: 0 }
      });

      const result = await teamService.assignUserToTeams(organizationId, userId, teamIds, 'member');

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/users/${userId}/teams/bulk-assign`,
        { teamIds, role: 'member' }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('canValidateAttendance', () => {
    it('should check attendance validation permissions', async () => {
      const mockPermissions = {
        canValidate: true,
        reason: 'User has MEMBER role in team with validation permissions',
        allowedEvents: ['event-1', 'event-2'],
        maxValidationsPerSession: 50
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockPermissions
      });

      const result = await teamService.canValidateAttendance(organizationId, userId, 'event-123');

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/users/${userId}/can-validate-attendance`,
        { params: { eventId: 'event-123' } }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPermissions);
    });
  });

  describe('bulkAssignTeams', () => {
    it('should handle bulk team assignments', async () => {
      const assignments = [
        { userId: 'user-1', teamIds: ['team-1', 'team-2'], role: 'member' },
        { userId: 'user-2', teamIds: ['team-1'], role: 'manager' }
      ];

      const mockResult = {
        successful: 2,
        failed: 0,
        errors: []
      };

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockResult
      });

      const result = await teamService.bulkAssignTeams(organizationId, assignments);

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/teams/bulk-assign`,
        { assignments }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('createDefaultTeams', () => {
    it('should create default teams for a sector', async () => {
      const mockTeams = [
        { id: 'team-1', name: 'Administration', department: 'Admin' },
        { id: 'team-2', name: 'Development', department: 'IT' }
      ];

      mockApiService.post.mockResolvedValue({
        success: true,
        data: mockTeams
      });

      const result = await teamService.createDefaultTeams(organizationId, 'corporate');

      expect(mockApiService.post).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/teams/create-defaults`,
        { sector: 'corporate' }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTeams);
    });
  });

  describe('getTeamTemplates', () => {
    it('should fetch team templates for a sector', async () => {
      const mockTemplates = [
        {
          name: 'Development Team',
          description: 'Software development team',
          department: 'IT',
          defaultSettings: { canValidateAttendance: true }
        }
      ];

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockTemplates
      });

      const result = await teamService.getTeamTemplates('technology');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/team-templates/technology');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTemplates);
    });
  });

  describe('calculateUserPermissions', () => {
    it('should calculate effective user permissions', async () => {
      const mockPermissions = {
        systemPermissions: ['view_events', 'create_events'],
        organizationPermissions: ['manage_members'],
        teamPermissions: {
          'team-1': ['validate_attendance'],
          'team-2': ['create_events']
        },
        effectivePermissions: ['view_events', 'create_events', 'manage_members', 'validate_attendance']
      };

      mockApiService.get.mockResolvedValue({
        success: true,
        data: mockPermissions
      });

      const result = await teamService.calculateUserPermissions(organizationId, userId);

      expect(mockApiService.get).toHaveBeenCalledWith(
        `/api/organizations/${organizationId}/users/${userId}/permissions`
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPermissions);
    });
  });
});