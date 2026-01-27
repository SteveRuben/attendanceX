---
inclusion: always
---

# Système de Design Evelya + Shopify Polaris - AttendanceX

Ce guide définit les standards de design inspirés d'Evelya.co et des principes CSS de Shopify Polaris pour maintenir la cohérence visuelle dans toute l'application.

## 🎨 Palette de Couleurs (Evelya)

### Couleurs Principales
```typescript
// Primaire - Bleu
primary: {
  DEFAULT: '#2563eb',  // blue-600
  hover: '#1d4ed8',    // blue-700
  light: '#3b82f6',    // blue-500
}

// Neutres - Slate (Polaris-inspired)
neutral: {
  50: '#f8fafc',   // Surface subdued
  100: '#f1f5f9',  // Surface
  200: '#e2e8f0',  // Border subdued
  300: '#cbd5e1',  // Border
  400: '#94a3b8',  // Text subdued
  500: '#64748b',  // Text secondary
  600: '#475569',  // Text
  700: '#334155',  // Text emphasis
  800: '#1e293b',  // Surface dark
  900: '#0f172a',  // Surface darkest
}
```

### ❌ Couleurs à Éviter
- Gradients vert/orange (`from-green-600 to-orange-600`)
- Couleurs vives non-Evelya
- Mélanges de palettes

### ✅ Utilisation Correcte (Polaris Principles)
```typescript
// Boutons primaires - Action claire
className="bg-blue-600 hover:bg-blue-700 text-white"

// Backgrounds - Hiérarchie visuelle
className="bg-slate-50 dark:bg-slate-900"  // Surface
className="bg-white dark:bg-slate-800"     // Surface elevated

// Textes - Contraste optimal
className="text-slate-900 dark:text-slate-100"  // Primary text
className="text-slate-600 dark:text-slate-400"  // Secondary text

// Bordures - Séparation subtile
className="border-slate-200 dark:border-slate-800"
```

## 📝 Typographie (Polaris Scale)

### Police Obligatoire
**Inter** - Système de police Polaris-compatible

```typescript
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
}
```

### Hiérarchie des Textes (Polaris Type Scale)
```typescript
// Display - Hero sections
className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100"

// Heading Large - Page titles
className="text-2xl font-bold text-slate-900 dark:text-slate-100"

// Heading Medium - Section titles
className="text-xl font-semibold text-slate-900 dark:text-slate-100"

// Heading Small - Card titles
className="text-lg font-semibold text-slate-900 dark:text-slate-100"

// Body Large - Emphasized text
className="text-base font-medium text-slate-900 dark:text-slate-100"

// Body - Default text
className="text-base text-slate-600 dark:text-slate-400"

// Body Small - Secondary text
className="text-sm text-slate-600 dark:text-slate-400"

// Caption - Labels, metadata
className="text-xs text-slate-500 dark:text-slate-500"
```

## 🎯 Composants UI Standards (Polaris-Inspired)

### Boutons (Polaris Button Patterns)

```typescript
// Primary - Action principale
<Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors shadow-sm">
  Action Principale
</Button>

// Secondary - Action secondaire
<Button 
  variant="outline" 
  className="h-12 px-6 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
>
  Action Secondaire
</Button>

// Plain - Action tertiaire
<Button 
  variant="ghost"
  className="h-12 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
>
  Action Tertiaire
</Button>

// Destructive - Action dangereuse
<Button className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
  Supprimer
</Button>

// Avec icône (Polaris pattern)
<Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
  <Icon className="h-4 w-4 mr-2" />
  <span>Texte</span>
</Button>
```

### Inputs (Polaris Form Patterns)

```typescript
// Input standard avec label
<div className="space-y-2">
  <label htmlFor="input-id" className="text-sm font-medium text-slate-700 dark:text-slate-300">
    Label
  </label>
  <Input
    id="input-id"
    className="h-12 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 transition-colors"
    placeholder="Placeholder..."
  />
  <p className="text-xs text-slate-500 dark:text-slate-500">Texte d'aide</p>
</div>

// Input avec icône (Polaris pattern)
<div className="relative">
  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
  <Input className="pl-12 h-12 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
</div>

// Input avec erreur
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Label</label>
  <Input className="h-12 px-4 rounded-lg border-2 border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
    <AlertCircle className="h-3 w-3" />
    Message d'erreur
  </p>
</div>
```

### Cards (Polaris Card Patterns)

```typescript
// Card standard
<Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm rounded-xl overflow-hidden">
  <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800">
    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
      Titre
    </CardTitle>
    <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6">
    {/* Contenu */}
  </CardContent>
  <CardFooter className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
    {/* Actions */}
  </CardFooter>
</Card>

// Card interactive (hover state)
<Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer">
  <CardContent className="p-6">
    {/* Contenu */}
  </CardContent>
</Card>

// Card subdued (moins d'emphase)
<Card className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
  <CardContent className="p-6">
    {/* Contenu */}
  </CardContent>
</Card>
```

### Badges (Polaris Badge Patterns)

```typescript
// Status badges avec sémantique claire
<Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
  <Dot className="h-2 w-2 fill-current" />
  Info
</Badge>

<Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
  <Check className="h-3 w-3" />
  Succès
</Badge>

<Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
  <AlertTriangle className="h-3 w-3" />
  Attention
</Badge>

<Badge className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
  <X className="h-3 w-3" />
  Erreur
</Badge>
```

## 🎭 Icônes (Polaris Icon Guidelines)

### Bibliothèque Obligatoire
**Lucide React** - Compatible avec Polaris

```typescript
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Navigation,
  SlidersHorizontal,
  Tag,
  X,
  Loader2,
  Check,
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
```

### Tailles Standards (Polaris Scale)
```typescript
// Small - Inline avec texte
<Icon className="h-4 w-4" />

// Medium - Labels, boutons
<Icon className="h-5 w-5" />

// Large - Headers, emphasis
<Icon className="h-6 w-6" />

// Extra Large - Hero, empty states
<Icon className="h-12 w-12" />
```

### Couleurs d'Icônes (Polaris Semantic)
```typescript
// Default
className="text-slate-600 dark:text-slate-400"

// Subdued
className="text-slate-400 dark:text-slate-600"

// Interactive
className="text-blue-600 dark:text-blue-400"

// Success
className="text-green-600 dark:text-green-400"

// Warning
className="text-yellow-600 dark:text-yellow-400"

// Critical
className="text-red-600 dark:text-red-400"
```

## 📐 Espacements (Polaris Spacing Scale)

### Standards Polaris
```typescript
// Space 1 - Très serré (4px)
gap-1, p-1, m-1

// Space 2 - Serré (8px)
gap-2, p-2, m-2

// Space 3 - Base (12px)
gap-3, p-3, m-3

// Space 4 - Confortable (16px)
gap-4, p-4, m-4

// Space 5 - Loose (20px)
gap-5, p-5, m-5

// Space 6 - Extra loose (24px)
gap-6, p-6, m-6

// Space 8 - Section spacing (32px)
gap-8, p-8, m-8

// Space 12 - Large section (48px)
gap-12, p-12, m-12

// Space 16 - Extra large (64px)
gap-16, p-16, m-16
```

### Application Contextuelle
```typescript
// Composants compacts
className="p-3 gap-2"  // Badges, small buttons

// Composants standards
className="p-4 gap-3"  // Inputs, medium buttons

// Composants spacieux
className="p-6 gap-4"  // Cards, large buttons

// Sections
className="py-8 gap-6"  // Section spacing

// Pages
className="py-12 gap-8"  // Page spacing
```

## 🎬 Animations et Transitions (Polaris Motion)

### Durées Standards (Polaris Duration Scale)
```typescript
// Fast - Micro-interactions (100ms)
duration-100

// Base - Interactions standard (200ms)
duration-200

// Slow - Transitions complexes (300ms)
duration-300

// Slower - Animations élaborées (500ms)
duration-500
```

### Transitions Standards
```typescript
// Couleurs - Fast
className="transition-colors duration-200"

// Tout - Base
className="transition-all duration-200"

// Ombres - Base
className="hover:shadow-md transition-shadow duration-200"

// Transform - Fast
className="hover:scale-105 transition-transform duration-100"

// Opacity - Fast
className="hover:opacity-80 transition-opacity duration-100"
```

### États de Chargement (Polaris Patterns)
```typescript
// Spinner avec contexte
<div className="flex items-center justify-center gap-3 py-12">
  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
  <span className="text-sm text-slate-600 dark:text-slate-400">Chargement...</span>
</div>

// Skeleton (Polaris pattern)
<div className="space-y-3">
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6" />
</div>

// Progress bar
<div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
  <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: '60%' }} />
</div>
```

## 🌐 Internationalisation (i18n)

### Utilisation Obligatoire
**Toujours** utiliser les traductions, jamais de texte hardcodé.

```typescript
import { useTranslation } from 'next-i18next';

const { t } = useTranslation(['events', 'common']);

// ✅ Correct
<h1>{t('events:page.title')}</h1>
<Button>{t('common:search')}</Button>

// ❌ Incorrect
<h1>Découvrir des Événements</h1>
<Button>Rechercher</Button>
```

## 📱 Responsive Design (Polaris Breakpoints)

### Breakpoints Standards
```typescript
// Mobile (default) - 0-639px
className="text-base"

// Tablet - 640px+
className="text-base sm:text-lg"

// Desktop - 768px+
className="text-base md:text-lg"

// Large Desktop - 1024px+
className="text-base lg:text-xl"

// Extra Large - 1280px+
className="text-base xl:text-2xl"
```

### Grilles Responsives (Polaris Layout)
```typescript
// Stack mobile, grid desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Flex responsive
className="flex flex-col md:flex-row gap-4"

// Container avec max-width
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
```

## ♿ Accessibilité (Polaris A11y Standards)

### Standards Obligatoires (WCAG 2.1 AA)
```typescript
// Labels pour inputs (obligatoire)
<label htmlFor="search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
  Recherche
</label>
<Input id="search" aria-describedby="search-help" />
<p id="search-help" className="text-xs text-slate-500">Texte d'aide</p>

// Aria labels pour icônes seules
<Button aria-label="Fermer le panneau">
  <X className="h-4 w-4" />
</Button>

// Focus visible (Polaris pattern)
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"

// Contraste suffisant (WCAG AA)
// Ratio minimum 4.5:1 pour texte normal
// Ratio minimum 3:1 pour texte large (18px+)
className="text-slate-900 dark:text-slate-100"  // ✅ Bon contraste
className="text-slate-400 dark:text-slate-600"  // ❌ Contraste insuffisant pour texte principal

// États interactifs clairs
className="hover:bg-slate-100 active:bg-slate-200 focus:ring-2"

// Skip links pour navigation clavier
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg">
  Aller au contenu principal
</a>
```

## 🎯 Patterns de Composants (Polaris-Inspired)

### Barre de Recherche
```typescript
<div className="flex flex-col md:flex-row gap-3">
  <div className="flex-1 relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
    <Input
      placeholder={t('search.placeholder')}
      className="pl-12 h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      aria-label={t('search.label')}
    />
  </div>
  <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 font-medium">
    {t('search.button')}
  </Button>
</div>
```

### Card d'Événement
```typescript
<Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer overflow-hidden">
  <div className="aspect-video relative overflow-hidden">
    <img src={image} alt={title} className="w-full h-full object-cover" />
    <Badge className="absolute top-4 right-4 bg-blue-600 text-white">
      {category}
    </Badge>
  </div>
  <CardContent className="p-6 space-y-3">
    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
      {title}
    </h3>
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <Calendar className="h-4 w-4" />
      <time dateTime={isoDate}>{formattedDate}</time>
    </div>
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <MapPin className="h-4 w-4" />
      <span>{location}</span>
    </div>
  </CardContent>
</Card>
```

### Panneau de Filtres
```typescript
<Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
  <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800">
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Filter className="h-5 w-5" />
        {t('filters.title')}
      </CardTitle>
      <Button variant="ghost" size="sm" aria-label={t('filters.close')}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  </CardHeader>
  <CardContent className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Filtres */}
    </div>
  </CardContent>
  <CardFooter className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between">
    <Button variant="ghost" onClick={clearFilters}>
      {t('filters.clear')}
    </Button>
    <Button onClick={applyFilters}>
      {t('filters.apply')}
    </Button>
  </CardFooter>
</Card>
```

### Empty State (Polaris Pattern)
```typescript
<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
    <Icon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
  </div>
  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
    {t('empty.title')}
  </h3>
  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
    {t('empty.description')}
  </p>
  <Button className="bg-blue-600 hover:bg-blue-700">
    <Plus className="h-4 w-4 mr-2" />
    {t('empty.action')}
  </Button>
</div>
```

## ✅ Checklist de Validation (Polaris Quality)

Avant de committer du code UI, vérifier :

### Design
- [ ] Couleurs bleu/slate (Evelya palette)
- [ ] Police Inter utilisée
- [ ] Icônes Lucide React
- [ ] Espacements Polaris (4px scale)
- [ ] Arrondis cohérents (lg ou xl)
- [ ] Transitions fluides (200ms base)
- [ ] Mode sombre supporté (dark:)

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

## 🚫 Anti-Patterns à Éviter

### ❌ Mauvais
```typescript
// Couleurs non-Evelya
className="bg-green-600 text-orange-500"

// Texte hardcodé
<h1>Découvrir des Événements</h1>

// Pas de mode sombre
className="bg-white text-black"

// Tailles inconsistantes
<Button className="h-10 px-4">Action</Button>
<Button className="h-14 px-8">Autre</Button>

// Contraste insuffisant
className="text-slate-400"  // Sur fond blanc

// Pas de label
<Input placeholder="Email" />  // ❌ Pas accessible

// Focus invisible
className="outline-none"  // ❌ Sans ring de focus
```

### ✅ Bon
```typescript
// Couleurs Evelya
className="bg-blue-600 text-white"

// Traductions
<h1>{t('events:page.title')}</h1>

// Mode sombre
className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"

// Tailles cohérentes (Polaris)
<Button className="h-12 px-8">Action</Button>
<Button className="h-12 px-6">Autre</Button>

// Bon contraste
className="text-slate-900 dark:text-slate-100"

// Avec label
<label htmlFor="email" className="text-sm font-medium">Email</label>
<Input id="email" placeholder="exemple@email.com" />

// Focus visible
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

## 📚 Ressources

- **Evelya.co:** https://evelya.co/ (référence design)
- **Shopify Polaris:** https://polaris.shopify.com/ (CSS guidelines)
- **Polaris React:** https://polaris-react.shopify.com/ (composants)
- **Lucide Icons:** https://lucide.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Next-i18next:** https://github.com/i18next/next-i18next
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

---

**Note:** Ce guide combine les principes de design d'Evelya.co avec les standards CSS de Shopify Polaris pour créer une expérience utilisateur cohérente, accessible et professionnelle. Respecter ces standards garantit la qualité et la maintenabilité du code frontend.
