---
inclusion: always
---

# Standards UX/UI Evelya - AttendanceX

Ce document définit les standards de design UX/UI inspirés d'Evelya.co (https://evelya.co et https://dashboard.evelya.co/auth/signin) pour maintenir une cohérence visuelle moderne et professionnelle dans AttendanceX.

## Philosophie de Design

### Principes Fondamentaux
- **Minimalisme élégant** : Interface épurée avec beaucoup d'espace blanc
- **Hiérarchie visuelle claire** : Utilisation stratégique de la typographie et des couleurs
- **Micro-interactions fluides** : Animations subtiles et transitions douces
- **Design centré utilisateur** : Priorité à l'expérience utilisateur et l'accessibilité
- **Cohérence systémique** : Composants réutilisables et patterns consistants

### Inspiration Evelya
- Interface moderne avec gradients subtils
- Cartes avec ombres douces et bordures arrondies
- Boutons avec états hover/focus bien définis
- Typographie claire et hiérarchisée
- Couleurs apaisantes avec accents colorés
- Layouts spacieux et aérés

## Palette de Couleurs

### Couleurs Principales
```css
/* Bleu principal (inspiré Evelya) */
--primary-50: #beece6ff
--primary-500: #abbd7fff  /* Couleur principale */
--primary-600: #d3f876ff  /* Hover states */
--primary-700: #e8ffad  /* Active states */

/* Gris neutres */
--gray-50: #f8fafc
--gray-100: #f1f5f9
--gray-500: #64748b
--gray-700: #334155
--gray-900: #0f172a

/* Couleurs sémantiques */
--success: #22c55e
--warning: #f59e0b
--error: #ef4444
```

### Utilisation des Couleurs
- **Primaire** : Actions principales, liens, éléments interactifs
- **Gris** : Textes, bordures, backgrounds neutres
- **Success** : Confirmations, états positifs
- **Warning** : Alertes, états d'attention
- **Error** : Erreurs, états négatifs

## Typographie

### Hiérarchie des Titres
```css
/* Titres principaux */
h1: text-3xl font-bold (30px, 700)
h2: text-2xl font-semibold (24px, 600)
h3: text-xl font-semibold (20px, 600)
h4: text-lg font-medium (18px, 500)

/* Corps de texte */
body: text-base (16px, 400)
small: text-sm (14px, 400)
caption: text-xs (12px, 400)
```

### Police Recommandée
- **Principale** : Inter (système de fallback : system-ui, sans-serif)
- **Monospace** : JetBrains Mono (pour le code)

## Composants UI Standards

### Boutons (Style Evelya)
```typescript
// Bouton primaire
className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"

// Bouton secondaire
className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-200"

// Bouton outline
className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-medium px-6 py-3 rounded-lg transition-all duration-200"
```

### Cartes (Style Evelya)
```typescript
// Carte standard
className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"

// Carte avec gradient subtil
className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"

// Carte interactive
className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 cursor-pointer transition-all duration-200 transform hover:-translate-y-1"
```

### Inputs et Formulaires
```typescript
// Input standard
className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"

// Label
className="block text-sm font-medium text-gray-700 mb-2"

// Message d'erreur
className="text-sm text-red-600 mt-1"
```

## Layouts et Espacements

### Conteneurs
```typescript
// Conteneur principal
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

// Conteneur étroit
className="max-w-3xl mx-auto px-4 sm:px-6"

// Conteneur pleine largeur
className="w-full px-4 sm:px-6 lg:px-8"
```

### Grilles Responsives
```typescript
// Grille 2 colonnes
className="grid grid-cols-1 md:grid-cols-2 gap-6"

// Grille 3 colonnes
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Grille 4 colonnes (stats)
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
```

### Espacements Standards
- **Petits éléments** : gap-2, gap-3 (8px, 12px)
- **Éléments moyens** : gap-4, gap-6 (16px, 24px)
- **Sections** : gap-8, gap-12 (32px, 48px)
- **Pages** : gap-16, gap-20 (64px, 80px)

## Animations et Transitions

### Transitions Standards
```css
/* Transition universelle */
transition-all duration-200 ease-in-out

/* Hover effects */
hover:scale-105 transition-transform duration-200
hover:shadow-lg transition-shadow duration-200

/* Focus states */
focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
```

### Animations Recommandées
```typescript
// Fade in
className="animate-fadeIn"

// Slide up
className="animate-slideUp"

// Scale in
className="animate-scaleIn"

// Stagger children (pour les listes)
className="stagger-children"
```

## Patterns UX Spécifiques

### Navigation (Style Evelya)
- Sidebar fixe avec icônes et labels
- Navigation breadcrumb pour les pages profondes
- Menu utilisateur en dropdown (coin supérieur droit)
- États actifs clairement identifiés

### Dashboards
- Cartes de statistiques avec icônes colorées
- Graphiques avec couleurs cohérentes
- Actions rapides accessibles
- Données temps réel avec indicateurs visuels

### Formulaires
- Labels au-dessus des champs
- Validation en temps réel
- Messages d'erreur contextuels
- Boutons d'action alignés à droite

### Tables et Listes
- Headers avec tri visuel
- Lignes alternées subtiles
- Actions par ligne (dropdown ou boutons)
- Pagination moderne

## États et Feedback

### États de Chargement
```typescript
// Skeleton loading
<div className="animate-pulse bg-gray-200 rounded h-4 w-3/4" />

// Spinner
<div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />

// Overlay de chargement
<div className="absolute inset-0 bg-white/80 flex items-center justify-center">
  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
</div>
```

### Notifications (Style Evelya)
```typescript
// Success
className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"

// Error
className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"

// Warning
className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg"

// Info
className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg"
```

### États Vides
- Illustration ou icône centrale
- Titre explicatif
- Description courte
- Action principale (bouton CTA)

## Responsive Design

### Breakpoints
```css
sm: 640px   /* Mobile large */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Patterns Responsifs
- Mobile-first approach
- Navigation collapsible sur mobile
- Grilles qui s'adaptent (1 col → 2 col → 3+ col)
- Textes qui s'ajustent (text-2xl → text-xl → text-lg)

## Accessibilité

### Standards Obligatoires
- Contraste minimum 4.5:1 pour le texte
- Focus visible sur tous les éléments interactifs
- Labels appropriés pour les formulaires
- Navigation au clavier fonctionnelle
- Textes alternatifs pour les images

### Implémentation
```typescript
// Focus visible
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"

// Texte accessible
className="text-gray-900 dark:text-gray-100" // Bon contraste

// Boutons accessibles
<button aria-label="Fermer la modal" className="...">
  <X className="h-4 w-4" />
</button>
```

## Mode Sombre

### Couleurs Sombres
```css
/* Backgrounds */
--dark-bg-primary: #0f172a
--dark-bg-secondary: #1e293b
--dark-bg-tertiary: #334155

/* Textes */
--dark-text-primary: #f8fafc
--dark-text-secondary: #cbd5e1
--dark-text-muted: #64748b
```

### Implémentation
```typescript
// Toujours inclure les variantes sombres
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
```

## Exemples d'Implémentation

### Page Dashboard (Style Evelya)
```typescript
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Tableau de Bord
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        Vue d'ensemble de votre activité
      </p>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Cartes de statistiques */}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Contenu principal */}
    </div>
  </div>
</div>
```

### Composant Card (Style Evelya)
```typescript
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
  <div className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Titre de la Card
      </h3>
      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
    <p className="text-gray-600 dark:text-gray-400">
      Contenu de la card
    </p>
  </div>
</div>
```

## Checklist de Validation

### Avant de Livrer un Composant
- [ ] Respecte la palette de couleurs Evelya
- [ ] Utilise les espacements standards
- [ ] Inclut les états hover/focus/active
- [ ] Fonctionne en mode sombre
- [ ] Est responsive sur tous les breakpoints
- [ ] Respecte les standards d'accessibilité
- [ ] Utilise les animations appropriées
- [ ] Suit la hiérarchie typographique

### Avant de Livrer une Page
- [ ] Header avec titre et description
- [ ] Navigation cohérente
- [ ] États de chargement implémentés
- [ ] Gestion d'erreur appropriée
- [ ] États vides avec actions
- [ ] Responsive design validé
- [ ] Performance optimisée
- [ ] Tests d'accessibilité passés

## Ressources et Références

### Outils Recommandés
- **Design** : Figma avec système de design Evelya
- **Couleurs** : Palette Tailwind CSS étendue
- **Icônes** : Lucide React (cohérent avec Evelya)
- **Animations** : Framer Motion ou CSS transitions

### Inspiration Continue
- Analyser régulièrement https://evelya.co pour les évolutions
- S'inspirer des meilleures pratiques UX modernes
- Maintenir la cohérence avec l'écosystème Evelya
- Adapter les patterns aux besoins spécifiques d'AttendanceX

Ce guide doit être suivi pour maintenir une expérience utilisateur moderne, cohérente et professionnelle dans toute l'application AttendanceX, en s'inspirant des meilleures pratiques d'Evelya.co.