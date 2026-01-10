import { useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import ResolutionList from '@/components/resolutions/ResolutionList'
import ResolutionForm from '@/components/resolutions/ResolutionForm'
import ResolutionDetail from '@/components/resolutions/ResolutionDetail'
import { Resolution, CreateResolutionRequest, UpdateResolutionRequest } from '@/types/resolution.types'
import { useResolutions } from '@/hooks/useResolutions'

export default function EventResolutionsPage() {
  const router = useRouter()
  const { id } = router.query
  const eventId = typeof id === 'string' ? id : ''

  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list')
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null)
  const [loading, setLoading] = useState(false)

  const { createResolution, updateResolution } = useResolutions(eventId)

  const handleCreateClick = () => {
    setSelectedResolution(null)
    setView('create')
  }

  const handleResolutionClick = (resolution: Resolution) => {
    setSelectedResolution(resolution)
    setView('detail')
  }

  const handleEditClick = () => {
    setView('edit')
  }

  const handleBackToList = () => {
    setSelectedResolution(null)
    setView('list')
  }

  const handleSubmitCreate = async (data: CreateResolutionRequest) => {
    if (!eventId) return

    setLoading(true)
    try {
      await createResolution(eventId, data)
      setView('list')
    } catch (error) {
      console.error('Erreur lors de la création:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEdit = async (data: UpdateResolutionRequest) => {
    if (!selectedResolution) return

    setLoading(true)
    try {
      const updated = await updateResolution(selectedResolution.id, data)
      setSelectedResolution(updated)
      setView('detail')
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Résolutions de l'événement">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/app/events/${eventId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à l'événement
              </Button>
              <h1 className="text-2xl font-semibold">Résolutions</h1>
            </div>

            {view === 'list' && (
              <Button onClick={handleCreateClick}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle résolution
              </Button>
            )}
          </div>

          {/* Content */}
          {view === 'list' && (
            <ResolutionList
              eventId={eventId}
              onResolutionClick={handleResolutionClick}
              onCreateClick={handleCreateClick}
              showCreateButton={false}
            />
          )}

          {view === 'create' && (
            <ResolutionForm
              eventId={eventId}
              onSubmit={handleSubmitCreate}
              onCancel={handleBackToList}
              loading={loading}
            />
          )}

          {view === 'edit' && selectedResolution && (
            <ResolutionForm
              eventId={eventId}
              resolution={selectedResolution}
              onSubmit={handleSubmitEdit}
              onCancel={() => setView('detail')}
              loading={loading}
            />
          )}

          {view === 'detail' && selectedResolution && (
            <ResolutionDetail
              resolutionId={selectedResolution.id}
              onEdit={handleEditClick}
              onClose={handleBackToList}
              canEdit={true}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
