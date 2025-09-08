// src/services/userService.ts - Service pour la gestion des utilisateurs
import { apiService, type ApiResponse, type PaginatedResponse } from './apiService';
import { type User, type CreateUserRequest, type UpdateUserRequest, UserRole, UserStatus } from '../shared';

export interface UserSearchFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  search?: string;
  includeInactive?: boolean;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
  recentlyJoined: number;
}

class UserService {
  // Get current user profile
  async getMyProfile(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/users/me');
  }

  // Update current user profile
  async updateProfile(data: Partial<UpdateUserRequest>): Promise<ApiResponse<User>> {
    return apiService.put<User>('/users/me', data);
  }

  // Get all users with filters
  async getUsers(filters: UserSearchFilters = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    return apiService.get<PaginatedResponse<User>>('/users', filters);
  }

  // Get user by ID
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiService.get<User>(`/users/${id}`);
  }

  // Create new user
  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return apiService.post<User>('/users', data);
  }

  // Update user
  async updateUser(id: string, data: Partial<UpdateUserRequest>): Promise<ApiResponse<User>> {
    return apiService.put<User>(`/users/${id}`, data);
  }

  // Change user role
  async changeUserRole(id: string, role: UserRole): Promise<ApiResponse<User>> {
    return apiService.post<User>(`/users/${id}/role`, { role });
  }

  // Change user status
  async changeUserStatus(id: string, status: UserStatus, reason?: string): Promise<ApiResponse<User>> {
    return apiService.post<User>(`/users/${id}/status`, { status, reason });
  }

  // Search users
  async searchUsers(query: string, filters?: Partial<UserSearchFilters>): Promise<ApiResponse<User[]>> {
    return apiService.post<User[]>('/users/search', { query, ...filters });
  }

  // Get user statistics
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return apiService.get<UserStats>('/users/stats');
  }

  // Accept invitation
  async acceptInvitation(token: string, password: string): Promise<ApiResponse<User>> {
    return apiService.post<User>('/users/invitations/accept', { token, password });
  }

  // Get user profile by ID
  async getUserProfile(userId: string): Promise<User> {
    const response = await apiService.get<User>(`/users/${userId}`);
    console.log(response);
    if (!response.success) {
      throw new Error(response.error || 'User not found');
    }
    return response.data as User;
  }

  // Create user profile
  async createUserProfile(userData: {
    uid: string;
    email: string;
    displayName: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt: Date;
  }): Promise<User> {
    const response = await apiService.post<User>('/users', userData);
    console.log(response);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create user profile');
    }
    return response.data as User;
  }

  // Get user organizations
  async getUserOrganizations(userId: string): Promise<ApiResponse<Array<{
    organizationId: string;
    organizationName: string;
    role: string;
    isActive: boolean;
    joinedAt: Date;
  }>>> {
    return apiService.get(`/users/${userId}/organizations`);
  }

  // Get user membership in specific organization
  async getUserOrganizationMembership(userId: string, organizationId: string): Promise<{
    organizationId: string;
    organizationName: string;
    role: string;
    isActive: boolean;
    joinedAt: Date;
    permissions: string[];
  }> {
    const response = await apiService.get(`/users/${userId}/organizations/${organizationId}`);
    console.log(response);
    if (!response.success) {
      throw new Error(response.error || 'User is not a member of this organization');
    }
    return response.data;
  }
}

export const userService = new UserService();