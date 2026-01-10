# UI Patterns & Design System - AttendanceX

Ce document définit les patterns UI standardisés et le système de design pour maintenir la cohérence visuelle et d'expérience utilisateur dans l'application AttendanceX.

## Architecture des Pages

### Structure Standard des Pages
Toutes les pages de l'application doivent suivre cette structure de base :

```typescript
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function MyPage() {
  const [loading, setLoading] = useState(false)

  if (loading) {
    return (
      <AppShell title="Page Title">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Page Title">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Icon className="h-6 w-6" /> Page Title
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Page description explaining the purpose and functionality
            </p>
          </div>

          {/* Page Content */}
          <div className="space-y-6">
            {/* Cards, forms, tables, etc. */}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
```

### Largeurs Maximales par Type de Page
- **Pages de paramètres** : `max-w-3xl` (profile, preferences)
- **Pages de contenu** : `max-w-4xl` (notifications, api-docs)
- **Pages complexes** : `max-w-6xl` (billing, dashboard)
- **Pages de liste** : `max-w-7xl` (events, users)

## Composants UI Standards

### AppShell
**Obligatoire** pour toutes les pages de l'application :
```typescript
<AppShell title="Page Title">
  {/* Contenu de la page */}
</AppShell>
```

### Headers avec Icônes
Utiliser systématiquement des icônes Lucide avec les titres :
```typescript
<h1 className="text-2xl font-semibold flex items-center gap-2">
  <CreditCard className="h-6 w-6" /> Billing & Subscription
</h1>
<p className="text-sm text-muted-foreground mt-1">
  Description claire et concise de la page
</p>
```

### Cards Standards
Structure standardisée pour tous les contenus :
```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Titre de la Section
    </CardTitle>
    <CardDescription>
      Description de la section et de son contenu
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Contenu de la card */}
  </CardContent>
</Card>
```

## États de Chargement

### Loading States Standards
```typescript
// Page complète en chargement
if (loading) {
  return (
    <AppShell title="Page Title">
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </AppShell>
  )
}

// Section en chargement
<Card>
  <CardContent className="flex items-center justify-center py-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </CardContent>
</Card>

// Bouton en chargement
<Button disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Saving...
    </>
  ) : (
    <>
      <Save className="h-4 w-4 mr-2" />
      Save Changes
    </>
  )}
</Button>
```

## Gestion des Erreurs

### Alertes d'Erreur Standards
```typescript
{error && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription className="flex items-center justify-between">
      <span>{error}</span>
      <Button variant="ghost" size="sm" onClick={clearError}>
        Dismiss
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### États Vides
```typescript
import { EmptyState } from '@/components/ui/empty-state'

{items.length === 0 ? (
  <EmptyState 
    title="No items found" 
    description="Create your first item to get started" 
    action={canCreate ? { 
      label: 'Create Item', 
      onClick: () => router.push('/create') 
    } : undefined} 
  />
) : (
  // Liste des items
)}
```

## Formulaires

### Structure Standard des Formulaires
```typescript
<Card>
  <CardHeader>
    <CardTitle>Form Title</CardTitle>
    <CardDescription>Form description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="field">Field Label</Label>
        <Input 
          id="field" 
          value={value} 
          onChange={handleChange} 
          placeholder="Placeholder text" 
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
    
    <div className="flex justify-end pt-2">
      <Button onClick={handleSubmit} disabled={saving}>
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Changes
      </Button>
    </div>
  </CardContent>
</Card>
```

### Champs avec Icônes
```typescript
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <div className="flex items-center gap-2">
    <Mail className="h-4 w-4 text-muted-foreground" />
    <Input id="email" type="email" value={email} onChange={handleChange} />
  </div>
</div>
```

## Navigation par Onglets

### Tabs avec Icônes
```typescript
<Tabs defaultValue="overview" className="space-y-6">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="overview" className="flex items-center gap-2">
      <TrendingUp className="h-4 w-4" />
      Overview
    </TabsTrigger>
    <TabsTrigger value="settings" className="flex items-center gap-2">
      <Settings className="h-4 w-4" />
      Settings
    </TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="space-y-6">
    {/* Contenu de l'onglet */}
  </TabsContent>
</Tabs>
```

## Grilles et Layouts

### Grilles Responsives Standards
```typescript
// Cards de statistiques (2-4 colonnes)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Metric</p>
          <p className="text-2xl font-bold">1,234</p>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
</div>

// Formulaires (1-2 colonnes)
<div className="grid gap-4 md:grid-cols-2">
  <div className="space-y-2">
    <Label>Field 1</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Field 2</Label>
    <Input />
  </div>
</div>

// Contenu principal (1-2 colonnes)
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <Card>Left Content</Card>
  <Card>Right Content</Card>
</div>
```

## Badges et États

### Badges de Statut Standards
```typescript
const getStatusBadge = (status: string) => {
  const variants = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
  }
  
  return (
    <Badge className={variants[status] || variants.inactive}>
      <StatusIcon className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  )
}
```

## Couleurs et Thèmes

### Support du Mode Sombre
Toujours inclure les classes dark mode :
```typescript
// Backgrounds
className="bg-white dark:bg-neutral-950"
className="bg-gray-50 dark:bg-neutral-900"

// Borders
className="border-gray-200 dark:border-neutral-800"

// Text
className="text-gray-900 dark:text-gray-100"
className="text-gray-600 dark:text-gray-400"

// Alerts et notifications
className="bg-orange-50 dark:bg-orange-950/30"
className="border-orange-200 dark:border-orange-800"
```

## Animations et Transitions

### Transitions Standards
```typescript
// Hover effects
className="transition-all hover:scale-105"
className="transition-colors hover:bg-muted/50"

// Loading states
className="animate-spin" // Pour les spinners
className="animate-pulse" // Pour les skeletons

// Backdrop blur pour les headers
className="backdrop-blur-sm"
```

## Espacement et Typographie

### Espacements Standards
```typescript
// Page container
className="p-6 space-y-6 max-w-6xl mx-auto pb-20"

// Card content
className="space-y-4" // Entre les éléments dans une card
className="space-y-6" // Entre les cards

// Form fields
className="space-y-2" // Label + input + error
className="gap-4" // Entre les colonnes de formulaire

// Buttons
className="gap-2" // Entre l'icône et le texte
```

### Typographie Standards
```typescript
// Page titles
className="text-2xl font-semibold"

// Section titles
className="text-xl font-semibold"

// Card titles
className="text-lg font-semibold"

// Descriptions
className="text-sm text-muted-foreground"

// Labels
className="text-sm font-medium"
```

## Icônes

### Tailles d'Icônes Standards
```typescript
// Page headers
<Icon className="h-6 w-6" />

// Card headers
<Icon className="h-5 w-5" />

// Buttons et inline
<Icon className="h-4 w-4" />

// Stats cards
<Icon className="h-8 w-8 text-muted-foreground" />

// Status indicators
<Icon className="h-3 w-3" />
```

### Icônes par Contexte
- **Billing** : `CreditCard`, `TrendingUp`, `Calendar`
- **Users** : `Users`, `User`, `Shield`
- **Settings** : `Settings`, `Cog`, `Sliders`
- **Events** : `Calendar`, `Clock`, `MapPin`
- **Status** : `CheckCircle`, `XCircle`, `AlertTriangle`, `Clock`

## Pagination

### Pattern de Pagination Standard
```typescript
<div className="flex items-center justify-between text-sm text-muted-foreground">
  <div>{total > 0 ? `Showing ${start}–${end} of ${total}` : ' '}</div>
  <div className="flex gap-2">
    <Button 
      variant="ghost" 
      size="sm" 
      disabled={!canPrev} 
      onClick={() => setPage(p => Math.max(1, p - 1))}
    >
      Previous
    </Button>
    <Button 
      variant="ghost" 
      size="sm" 
      disabled={!canNext} 
      onClick={() => setPage(p => p + 1)}
    >
      Next
    </Button>
  </div>
</div>
```

## Bonnes Pratiques

### Accessibilité
- Toujours utiliser des `Label` avec les `Input`
- Inclure des `aria-label` pour les boutons d'icônes
- Respecter les contrastes de couleur
- Utiliser des tailles de touch target appropriées (min 44px)

### Performance
- Utiliser `React.memo` pour les composants lourds
- Implémenter le lazy loading avec `React.lazy`
- Optimiser les images avec Next.js Image
- Debounce les recherches et API calls

### Responsive Design
- Mobile-first approach
- Utiliser les breakpoints Tailwind : `sm:`, `md:`, `lg:`, `xl:`
- Tester sur différentes tailles d'écran
- Adapter les grilles selon la taille d'écran

### Cohérence
- Utiliser les mêmes patterns dans toute l'application
- Respecter la hiérarchie visuelle
- Maintenir des espacements cohérents
- Utiliser les mêmes couleurs et typographies

## Exemples de Pages Types

### Page de Paramètres
```typescript
export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-3xl mx-auto pb-20">
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Settings className="h-6 w-6" /> Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your account settings and preferences
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Section Title</CardTitle>
              <CardDescription>Section description</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Form content */}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
```

### Page de Liste
```typescript
export default function ListPage() {
  return (
    <AppShell title="Items">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Items</h1>
          <Button onClick={() => router.push('/create')}>
            Create Item
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Items</CardTitle>
          </CardHeader>
          <CardContent>
            {/* List content */}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
```

Ce guide doit être suivi pour maintenir la cohérence visuelle et l'expérience utilisateur dans toute l'application AttendanceX.