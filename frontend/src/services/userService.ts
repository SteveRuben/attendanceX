// src/services/userService.ts - Service pour la gestion des utilisateurs
import { apiService, type ApiResponse, type PaginatedResponse } from './apiService';
import { type User, type CreateUserRequest, type UpdateUserRequest, UserRole, UserStatus } from '@attendance-x/shared';

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
}

export const userService = new UserService();