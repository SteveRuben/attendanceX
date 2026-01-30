# Système de Résolutions - Documentation Frontend

## Vue d'ensemble

Le système de résolutions permet aux utilisateurs de créer, gérer et suivre les tâches et décisions qui découlent des réunions. Cette intégration frontend fournit une interface complète pour interagir avec les APIs de résolution.

## Architecture

### Structure des fichiers

```
src/
├── types/resolution.types.ts          # Types TypeScript
├── services/resolutionService.ts      # Service API
├── hooks/useResolutions.ts            # Hooks React
├── components/resolutions/
│   ├── ResolutionList.tsx            # Liste des résolutions
│   ├── ResolutionForm.tsx            # Formulaire création/modification
│   ├── ResolutionDetail.tsx          # Vue détaillée
│   ├── MyTasksDashboard.tsx          # Dashboard personnel
│   ├── ResolutionNotifications.tsx   # Notifications
│   ├── ResolutionExport.tsx          # Export de données
│   └── index.ts                      # Exports centralisés
└── pages/app/
    ├── my-tasks.tsx                  # Page des tâches personnelles
    └── events/[id]/resolutions.tsx   # Page des résolutions d'événement
```

## Composants

### 1. ResolutionList

Affiche la liste des résolutions avec filtrage et tri.

```tsx
import { ResolutionList } from '@/components/resolutions'

<ResolutionList
  eventId="event-123"
  onResolutionClick={(resolution) => console.log(resolution)}
  onCreateClick={() => setShowForm(true)}
  showCreateButton={true}
/>
```

**Props:**
- `eventId`: ID de l'événement
- `onResolutionClick?`: Callback lors du clic sur une résolution
- `onCreateClick?`: Callback pour créer une nouvelle résolution
- `showCreateButton?`: Afficher le bouton de création (défaut: true)

### 2. ResolutionForm

Formulaire pour créer ou modifier une résolution.

```tsx
import { ResolutionForm } from '@/components/resolutions'

<ResolutionForm
  eventId="event-123"
  resolution={existingResolution} // Optionnel pour modification
  eventParticipants={participants}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  loading={false}
/>
```

**Props:**
- `eventId`: ID de l'événement
- `resolution?`: Résolution existante pour modification
- `eventParticipants?`: Liste des participants pour assignation
- `onSubmit`: Callback de soumission
- `onCancel`: Callback d'annulation
- `loading?`: État de chargement

### 3. ResolutionDetail

Vue détaillée d'une résolution avec commentaires et historique.

```tsx
import { ResolutionDetail } from '@/components/resolutions'

<ResolutionDetail
  resolutionId="resolution-123"
  onEdit={() => setEditMode(true)}
  onClose={() => setShowDetail(false)}
  canEdit={true}
/>
```

**Props:**
- `resolutionId`: ID de la résolution
- `onEdit?`: Callback pour éditer
- `onClose?`: Callback pour fermer
- `canEdit?`: Permissions d'édition (défaut: true)

### 4. MyTasksDashboard

Dashboard personnel des tâches assignées.

```tsx
import { MyTasksDashboard } from '@/components/resolutions'

<MyTasksDashboard
  onTaskClick={(taskId) => router.push(`/task/${taskId}`)}
/>
```

**Props:**
- `onTaskClick?`: Callback lors du clic sur une tâche

### 5. ResolutionNotifications

Composant de notifications pour les résolutions.

```tsx
import { ResolutionNotifications } from '@/components/resolutions'

<ResolutionNotifications
  onNotificationClick={(resolutionId) => openResolution(resolutionId)}
/>
```

**Props:**
- `onNotificationClick?`: Callback lors du clic sur une notification

### 6. ResolutionExport

Composant d'export des résolutions.

```tsx
import { ResolutionExport } from '@/components/resolutions'

<ResolutionExport
  eventId="event-123"
  currentFilters={filters}
  onExportStart={() => setLoading(true)}
  onExportComplete={() => setLoading(false)}
  onExportError={(error) => showError(error)}
/>
```

**Props:**
- `eventId`: ID de l'événement
- `currentFilters?`: Filtres actuels à appliquer
- `onExportStart?`: Callback de début d'export
- `onExportComplete?`: Callback de fin d'export
- `onExportError?`: Callback d'erreur

## Hooks

### useResolutions

Hook principal pour gérer les résolutions d'un événement.

```tsx
import { useResolutions } from '@/hooks/useResolutions'

const {
  resolutions,
  loading,
  error,
  total,
  hasMore,
  loadResolutions,
  loadMore,
  createResolution,
  updateResolution,
  deleteResolution,
  updateStatus,
  updateProgress,
  addComment,
  refresh
} = useResolutions(eventId, options)
```

### useResolution

Hook pour une résolution spécifique.

```tsx
import { useResolution } from '@/hooks/useResolutions'

const {
  resolution,
  loading,
  error,
  loadResolution,
  updateResolution,
  refresh
} = useResolution(resolutionId)
```

### useMyTasks

Hook pour les tâches personnelles.

```tsx
import { useMyTasks } from '@/hooks/useResolutions'

const {
  resolutions: tasks,
  loading,
  error,
  total,
  hasMore,
  loadTasks,
  updateTask,
  refresh
} = useMyTasks(options)
```

## Service API

### ResolutionService

Service pour interagir avec l'API backend.

```tsx
import ResolutionService from '@/services/resolutionService'

// Créer une résolution
const resolution = await ResolutionService.createResolution(eventId, data)

// Obtenir les résolutions d'un événement
const response = await ResolutionService.getEventResolutions(eventId, options)

// Mettre à jour une résolution
const updated = await ResolutionService.updateResolution(id, data)

// Ajouter un commentaire
const withComment = await ResolutionService.addComment(id, content)

// Obtenir mes tâches
const myTasks = await ResolutionService.getMyTasks(options)

// Exporter des résolutions
await ResolutionService.exportResolutions(eventId, format, options)
```

## Types

### Interfaces principales

```tsx
interface Resolution {
  id: string
  eventId: string
  title: string
  description: string
  assignedTo: string[]
  assignedToNames?: string[]
  createdBy: string
  createdByName?: string
  dueDate?: string
  status: ResolutionStatus
  priority: ResolutionPriority
  tags?: string[]
  comments?: ResolutionComment[]
  progress?: number
  estimatedHours?: number
  actualHours?: number
  tenantId: string
  createdAt: string
  updatedAt: string
}

enum ResolutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

enum ResolutionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}
```

## Utilisation dans les pages

### Page d'événement

Ajouter un lien vers les résolutions dans la page d'événement :

```tsx
import { CheckSquare } from 'lucide-react'

<Button 
  variant="outline" 
  onClick={() => router.push(`/app/events/${eventId}/resolutions`)}
>
  <CheckSquare className="w-4 h-4 mr-2" />
  Résolutions
</Button>
```

### Page des tâches personnelles

```tsx
// pages/app/my-tasks.tsx
import MyTasksDashboard from '@/components/resolutions/MyTasksDashboard'

export default function MyTasksPage() {
  return (
    <AppShell title="Mes tâches">
      <MyTasksDashboard onTaskClick={handleTaskClick} />
    </AppShell>
  )
}
```

## Intégration avec les notifications

Pour intégrer les notifications de résolutions dans la barre de navigation :

```tsx
import ResolutionNotifications from '@/components/resolutions/ResolutionNotifications'

// Dans votre composant de navigation
<ResolutionNotifications
  onNotificationClick={(resolutionId) => {
    router.push(`/app/resolution/${resolutionId}`)
  }}
/>
```

## Personnalisation

### Styles

Les composants utilisent Tailwind CSS. Vous pouvez personnaliser les styles en modifiant les classes CSS dans chaque composant.

### Couleurs des statuts et priorités

Les couleurs sont définies dans `resolution.types.ts` :

```tsx
export const ResolutionStatusColors: Record<ResolutionStatus, string> = {
  [ResolutionStatus.PENDING]: 'bg-gray-100 text-gray-800',
  [ResolutionStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [ResolutionStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [ResolutionStatus.CANCELLED]: 'bg-red-100 text-red-800'
}
```

### Labels

Les labels sont également personnalisables :

```tsx
export const ResolutionStatusLabels: Record<ResolutionStatus, string> = {
  [ResolutionStatus.PENDING]: 'En attente',
  [ResolutionStatus.IN_PROGRESS]: 'En cours',
  [ResolutionStatus.COMPLETED]: 'Terminé',
  [ResolutionStatus.CANCELLED]: 'Annulé'
}
```

## Performance

### Optimisations

1. **Pagination** : Les listes utilisent la pagination pour éviter de charger trop de données
2. **Cache local** : Les hooks maintiennent un cache local des données
3. **Mise à jour optimiste** : Les modifications sont reflétées immédiatement dans l'UI
4. **Lazy loading** : Chargement à la demande des détails des résolutions

### Bonnes pratiques

1. Utilisez `useResolutions` avec des options de filtrage pour limiter les données chargées
2. Implémentez la pagination pour les grandes listes
3. Utilisez `useMemo` pour les calculs coûteux dans les composants
4. Évitez les re-renders inutiles avec `useCallback`

## Tests

### Tests unitaires

```tsx
import { render, screen } from '@testing-library/react'
import ResolutionList from '@/components/resolutions/ResolutionList'

test('affiche la liste des résolutions', () => {
  render(<ResolutionList eventId="test-event" />)
  expect(screen.getByText('Résolutions')).toBeInTheDocument()
})
```

### Tests d'intégration

```tsx
import { renderHook } from '@testing-library/react-hooks'
import { useResolutions } from '@/hooks/useResolutions'

test('charge les résolutions', async () => {
  const { result, waitForNextUpdate } = renderHook(() => 
    useResolutions('test-event')
  )
  
  await waitForNextUpdate()
  expect(result.current.resolutions).toBeDefined()
})
```

## Dépannage

### Problèmes courants

1. **Résolutions non chargées** : Vérifiez que l'eventId est correct
2. **Erreurs de permissions** : Vérifiez que l'utilisateur a les bonnes permissions
3. **Notifications non affichées** : Vérifiez que le hook useMyTasks fonctionne
4. **Export échoue** : Vérifiez les filtres et le format d'export

### Debug

Activez les logs de debug dans le service :

```tsx
// Dans resolutionService.ts
console.log('API call:', endpoint, data)
```

## Roadmap

### Fonctionnalités futures

1. **Notifications push** : Notifications en temps réel
2. **Collaboration** : Édition collaborative des résolutions
3. **Templates** : Modèles de résolutions prédéfinis
4. **Intégration calendrier** : Synchronisation avec les calendriers
5. **Rapports avancés** : Analytics et métriques détaillées