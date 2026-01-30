import { useState, useCallback } from 'react'
import { aiService, EventGenerationRequest, GeneratedEventResponse, CreateEventFromGeneratedRequest, RefineEventRequest } from '@/services/aiService'

interface UseAIReturn {
  // État
  loading: boolean
  creating: boolean
  refining: boolean
  error: string | null
  generatedEvent: GeneratedEventResponse | null
  
  // Actions
  generateEvent: (request: EventGenerationRequest) => Promise<void>
  createEventFromGenerated: (request: CreateEventFromGeneratedRequest) => Promise<{ eventId: string; title: string; type: string } | null>
  refineEvent: (eventId: string, request: RefineEventRequest) => Promise<void>
  testConnection: () => Promise<boolean>
  clearError: () => void
  clearGeneratedEvent: () => void
}

export const useAI = (): UseAIReturn => {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedEvent, setGeneratedEvent] = useState<GeneratedEventResponse | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearGeneratedEvent = useCallback(() => {
    setGeneratedEvent(null)
  }, [])

  const generateEvent = useCallback(async (request: EventGenerationRequest) => {
    setLoading(true)
    setError(null)
    setGeneratedEvent(null)

    try {
      const response = await aiService.generateEvent(request)
      setGeneratedEvent(response)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Erreur lors de la génération'
      setError(errorMessage)
      console.error('Error generating event:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createEventFromGenerated = useCallback(async (request: CreateEventFromGeneratedRequest) => {
    setCreating(true)
    setError(null)

    try {
      const response = await aiService.createEventFromGenerated(request)
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Erreur lors de la création'
      setError(errorMessage)
      console.error('Error creating event from generated:', err)
      return null
    } finally {
      setCreating(false)
    }
  }, [])

  const refineEvent = useCallback(async (eventId: string, request: RefineEventRequest) => {
    setRefining(true)
    setError(null)

    try {
      const response = await aiService.refineEvent(eventId, request)
      setGeneratedEvent(response)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Erreur lors du raffinement'
      setError(errorMessage)
      console.error('Error refining event:', err)
    } finally {
      setRefining(false)
    }
  }, [])

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await aiService.testConnection()
      return response.aiServiceAvailable
    } catch (err: any) {
      console.error('Error testing AI connection:', err)
      return false
    }
  }, [])

  return {
    // État
    loading,
    creating,
    refining,
    error,
    generatedEvent,
    
    // Actions
    generateEvent,
    createEventFromGenerated,
    refineEvent,
    testConnection,
    clearError,
    clearGeneratedEvent
  }
}

export default useAI