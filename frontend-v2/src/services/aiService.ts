import { apiClient } from './apiClient'

export interface EventGenerationRequest {
  naturalLanguageInput: string
  preferences?: {
    defaultBudget?: number
    preferredVenues?: string[]
    defaultDuration?: number
  }
}

export interface GeneratedEvent {
  title: string
  description: string
  type: string
  estimatedDuration: number
  estimatedParticipants: number
  suggestedDate?: string
  suggestedTime?: string
  budget?: {
    min: number
    max: number
    currency: string
  }
  tasks: Array<{
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    estimatedTime: number
    dueDate?: string
  }>
  requirements: {
    venue: string[]
    catering: string[]
    equipment: string[]
    staff: string[]
  }
  confidence: number
}

export interface GeneratedEventResponse {
  event: GeneratedEvent
  suggestions: {
    venues: string[]
    improvements: string[]
    alternatives: string[]
  }
  metadata: {
    processingTime: number
    confidence: number
    model: string
  }
}

export interface CreateEventFromGeneratedRequest {
  generatedEventData: GeneratedEvent
}

export interface RefineEventRequest {
  refinementPrompt: string
}

export const aiService = {
  /**
   * Génère un événement à partir d'une description en langage naturel
   */
  async generateEvent(request: EventGenerationRequest): Promise<GeneratedEventResponse> {
    const response = await apiClient.post<{ data: GeneratedEventResponse }>('/api/ai/events/generate', request)
    return response.data
  },

  /**
   * Crée un événement réel à partir des données générées par l'IA
   */
  async createEventFromGenerated(request: CreateEventFromGeneratedRequest): Promise<{ eventId: string; title: string; type: string }> {
    const response = await apiClient.post<{ data: { eventId: string; title: string; type: string } }>('/api/ai/events/create-from-generated', request)
    return response.data
  },

  /**
   * Affine un événement existant avec de nouvelles instructions
   */
  async refineEvent(eventId: string, request: RefineEventRequest): Promise<GeneratedEventResponse> {
    const response = await apiClient.post<{ data: GeneratedEventResponse }>(`/api/ai/events/refine/${eventId}`, request)
    return response.data
  },

  /**
   * Teste la connexion avec le service IA
   */
  async testConnection(): Promise<{ aiServiceAvailable: boolean; timestamp: string }> {
    const response = await apiClient.get<{ data: { aiServiceAvailable: boolean; timestamp: string } }>('/api/ai/events/test-connection')
    return response.data
  }
}

export default aiService