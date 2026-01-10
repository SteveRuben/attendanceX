import { useState, useEffect, useCallback } from 'react'
import { userProfileService, UserProfile, UserProfileUpdate, UserAccountInfo } from '@/services/userProfileService'

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [accountInfo, setAccountInfo] = useState<UserAccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [profileData, accountData] = await Promise.all([
        userProfileService.getMyProfile(),
        userProfileService.getMyAccountInfo()
      ])
      setProfile(profileData)
      setAccountInfo(accountData)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du profil')
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: UserProfileUpdate) => {
    if (!profile) return

    try {
      setUpdating(true)
      setError(null)
      const updatedProfile = await userProfileService.updateMyProfile(updates)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du profil')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [profile])

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      setUpdating(true)
      setError(null)
      const result = await userProfileService.uploadAvatar(file)
      if (profile) {
        setProfile({ ...profile, avatarUrl: result.avatarUrl })
      }
      return result
    } catch (err: any) {
      setError(err.message || 'Erreur lors du téléchargement de la photo')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [profile])

  const deleteAvatar = useCallback(async () => {
    try {
      setUpdating(true)
      setError(null)
      await userProfileService.deleteAvatar()
      if (profile) {
        setProfile({ ...profile, avatarUrl: undefined })
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression de la photo')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [profile])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      setUpdating(true)
      setError(null)
      await userProfileService.changePassword(currentPassword, newPassword)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    accountInfo,
    loading,
    error,
    updating,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    changePassword,
    refetch: fetchProfile,
  }
}

export function useUserAccountInfo() {
  const [accountInfo, setAccountInfo] = useState<UserAccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccountInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await userProfileService.getMyAccountInfo()
      setAccountInfo(data)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des informations du compte')
      console.error('Error fetching account info:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccountInfo()
  }, [fetchAccountInfo])

  return {
    accountInfo,
    loading,
    error,
    refetch: fetchAccountInfo,
  }
}