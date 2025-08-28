# Implementation Plan - Core Workflow V1

## Vue d'ensemble

Ce plan d'implémentation définit les tâches nécessaires pour compléter le système de workflow principal, en tenant compte des composants déjà existants dans l'application. L'approche est incrémentale et privilégie la réutilisation des services et composants existants.

## État Actuel - Composants Existants

### ✅ Déjà Implémentés
- **EventCreationWizard** : Wizard complet de création d'événements (5 étapes)
- **OrganizationOnboardingFlow** : Flow d'onboarding des organisations
- **UserInvitation** : Système d'invitation des utilisateurs
- **InvitationService** : Service complet avec import CSV/Excel
- **OrganizationService** : Gestion des organisations
- **EventService** : Gestion des événements
- **NotificationService** : Système de notifications
- **Types partagés** : Organization, Event, User, Notification, etc.

### 🔄 À Étendre/Modifier
- **Gestion des équipes** : Ajout du concept d'équipes multiples
- **Distinction utilisateur/participant** : Clarification des rôles
- **Support multi-langues** : Extension des notifications
- **Validation manuelle** : Interface pour les membres d'équipe
- **Import utilisateurs** : Extension avec rôle CONTRIBUTOR par défaut

---

## Tâches d'Implémentation

### Phase 1 : Extensions des Modèles et Services

- [x] 1. Étendre les types existants pour les équipes multiples


  - Créer l'interface `Team` avec permissions par équipe
  - Étendre `OrganizationUser` avec support multi-équipes
  - Ajouter `EventParticipant` pour distinguer des utilisateurs internes
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Mettre à jour les services pour le support des équipes


  - Étendre `organizationService` avec gestion des équipes
  - Ajouter méthodes CRUD pour les équipes dans `organizationService`
  - Modifier `userService` pour l'affectation multi-équipes
  - _Requirements: 1.2, 2.2_

- [x] 3. Implémenter le service de gestion des participants


  - Créer `participantService` distinct du `userService`
  - Ajouter méthodes d'import CSV/Excel pour participants
  - Implémenter la détection automatique utilisateur interne vs externe
  - _Requirements: 3.2, 3.3_

### Phase 2 : Gestion des Équipes

- [x] 4. Créer les composants de gestion des équipes


  - Développer `TeamManagement` component pour CRUD équipes
  - Créer `TeamMemberAssignment` pour affectation utilisateurs
  - Implémenter `TeamPermissionsEditor` pour permissions par équipe
  - _Requirements: 1.3, 2.3_

- [x] 5. Étendre l'onboarding avec création d'équipes


  - Modifier `OrganizationOnboardingFlow` pour inclure étape équipes
  - Ajouter `TeamCreationWizard` dans le flow d'onboarding
  - Implémenter templates d'équipes par secteur d'activité
  - _Requirements: 1.1, 1.3_

- [x] 6. Implémenter l'import en masse des utilisateurs


  - Créer `UserBulkImport` component avec support Excel/CSV
  - Ajouter validation des données avec rôle CONTRIBUTOR par défaut
  - Implémenter affectation automatique aux équipes par département
  - Gérer les mots de passe temporaires et changement obligatoire
  - _Requirements: 2.1, 2.2_

### Phase 3 : Gestion des Participants et Événements

- [x] 7. Étendre EventCreationWizard pour les participants




  - Modifier l'étape "Invitations" pour supporter import CSV/Excel
  - Ajouter distinction utilisateurs internes vs participants externes
  - Implémenter sélection des préférences de notification (email/SMS)
  - Ajouter support des langues dans l'import des participants
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Créer le composant ParticipantListManager




  - Développer interface de gestion avancée des participants
  - Implémenter import CSV/Excel avec validation contact (email OU phone)
  - Ajouter détection et résolution des doublons
  - Créer système de filtrage et recherche multi-critères
  - _Requirements: 3.2, 3.3_

- [x] 9. Implémenter la validation manuelle des présences


  - Créer `AttendanceValidationInterface` pour les membres d'équipe
  - Ajouter permissions de validation selon rôle et équipe
  - Implémenter validation en lot pour les managers
  - Créer interface de override pour les admins
  - _Requirements: 4.1, 4.2, 4.3_

### Phase 4 : Notifications Multi-langues

- [x] 10. Étendre le système de notifications pour multi-langues




  - Modifier `NotificationTemplate` pour support des traductions
  - Créer `MultiLanguageNotificationService` 
  - Implémenter détection automatique de langue utilisateur
  - Ajouter fallback vers langue par défaut organisation
  - _Requirements: 5.1, 5.2_

- [ ] 11. Créer les templates de notification multi-langues
  - Développer templates pour chaque `NotificationType` en fr/en/es/de/it
  - Implémenter système de variables contextuelles
  - Créer interface d'édition des templates par langue
  - Ajouter prévisualisation des notifications
  - _Requirements: 5.1, 5.2_

- [ ] 12. Intégrer les notifications dans les workflows d'import
  - Modifier import utilisateurs pour notifications de bienvenue multi-langues
  - Étendre import participants avec préférences de langue
  - Implémenter notifications de confirmation d'import
  - Ajouter notifications d'erreurs d'import avec détails
  - _Requirements: 5.2, 2.2, 3.3_

### Phase 5 : Interface Utilisateur et Expérience

- [x] 13. Créer le dashboard unifié d'organisation







  - Développer `OrganizationDashboard` avec vue d'ensemble
  - Intégrer statistiques équipes, utilisateurs, événements
  - Ajouter raccourcis vers actions principales (import, création)
  - Implémenter notifications en temps réel des activités
  - _Requirements: 1.4, 6.1_

- [x] 14. Améliorer l'interface de validation des présences

  - Étendre interface existante avec permissions par équipe
  - Ajouter vue en lot pour validation rapide
  - Implémenter scanner QR intégré pour validation mobile
  - Créer historique des validations par membre
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 15. Créer les composants d'analytics et rapports







  - Développer `EventAnalyticsDashboard` avec métriques temps réel
  - Implémenter export des données en CSV/Excel/PDF
  - Ajouter graphiques de participation par équipe
  - Créer rapports de validation des présences
  - _Requirements: 6.1, 6.2_

### Phase 6 : Tests et Validation


 

- [-] 16. Implémenter les tests unitaires des nouveaux services

  - Tester `TeamService` avec toutes les opérations CRUD
  - Valider `ParticipantService` avec import et détection doublons
  - Tester `MultiLanguageNotificationService` avec toutes les langues
  - Vérifier calcul des permissions multi-équipes
  - _Requirements: Tous_

- [ ] 17. Créer les tests d'intégration des workflows
  - Tester workflow complet onboarding avec équipes
  - Valider import utilisateurs avec affectation équipes
  - Tester création événement avec participants externes
  - Vérifier notifications multi-langues end-to-end
  - _Requirements: Tous_

- [ ] 18. Tests de validation utilisateur
  - Tester workflow onboarding complet par secteur
  - Valider import CSV/Excel avec différents formats
  - Tester validation présences par différents rôles
  - Vérifier expérience multi-langues complète
  - _Requirements: Tous_

---

## Priorités et Dépendances

### Priorité Haute (Phase 1-2)
- Extensions des modèles (tâche 1)
- Services équipes (tâche 2)
- Gestion équipes UI (tâches 4-5)
- Import utilisateurs (tâche 6)

### Priorité Moyenne (Phase 3-4)
- Gestion participants (tâches 7-8)
- Validation présences (tâche 9)
- Notifications multi-langues (tâches 10-12)

### Priorité Basse (Phase 5-6)
- Dashboard et analytics (tâches 13-15)
- Tests complets (tâches 16-18)

## Notes d'Implémentation

### Réutilisation de l'Existant
- **EventCreationWizard** : Étendre étape 4 pour import participants
- **OrganizationOnboardingFlow** : Ajouter étape création équipes
- **InvitationService** : Réutiliser pour import utilisateurs et participants
- **Types partagés** : Étendre sans casser la compatibilité

### Nouvelles Fonctionnalités Clés
- **Multi-équipes** : Un utilisateur peut appartenir à plusieurs équipes
- **Distinction utilisateur/participant** : Clarification des rôles et permissions
- **Multi-langues** : Support complet des notifications en 5 langues
- **Validation manuelle** : Interface dédiée pour les membres d'équipe
- **Import avancé** : Support CSV/Excel avec validation et gestion erreurs

### Considérations Techniques
- **Compatibilité** : Maintenir compatibilité avec API existantes
- **Performance** : Optimiser imports en lot et calculs permissions
- **Sécurité** : Validation stricte des permissions multi-équipes
- **UX** : Interface intuitive pour workflows complexes