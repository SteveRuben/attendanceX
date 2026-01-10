import { useState, useEffect, useCallback } from 'react'
import { 
  Organization, 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
  OrganizationSettings,
  OrganizationBranding,
  DomainCheckResponse
} from '@/types/organization.types'
import { OrganizationService } from '@/services/organizationService'
import { useToast } from '@/hooks/useToast'

interface UseOrganizationReturn {
  organization: Organization | null
  loading: boolean
  error: string | null
  hasOrganization: boolean
  
  // Actions CRUD
  fetchOrganization: () => Promise<void>
  createOrganization: (data: CreateOrganizationRequest) => Promise<Organization>
  updateOrganization: (data: UpdateOrganizationRequest) => Promise<Organization>
  deleteOrganization: () => Promise<void>
  
  // Actions spécialisées
  updateSettings: (settings: Partial<OrganizationSettings>) => Promise<Organization>
  updateBranding: (branding: Partial<OrganizationBranding>) => Promise<Organization>
  
  // Utilitaires domaines
  checkSubdomainAvailability: (subdomain: string) => Promise<DomainCheckResponse>
  testSmtpConfiguration: (smtpConfig: any) => Promise<{ success: boolean; message: string }>
  testSmsConfiguration: (smsConfig: any) => Promise<{ success: boolean; message: string }>
  
  // État
  refresh: () => Promise<void>
  clearError: () => void
}

export const useOrganization = (): UseOrganizationReturn => {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchOrganization = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await OrganizationService.getOrganizationByTenant()
      setOrganization(data)
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement de l\'organisation'
      setError(errorMessage)
      console.error('Error fetching organization:', err)
      // Ne pas considérer l'absence d'organisation comme une erreur bloquante
      if (err.status === 404) {
        setOrganization(null)
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const createOrganization = useCallback(async (data: CreateOrganizationRequest): Promise<Organization> => {
    setLoading(true)
    setError(null)
    
    try {
      const newOrganization = await OrganizationService.createOrganization(data)
      setOrganization(newOrganization)
      return newOrganization
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création de l\'organisation'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  const updateOrganization = useCallback(async (data: UpdateOrganizationRequest): Promise<Organization> => {
    if (!organization) {
      throw new Error('Aucune organisation à mettre à jour')
    }

    setLoading(true)
    setError(null)
    
    try {
      const updatedOrganization = await OrganizationService.updateOrganization(organization.id, data)
      setOrganization(updatedOrganization)
      return updatedOrganization
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour de l\'organisation'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [organization, toast])

  const updateSettings = useCallback(async (settings: Partial<OrganizationSettings>): Promise<Organization> => {
    if (!organization) {
      throw new Error('Aucune organisation à mettre à jour')
    }

    setLoading(true)
    setError(null)
    
    try {
      const updatedOrganization = await OrganizationService.updateOrganizationSettings(organization.id, settings)
      setOrganization(updatedOrganization)
      return updatedOrganization
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour des paramètres'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [organization, toast])

  const updateBranding = useCallback(async (branding: Partial<OrganizationBranding>): Promise<Organization> => {
    if (!organization) {
      throw new Error('Aucune organisation à mettre à jour')
    }

    setLoading(true)
    setError(null)
    
    try {
      const updatedOrganization = await OrganizationService.updateOrganizationBranding(organization.id, branding)
      setOrganization(updatedOrganization)
      return updatedOrganization
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour du branding'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [organization, toast])

  const deleteOrganization = useCallback(async (): Promise<void> => {
    if (!organization) {
      throw new Error('Aucune organisation à supprimer')
    }

    setLoading(true)
    setError(null)
    
    try {
      await OrganizationService.deleteOrganization(organization.id)
      setOrganization(null)
      toast.success('Organisation supprimée avec succès')
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la suppression de l\'organisation'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [organization, toast])

  const checkSubdomainAvailability = useCallback(async (subdomain: string): Promise<DomainCheckResponse> => {
    try {
      return await OrganizationService.checkSubdomainAvailability(subdomain)
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la vérification du sous-domaine'
      toast.error(errorMessage)
      throw err
    }
  }, [toast])

  const testSmtpConfiguration = useCallback(async (smtpConfig: any): Promise<{ success: boolean; message: string }> => {
    if (!organization) {
      throw new Error('Aucune organisation configurée')
    }

    try {
      const result = await OrganizationService.testSmtpConfiguration(organization.id, smtpConfig)
      
      if (result.success) {
        toast.success('Configuration SMTP valide')
      } else {
        toast.error(`Test SMTP échoué: ${result.message}`)
      }
      
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du test SMTP'
      toast.error(errorMessage)
      return { success: false, message: errorMessage }
    }
  }, [organization, toast])

  const testSmsConfiguration = useCallback(async (smsConfig: any): Promise<{ success: boolean; message: string }> => {
    if (!organization) {
      throw new Error('Aucune organisation configurée')
    }

    try {
      const result = await OrganizationService.testSmsConfiguration(organization.id, smsConfig)
      
      if (result.success) {
        toast.success('Configuration SMS valide')
      } else {
        toast.error(`Test SMS échoué: ${result.message}`)
      }
      
      return result
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du test SMS'
      toast.error(errorMessage)
      return { success: false, message: errorMessage }
    }
  }, [organization, toast])

  const refresh = useCallback(async () => {
    await fetchOrganization()
  }, [fetchOrganization])

  // Charger l'organisation au montage du hook avec timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false)
        setError('Timeout lors du chargement de l\'organisation')
      }
    }, 10000) // 10 secondes de timeout

    fetchOrganization().finally(() => {
      clearTimeout(timeoutId)
    })

    return () => clearTimeout(timeoutId)
  }, [fetchOrganization])

  return {
    organization,
    loading,
    error,
    hasOrganization: !!organization,
    
    // Actions CRUD
    fetchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    
    // Actions spécialisées
    updateSettings,
    updateBranding,
    
    // Utilitaires
    checkSubdomainAvailability,
    testSmtpConfiguration,
    testSmsConfiguration,
    
    // État
    refresh,
    clearError
  }
}

export default useOrganization