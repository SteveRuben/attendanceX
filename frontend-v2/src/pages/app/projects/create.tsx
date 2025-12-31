import React from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ProjectCreationWizard } from '@/components/projects/ProjectCreationWizard'
import { useRouter } from 'next/router'
import { EventProject } from '@/types/project.types'

export default function CreateProjectPage() {
  const router = useRouter()

  const handleComplete = (project: EventProject) => {
    // Rediriger vers la page du projet créé
    router.push(`/app/projects/${project.id}`)
  }

  const handleCancel = () => {
    // Retourner à la liste des projets
    router.push('/app/projects')
  }

  return (
    <AppShell title="Créer un Projet">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Sticky Header - Standard Evelya */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <div className="text-blue-600 dark:text-blue-400">🎯</div>
              </div>
              Créer un Nouveau Projet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configurez votre projet d'événement avec des workflows structurés
            </p>
          </div>

          {/* Page Content */}
          <div className="space-y-6">
            <ProjectCreationWizard
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}