import React, { useState, useMemo } from 'react'
import { 
  ResolutionStatus, 
  ResolutionPriority,
  ResolutionStatusLabels,
  ResolutionPriorityLabels,
  ResolutionStatusColors,
  ResolutionPriorityColors,
  isResolutionOverdue,
  isDueSoon,
  calculateTimeRemaining
} from '@/types/resolution.types'
import { useMyTasks } from '@/hooks/useResolutions'
import ResolutionService from '@/services/resolutionService'

interface MyTasksDashboardProps {
  onTaskClick?: (taskId: string) => void
}

export const MyTasksDashboard: React.FC<MyTasksDashboardProps> = ({
  onTaskClick
}) => {
  const [filters, setFilters] = useState({
    status: undefined as ResolutionStatus | undefined,
    priority: undefined as ResolutionPriority | undefined,
    overdue: false
  })

  const {
    resolutions: tasks,
    loading,
    error,
    total,
    updateTask,
    refresh
  } = useMyTasks({
    sortBy: 'dueDate',
    sortOrder: 'asc',
    ...filters
  })

  // Statistiques calculées
  const stats = useMemo(() => {
    const overdueTasks = tasks.filter(isResolutionOverdue)
    const dueSoonTasks = tasks.filter(task => 
      task.dueDate && isDueSoon(task.dueDate, 48) && !isResolutionOverdue(task)
    )
    const completedTasks = tasks.filter(task => task.status === ResolutionStatus.COMPLETED)
    const inProgressTasks = tasks.filter(task => task.status === ResolutionStatus.IN_PROGRESS)
    
    const totalProgress = tasks.reduce((sum, task) => sum + (task.progress || 0), 0)
    const avgProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0

    return {
      total: tasks.length,
      overdue: overdueTasks.length,
      dueSoon: dueSoonTasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      avgProgress,
      completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
    }
  }, [tasks])

  const handleStatusChange = async (taskId: string, newStatus: ResolutionStatus) => {
    try {
      await updateTask(taskId, { status: newStatus })
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error)
    }
  }

  const handleProgressChange = async (taskId: string, progress: number) => {
    try {
      await updateTask(taskId, { progress })
    } catch (error) {
      console.error('Erreur lors de la mise à jour du progrès:', error)
    }
  }

  const StatCard: React.FC<{
    title: string
    value: number | string
    color: string
    icon: React.ReactNode
    subtitle?: string
  }> = ({ title, value, color, icon, subtitle }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )

  const TaskCard: React.FC<{ task: any }> = ({ task }) => {
    const isOverdue = isResolutionOverdue(task)
    const timeRemaining = task.dueDate ? calculateTimeRemaining(task.dueDate) : null
    const dueSoon = task.dueDate && isDueSoon(task.dueDate, 48)

    return (
      <div 
        className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
          isOverdue ? 'border-red-300 bg-red-50' : 
          dueSoon ? 'border-yellow-300 bg-yellow-50' : 
          'border-gray-200'
        }`}
        onClick={() => onTaskClick?.(task.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          </div>
          
          <div className="flex flex-col items-end space-y-2 ml-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              ResolutionStatusColors[task.status]
            }`}>
              {ResolutionStatusLabels[task.status]}
            </span>
            
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              ResolutionPriorityColors[task.priority]
            }`}>
              {ResolutionPriorityLabels[task.priority]}
            </span>
          </div>
        </div>

        {/* Échéance */}
        {task.dueDate && (
          <div className={`text-sm mb-3 ${
            isOverdue ? 'text-red-600 font-medium' : 
            dueSoon ? 'text-yellow-600 font-medium' : 
            'text-gray-500'
          }`}>
            <span>Échéance: {new Date(task.dueDate).toLocaleDateString()}</span>
            {timeRemaining && (
              <span className="ml-2">
                ({timeRemaining.isOverdue ? 'En retard de ' : 'Dans '}
                {timeRemaining.days > 0 && `${timeRemaining.days}j `}
                {timeRemaining.hours}h)
              </span>
            )}
          </div>
        )}

        {/* Barre de progression */}
        {task.progress !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progrès</span>
              <span>{task.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions rapides */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {task.status !== ResolutionStatus.COMPLETED && (
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(task.id, e.target.value as ResolutionStatus)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                {Object.entries(ResolutionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
            
            {task.status === ResolutionStatus.IN_PROGRESS && (
              <input
                type="range"
                min="0"
                max="100"
                value={task.progress || 0}
                onChange={(e) => handleProgressChange(task.id, parseInt(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-20"
              />
            )}
          </div>

          <div className="text-xs text-gray-500">
            {task.comments && task.comments.length > 0 && (
              <span>{task.comments.length} commentaire(s)</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Erreur: {error}</p>
        <button
          onClick={refresh}
          className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total des tâches"
          value={stats.total}
          color="text-blue-600"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        
        <StatCard
          title="En retard"
          value={stats.overdue}
          color="text-red-600"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle={stats.dueSoon > 0 ? `${stats.dueSoon} bientôt dues` : undefined}
        />
        
        <StatCard
          title="Taux de completion"
          value={`${stats.completionRate}%`}
          color="text-green-600"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtitle={`${stats.completed}/${stats.total} terminées`}
        />
        
        <StatCard
          title="Progrès moyen"
          value={`${stats.avgProgress}%`}
          color="text-purple-600"
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          subtitle={`${stats.inProgress} en cours`}
        />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Mes tâches</h3>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              status: e.target.value as ResolutionStatus || undefined 
            }))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(ResolutionStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              priority: e.target.value as ResolutionPriority || undefined 
            }))}
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
              checked={filters.overdue}
              onChange={(e) => setFilters(prev => ({ ...prev, overdue: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">En retard uniquement</span>
          </label>

          <button
            onClick={refresh}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-4">
        {loading && tasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Chargement...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">Aucune tâche trouvée</p>
            <p className="text-gray-400 text-sm mt-1">
              {Object.values(filters).some(Boolean) 
                ? 'Essayez de modifier les filtres' 
                : 'Vous n\'avez aucune tâche assignée pour le moment'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Tâches en retard */}
            {stats.overdue > 0 && !filters.status && !filters.priority && (
              <div>
                <h4 className="text-red-600 font-medium mb-3">⚠️ Tâches en retard ({stats.overdue})</h4>
                <div className="space-y-3">
                  {tasks.filter(isResolutionOverdue).map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Tâches bientôt dues */}
            {stats.dueSoon > 0 && !filters.status && !filters.priority && !filters.overdue && (
              <div>
                <h4 className="text-yellow-600 font-medium mb-3">⏰ Bientôt dues ({stats.dueSoon})</h4>
                <div className="space-y-3">
                  {tasks.filter(task => 
                    task.dueDate && isDueSoon(task.dueDate, 48) && !isResolutionOverdue(task)
                  ).map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Autres tâches */}
            <div>
              {!filters.status && !filters.priority && !filters.overdue && (
                <h4 className="text-gray-700 font-medium mb-3">Autres tâches</h4>
              )}
              <div className="space-y-3">
                {tasks.filter(task => {
                  if (filters.overdue) return true
                  if (filters.status || filters.priority) return true
                  return !isResolutionOverdue(task) && !(task.dueDate && isDueSoon(task.dueDate, 48))
                }).map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MyTasksDashboard