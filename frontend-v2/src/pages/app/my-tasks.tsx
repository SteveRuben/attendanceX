import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { CheckSquare, Calendar, BarChart3 } from 'lucide-react'
import MyTasksDashboard from '@/components/resolutions/MyTasksDashboard'
import ResolutionDetail from '@/components/resolutions/ResolutionDetail'

export default function MyTasksPage() {
  const [view, setView] = useState<'dashboard' | 'detail'>('dashboard')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId)
    setView('detail')
  }

  const handleBackToDashboard = () => {
    setSelectedTaskId(null)
    setView('dashboard')
  }

  return (
    <AppShell title="Mes tâches">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-semibold">Mes tâches</h1>
            </div>

            {view === 'detail' && (
              <Button variant="outline" onClick={handleBackToDashboard}>
                Retour au dashboard
              </Button>
            )}
          </div>

          {/* Navigation tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setView('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  view === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  view === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Calendrier
              </button>
            </nav>
          </div>

          {/* Content */}
          {view === 'dashboard' && (
            <MyTasksDashboard onTaskClick={handleTaskClick} />
          )}

          {view === 'detail' && selectedTaskId && (
            <ResolutionDetail
              resolutionId={selectedTaskId}
              onClose={handleBackToDashboard}
              canEdit={true}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}