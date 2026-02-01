# 🗺️ Roadmap d'Implémentation - AttendanceX

## Date: 2026-01-30
## Durée totale estimée: 4 semaines

---

## 🎯 SPRINT 1: DESIGN FRONTEND (Semaine 1)

### Objectif: Moderniser l'interface selon les instructions Kiro

### Jour 1-2: Pages Principales (16h)
**Priorité**: 🔴 CRITIQUE

#### Tâches:
1. **Page d'accueil** (`frontend/src/pages/index.tsx`)
   - [ ] Hero section avec gradient moderne
   - [ ] Section localisation (sélecteur ville + "Près de moi")
   - [ ] Grille événements 3 colonnes responsive
   - [ ] Filtres horizontaux (catégories badges)
   - [ ] Appliquer palette (#4F46E5, #F59E0B)
   - **Temps**: 6h

2. **Page liste événements** (`frontend/src/pages/events/index.tsx`)
   - [ ] Barre de filtres complète
   - [ ] Compteur de résultats
   - [ ] Tri par distance
   - [ ] Animation hover sur cartes
   - **Temps**: 4h

3. **Page détails événement** (`frontend/src/pages/events/[slug].tsx`)
   - [ ] Optimiser hero banner
   - [ ] Layout 2 colonnes (70/30)
   - [ ] Card réservation sticky
   - [ ] Section programme/agenda
   - **Temps**: 6h

### Jour 3-4: Dashboard et Formulaires (16h)

4. **Dashboard utilisateur** (`frontend/src/pages/app/dashboard.tsx`)
   - [ ] 4 cards statistiques en haut
   - [ ] Onglets (Tous, Actifs, Passés, Brouillons)
   - [ ] Vue liste/tableau avec actions
   - [ ] Graphiques simples
   - **Temps**: 8h

5. **Formulaire création événement** (`frontend/src/pages/app/events/create.tsx`)
   - [ ] Stepper 4 étapes
   - [ ] Étape 1: Infos de base
   - [ ] Étape 2: Détails et description
   - [ ] Étape 3: Billets et tarification
   - [ ] Étape 4: Paramètres et publication
   - **Temps**: 8h

### Jour 5: Composants UI (8h)

6. **Composants réutilisables**
   - [ ] EventCard amélioré (badge distance, animation)
   - [ ] CategoryBadge (pill-shaped, couleurs)
   - [ ] LocationSelector (dropdown + géoloc)
   - [ ] DistanceFilter (slider + badges)
   - [ ] StatCard (pour dashboard)
   - **Temps**: 8h

**Livrables Sprint 1**:
- ✅ Design moderne appliqué
- ✅ Pages principales refaites
- ✅ Composants UI réutilisables
- ✅ Responsive 100%

---

## 🌍 SPRINT 2: SYSTÈME DE LOCALISATION (Semaine 2)

### Objectif: Implémenter la géolocalisation complète

### Jour 1-2: Services et Hooks Frontend (16h)

1. **Service de géolocalisation** (`frontend/src/services/locationService.ts`)
   - [ ] getCurrentPosition()
   - [ ] calculateDistance()
   - [ ] searchCities()
   - [ ] getNearbyEvents()
   - **Temps**: 4h

2. **Hook useLocation** (`frontend/src/hooks/useLocation.ts`)
   - [ ] État: position, ville, rayon, loading, error
   - [ ] Actions: detectPosition, selectCity, setRadius
   - [ ] Persistance localStorage
   - **Temps**: 4h

3. **Intégration dans les pages**
   - [ ] Header avec sélecteur ville
   - [ ] Bouton "Près de moi"
   - [ ] Affichage distance sur cartes
   - [ ] Filtre par rayon
   - **Temps**: 8h

### Jour 3-4: Google Maps (16h)

4. **Installation et configuration**
   - [ ] Installer `@react-google-maps/api`
   - [ ] Configurer API key
   - [ ] Créer MapContainer component
   - **Temps**: 2h

5. **Composants carte**
   - [ ] EventMarker (marker personnalisé)
   - [ ] MarkerCluster (groupement)
   - [ ] InfoWindow (popup détails)
   - [ ] MapControls (zoom, recentrer)
   - **Temps**: 8h

6. **Page vue carte** (`frontend/src/pages/events/map.tsx`)
   - [ ] Carte plein écran
   - [ ] Liste latérale
   - [ ] Synchronisation carte/liste
   - [ ] Filtres sur carte
   - **Temps**: 6h

### Jour 5: Backend Localisation (8h)

7. **API Backend**
   - [ ] Routes: `/api/v1/location/*`
   - [ ] Controller: location.controller.ts
   - [ ] Service: location.service.ts
   - [ ] Endpoints: cities, nearby, calculate-distance
   - [ ] Tests unitaires
   - **Temps**: 8h

**Livrables Sprint 2**:
- ✅ Géolocalisation fonctionnelle
- ✅ Carte interactive
- ✅ Filtres par distance
- ✅ API backend localisation

---

## 💳 SPRINT 3: SYSTÈME DE BILLETTERIE (Semaine 3)

### Objectif: Permettre l'achat de billets

### Jour 1-2: Intégration Stripe (16h)

1. **Configuration Stripe**
   - [ ] Créer compte Stripe
   - [ ] Installer SDK: `stripe`
   - [ ] Configurer webhooks
   - [ ] Variables d'environnement
   - **Temps**: 2h

2. **Backend Stripe**
   - [ ] Service: stripe.service.ts
   - [ ] Créer Payment Intent
   - [ ] Gérer webhooks
   - [ ] Remboursements
   - **Temps**: 6h

3. **Frontend Stripe**
   - [ ] Installer `@stripe/stripe-js` et `@stripe/react-stripe-js`
   - [ ] Composant PaymentForm
   - [ ] Gestion des erreurs
   - [ ] Confirmation paiement
   - **Temps**: 8h

### Jour 3: Génération PDF et QR Codes (8h)

4. **Service PDF**
   - [ ] Installer `pdfkit` ou `puppeteer`
   - [ ] Template billet PDF
   - [ ] Génération dynamique
   - [ ] Endpoint download
   - **Temps**: 4h

5. **Service QR Code**
   - [ ] Installer `qrcode`
   - [ ] Génération QR unique
   - [ ] Validation QR
   - [ ] Scan check-in
   - **Temps**: 4h

### Jour 4: API Billetterie (8h)

6. **Backend Tickets**
   - [ ] Routes: `/api/v1/tickets/*`
   - [ ] Controller: tickets.controller.ts
   - [ ] Service: tickets.service.ts
   - [ ] Model: ticket.model.ts
   - [ ] Endpoints: purchase, my-tickets, download, cancel
   - **Temps**: 8h

### Jour 5: Frontend Billetterie (8h)

7. **Pages et composants**
   - [ ] Page achat: `/events/[slug]/purchase`
   - [ ] Page mes billets: `/app/tickets`
   - [ ] Composant TicketCard
   - [ ] Modal confirmation
   - [ ] Téléchargement PDF
   - **Temps**: 8h

**Livrables Sprint 3**:
- ✅ Paiement Stripe fonctionnel
- ✅ Génération billets PDF
- ✅ QR codes
- ✅ Page mes billets

---

## 📊 SPRINT 4: ANALYTICS ET REVIEWS (Semaine 4)

### Objectif: Compléter les fonctionnalités avancées

### Jour 1-2: Analytics (16h)

1. **Backend Analytics**
   - [ ] Routes: `/api/v1/analytics/*`
   - [ ] Service: analytics.service.ts
   - [ ] Calculs statistiques
   - [ ] Agrégations Firestore
   - **Temps**: 8h

2. **Frontend Analytics**
   - [ ] Dashboard organisateur
   - [ ] Graphiques (Chart.js ou Recharts)
   - [ ] Métriques temps réel
   - [ ] Export données
   - **Temps**: 8h

### Jour 3: Système de Reviews (8h)

3. **Backend Reviews**
   - [ ] Routes: `/api/v1/reviews/*`
   - [ ] Service: reviews.service.ts
   - [ ] Modération
   - [ ] Calcul moyenne
   - **Temps**: 4h

4. **Frontend Reviews**
   - [ ] Formulaire avis
   - [ ] Affichage notes
   - [ ] Upload photos
   - [ ] Filtres et tri
   - **Temps**: 4h

### Jour 4: Favoris et Notifications (8h)

5. **Système de Favoris**
   - [ ] Backend: favorites.service.ts
   - [ ] Frontend: useFavorites hook
   - [ ] Page favoris
   - [ ] Icône cœur
   - **Temps**: 4h

6. **Centre de Notifications**
   - [ ] Backend: notifications.service.ts
   - [ ] Frontend: NotificationCenter
   - [ ] Badge compteur
   - [ ] Préférences
   - **Temps**: 4h

### Jour 5: Tests et Optimisation (8h)

7. **Tests et Qualité**
   - [ ] Tests E2E critiques
   - [ ] Tests unitaires manquants
   - [ ] Optimisation performance
   - [ ] Correction bugs
   - [ ] Documentation
   - **Temps**: 8h

**Livrables Sprint 4**:
- ✅ Analytics complet
- ✅ Système de reviews
- ✅ Favoris
- ✅ Notifications
- ✅ Tests et optimisation

---

## 📋 CHECKLIST GLOBALE

### Design Frontend
- [ ] Palette de couleurs appliquée (#4F46E5, #F59E0B)
- [ ] Typographie Inter/Poppins
- [ ] Border-radius 12-16px
- [ ] Ombres légères
- [ ] Animations hover
- [ ] Responsive 3 breakpoints
- [ ] Dark mode

### Localisation
- [ ] Géolocalisation automatique
- [ ] Sélecteur de ville
- [ ] Distance sur cartes
- [ ] Filtre par rayon
- [ ] Carte interactive Google Maps
- [ ] Tri par distance
- [ ] API backend

### Billetterie
- [ ] Intégration Stripe
- [ ] Paiement sécurisé
- [ ] Génération PDF
- [ ] QR codes
- [ ] Emails confirmation
- [ ] Page mes billets
- [ ] Annulation/remboursement

### Analytics
- [ ] Dashboard stats
- [ ] Graphiques
- [ ] Métriques temps réel
- [ ] Export données

### Reviews
- [ ] Formulaire avis
- [ ] Affichage notes
- [ ] Upload photos
- [ ] Modération

### Autres
- [ ] Favoris
- [ ] Notifications
- [ ] Tests E2E
- [ ] Documentation
- [ ] Déploiement

---

## 🚀 COMMANDES RAPIDES

### Démarrer un sprint
```bash
# Créer une branche
git checkout -b sprint-1-design-frontend

# Installer dépendances si nécessaire
cd frontend && npm install
cd backend/functions && npm install
```

### Pendant le développement
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev

# Tests
npm run test
```

### Fin de sprint
```bash
# Build et tests
npm run build
npm run test

# Commit et push
git add .
git commit -m "feat: complete sprint 1 - design frontend"
git push origin sprint-1-design-frontend

# Créer PR sur GitHub
```

---

## 📊 MÉTRIQUES DE SUCCÈS

### Sprint 1
- [ ] 100% pages principales refaites
- [ ] Design system appliqué
- [ ] Responsive validé
- [ ] Performance Lighthouse > 90

### Sprint 2
- [ ] Géolocalisation fonctionnelle
- [ ] Carte interactive opérationnelle
- [ ] API localisation testée
- [ ] Distance affichée partout

### Sprint 3
- [ ] Paiement Stripe testé
- [ ] PDF générés correctement
- [ ] QR codes scannables
- [ ] 0 erreur paiement

### Sprint 4
- [ ] Analytics précis
- [ ] Reviews modérées
- [ ] Notifications envoyées
- [ ] Tests E2E passent

---

## 🎯 PROCHAINE ACTION

**Commencer par**: Sprint 1, Jour 1 - Page d'accueil

**Commande**:
```bash
git checkout -b sprint-1-design-frontend
cd frontend
npm run dev
# Ouvrir frontend/src/pages/index.tsx
```

**Objectif du jour**: Refaire la page d'accueil avec le nouveau design

---

**Dernière mise à jour**: 2026-01-30
**Statut**: Prêt à démarrer
