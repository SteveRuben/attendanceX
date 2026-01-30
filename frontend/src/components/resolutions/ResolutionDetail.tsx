import React, { useState } from 'react'
import { 
  Resolution, 
  ResolutionStatus,
  ResolutionStatusLabels,
  ResolutionPriorityLabels,
  ResolutionStatusColors,
  ResolutionPriorityColors,
  isResolutionOverdue,
  calculateTimeRemaining
} from '@/types/resolution.types'
import { useResolution } from '@/hooks/useResolutions'
import ResolutionService from '@/services/resolutionService'

interface ResolutionDetailProps {
  resolutionId: string
  onEdit?: () => void
  onClose?: () => void
  canEdit?: boolean
}

export const ResolutionDetail: React.FC<ResolutionDetailProps> = ({
  resolutionId,
  onEdit,
  onClose,
  canEdit = true
}) => {
  const { resolution, loading, error, updateResolution } = useResolution(resolutionId)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [updatingProgress, setUpdatingProgress] = useState(false)

  const handleStatusChange = async (newStatus: ResolutionStatus) => {
    if (!resolution) return
    
    try {
      await ResolutionService.updateStatus(resolution.id, newStatus)
      // Le hook se chargera de mettre à jour les données
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
    }
  }

  const handleProgressChange = async (progress: number) => {
    if (!resolution) return
    
    setUpdatingProgress(true)
    try {
      await ResolutionService.updateProgress(resolution.id, progress)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du progrès:', error)
    } finally {
      setUpdatingProgress(false)
    }
  }

  const handleAddComment = async () => {
    if (!resolution || !newComment.trim()) return
    
    setAddingComment(true)
    try {
      await ResolutionService.addComment(resolution.id, newComment.trim())
      setNewComment('')
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error)
    } finally {
      setAddingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  if (error || !resolution) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Résolution non trouvée'}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    )
  }

  const isOverdue = isResolutionOverdue(resolution)
  const timeRemaining = resolution.dueDate ? calculateTimeRemaining(resolution.dueDate) : null

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* En-tête */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{resolution.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Créé par {resolution.createdByName || 'Utilisateur inconnu'}</span>
              <span>•</span>
              <span>{new Date(resolution.createdAt).toLocaleDateString()}</span>
              {resolution.updatedAt !== resolution.createdAt && (
                <>
                  <span>•</span>
                  <span>Modifié le {new Date(resolution.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {canEdit && onEdit && (
              <button
                onClick={onEdit}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Modifier
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Informations principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Statut et priorité */}
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                {canEdit ? (
                  <select
                    value={resolution.status}
                    onChange={(e) => handleStatusChange(e.target.value as ResolutionStatus)}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    {Object.entries(ResolutionStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    ResolutionStatusColors[resolution.status]
                  }`}>
                    {ResolutionStatusLabels[resolution.status]}
                  </span>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  ResolutionPriorityColors[resolution.priority]
                }`}>
                  {ResolutionPriorityLabels[resolution.priority]}
                </span>
              </div>
            </div>

            {/* Assignés */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignés</label>
              <div className="flex flex-wrap gap-2">
                {resolution.assignedToNames?.map((name, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {name}
                  </span>
                )) || (
                  <span className="text-gray-500 text-sm">Aucun assigné</span>
                )}
              </div>
            </div>

            {/* Tags */}
            {resolution.tags && resolution.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {resolution.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Échéance */}
            {resolution.dueDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                  <div>{new Date(resolution.dueDate).toLocaleDateString()}</div>
                  {timeRemaining && (
                    <div className="text-xs">
                      {timeRemaining.isOverdue ? 'En retard de ' : 'Dans '}
                      {timeRemaining.days > 0 && `${timeRemaining.days} jour(s) `}
                      {timeRemaining.hours} heure(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Heures */}
            <div className="grid grid-cols-2 gap-4">
              {resolution.estimatedHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimé</label>
                  <span className="text-sm text-gray-900">{resolution.estimatedHours}h</span>
                </div>
              )}
              {resolution.actualHours && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Réel</label>
                  <span className="text-sm text-gray-900">{resolution.actualHours}h</span>
                </div>
              )}
            </div>

            {/* Progrès */}
            {resolution.progress !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progrès ({resolution.progress}%)
                </label>
                {canEdit ? (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={resolution.progress}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                    disabled={updatingProgress}
                    className="w-full"
                  />
                ) : (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${resolution.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <div className="bg-gray-50 rounded-md p-4">
            <p className="text-gray-900 whitespace-pre-wrap">{resolution.description}</p>
          </div>
        </div>

        {/* Commentaires */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Commentaires ({resolution.comments?.length || 0})
          </label>
          
          {/* Nouveau commentaire */}
          {canEdit && (
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingComment ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          {/* Liste des commentaires */}
          <div className="space-y-4">
            {resolution.comments && resolution.comments.length > 0 ? (
              resolution.comments
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{comment.authorName}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-sm">Aucun commentaire</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResolutionDetail