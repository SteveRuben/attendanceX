import React, { useState, useEffect } from 'react'
import { 
  Resolution, 
  CreateResolutionRequest, 
  UpdateResolutionRequest,
  ResolutionPriority,
  ResolutionPriorityLabels 
} from '@/types/resolution.types'

interface ResolutionFormProps {
  eventId: string
  resolution?: Resolution
  eventParticipants?: Array<{ id: string; name: string; email: string }>
  onSubmit: (data: CreateResolutionRequest | UpdateResolutionRequest) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

interface FormData {
  title: string
  description: string
  assignedTo: string[]
  dueDate: string
  priority: ResolutionPriority
  tags: string[]
  estimatedHours: number | undefined
}

interface FormErrors {
  title?: string
  description?: string
  assignedTo?: string
  dueDate?: string
  estimatedHours?: string
}

export const ResolutionForm: React.FC<ResolutionFormProps> = ({
  eventId,
  resolution,
  eventParticipants = [],
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    assignedTo: [],
    dueDate: '',
    priority: ResolutionPriority.MEDIUM,
    tags: [],
    estimatedHours: undefined
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [newTag, setNewTag] = useState('')

  // Pré-remplir le formulaire si on modifie une résolution existante
  useEffect(() => {
    if (resolution) {
      setFormData({
        title: resolution.title,
        description: resolution.description,
        assignedTo: resolution.assignedTo,
        dueDate: resolution.dueDate ? resolution.dueDate.split('T')[0] : '',
        priority: resolution.priority,
        tags: resolution.tags || [],
        estimatedHours: resolution.estimatedHours
      })
    }
  }, [resolution])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est obligatoire'
    } else if (formData.title.length < 3) {
      newErrors.title = 'Le titre doit contenir au moins 3 caractères'
    } else if (formData.title.length > 200) {
      newErrors.title = 'Le titre ne peut pas dépasser 200 caractères'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire'
    } else if (formData.description.length < 10) {
      newErrors.description = 'La description doit contenir au moins 10 caractères'
    } else if (formData.description.length > 2000) {
      newErrors.description = 'La description ne peut pas dépasser 2000 caractères'
    }

    if (formData.assignedTo.length === 0) {
      newErrors.assignedTo = 'Au moins un assigné est requis'
    }

    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate)
      const now = new Date()
      now.setHours(0, 0, 0, 0) // Reset time to compare only dates
      
      if (dueDate < now) {
        newErrors.dueDate = 'La date d\'échéance ne peut pas être dans le passé'
      }
    }

    if (formData.estimatedHours !== undefined && formData.estimatedHours < 0) {
      newErrors.estimatedHours = 'Le nombre d\'heures estimées doit être positif'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const submitData: CreateResolutionRequest | UpdateResolutionRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate || undefined,
        priority: formData.priority,
        tags: formData.tags,
        estimatedHours: formData.estimatedHours
      }

      await onSubmit(submitData)
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
    }
  }

  const handleAssigneeToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter(id => id !== userId)
        : [...prev.assignedTo, userId]
    }))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {resolution ? 'Modifier la résolution' : 'Nouvelle résolution'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titre */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titre *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`w-full border rounded-md px-3 py-2 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Titre de la résolution"
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full border rounded-md px-3 py-2 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Description détaillée de la résolution"
          />
          {errors.description && (
            <p className="text-red-600 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {/* Assignés */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assignés *
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
            {eventParticipants.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun participant disponible</p>
            ) : (
              eventParticipants.map((participant) => (
                <label key={participant.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.assignedTo.includes(participant.id)}
                    onChange={() => handleAssigneeToggle(participant.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    {participant.name} ({participant.email})
                  </span>
                </label>
              ))
            )}
          </div>
          {errors.assignedTo && (
            <p className="text-red-600 text-sm mt-1">{errors.assignedTo}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date d'échéance */}
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Date d'échéance
            </label>
            <input
              type="date"
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full border rounded-md px-3 py-2 ${
                errors.dueDate ? 'border-red-300' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.dueDate && (
              <p className="text-red-600 text-sm mt-1">{errors.dueDate}</p>
            )}
          </div>

          {/* Priorité */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priorité
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                priority: e.target.value as ResolutionPriority 
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ResolutionPriorityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Heures estimées */}
        <div>
          <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 mb-1">
            Heures estimées
          </label>
          <input
            type="number"
            id="estimatedHours"
            min="0"
            step="0.5"
            value={formData.estimatedHours || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined 
            }))}
            className={`w-full border rounded-md px-3 py-2 ${
              errors.estimatedHours ? 'border-red-300' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Nombre d'heures estimées"
          />
          {errors.estimatedHours && (
            <p className="text-red-600 text-sm mt-1">{errors.estimatedHours}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ajouter un tag"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Enregistrement...' : (resolution ? 'Mettre à jour' : 'Créer')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ResolutionForm