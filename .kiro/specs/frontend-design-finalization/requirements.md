# Frontend Design Finalization - Requirements

## Feature Overview
Moderniser l'interface frontend d'AttendanceX selon les instructions Kiro pour créer une application de gestion d'événements avec un design épuré et professionnel, incluant un système de localisation complet.

## User Stories

### US-1: Page d'Accueil Moderne
**En tant qu'** utilisateur visitant l'application  
**Je veux** voir une page d'accueil moderne avec localisation  
**Afin de** découvrir facilement des événements près de moi

**Acceptance Criteria:**
1.1. Hero section avec gradient moderne (#4F46E5 à #F59E0B)
1.2. Section de localisation avec sélecteur de ville
1.3. Bouton "Près de moi" avec icône GPS fonctionnel
1.4. Grille d'événements 3 colonnes (desktop), 2 (tablette), 1 (mobile)
1.5. Filtres horizontaux par catégories (badges cliquables)
1.6. Badge de distance "À X km" sur chaque carte d'événement
1.7. Compteur de résultats "X événements trouvés à [Ville]"
1.8. Animations hover fluides (élévation + zoom subtil)

### US-2: Liste d'Événements Améliorée
**En tant qu'** utilisateur recherchant des événements  
**Je veux** filtrer et trier les événements efficacement  
**Afin de** trouver exactement ce que je cherche

**Acceptance Criteria:**
2.1. Barre de filtres horizontale complète
2.2. Filtres par catégorie (musique, sport, conférence, festival, etc.)
2.3. Filtre par date (Aujourd'hui, Cette semaine, Ce mois-ci, Personnalisé)
2.4. Filtre par prix (Gratuit, Payant, Toutes gammes)
2.5. Tri par distance, date, popularité, prix
2.6. Filtre par rayon de distance (5km, 10km, 25km, 50km, 100km+)
2.7. Compteur de résultats dynamique
2.8. Vue carte interactive (toggle liste/carte)

### US-3: Page Détails Événement Optimisée
**En tant qu'** utilisateur intéressé par un événement  
**Je veux** voir tous les détails dans un layout clair  
**Afin de** prendre une décision d'inscription éclairée

**Acceptance Criteria:**
3.1. Hero banner optimisé avec overlay gradient
3.2. Layout 2 colonnes (70% gauche / 30% droite)
3.3. Colonne gauche: Description, Détails, Carte interactive, Programme/Agenda
3.4. Colonne droite: Card de réservation sticky
3.5. Carte Google Maps interactive du lieu
3.6. Bouton "Itinéraire" fonctionnel
3.7. Section Programme/Agenda avec timeline verticale
3.8. Affichage distance depuis position utilisateur
3.9. Section événements similaires en bas

### US-4: Dashboard Utilisateur
**En tant qu'** organisateur d'événements  
**Je veux** voir mes statistiques et gérer mes événements  
**Afin de** suivre mes performances

**Acceptance Criteria:**
4.1. 4 cards de statistiques en haut (Événements créés, À venir, Participants, Revenus)
4.2. Chaque card avec icône, valeur, label, indicateur de tendance (↑/↓)
4.3. Onglets: Tous, Actifs, Passés, Brouillons
4.4. Vue liste/tableau avec colonnes: Image, Nom, Date, Statut, Participants, Actions
4.5. Menu actions (3 points): Modifier, Dupliquer, Supprimer, Statistiques
4.6. Toggle vue liste/cartes
4.7. Graphiques simples de statistiques

### US-5: Formulaire Création Événement
**En tant qu'** organisateur  
**Je veux** créer un événement via un formulaire guidé  
**Afin de** publier facilement mon événement

**Acceptance Criteria:**
5.1. Stepper 4 étapes visible en haut
5.2. Étape 1: Infos de base (Image, Titre, Catégorie, Tags, Dates/Heures)
5.3. Étape 2: Détails (Description riche, Lieu avec autocomplétion, Carte, Programme)
5.4. Étape 3: Billets (Gratuit/Payant, Types de billets multiples, Prix, Quantité)
5.5. Étape 4: Paramètres (Visibilité, Capacité, Approbation, Notifications)
5.6. Upload image avec drag & drop
5.7. Validation en temps réel
5.8. Boutons "Enregistrer brouillon" et "Publier"

### US-6: Système de Localisation
**En tant qu'** utilisateur  
**Je veux** trouver des événements près de moi  
**Afin de** participer à des événements locaux

**Acceptance Criteria:**
6.1. Détection automatique de position (avec permission)
6.2. Sélecteur de ville avec dropdown et recherche
6.3. Villes populaires suggérées
6.4. Affichage ville actuelle avec icône
6.5. Badge distance sur chaque carte événement
6.6. Filtre par rayon de distance (slider + badges)
6.7. Tri par distance fonctionnel
6.8. Carte interactive avec markers événements
6.9. Clusters pour zones denses
6.10. Popup au clic sur marker avec infos essentielles

### US-7: Composants UI Réutilisables
**En tant que** développeur  
**Je veux** des composants UI cohérents  
**Afin de** maintenir la cohérence visuelle

**Acceptance Criteria:**
7.1. EventCard avec badge distance, animation hover, icône favori
7.2. CategoryBadge pill-shaped avec couleurs par catégorie
7.3. LocationSelector avec dropdown + géolocalisation
7.4. DistanceFilter avec slider + badges prédéfinis
7.5. StatCard pour dashboard (icône, valeur, label, tendance)
7.6. InteractiveMap avec markers, clusters, popups
7.7. Tous les composants responsive
7.8. Dark mode supporté

## Design System Requirements

### Palette de Couleurs
- **Primaire**: #4F46E5 (indigo)
- **Accent**: #F59E0B (orange)
- **Background**: #F9FAFB (gris très clair)
- **Cards**: #FFFFFF (blanc)
- **Texte principal**: #1F2937 (gris foncé)
- **Texte secondaire**: #6B7280 (gris moyen)
- **Bordures**: #E5E7EB (gris très clair)

### Typographie
- **Police**: Inter ou Poppins (sans-serif moderne)
- **H1**: 32-36px, font-weight 700
- **H2**: 24-28px, font-weight 600
- **H3**: 18-20px, font-weight 600
- **Body**: 14-16px, font-weight 400
- **Small**: 12-14px, font-weight 400

### Espacements
- **Padding cards**: 20-24px
- **Gap éléments**: 16-20px
- **Marges sections**: 32-40px
- **Border-radius cards**: 12-16px
- **Border-radius boutons**: 8px

### Animations
- **Hover**: transition 200-300ms ease
- **Page changes**: fade-in 300ms
- **Cards apparition**: stagger animation (décalage 50ms)
- **Modals**: scale et fade 250ms

## Technical Requirements

### Frontend Stack
- **Framework**: Next.js (existant)
- **Styling**: Tailwind CSS (existant)
- **Icons**: Lucide React (existant)
- **Maps**: @react-google-maps/api (à installer)
- **State**: React hooks + Context API

### Responsive Breakpoints
- **Mobile**: < 640px
- **Tablette**: 640px - 1024px
- **Desktop**: > 1024px

### Performance
- Images optimisées (Next.js Image)
- Lazy loading des composants lourds
- Debounce pour recherches
- Loading skeletons partout

### Accessibilité (WCAG 2.1 AA)
- Contraste minimum 4.5:1 pour texte normal
- Contraste minimum 3:1 pour texte large
- Labels visibles sur tous les inputs
- Focus visible sur éléments interactifs
- Navigation clavier complète
- Attributs ARIA appropriés
- Alt text sur toutes les images

## Out of Scope (Phase 2)
- Intégration Stripe pour paiements
- Génération billets PDF
- QR codes check-in
- Système de reviews
- Analytics avancés
- Notifications push
- Application mobile native

## Dependencies
- Existant: Next.js, Tailwind CSS, Lucide React
- À installer: @react-google-maps/api
- Backend API: Endpoints publics déjà fonctionnels

## Success Metrics
- Performance Lighthouse > 90
- Responsive 100% (mobile, tablette, desktop)
- Accessibilité score A
- Temps de chargement < 2s
- 0 erreur console
- Design system appliqué à 100%

## Risks and Mitigations
**Risque**: Google Maps API coût élevé  
**Mitigation**: Limiter les appels, utiliser cache, considérer alternatives (Mapbox, Leaflet)

**Risque**: Performance avec beaucoup d'événements  
**Mitigation**: Pagination, virtualisation, lazy loading

**Risque**: Géolocalisation refusée par utilisateur  
**Mitigation**: Fallback sur sélection manuelle de ville

## Notes
- Suivre strictement les instructions du steering file `instructions_kiro_gestion_evenements.md`
- Utiliser les composants UI existants comme base
- Maintenir la compatibilité avec le backend existant
- Tester sur vrais devices (mobile, tablette)
- Documenter tous les nouveaux composants
