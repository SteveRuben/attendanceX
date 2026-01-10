import { apiClient } from '@/services/apiClient'

export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  jobTitle?: string
  department?: string
  location?: string
  bio?: string
  avatarUrl?: string
  role?: string
  tenantId?: string
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
}

export interface UserProfileUpdate {
  firstName?: string
  lastName?: string
  phone?: string
  jobTitle?: string
  department?: string
  location?: string
  bio?: string
}

export interface UserAccountInfo {
  membership: {
    id: string
    tenantId: string
    userId: string
    role: string
    featurePermissions: string[]
    isActive: boolean
    joinedAt: string
    createdAt: string
    updatedAt: string
  }
  organization: {
    id: string
    name: string
  }
  lastLogin: string
}

export interface AvatarUploadResponse {
  avatarUrl: string
}

export class UserProfileService {
  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<UserProfile> {
    const res = await apiClient.get<any>('/users/me/profile', { withAuth: true })
    return this.mapProfile(res?.data ?? res)
  }

  /**
   * Update current user's profile
   */
  async updateMyProfile(updates: UserProfileUpdate): Promise<UserProfile> {
    const res = await apiClient.put<any>('/users/me/profile', updates, {
      withAuth: true,
      withToast: { 
        loading: 'Mise à jour du profil...', 
        success: 'Profil mis à jour avec succès' 
      },
    })
    return this.mapProfile(res?.data ?? res)
  }

  /**
   * Get current user's account information (role, organization, etc.)
   */
  async getMyAccountInfo(): Promise<UserAccountInfo> {
    const res = await apiClient.get<any>('/users/me/account-info', { withAuth: true })
    return this.mapAccountInfo(res?.data ?? res)
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData()
    formData.append('avatar', file)

    const res = await apiClient.post<any>('/users/me/avatar', formData, {
      withAuth: true,
      withToast: { 
        loading: 'Téléchargement de la photo...', 
        success: 'Photo de profil mise à jour' 
      },
    })
    return res?.data ?? res
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(): Promise<void> {
    await apiClient.delete('/users/me/avatar', {
      withAuth: true,
      withToast: { 
        loading: 'Suppression de la photo...', 
        success: 'Photo de profil supprimée' 
      },
    })
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/users/me/change-password', 
      { currentPassword, newPassword }, 
      {
        withAuth: true,
        withToast: { 
          loading: 'Changement du mot de passe...', 
          success: 'Mot de passe modifié avec succès' 
        },
      }
    )
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(reason?: string): Promise<void> {
    await apiClient.post('/users/me/request-deletion', 
      { reason }, 
      {
        withAuth: true,
        withToast: { 
          loading: 'Demande de suppression...', 
          success: 'Demande de suppression envoyée' 
        },
      }
    )
  }

  private mapProfile(data: any): UserProfile {
    return {
      id: String(data?.id ?? data?._id ?? ''),
      email: data?.email ?? '',
      firstName: data?.firstName,
      lastName: data?.lastName,
      displayName: data?.displayName || [data?.firstName, data?.lastName].filter(Boolean).join(' ') || data?.email,
      phone: data?.phone,
      jobTitle: data?.jobTitle,
      department: data?.department,
      location: data?.location,
      bio: data?.bio,
      avatarUrl: data?.avatarUrl || data?.photoURL,
      role: data?.role,
      tenantId: data?.tenantId,
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
      lastLoginAt: data?.lastLoginAt,
    }
  }

  private mapAccountInfo(data: any): UserAccountInfo {
    // Handle the new structure with membership and organization objects
    if (data?.membership && data?.organization) {
      return {
        membership: {
          id: data.membership.id || '',
          tenantId: data.membership.tenantId || '',
          userId: data.membership.userId || '',
          role: data.membership.role || 'member',
          featurePermissions: data.membership.featurePermissions || [],
          isActive: data.membership.isActive ?? true,
          joinedAt: data.membership.joinedAt || data.membership.createdAt || '',
          createdAt: data.membership.createdAt || '',
          updatedAt: data.membership.updatedAt || '',
        },
        organization: {
          id: data.organization.id || '',
          name: data.organization.name || 'Organisation non définie',
        },
        lastLogin: data.lastLogin || '',
      }
    }
    
    // Fallback for old structure (backward compatibility)
    return {
      membership: {
        id: `${data?.userId || 'unknown'}_${data?.tenantId || 'unknown'}`,
        tenantId: data?.tenantId || '',
        userId: data?.userId || '',
        role: data?.role || 'member',
        featurePermissions: data?.permissions || [],
        isActive: true,
        joinedAt: data?.joinDate || data?.createdAt || '',
        createdAt: data?.joinDate || data?.createdAt || '',
        updatedAt: new Date().toISOString(),
      },
      organization: {
        id: data?.tenantId || '',
        name: typeof data?.organization === 'string' ? data.organization : data?.organization?.name || 'Organisation non définie',
      },
      lastLogin: data?.lastLogin || data?.lastLoginAt || '',
    }
  }
}

export const userProfileService = new UserProfileService()