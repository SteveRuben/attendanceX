# 📄 Spécifications - Page Publique d'Événements

**Date:** 26 Janvier 2026  
**Priorité:** P1 - Haute  
**Estimation:** 2-3 semaines  
**Impact Business:** +300% acquisition organique

---

## 🎯 Objectifs

### Business
- Augmenter la découvrabilité des événements
- Améliorer le SEO et le référencement naturel
- Générer du trafic organique
- Convertir les visiteurs en utilisateurs

### Technique
- Pages publiques accessibles sans authentification
- SEO optimisé (meta tags, structured data)
- Performance optimale (SSG/ISR)
- Responsive design

---

## 📐 Architecture

### Pages à Créer

```
/events                          → Liste publique d'événements
/events/[slug]                   → Détail événement public
/organizers/[slug]               → Profil organisateur public
/events/category/[category]      → Événements par catégorie
/events/location/[location]      → Événements par lieu
```

### Routes API Backend

```
GET /public/events               → Liste événements publics (avec filtres)
GET /public/events/:slug         → Détail événement public
GET /public/organizers/:slug     → Profil organisateur public
GET /public/categories           → Liste des catégories
GET /public/locations            → Liste des lieux populaires
```

---

## 🎨 Wireframes

### 1. Page Liste d'Événements (`/events`)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] AttendanceX          [Search]         [Sign In]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Discover Amazing Events                                     │
│  Find and join events near you                               │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔍 Search events...                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Filters:                                                     │
│  [📍 Location ▼] [📅 Date ▼] [🏷️ Category ▼] [💰 Price ▼]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Featured Events                                      │    │
│  │                                                       │    │
│  │ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │    │
│  │ │Event │  │Event │  │Event │  │Event │            │    │
│  │ │Card  │  │Card  │  │Card  │  │Card  │            │    │
│  │ │  1   │  │  2   │  │  3   │  │  4   │            │    │
│  │ └──────┘  └──────┘  └──────┘  └──────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  All Events (245)                                             │
│  Sort by: [Most Recent ▼]                                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [Image]  Tech Conference 2026                        │    │
│  │          📅 Feb 15, 2026 • 📍 Paris                 │    │
│  │          💰 €50 • 👥 250 attendees                  │    │
│  │          ⭐⭐⭐⭐⭐ 4.8 (120 reviews)                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [Image]  Marketing Workshop                          │    │
│  │          📅 Feb 20, 2026 • 📍 Online                │    │
│  │          💰 Free • 👥 500 attendees                 │    │
│  │          ⭐⭐⭐⭐☆ 4.2 (85 reviews)                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Load More]                                                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Footer: About • Contact • Terms • Privacy                   │
└─────────────────────────────────────────────────────────────┘
```

### 2. Page Détail Événement (`/events/[slug]`)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] AttendanceX          [Search]         [Sign In]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                       │    │
│  │         [Event Cover Image]                          │    │
│  │                                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │                           │  │                       │    │
│  │ Tech Conference 2026      │  │  [Register Now]      │    │
│  │                           │  │                       │    │
│  │ By TechOrg                │  │  €50 / person        │    │
│  │ ⭐⭐⭐⭐⭐ 4.8 (120)      │  │                       │    │
│  │                           │  │  250 / 300 spots     │    │
│  │ 📅 Feb 15, 2026          │  │                       │    │
│  │ ⏰ 9:00 AM - 6:00 PM     │  │  [Share] [Save]      │    │
│  │                           │  │                       │    │
│  │ 📍 Paris Convention Ctr  │  └──────────────────────┘    │
│  │    123 Rue de Paris      │                               │
│  │    [View Map]            │  ┌──────────────────────┐    │
│  │                           │  │ Organizer            │    │
│  │ About This Event          │  │                       │    │
│  │ ─────────────────────    │  │ [Avatar] TechOrg     │    │
│  │                           │  │                       │    │
│  │ Join us for the biggest   │  │ 4.9 ⭐ (250 reviews)│    │
│  │ tech conference of 2026!  │  │                       │    │
│  │ Learn from industry       │  │ 50+ events hosted    │    │
│  │ leaders...                │  │                       │    │
│  │                           │  │ [View Profile]       │    │
│  │ What You'll Learn         │  └──────────────────────┘    │
│  │ • AI & Machine Learning   │                               │
│  │ • Cloud Computing         │  ┌──────────────────────┐    │
│  │ • Cybersecurity           │  │ Similar Events       │    │
│  │                           │  │                       │    │
│  │ Schedule                  │  │ [Event 1]            │    │
│  │ ─────────────────────    │  │ [Event 2]            │    │
│  │ 9:00 - Registration       │  │ [Event 3]            │    │
│  │ 10:00 - Keynote           │  └──────────────────────┘    │
│  │ 12:00 - Lunch             │                               │
│  │ ...                       │                               │
│  │                           │                               │
│  │ Reviews (120)             │                               │
│  │ ─────────────────────    │                               │
│  │                           │                               │
│  │ ⭐⭐⭐⭐⭐ John D.        │                               │
│  │ "Amazing event! Learned   │                               │
│  │  so much..."              │                               │
│  │                           │                               │
│  └──────────────────────────┘                               │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Footer                                                       │
└─────────────────────────────────────────────────────────────┘
```

### 3. Page Profil Organisateur (`/organizers/[slug]`)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] AttendanceX          [Search]         [Sign In]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         [Cover Image]                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │                           │  │                       │    │
│  │ [Avatar]                  │  │  Stats                │    │
│  │                           │  │                       │    │
│  │ TechOrg                   │  │  50+ Events           │    │
│  │ ⭐⭐⭐⭐⭐ 4.9 (250)      │  │  10K+ Attendees      │    │
│  │                           │  │  4.9 ⭐ Rating       │    │
│  │ 📍 Paris, France         │  │                       │    │
│  │ 🌐 techorg.com           │  │  [Follow]            │    │
│  │                           │  │                       │    │
│  │ About                     │  └──────────────────────┘    │
│  │ ─────────────────────    │                               │
│  │ Leading tech event        │                               │
│  │ organizer in Europe...    │                               │
│  │                           │                               │
│  │ Upcoming Events (12)      │                               │
│  │ ─────────────────────    │                               │
│  │                           │                               │
│  │ ┌──────┐  ┌──────┐       │                               │
│  │ │Event │  │Event │       │                               │
│  │ │Card  │  │Card  │       │                               │
│  │ └──────┘  └──────┘       │                               │
│  │                           │                               │
│  │ Past Events (38)          │                               │
│  │ ─────────────────────    │                               │
│  │                           │                               │
│  │ ┌──────┐  ┌──────┐       │                               │
│  │ │Event │  │Event │       │                               │
│  │ │Card  │  │Card  │       │                               │
│  │ └──────┘  └──────┘       │                               │
│  │                           │                               │
│  │ Reviews (250)             │                               │
│  │ ─────────────────────    │                               │
│  │                           │                               │
│  │ ⭐⭐⭐⭐⭐ Sarah M.       │                               │
│  │ "Great organizer..."      │                               │
│  │                           │                               │
│  └──────────────────────────┘                               │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  Footer                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Modèle de Données

### Event (Extension pour Public)

```typescript
interface PublicEvent {
  // Identifiants
  id: string;
  slug: string; // URL-friendly: "tech-conference-2026-paris"
  
  // Informations de base
  title: string;
  description: string;
  shortDescription: string; // 160 caractères max pour SEO
  coverImage: string;
  images: string[];
  
  // Organisateur
  organizerId: string;
  organizerName: string;
  organizerSlug: string;
  organizerAvatar: string;
  organizerRating: number;
  
  // Date et lieu
  startDate: Date;
  endDate: Date;
  timezone: string;
  location: {
    type: 'physical' | 'online' | 'hybrid';
    venue?: string;
    address?: string;
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Catégorie et tags
  category: string; // 'tech', 'business', 'education', etc.
  tags: string[];
  
  // Pricing
  pricing: {
    type: 'free' | 'paid';
    amount?: number;
    currency?: string;
    earlyBird?: {
      amount: number;
      deadline: Date;
    };
  };
  
  // Capacité
  capacity: {
    total: number;
    available: number;
    registered: number;
  };
  
  // Ratings et reviews
  rating: {
    average: number; // 0-5
    count: number;
  };
  
  // Visibilité
  visibility: 'public' | 'private' | 'unlisted';
  featured: boolean;
  
  // SEO
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage: string;
  };
  
  // Timestamps
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Organizer Profile (Public)

```typescript
interface PublicOrganizer {
  id: string;
  slug: string;
  name: string;
  avatar: string;
  coverImage: string;
  bio: string;
  
  location: {
    city: string;
    country: string;
  };
  
  website?: string;
  social: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  
  stats: {
    totalEvents: number;
    upcomingEvents: number;
    totalAttendees: number;
    rating: number;
    reviewCount: number;
  };
  
  verified: boolean;
  
  createdAt: Date;
}
```

---

## 🔍 Fonctionnalités Détaillées

### Page Liste d'Événements

#### Recherche
- **Recherche textuelle** (titre, description, tags)
- **Recherche géographique** (ville, pays, rayon)
- **Autocomplétion** des suggestions
- **Historique de recherche** (localStorage)

#### Filtres
- **Localisation**
  - Ville
  - Pays
  - Rayon (5km, 10km, 25km, 50km, 100km)
  - En ligne / Présentiel / Hybride
  
- **Date**
  - Aujourd'hui
  - Ce week-end
  - Cette semaine
  - Ce mois
  - Plage personnalisée
  
- **Catégorie**
  - Tech
  - Business
  - Education
  - Arts & Culture
  - Sports
  - Santé & Bien-être
  - Autre
  
- **Prix**
  - Gratuit
  - Payant
  - < €20
  - €20-€50
  - €50-€100
  - > €100

#### Tri
- Plus récents
- Plus populaires
- Mieux notés
- Prix croissant
- Prix décroissant
- Date proche

#### Affichage
- **Vue grille** (cards)
- **Vue liste** (détails)
- **Vue carte** (map view)

---

### Page Détail Événement

#### Sections
1. **Hero Section**
   - Cover image
   - Titre
   - Organisateur
   - Rating
   - Bouton d'inscription

2. **Informations Essentielles**
   - Date et heure
   - Lieu (avec carte)
   - Prix
   - Capacité
   - Boutons de partage

3. **Description**
   - Description complète
   - Ce que vous apprendrez
   - Programme/Agenda
   - Speakers/Intervenants

4. **Organisateur**
   - Profil
   - Rating
   - Nombre d'événements
   - Lien vers profil

5. **Reviews**
   - Liste des avis
   - Filtres (note, date)
   - Pagination

6. **Événements Similaires**
   - Recommandations
   - Même catégorie
   - Même lieu

#### Actions
- **S'inscrire** (redirect vers login si non connecté)
- **Partager** (Facebook, Twitter, LinkedIn, Email, Copier lien)
- **Sauvegarder** (wishlist)
- **Signaler** (contenu inapproprié)
- **Ajouter au calendrier** (Google, Outlook, iCal)

---

### Page Profil Organisateur

#### Sections
1. **Header**
   - Cover image
   - Avatar
   - Nom
   - Rating
   - Localisation
   - Site web
   - Réseaux sociaux

2. **Stats**
   - Nombre d'événements
   - Nombre de participants
   - Rating moyen
   - Nombre d'avis

3. **À propos**
   - Biographie
   - Spécialités
   - Certifications

4. **Événements à venir**
   - Liste des événements futurs
   - Filtres et tri

5. **Événements passés**
   - Historique
   - Archives

6. **Avis**
   - Reviews de l'organisateur
   - Filtres et pagination

#### Actions
- **Suivre** l'organisateur
- **Contacter** (formulaire)
- **Partager** le profil
- **Signaler**

---

## 🎨 Design System

### Composants à Créer

#### EventCard
```typescript
interface EventCardProps {
  event: PublicEvent;
  variant: 'grid' | 'list' | 'featured';
  showOrganizer?: boolean;
  showRating?: boolean;
}
```

#### EventFilters
```typescript
interface EventFiltersProps {
  filters: EventFilters;
  onFilterChange: (filters: EventFilters) => void;
  categories: Category[];
  locations: Location[];
}
```

#### EventSearch
```typescript
interface EventSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  suggestions?: string[];
}
```

#### OrganizerCard
```typescript
interface OrganizerCardProps {
  organizer: PublicOrganizer;
  variant: 'compact' | 'full';
  showStats?: boolean;
}
```

#### ReviewCard
```typescript
interface ReviewCardProps {
  review: Review;
  showEvent?: boolean;
  showOrganizer?: boolean;
}
```

---

## 🚀 SEO et Performance

### Meta Tags
```html
<!-- Page Liste -->
<title>Discover Events | AttendanceX</title>
<meta name="description" content="Find and join amazing events near you. Browse thousands of events in tech, business, education and more." />
<meta property="og:title" content="Discover Events | AttendanceX" />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />

<!-- Page Détail -->
<title>Tech Conference 2026 - Paris | AttendanceX</title>
<meta name="description" content="Join us for the biggest tech conference of 2026 in Paris. Learn from industry leaders..." />
<meta property="og:title" content="Tech Conference 2026 - Paris" />
<meta property="og:type" content="event" />
<meta property="og:url" content="https://attendance-x.vercel.app/events/tech-conference-2026-paris" />
```

### Structured Data (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Tech Conference 2026",
  "startDate": "2026-02-15T09:00:00+01:00",
  "endDate": "2026-02-15T18:00:00+01:00",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "Paris Convention Center",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Rue de Paris",
      "addressLocality": "Paris",
      "postalCode": "75001",
      "addressCountry": "FR"
    }
  },
  "image": "https://...",
  "description": "...",
  "offers": {
    "@type": "Offer",
    "url": "https://...",
    "price": "50",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "validFrom": "2026-01-01T00:00:00+01:00"
  },
  "organizer": {
    "@type": "Organization",
    "name": "TechOrg",
    "url": "https://..."
  }
}
```

### Performance
- **SSG** (Static Site Generation) pour les pages statiques
- **ISR** (Incremental Static Regeneration) pour les événements
- **Image optimization** avec Next.js Image
- **Lazy loading** des composants lourds
- **Prefetching** des liens

---

## 📊 Analytics

### Événements à Tracker
- Page views (liste, détail, profil)
- Recherches (termes, filtres)
- Clics sur événements
- Inscriptions
- Partages
- Sauvegardes
- Conversions

### Métriques
- Taux de conversion (visiteur → inscription)
- Taux de rebond
- Temps passé sur la page
- Événements les plus vus
- Catégories les plus populaires
- Sources de trafic

---

## 🔐 Sécurité

### Données Publiques
- Pas d'informations sensibles
- Pas d'emails des participants
- Pas de données personnelles

### Rate Limiting
- 100 requêtes/minute pour la liste
- 200 requêtes/minute pour les détails
- 50 requêtes/minute pour la recherche

### Validation
- Validation des slugs
- Sanitization des inputs
- Protection XSS
- Protection CSRF

---

## ✅ Checklist de Développement

### Backend
- [ ] Créer les endpoints publics
- [ ] Ajouter le champ `slug` aux événements
- [ ] Ajouter le champ `visibility` aux événements
- [ ] Créer les indexes Firestore
- [ ] Implémenter la recherche
- [ ] Implémenter les filtres
- [ ] Implémenter la pagination
- [ ] Ajouter le cache serveur
- [ ] Tests API

### Frontend
- [ ] Créer les pages Next.js
- [ ] Créer les composants UI
- [ ] Implémenter la recherche
- [ ] Implémenter les filtres
- [ ] Implémenter la pagination
- [ ] Ajouter les meta tags SEO
- [ ] Ajouter structured data
- [ ] Optimiser les images
- [ ] Tests E2E
- [ ] Responsive design

### SEO
- [ ] Sitemap.xml
- [ ] Robots.txt
- [ ] Meta tags
- [ ] Structured data
- [ ] Open Graph
- [ ] Twitter Cards
- [ ] Canonical URLs

---

**Prochaine étape:** Commencer le développement backend (endpoints publics)

**Dernière mise à jour:** 26 Janvier 2026
