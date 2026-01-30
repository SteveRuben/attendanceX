# UI Patterns & Design System - AttendanceX

Ce document définit les patterns UI standardisés et le système de design pour maintenir la cohérence visuelle et d'expérience utilisateur dans l'application AttendanceX.

## 🎨 Systèmes de Design Intégrés

AttendanceX combine trois systèmes de design complémentaires :

1. **Evelya Design System** - Base élégante et professionnelle
2. **Shopify Polaris** - Standards CSS et composants robustes
3. **Solstice Template** - Design coloré et moderne avec gradients

### Hiérarchie des Styles

```
Solstice (Gradients & Animations)
    ↓
Polaris (Structure & Standards CSS)
    ↓
Evelya (Base & Cohérence)
```

---

## 🎨 Palette de Couleurs Complète

### Couleurs Principales (Evelya Base)

```css
/* Bleu principal */
--primary-500: #3b82f6  /* blue-600 */
--primary-600: #2563eb  /* blue-700 */
--primary-700: #1d4ed8  /* blue-800 */

/* Gris neutres (Polaris) */
--slate-50: #f8fafc
--slate-100: #f1f5f9
--slate-200: #e2e8f0
--slate-300: #cbd5e1
--slate-400: #94a3b8
--slate-500: #64748b
--slate-600: #475569
--slate-700: #334155
--slate-800: #1e293b
--slate-900: #0f172a
```

### Gradients Colorés (Solstice)

```css
/* Gradients par fonctionnalité */
.gradient-blue-cyan {
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
}

.gradient-purple-pink {
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
}

.gradient-emerald-teal {
  background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
}

.gradient-orange-amber {
  background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%);
}

.gradient-red-rose {
  background: linear-gradient(135deg, #ef4444 0%, #f43f5e 100%);
}

.gradient-yellow-orange {
  background: linear-gradient(135deg, #eab308 0%, #f97316 100%);
}

/* Gradient Rainbow */
.gradient-rainbow {
  background: linear-gradient(135deg, 
    #3b82f6 0%, 
    #8b5cf6 25%, 
    #ec4899 50%, 
    #f97316 75%, 
    #10b981 100%
  );
}
```

### Couleurs Sémantiques (Polaris Standards)

```css
/* Success */
--success: #22c55e
--success-light: #86efac
--success-dark: #16a34a

/* Warning */
--warning: #f59e0b
--warning-light: #fcd34d
--warning-dark: #d97706

/* Error */
--error: #ef4444
--error-light: #fca5a5
--error-dark: #dc2626

/* Info */
--info: #3b82f6
--info-light: #93c5fd
--info-dark: #2563eb
```

---

## 📐 Architecture des Pages

### Structure Standard (Polaris Pattern)

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
          {/* Sticky Header avec Gradient (Solstice) */}
          <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Icon className="h-6 w-6" /> 
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Page Title
              </span>
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

### Largeurs Maximales par Type de Page (Polaris)

- **Pages de paramètres** : `max-w-3xl` (profile, preferences)
- **Pages de contenu** : `max-w-4xl` (notifications, api-docs)
- **Pages complexes** : `max-w-6xl` (billing, dashboard)
- **Pages de liste** : `max-w-7xl` (events, users)

---

## 🎬 Animations (Solstice)

### Animations Disponibles

```css
/* Fade In */
.animate-fade-in {
  animation: fade-in 0.6s ease-out forwards;
}

/* Float Effect */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

/* Pulse Slow */
.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}

/* Shimmer */
.animate-shimmer {
  animation: shimmer 2s linear infinite;
}

/* Gradient Shift */
.animate-gradient {
  animation: gradient-shift 8s ease infinite;
  background-size: 200% 200%;
}
```

### Delays

```css
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }
.delay-1000 { animation-delay: 1000ms; }
.delay-2000 { animation-delay: 2000ms; }
```

---

## 🧩 Composants UI Standards

### Boutons (Polaris + Solstice)

```typescript
// Bouton primaire avec gradient (Solstice)
<Button className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
  Action Principale
  <ArrowRight className="h-5 w-5 ml-2" />
</Button>

// Bouton secondaire (Polaris)
<Button 
  variant="outline" 
  className="h-12 px-6 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors duration-200"
>
  Action Secondaire
</Button>

// Bouton avec loading
<Button disabled={loading} className="h-12 px-8">
  {loading ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Chargement...
    </>
  ) : (
    <>
      <Save className="h-4 w-4 mr-2" />
      Sauvegarder
    </>
  )}
</Button>
```

### Cards (Polaris + Solstice)

```typescript
// Card standard avec gradient hover (Solstice)
<Card className="relative p-8 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 overflow-hidden group">
  {/* Gradient Background on Hover */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
  
  {/* Icon avec Gradient */}
  <div className="relative inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
    <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
  </div>
  
  <CardHeader>
    <CardTitle className="text-xl font-bold">Titre</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  
  <CardContent>
    {/* Contenu */}
  </CardContent>
</Card>

// Card Polaris standard
<Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm rounded-xl">
  <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800">
    <CardTitle className="text-lg font-semibold flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Titre
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6 space-y-4">
    {/* Contenu */}
  </CardContent>
</Card>
```

### Badges (Polaris + Solstice)

```typescript
// Badge avec gradient (Solstice)
<Badge className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
  <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
    Nouveau
  </span>
</Badge>

// Badge status (Polaris)
<Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
  <Check className="h-3 w-3" />
  Actif
</Badge>
```

### Inputs (Polaris Standards)

```typescript
// Input standard
<div className="space-y-2">
  <Label htmlFor="input-id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
    Label
  </Label>
  <Input
    id="input-id"
    className="h-12 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 transition-colors"
    placeholder="Placeholder..."
  />
  <p className="text-xs text-slate-500 dark:text-slate-500">Texte d'aide</p>
</div>

// Input avec icône
<div className="relative">
  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
  <Input className="pl-12 h-12 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
</div>
```

---

## 📊 Grilles et Layouts (Polaris)

### Grilles Responsives

```typescript
// Cards de statistiques (2-4 colonnes)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {stats.map((stat, idx) => (
    <Card key={idx} className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Métrique</p>
          <p className="text-3xl font-bold">{stat.value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Card>
  ))}
</div>

// Formulaires (1-2 colonnes)
<div className="grid gap-4 md:grid-cols-2">
  <div className="space-y-2">
    <Label>Champ 1</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Champ 2</Label>
    <Input />
  </div>
</div>
```

---

## 🎨 Effets Spéciaux (Solstice)

### Glass Morphism

```typescript
<div className="glass backdrop-blur-xl bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700/50 rounded-2xl p-6">
  Contenu avec effet verre
</div>
```

### Hover Effects

```typescript
// Lift Effect
<div className="hover-lift transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
  Contenu
</div>

// Glow Effect
<div className="hover-glow-blue transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
  Contenu
</div>

// Scale Effect
<div className="transition-transform duration-300 hover:scale-105">
  Contenu
</div>
```

### Gradient Text

```typescript
<h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
  Titre avec Gradient
</h1>
```

---

## 🎯 Patterns de Composants Avancés

### Hero Section (Solstice)

```typescript
<section className="relative overflow-hidden py-20 sm:py-32 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
  {/* Animated Background */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
  </div>

  {/* Grid Pattern */}
  <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Hero Content */}
  </div>
</section>
```

### Feature Cards Grid (Solstice)

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {features.map((feature, index) => (
    <div
      key={index}
      className="group relative p-8 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
    >
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      {/* Icon */}
      <div className={`relative inline-flex p-4 rounded-2xl ${feature.bgColor} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <feature.icon className={`h-8 w-8 ${feature.iconColor}`} />
      </div>
      
      {/* Content */}
      <h3 className="relative text-xl font-bold mb-3 text-slate-900 dark:text-slate-100">
        {feature.title}
      </h3>
      <p className="relative text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {feature.description}
      </p>

      {/* Decorative Element */}
      <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br ${feature.gradient} rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-300`} />
    </div>
  ))}
</div>
```

---

## 📱 Responsive Design (Polaris Breakpoints)

### Breakpoints Standards

```css
sm: 640px   /* Mobile large */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Patterns Responsifs

```typescript
// Mobile-first approach
<div className="text-base sm:text-lg md:text-xl lg:text-2xl">
  Texte responsive
</div>

// Grilles adaptatives
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {/* Items */}
</div>

// Navigation collapsible
<nav className="hidden md:flex md:items-center md:gap-6">
  {/* Desktop nav */}
</nav>
<button className="md:hidden">
  {/* Mobile menu button */}
</button>
```

---

## ♿ Accessibilité (WCAG 2.1 AA)

### Standards Obligatoires

```typescript
// Contraste minimum 4.5:1
className="text-slate-900 dark:text-slate-100"  // ✅ Bon contraste

// Focus visible
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"

// Labels pour inputs
<label htmlFor="email" className="text-sm font-medium">Email</label>
<Input id="email" aria-describedby="email-help" />
<p id="email-help" className="text-xs text-slate-500">Texte d'aide</p>

// Aria labels pour icônes
<Button aria-label="Fermer le panneau">
  <X className="h-4 w-4" />
</Button>

// Skip links
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg">
  Aller au contenu principal
</a>
```

---

## 🎨 Mode Sombre (Dark Mode)

### Implémentation Systématique

```typescript
// Toujours inclure les variantes dark
className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"

// Bordures
className="border-slate-200 dark:border-slate-800"

// Backgrounds
className="bg-slate-50 dark:bg-slate-900"

// Gradients adaptés
className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400"
```

---

## ✅ Checklist de Validation

Avant de livrer un composant :

### Design
- [ ] Couleurs Evelya/Polaris/Solstice respectées
- [ ] Police Inter utilisée
- [ ] Icônes Lucide React
- [ ] Espacements Polaris (4px scale)
- [ ] Arrondis cohérents (lg ou xl)
- [ ] Transitions fluides (200ms base)
- [ ] Mode sombre supporté (dark:)
- [ ] Gradients appropriés (si Solstice)

### Contenu
- [ ] Traductions i18n (pas de texte hardcodé)
- [ ] Labels descriptifs
- [ ] Messages d'erreur clairs
- [ ] Textes d'aide appropriés

### Responsive
- [ ] Mobile first approach
- [ ] Breakpoints Tailwind respectés
- [ ] Touch targets ≥ 44px
- [ ] Grilles adaptatives

### Accessibilité (WCAG 2.1 AA)
- [ ] Contraste ≥ 4.5:1 (texte normal)
- [ ] Contraste ≥ 3:1 (texte large)
- [ ] Labels pour tous les inputs
- [ ] Aria labels pour icônes seules
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Navigation clavier fonctionnelle
- [ ] Skip links présents
- [ ] Sémantique HTML correcte

### Performance
- [ ] Animations optimisées (GPU)
- [ ] Images optimisées
- [ ] Lazy loading si nécessaire
- [ ] Pas de layout shifts

---

## 📚 Ressources

### Documentation
- **Evelya Design** : `.kiro/steering/evelya-design-system.md`
- **Solstice Update** : `docs/ux-ui/SOLSTICE_DESIGN_UPDATE.md`
- **Animations** : `frontend-v2/src/styles/animations.css`
- **Globals CSS** : `frontend-v2/src/styles/globals.css`

### Outils
- **Gradient Generator** : https://cssgradient.io/
- **Color Palette** : https://coolors.co/
- **Tailwind CSS** : https://tailwindcss.com/
- **Lucide Icons** : https://lucide.dev/
- **Shopify Polaris** : https://polaris.shopify.com/

---

Ce guide unifie les trois systèmes de design (Evelya, Polaris, Solstice) pour maintenir la cohérence visuelle et l'expérience utilisateur dans toute l'application AttendanceX.

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