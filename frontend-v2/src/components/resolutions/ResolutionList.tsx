import React, { useState, useMemo } from 'react'
import { 
  Resolution, 
  ResolutionStatus, 
  ResolutionPriority,
  ResolutionStatusLabels,
  ResolutionPriorityLabels,
  ResolutionStatusColors,
  ResolutionPriorityColors,
  isResolutionOverdue,
  calculateTimeRemaining
} from '@/types/resolution.types'
import { useResolutions } from '@/hooks/useResolutions'
import ResolutionExport from './ResolutionExport'

interface ResolutionListProps {
  eventId: string
  onResolutionClick?: (resolution: Resolution) => void
  onCreateClick?: () => void
  showCreateButton?: boolean
}

interface FilterState {
  status?: ResolutionStatus
  priority?: ResolutionPriority
  assignedTo?: string
  overdue?: boolean
  search?: string
}

export const ResolutionList: React.FC<ResolutionListProps> = ({
  eventId,
  onResolutionClick,
  onCreateClick,
  showCreateButton = true
}) => {
  const [filters, setFilters] = useState<FilterState>({})
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status' | 'createdAt'>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const {
    resolutions,
    loading,
    error,
    total,
    hasMore,
    loadResolutions,
    loadMore,
    updateStatus,
    updateProgress
  } = useResolutions(eventId, {
    limit: 20,
    sortBy,
    sortOrder,
    ...filters
  })

  // Filtrage local pour la recherche
  const filteredResolutions = useMemo(() => {
    if (!filters.search) return resolutions

    const searchLower = filters.search.toLowerCase()
    return resolutions.filter(resolution =>
      resolution.title.toLowerCase().includes(searchLower) ||
      resolution.description.toLowerCase().includes(searchLower) ||
      resolution.assignedToNames?.some(name => 
        name.toLowerCase().includes(searchLower)
      )
    )
  }, [resolutions, filters.search])

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    loadResolutions(eventId, { 
      ...updatedFilters, 
      sortBy, 
      sortOrder, 
      offset: 0 
    })
  }

  const handleSortChange = (field: typeof sortBy) => {
    const newOrder = field === sortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortOrder(newOrder)
    loadResolutions(eventId, { 
      ...filters, 
      sortBy: field, 
      sortOrder: newOrder, 
      offset: 0 
    })
  }

  const handleStatusChange = async (resolutionId: string, newStatus: ResolutionStatus) => {
    try {
      await updateStatus(resolutionId, newStatus)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
    }
  }

  const handleProgressChange = async (resolutionId: string, progress: number) => {
    try {
      await updateProgress(resolutionId, progress)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du progrès:', error)
    }
  }

  const ResolutionCard: React.FC<{ resolution: Resolution }> = ({ resolution }) => {
    const isOverdue = isResolutionOverdue(resolution)
    const timeRemaining = resolution.dueDate ? calculateTimeRemaining(resolution.dueDate) : null

    return (
      <div 
        className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
          isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
        }`}
        onClick={() => onResolutionClick?.(resolution)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-1">{resolution.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{resolution.description}</p>
          </div>
          
          <div className="flex flex-col items-end space-y-2 ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              ResolutionStatusColors[resolution.status]
            }`}>
              {ResolutionStatusLabels[resolution.status]}
            </span>
            
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              ResolutionPriorityColors[resolution.priority]
            }`}>
              {ResolutionPriorityLabels[resolution.priority]}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center space-x-4">
            <span>Assigné à: {resolution.assignedToNames?.join(', ') || 'Non assigné'}</span>
            {resolution.dueDate && (
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {timeRemaining?.isOverdue ? 'En retard de ' : 'Dans '}
                {timeRemaining?.days > 0 && `${timeRemaining.days}j `}
                {timeRemaining?.hours}h
              </span>
            )}
          </div>
          
          {resolution.progress !== undefined && (
            <span>{resolution.progress}% terminé</span>
          )}
        </div>

        {/* Barre de progression */}
        {resolution.progress !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${resolution.progress}%` }}
            />
          </div>
        )}

        {/* Actions rapides */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {resolution.status !== ResolutionStatus.COMPLETED && (
              <select
                value={resolution.status}
                onChange={(e) => handleStatusChange(resolution.id, e.target.value as ResolutionStatus)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                {Object.entries(ResolutionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
            
            {resolution.status === ResolutionStatus.IN_PROGRESS && (
              <input
                type="range"
                min="0"
                max="100"
                value={resolution.progress || 0}
                onChange={(e) => handleProgressChange(resolution.id, parseInt(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-20"
              />
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {resolution.comments && resolution.comments.length > 0 && (
              <span>{resolution.comments.length} commentaire(s)</span>
            )}
            <span>{new Date(resolution.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Erreur: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Résolutions ({total})
          </h2>
          
          <div className="flex space-x-2">
            <ResolutionExport 
              eventId={eventId}
              currentFilters={filters}
            />
            {showCreateButton && (
              <button
                onClick={onCreateClick}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Nouvelle résolution
              </button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Rechercher..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange({ 
              status: e.target.value as ResolutionStatus || undefined 
            })}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(ResolutionStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <select
            value={filters.priority || ''}
            onChange={(e) => handleFilterChange({ 
              priority: e.target.value as ResolutionPriority || undefined 
            })}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Toutes les priorités</option>
            {Object.entries(ResolutionPriorityLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.overdue || false}
              onChange={(e) => handleFilterChange({ overdue: e.target.checked || undefined })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">En retard uniquement</span>
          </label>
        </div>

        {/* Tri */}
        <div className="flex space-x-2">
          <span className="text-sm text-gray-700">Trier par:</span>
          {(['dueDate', 'priority', 'status', 'createdAt'] as const).map((field) => (
            <button
              key={field}
              onClick={() => handleSortChange(field)}
              className={`text-sm px-2 py-1 rounded ${
                sortBy === field 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {field === 'dueDate' && 'Échéance'}
              {field === 'priority' && 'Priorité'}
              {field === 'status' && 'Statut'}
              {field === 'createdAt' && 'Date de création'}
              {sortBy === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des résolutions */}
      <div className="space-y-4">
        {loading && filteredResolutions.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Chargement...</p>
          </div>
        ) : filteredResolutions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucune résolution trouvée</p>
          </div>
        ) : (
          <>
            {filteredResolutions.map((resolution) => (
              <ResolutionCard key={resolution.id} resolution={resolution} />
            ))}
            
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : 'Charger plus'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ResolutionList