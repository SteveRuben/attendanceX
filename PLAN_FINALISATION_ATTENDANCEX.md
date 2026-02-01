# 🎯 Plan de Finalisation AttendanceX

## Date: 2026-01-30
## Objectif: Finaliser le design frontend selon les instructions Kiro, puis compléter le backend

---

## 📋 PHASE 1: DESIGN FRONTEND (Priorité Immédiate)

### 1.1 Mise à jour de la Page d'Accueil Publique
**Fichier**: `frontend/src/pages/index.tsx`

**Modifications requises**:
- ✅ Hero section avec gradient moderne
- ✅ Section de localisation avec sélecteur de ville
- ✅ Bouton "Près de moi" pour géolocalisation
- ✅ Grille d'événements 3 colonnes (responsive)
- ✅ Filtres horizontaux (catégories, dates, prix)
- ✅ Badges de distance sur chaque carte

**Design System à appliquer**:
```typescript
// Couleurs
primary: '#4F46E5' (indigo)
accent: '#F59E0B' (orange)
background: '#F9FAFB'
cards: '#FFFFFF'
```

### 1.2 Amélioration de la Page Liste Événements
**Fichier**: `frontend/src/pages/events/index.tsx`

**À ajouter**:
- Barre de filtres horizontale complète
- Compteur de résultats
- Tri par distance
- Vue carte interactive
- Animation au survol des cartes


### 1.3 Refonte de la Page Détails Événement
**Fichier**: `frontend/src/pages/events/[slug].tsx`

**Améliorations**:
- ✅ Hero banner déjà présent (à optimiser)
- ➕ Carte interactive du lieu (Google Maps)
- ➕ Bouton "Itinéraire"
- ➕ Section Programme/Agenda avec timeline
- ➕ Card de réservation sticky (sidebar droite)
- ➕ Affichage distance depuis position utilisateur

### 1.4 Dashboard Utilisateur
**Fichier**: `frontend/src/pages/app/dashboard.tsx`

**À créer/améliorer**:
- Cards de statistiques en haut (4 cards)
- Onglets: Tous, Actifs, Passés, Brouillons
- Vue liste/tableau avec actions
- Graphiques de statistiques

### 1.5 Formulaire Création Événement
**Fichier**: `frontend/src/pages/app/events/create.tsx`

**Stepper multi-étapes**:
1. Informations de base
2. Détails et description
3. Billets et tarification
4. Paramètres et publication

---

## 📋 PHASE 2: COMPOSANTS UI RÉUTILISABLES

### 2.1 Composants à créer/améliorer

**EventCard** (déjà existe - à améliorer):
- Badge distance
- Animation hover
- Icône favori
- Prix en évidence

**LocationSelector** (nouveau):
- Dropdown avec recherche
- Géolocalisation
- Affichage ville actuelle

**DistanceFilter** (nouveau):
- Slider de rayon
- Badges 5km, 10km, 25km, 50km

**InteractiveMap** (nouveau):
- Intégration Google Maps
- Markers événements
- Clusters
- Popups

**CategoryBadge** (améliorer):
- Style pill-shaped
- Couleurs par catégorie
- Cliquable pour filtrer

---

## 📋 PHASE 3: SYSTÈME DE LOCALISATION

### 3.1 Service de Géolocalisation
**Fichier**: `frontend/src/services/locationService.ts`

**Fonctionnalités**:
```typescript
- getCurrentPosition(): Promise<Coordinates>
- calculateDistance(from, to): number
- searchCities(query): Promise<City[]>
- getNearbyEvents(coords, radius): Promise<Event[]>
```

### 3.2 Hook de Localisation
**Fichier**: `frontend/src/hooks/useLocation.ts`

**État géré**:
```typescript
{
  currentPosition: Coordinates | null
  selectedCity: City | null
  radius: number
  loading: boolean
  error: string | null
}
```

### 3.3 Intégration Google Maps
**Package**: `@react-google-maps/api`

**Composants**:
- MapContainer
- EventMarker
- MarkerCluster
- InfoWindow

---

## 📋 PHASE 4: BACKEND - ENDPOINTS MANQUANTS

### 4.1 API de Localisation
**Fichiers à créer**:
```
backend/functions/src/routes/location/
  - location.routes.ts
backend/functions/src/controllers/location/
  - location.controller.ts
backend/functions/src/services/location/
  - location.service.ts
```

**Endpoints**:
```typescript
GET /api/v1/location/cities?search=montreal
GET /api/v1/location/nearby?lat=45.5&lng=-73.5&radius=10
POST /api/v1/location/calculate-distance
```

### 4.2 API de Billetterie
**Fichiers à créer**:
```
backend/functions/src/routes/tickets/
  - tickets.routes.ts
backend/functions/src/controllers/tickets/
  - tickets.controller.ts
backend/functions/src/services/tickets/
  - tickets.service.ts
  - stripe.service.ts
  - pdf-generator.service.ts
```

**Endpoints**:
```typescript
POST /api/v1/tickets/purchase
GET /api/v1/tickets/my-tickets
GET /api/v1/tickets/:id/download
POST /api/v1/tickets/:id/cancel
GET /api/v1/tickets/:id/qr-code
```

### 4.3 API de Statistiques
**Fichiers à créer**:
```
backend/functions/src/routes/analytics/
  - analytics.routes.ts
backend/functions/src/controllers/analytics/
  - analytics.controller.ts
backend/functions/src/services/analytics/
  - analytics.service.ts
```

**Endpoints**:
```typescript
GET /api/v1/analytics/dashboard
GET /api/v1/analytics/events/:id/stats
GET /api/v1/analytics/revenue
GET /api/v1/analytics/participants
```

### 4.4 API de Reviews
**Fichiers à créer**:
```
backend/functions/src/routes/reviews/
  - reviews.routes.ts
backend/functions/src/controllers/reviews/
  - reviews.controller.ts
backend/functions/src/services/reviews/
  - reviews.service.ts
```

**Endpoints**:
```typescript
POST /api/v1/events/:id/reviews
GET /api/v1/events/:id/reviews
PUT /api/v1/reviews/:id
DELETE /api/v1/reviews/:id
```

---

## 📋 PHASE 5: FONCTIONNALITÉS AVANCÉES

### 5.1 Système de Favoris
**Backend**:
- Collection `favorites` dans Firestore
- Endpoints CRUD

**Frontend**:
- Hook `useFavorites`
- Page `/app/favorites`
- Icône cœur sur cartes

### 5.2 Système de Notifications
**Backend**:
- Service de notifications
- Templates d'emails
- Push notifications

**Frontend**:
- Centre de notifications
- Badge de compteur
- Préférences

### 5.3 Calendrier Intégré
**Frontend**:
- Vue calendrier
- Export iCal/Google Calendar
- Rappels

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

### Semaine 1: Design Frontend
**Jour 1-2**: Pages principales
- ✅ Page d'accueil
- ✅ Liste événements
- ✅ Détails événement

**Jour 3-4**: Dashboard et formulaires
- ✅ Dashboard utilisateur
- ✅ Formulaire création

**Jour 5**: Composants UI
- ✅ Tous les composants réutilisables

### Semaine 2: Localisation
**Jour 1-2**: Service et hooks
- ✅ Service de géolocalisation
- ✅ Hook useLocation

**Jour 3-4**: Intégration Maps
- ✅ Google Maps
- ✅ Markers et clusters

**Jour 5**: Backend localisation
- ✅ API endpoints

### Semaine 3: Billetterie
**Jour 1-3**: Backend
- ✅ Intégration Stripe
- ✅ Génération PDF
- ✅ QR codes

**Jour 4-5**: Frontend
- ✅ Formulaire achat
- ✅ Page mes billets

### Semaine 4: Analytics et Reviews
**Jour 1-2**: Analytics
- ✅ Backend + Frontend

**Jour 3-4**: Reviews
- ✅ Backend + Frontend

**Jour 5**: Tests et optimisation

---

## 📊 CHECKLIST DE VALIDATION

### Design
- [ ] Palette de couleurs appliquée (#4F46E5, #F59E0B)
- [ ] Typographie Inter/Poppins
- [ ] Border-radius 12-16px partout
- [ ] Ombres légères sur cartes
- [ ] Animations hover fluides
- [ ] Responsive 3 breakpoints

### Localisation
- [ ] Géolocalisation fonctionnelle
- [ ] Sélecteur de ville
- [ ] Distance sur cartes
- [ ] Filtre par rayon
- [ ] Carte interactive
- [ ] Tri par distance

### Billetterie
- [ ] Achat Stripe
- [ ] Génération PDF
- [ ] QR codes
- [ ] Emails confirmation
- [ ] Page mes billets

### Analytics
- [ ] Dashboard stats
- [ ] Graphiques
- [ ] Export données

### Reviews
- [ ] Formulaire avis
- [ ] Affichage notes
- [ ] Modération

---

## 🚀 COMMANDES RAPIDES

### Démarrer le développement
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev
```

### Créer un nouveau composant
```bash
# Dans frontend/src/components/
mkdir -p location
touch location/LocationSelector.tsx
touch location/DistanceFilter.tsx
touch location/InteractiveMap.tsx
```

### Créer une nouvelle route backend
```bash
# Dans backend/functions/src/
mkdir -p routes/location controllers/location services/location
touch routes/location/location.routes.ts
touch controllers/location/location.controller.ts
touch services/location/location.service.ts
```

---

## 📚 DOCUMENTATION À CRÉER

- [ ] Guide d'utilisation de la géolocalisation
- [ ] Guide d'intégration Stripe
- [ ] Guide de génération PDF
- [ ] API documentation complète
- [ ] Guide de déploiement

---

**Prochaine action**: Commencer par la mise à jour du design de la page d'accueil
