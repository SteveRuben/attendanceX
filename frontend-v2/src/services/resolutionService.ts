import { apiClient } from '@/services/apiClient'
import { apiCache } from '@/utils/debounce'
import {
  Resolution,
  CreateResolutionRequest,
  UpdateResolutionRequest,
  ResolutionListOptions,
  ResolutionListResponse,
  ResolutionStats
} from '@/types/resolution.types'

export class ResolutionService {
  /**
   * Créer une résolution pour un événement
   */
  static async createResolution(
    eventId: string,
    data: CreateResolutionRequest
  ): Promise<Resolution> {
    const response = await apiClient.post<{ data: Resolution }>(
      `/events/${eventId}/resolutions`,
      data,
      {
        withToast: {
          loading: 'Création de la résolution...',
          success: 'Résolution créée avec succès'
        }
      }
    )
    return response.data
  }

  /**
   * Obtenir les résolutions d'un événement
   */
  static async getEventResolutions(
    eventId: string,
    options: ResolutionListOptions = {}
  ): Promise<ResolutionListResponse> {
    const params = new URLSearchParams()
    
    if (options.status) params.set('status', options.status)
    if (options.assignedTo) params.set('assignedTo', options.assignedTo)
    if (options.priority) params.set('priority', options.priority)
    if (options.overdue !== undefined) params.set('overdue', String(options.overdue))
    if (options.limit) params.set('limit', String(options.limit))
    if (options.offset) params.set('offset', String(options.offset))
    if (options.sortBy) params.set('sortBy', options.sortBy)
    if (options.sortOrder) params.set('sortOrder', options.sortOrder)

    const response = await apiClient.get<{ data: ResolutionListResponse }>(
      `/events/${eventId}/resolutions?${params.toString()}`
    )
    return response.data
  }

  /**
   * Obtenir une résolution par ID
   */
  static async getResolution(resolutionId: string): Promise<Resolution> {
    const response = await apiClient.get<{ data: Resolution }>(
      `/resolutions/${resolutionId}`
    )
    return response.data
  }

  /**
   * Mettre à jour une résolution
   */
  static async updateResolution(
    resolutionId: string,
    data: UpdateResolutionRequest
  ): Promise<Resolution> {
    const response = await apiClient.put<{ data: Resolution }>(
      `/resolutions/${resolutionId}`,
      data,
      {
        withToast: {
          loading: 'Mise à jour...',
          success: 'Résolution mise à jour'
        }
      }
    )
    return response.data
  }

  /**
   * Supprimer une résolution
   */
  static async deleteResolution(resolutionId: string): Promise<void> {
    await apiClient.delete(
      `/resolutions/${resolutionId}`,
      {
        withToast: {
          loading: 'Suppression...',
          success: 'Résolution supprimée'
        }
      }
    )
  }

  /**
   * Mettre à jour le statut d'une résolution
   */
  static async updateStatus(
    resolutionId: string,
    status: string
  ): Promise<Resolution> {
    const response = await apiClient.put<{ data: Resolution }>(
      `/resolutions/${resolutionId}/status`,
      { status },
      {
        withToast: {
          loading: 'Mise à jour du statut...',
          success: 'Statut mis à jour'
        }
      }
    )
    return response.data
  }

  /**
   * Mettre à jour le progrès d'une résolution
   */
  static async updateProgress(
    resolutionId: string,
    progress: number
  ): Promise<Resolution> {
    const response = await apiClient.put<{ data: Resolution }>(
      `/resolutions/${resolutionId}/progress`,
      { progress },
      {
        withToast: {
          loading: 'Mise à jour du progrès...',
          success: 'Progrès mis à jour'
        }
      }
    )
    return response.data
  }

  /**
   * Ajouter un commentaire à une résolution
   */
  static async addComment(
    resolutionId: string,
    content: string
  ): Promise<Resolution> {
    const response = await apiClient.post<{ data: Resolution }>(
      `/resolutions/${resolutionId}/comments`,
      { content },
      {
        withToast: {
          loading: 'Ajout du commentaire...',
          success: 'Commentaire ajouté'
        }
      }
    )
    return response.data
  }

  /**
   * Obtenir les tâches assignées à l'utilisateur
   */
  static async getMyTasks(
    options: ResolutionListOptions = {}
  ): Promise<ResolutionListResponse> {
    try {
      // Créer une clé de cache basée sur les options
      const cacheKey = `my-tasks-${JSON.stringify(options)}`
      
      // Vérifier le cache
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const params = new URLSearchParams()
      
      if (options.status) params.set('status', options.status)
      if (options.priority) params.set('priority', options.priority)
      if (options.overdue !== undefined) params.set('overdue', String(options.overdue))
      if (options.limit) params.set('limit', String(options.limit))
      if (options.offset) params.set('offset', String(options.offset))
      if (options.sortBy) params.set('sortBy', options.sortBy)
      if (options.sortOrder) params.set('sortOrder', options.sortOrder)

      const response = await apiClient.get<{ data: ResolutionListResponse }>(
        `/resolutions/my-tasks?${params.toString()}`
      )
      
      // Mettre en cache le résultat
      apiCache.set(cacheKey, response.data)
      
      return response.data
    } catch (error) {
      console.warn('API non disponible pour getMyTasks, retour de données vides:', error)
      // Retourner des données vides en cas d'erreur API
      return {
        resolutions: [],
        total: 0,
        hasMore: false
      }
    }
  }

  /**
   * Obtenir les statistiques des résolutions
   */
  static async getStats(
    eventId?: string,
    period: string = 'month'
  ): Promise<ResolutionStats> {
    const params = new URLSearchParams()
    if (eventId) params.set('eventId', eventId)
    params.set('period', period)

    const response = await apiClient.get<{ data: ResolutionStats }>(
      `/resolutions/stats?${params.toString()}`
    )
    return response.data
  }

  /**
   * Exporter les résolutions
   */
  static async exportResolutions(
    eventId: string,
    format: 'csv' | 'excel' | 'pdf' = 'csv',
    options: ResolutionListOptions = {}
  ): Promise<void> {
    const params = new URLSearchParams()
    params.set('format', format)
    
    if (options.status) params.set('status', options.status)
    if (options.assignedTo) params.set('assignedTo', options.assignedTo)
    if (options.priority) params.set('priority', options.priority)
    if (options.overdue !== undefined) params.set('overdue', String(options.overdue))

    // Téléchargement direct du fichier
    const response = await fetch(
      `/api/events/${eventId}/resolutions/export?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Erreur lors de l\'export')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resolutions-${eventId}-${Date.now()}.${format}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }
}

export default ResolutionService