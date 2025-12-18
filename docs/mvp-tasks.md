# MVP Tasks - Liste Détaillée des Tâches

## Phase 1: Frontend Core (Semaine 1-2)

### Setup & Configuration (2 jours)

#### Task 1.1: Initialiser le projet frontend
- [ ] Vérifier la configuration Vite existante
- [ ] Installer les dépendances manquantes
  - React Router v6
  - React Query (TanStack Query)
  - Zustand (state management)
  - React Hook Form
  - Zod (validation)
  - date-fns
  - lucide-react (icons)
- [ ] Configurer les variables d'environnement
- [ ] Configurer les alias de chemins
- [ ] Tester le build

#### Task 1.2: Structure du projet
- [ ] Créer la structure de dossiers
  ```
  src/
  ├── components/
  │   ├── ui/           # Composants de base
  │   ├── forms/        # Composants de formulaires
  │   ├── layout/       # Layout components
  │   └── features/     # Composants métier
  ├── pages/            # Pages de l'app
  ├── services/         # API calls
  ├── hooks/            # Custom hooks
  ├── stores/           # Zustand stores
  ├── utils/            # Utilitaires
  ├── types/            # Types TypeScript
  └── config/           # Configuration
  ```
- [ ] Créer les fichiers de configuration
- [ ] Setup ESLint et Prettier

### Authentification (3 jours)

#### Task 1.3: Pages d'authentification
- [ ] Page Login
  - Formulaire email/password
  - Validation avec Zod
  - Gestion des erreurs
  - Lien "Mot de passe oublié"
  - Lien "S'inscrire"
- [ ] Page Register
  - Formulaire complet
  - Validation des champs
  - Confirmation de mot de passe
  - Acceptation des CGU
- [ ] Page Forgot Password
  - Formulaire email
  - Message de confirmation
- [ ] Page Reset Password
  - Formulaire nouveau mot de passe
  - Validation du token

#### Task 1.4: Service d'authentification
- [ ] Créer `authService.ts`
  - login()
  - register()
  - logout()
  - forgotPassword()
  - resetPassword()
  - getCurrentUser()
- [ ] Créer `authStore.ts` (Zustand)
  - État : user, isAuthenticated, isLoading
  - Actions : setUser, clearUser
- [ ] Créer le hook `useAuth()`
- [ ] Créer le composant `ProtectedRoute`

### Layout & Navigation (2 jours)

#### Task 1.5: Layout principal
- [ ] Composant `AppLayout`
  - Header avec logo et menu utilisateur
  - Sidebar avec navigation
  - Zone de contenu principale
  - Footer (optionnel)
- [ ] Composant `Header`
  - Logo cliquable
  - Menu utilisateur (dropdown)
  - Notifications (icône)
- [ ] Composant `Sidebar`
  - Navigation principale
  - Indicateur de page active
  - Collapse/expand
  - Responsive (drawer sur mobile)

#### Task 1.6: Navigation
- [ ] Configurer React Router
- [ ] Créer les routes principales
  ```typescript
  /login
  /register
  /forgot-password
  /reset-password
  /dashboard
  /events
  /events/new
  /events/:id
  /events/:id/attendances
  /profile
  /settings
  ```
- [ ] Breadcrumbs
- [ ] Gestion du 404

### Dashboard (2 jours)

#### Task 1.7: Page Dashboard
- [ ] Layout de la page
- [ ] Cartes de statistiques
  - Nombre d'événements
  - Nombre de participants
  - Taux de présence moyen
  - Événements à venir
- [ ] Liste des événements récents
- [ ] Liste des événements à venir
- [ ] Graphique simple (Chart.js)
  - Présences par mois
  - Taux de présence par événement

#### Task 1.8: Service Dashboard
- [ ] Créer `dashboardService.ts`
  - getStats()
  - getRecentEvents()
  - getUpcomingEvents()
- [ ] Créer les types TypeScript
- [ ] Gérer le loading et les erreurs

## Phase 2: Gestion des Événements (Semaine 2)

### Liste des Événements (2 jours)

#### Task 2.1: Page Liste des Événements
- [ ] Layout de la page
- [ ] Barre de recherche
- [ ] Filtres
  - Par statut (à venir, en cours, terminé)
  - Par date
  - Par organisateur
- [ ] Table des événements
  - Colonnes : Titre, Date, Lieu, Participants, Présences, Actions
  - Tri par colonne
  - Pagination
- [ ] Actions rapides
  - Voir détails
  - Éditer
  - Supprimer
  - Dupliquer

#### Task 2.2: Service Événements
- [ ] Créer `eventService.ts`
  - getEvents(filters, pagination)
  - getEvent(id)
  - createEvent(data)
  - updateEvent(id, data)
  - deleteEvent(id)
  - duplicateEvent(id)
- [ ] Créer les types TypeScript
- [ ] Gérer le cache avec React Query

### Création d'Événement (3 jours)

#### Task 2.3: Formulaire de Création (Wizard)
- [ ] Étape 1 : Informations de base
  - Titre (requis)
  - Description
  - Type d'événement (dropdown)
  - Modalité (physique/virtuel/hybride)
- [ ] Étape 2 : Date et Lieu
  - Date de début (date + heure)
  - Date de fin (date + heure)
  - Lieu (si physique)
  - Lien (si virtuel)
  - Fuseau horaire
- [ ] Étape 3 : Participants
  - Capacité maximale
  - Inscription publique/privée
  - Approbation requise (toggle)
  - Liste d'invités (optionnel)
- [ ] Étape 4 : Paramètres de Présence
  - Méthodes activées (QR, GPS, Manuel)
  - Rayon GPS (si activé)
  - Fenêtre de marquage (avant/après)
- [ ] Étape 5 : Récapitulatif
  - Afficher toutes les infos
  - Bouton "Créer l'événement"

#### Task 2.4: Composants de Formulaire
- [ ] `FormStep` (wrapper pour chaque étape)
- [ ] `StepIndicator` (indicateur de progression)
- [ ] `DateTimePicker`
- [ ] `LocationPicker` (avec autocomplete)
- [ ] `ParticipantSelector`
- [ ] Validation avec Zod pour chaque étape

### Détail d'Événement (2 jours)

#### Task 2.5: Page Détail
- [ ] Header avec titre et actions
  - Éditer
  - Supprimer
  - Partager
  - Exporter
- [ ] Onglets
  - Vue d'ensemble
  - Participants
  - Présences
  - Statistiques
- [ ] Onglet Vue d'ensemble
  - Informations complètes
  - QR code de l'événement
  - Lien d'inscription
  - Carte (si lieu physique)
- [ ] Onglet Participants
  - Liste des participants
  - Statut d'inscription
  - Actions (ajouter, supprimer, envoyer invitation)
- [ ] Onglet Présences
  - Liste des présences
  - Filtres (présent, absent, en retard)
  - Marquage manuel
- [ ] Onglet Statistiques
  - Graphiques
  - Métriques clés

## Phase 3: Onboarding & Invitations (Semaine 3)

### Onboarding Organisation (3 jours)

#### Task 3.1: Wizard d'Onboarding
- [ ] Détecter si l'utilisateur a une organisation
- [ ] Rediriger vers l'onboarding si nécessaire
- [ ] Étape 1 : Bienvenue
  - Message de bienvenue
  - Explication du processus
- [ ] Étape 2 : Informations Organisation
  - Nom de l'organisation
  - Secteur d'activité
  - Taille (dropdown)
  - Logo (upload optionnel)
- [ ] Étape 3 : Configuration
  - Fuseau horaire
  - Langue
  - Devise
- [ ] Étape 4 : Premier Événement (optionnel)
  - Formulaire simplifié
  - Possibilité de skip
- [ ] Étape 5 : Félicitations
  - Message de succès
  - Bouton "Commencer"
  - Tour guidé (optionnel)

#### Task 3.2: Service Organisation
- [ ] Créer `organizationService.ts`
  - createOrganization(data)
  - updateOrganization(id, data)
  - getOrganization(id)
  - uploadLogo(file)
- [ ] Créer le store `organizationStore.ts`
- [ ] Gérer les erreurs

### Système d'Invitation (2 jours)

#### Task 3.3: Inviter des Membres
- [ ] Modal d'invitation
  - Champ email
  - Sélection du rôle
  - Message personnalisé (optionnel)
  - Bouton "Envoyer l'invitation"
- [ ] Liste des invitations en attente
  - Statut (envoyée, acceptée, expirée)
  - Actions (renvoyer, annuler)
- [ ] Service `invitationService.ts`
  - sendInvitation(email, role, message)
  - getInvitations()
  - resendInvitation(id)
  - cancelInvitation(id)

#### Task 3.4: Accepter une Invitation
- [ ] Page d'acceptation `/invite/:token`
  - Afficher les infos de l'organisation
  - Formulaire si nouvel utilisateur
  - Bouton "Accepter l'invitation"
- [ ] Gérer les cas d'erreur
  - Token invalide
  - Token expiré
  - Invitation déjà acceptée
- [ ] Redirection après acceptation

### Templates Email (2 jours)

#### Task 3.5: Templates Email Essentiels
- [ ] Template Bienvenue
  - Design HTML responsive
  - Variables dynamiques
  - CTA "Commencer"
- [ ] Template Invitation Organisation
  - Infos de l'organisation
  - Lien d'acceptation
  - Expiration
- [ ] Template Invitation Événement
  - Détails de l'événement
  - Lien d'inscription
  - Ajouter au calendrier
- [ ] Template Rappel Événement
  - 24h avant
  - Détails de l'événement
  - QR code personnel
- [ ] Template Confirmation Présence
  - Confirmation de marquage
  - Détails de l'événement
- [ ] Tester tous les templates

## Phase 4: Présences (Semaine 4)

### QR Code (3 jours)

#### Task 4.1: Génération QR Code
- [ ] Afficher le QR code sur la page événement
- [ ] Bouton "Télécharger QR Code"
- [ ] Bouton "Imprimer QR Code"
- [ ] QR code avec logo (optionnel)
- [ ] Régénérer le QR code

#### Task 4.2: Scanner QR Code
- [ ] Page de scan `/events/:id/scan`
- [ ] Demander permission caméra
- [ ] Afficher le flux vidéo
- [ ] Détecter et décoder le QR code
- [ ] Envoyer au backend pour validation
- [ ] Afficher le résultat
  - Succès : Nom, photo, message de confirmation
  - Erreur : Message d'erreur clair
- [ ] Permettre de scanner plusieurs codes
- [ ] Historique des scans (session)

#### Task 4.3: Bibliothèque QR
- [ ] Installer `html5-qrcode` ou `react-qr-reader`
- [ ] Créer le composant `QRScanner`
- [ ] Gérer les erreurs
  - Pas de caméra
  - Permission refusée
  - QR code invalide
- [ ] Optimiser les performances

### Liste des Présences (2 jours)

#### Task 4.4: Page Présences
- [ ] Liste des présences
  - Colonnes : Participant, Statut, Heure, Méthode
  - Filtres (statut, méthode, heure)
  - Recherche
  - Tri
- [ ] Actions
  - Marquer présent manuellement
  - Marquer absent
  - Modifier le statut
  - Voir les détails
- [ ] Statistiques en temps réel
  - Nombre de présents
  - Nombre d'absents
  - Taux de présence
  - Graphique en temps réel

#### Task 4.5: Service Présences
- [ ] Créer `attendanceService.ts`
  - getAttendances(eventId, filters)
  - markAttendance(eventId, userId, method)
  - updateAttendance(id, status)
  - scanQRCode(eventId, qrData)
- [ ] WebSocket pour les mises à jour en temps réel (optionnel)
- [ ] Polling pour les stats (toutes les 10s)

## Phase 5: Rapports & Stats (Semaine 5)

### Tableau de Bord (2 jours)

#### Task 5.1: Améliorer le Dashboard
- [ ] Ajouter plus de statistiques
  - Événements ce mois
  - Participants actifs
  - Taux de présence par type d'événement
  - Tendances
- [ ] Graphiques avancés
  - Présences par jour de la semaine
  - Présences par heure
  - Comparaison mois par mois
- [ ] Filtres de période
  - Cette semaine
  - Ce mois
  - Ce trimestre
  - Personnalisé

### Rapports (3 jours)

#### Task 5.2: Rapport de Présence
- [ ] Page de rapport `/events/:id/report`
- [ ] Afficher les statistiques
  - Taux de présence
  - Taux de ponctualité
  - Durée moyenne
  - Méthodes utilisées
- [ ] Graphiques
  - Présences par statut (pie chart)
  - Présences par heure (line chart)
  - Présences par méthode (bar chart)
- [ ] Liste détaillée des participants
  - Avec statut et heure

#### Task 5.3: Export de Rapports
- [ ] Bouton "Exporter PDF"
  - Utiliser `jsPDF` ou `react-pdf`
  - Inclure le logo de l'organisation
  - Inclure les graphiques
  - Inclure la liste des participants
- [ ] Bouton "Exporter Excel"
  - Utiliser `xlsx`
  - Feuille avec statistiques
  - Feuille avec liste détaillée
- [ ] Bouton "Exporter CSV"
  - Format simple
  - Compatible Excel

#### Task 5.4: Attestations de Présence
- [ ] Générer une attestation PDF
  - Template professionnel
  - Logo de l'organisation
  - Informations du participant
  - Informations de l'événement
  - QR code de vérification
  - Signature numérique
- [ ] Envoi par email
- [ ] Téléchargement direct

## Phase 6: Polish & Tests (Semaine 6-7)

### Gestion des Erreurs (2 jours)

#### Task 6.1: Messages d'Erreur
- [ ] Créer un système de notification toast
  - Succès (vert)
  - Erreur (rouge)
  - Warning (orange)
  - Info (bleu)
- [ ] Mapper les erreurs backend
  - 400 : Validation
  - 401 : Non authentifié
  - 403 : Non autorisé
  - 404 : Non trouvé
  - 500 : Erreur serveur
- [ ] Messages clairs et actionnables
- [ ] Traduction française

#### Task 6.2: Validation des Formulaires
- [ ] Validation en temps réel
- [ ] Messages d'erreur sous les champs
- [ ] Désactiver le submit si invalide
- [ ] Feedback visuel (bordures rouges)
- [ ] Tester tous les formulaires

### Tests (3 jours)

#### Task 6.3: Tests E2E
- [ ] Installer Cypress ou Playwright
- [ ] Test : Créer un compte
- [ ] Test : Créer une organisation
- [ ] Test : Créer un événement
- [ ] Test : Inviter un participant
- [ ] Test : Marquer une présence
- [ ] Test : Voir les statistiques
- [ ] Test : Exporter un rapport

#### Task 6.4: Tests Unitaires
- [ ] Tests des services
- [ ] Tests des hooks
- [ ] Tests des utilitaires
- [ ] Couverture > 70%

### Optimisation (2 jours)

#### Task 6.5: Performance
- [ ] Lazy loading des pages
- [ ] Code splitting
- [ ] Optimisation des images
- [ ] Compression
- [ ] Caching
- [ ] Lighthouse score > 90

#### Task 6.6: Responsive
- [ ] Tester sur mobile
- [ ] Tester sur tablette
- [ ] Tester sur desktop
- [ ] Corriger les problèmes
- [ ] Touch-friendly

### Documentation (2 jours)

#### Task 6.7: Documentation Utilisateur
- [ ] Guide de démarrage rapide
- [ ] Tutoriel vidéo (optionnel)
- [ ] FAQ
- [ ] Aide contextuelle dans l'app
- [ ] Tooltips

#### Task 6.8: Documentation Technique
- [ ] README du frontend
- [ ] Guide de contribution
- [ ] Architecture frontend
- [ ] Conventions de code

## Phase 7: Déploiement (Semaine 8)

### Configuration Production (2 jours)

#### Task 7.1: Variables d'Environnement
- [ ] Créer `.env.production`
- [ ] Configurer les URLs de production
- [ ] Configurer les clés API
- [ ] Tester la configuration

#### Task 7.2: Build de Production
- [ ] Optimiser le build
- [ ] Tester le build localement
- [ ] Vérifier la taille des bundles
- [ ] Analyser les dépendances

### Déploiement (2 jours)

#### Task 7.3: Firebase Hosting
- [ ] Configurer Firebase Hosting
- [ ] Configurer les redirections
- [ ] Configurer le cache
- [ ] Déployer sur staging
- [ ] Tester sur staging
- [ ] Déployer sur production

#### Task 7.4: Monitoring
- [ ] Configurer Firebase Analytics
- [ ] Configurer Error Reporting
- [ ] Configurer Performance Monitoring
- [ ] Créer des alertes
- [ ] Dashboard de monitoring

### Tests Finaux (1 jour)

#### Task 7.5: Tests de Production
- [ ] Tester tous les workflows
- [ ] Tester sur différents navigateurs
- [ ] Tester sur différents appareils
- [ ] Tester les performances
- [ ] Corriger les bugs critiques

## Estimation Totale

- **Phase 1** : 10 jours (2 semaines)
- **Phase 2** : 7 jours (1.5 semaines)
- **Phase 3** : 7 jours (1.5 semaines)
- **Phase 4** : 5 jours (1 semaine)
- **Phase 5** : 5 jours (1 semaine)
- **Phase 6** : 9 jours (2 semaines)
- **Phase 7** : 5 jours (1 semaine)

**Total** : 48 jours (~10 semaines avec 1 développeur frontend)

Avec 2 développeurs en parallèle : **5-6 semaines**

## Priorisation

### Must Have (Bloquant)
- Authentification
- Création d'événement
- QR Code scanning
- Liste des présences

### Should Have (Important)
- Onboarding
- Invitations
- Dashboard
- Rapports de base

### Could Have (Nice to have)
- Graphiques avancés
- Attestations PDF
- Mode hors-ligne
- Notifications push

### Won't Have (Post-MVP)
- Géolocalisation
- Biométrie
- Application mobile
- Intégrations tierces
