# Implementation Plan - Restructuration du Système de Billing

## Phase 1: Modèles de Données et Infrastructure

- [x] 1. Créer le modèle PromoCode


  - Créer `backend/functions/src/models/promoCode.model.ts`
  - Définir l'interface PromoCode avec tous les champs requis
  - Implémenter la validation des codes (format, dates, limites)
  - Ajouter les méthodes de validation métier (isValid, canBeUsedBy, etc.)
  - Créer l'interface PromoCodeUsage pour le tracking des utilisations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 2. Créer le modèle GracePeriod


  - Créer `backend/functions/src/models/gracePeriod.model.ts`
  - Définir l'interface GracePeriod avec statuts et notifications
  - Implémenter les méthodes de gestion du cycle de vie (isActive, isExpired, etc.)
  - Ajouter la gestion des notifications automatiques
  - Créer les énumérations pour les statuts et sources
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


- [x] 3. Mettre à jour le modèle SubscriptionPlan

  - Modifier `backend/functions/src/models/subscriptionPlan.model.ts`
  - Supprimer la référence au plan gratuit
  - Ajouter le champ gracePeriodDays configurable
  - Mettre à jour les énumérations pour ne garder que 3 plans payants
  - Ajouter les validations pour les nouveaux champs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Mettre à jour le modèle Subscription



  - Modifier `backend/functions/src/models/subscription.model.ts`
  - Ajouter les champs pour les codes promo appliqués
  - Ajouter les champs pour la période de grâce
  - Implémenter l'historique des changements de plan
  - Mettre à jour les validations et méthodes métier
  - _Requirements: 2.4, 3.1, 3.4, 5.4, 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 2: Services Backend Core

- [x] 5. Créer le PromoCodeService


  - Créer `backend/functions/src/services/promoCode/promoCode.service.ts`
  - Implémenter les méthodes CRUD (create, read, update, delete)
  - Ajouter la validation et application des codes promo
  - Implémenter la gestion des limites d'usage (max uses, per user)
  - Ajouter les méthodes de statistiques et rapports
  - Gérer la sécurité et le rate limiting
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.2, 9.3, 9.4_

- [x] 6. Créer le GracePeriodService


  - Créer `backend/functions/src/services/gracePeriod/gracePeriod.service.ts`
  - Implémenter la création et gestion des périodes de grâce
  - Ajouter la logique de notifications automatiques (7j, 3j, 1j)
  - Implémenter la conversion vers abonnement payant
  - Gérer l'expiration et les restrictions d'accès
  - Ajouter les statistiques et métriques de conversion
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 7. Mettre à jour le BillingService


  - Modifier `backend/functions/src/services/billing/billing.service.ts`
  - Intégrer la gestion des codes promo dans les abonnements
  - Ajouter les méthodes pour la période de grâce
  - Supprimer toutes les références au plan gratuit
  - Mettre à jour les calculs de prix avec les réductions
  - Intégrer avec Stripe pour les coupons et réductions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 5.4, 9.4_

## Phase 3: APIs et Contrôleurs

- [x] 8. Créer les contrôleurs pour les codes promo


  - Créer `backend/functions/src/controllers/promoCode/promoCode.controller.ts`
  - Implémenter les endpoints CRUD pour les codes promo
  - Ajouter l'endpoint de validation des codes (POST /promo-codes/validate)
  - Créer l'endpoint d'application des codes (POST /promo-codes/apply)
  - Implémenter les endpoints de statistiques et rapports
  - Gérer les permissions (admin seulement pour création/modification)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.1, 9.2, 9.3, 9.4_

- [x] 9. Créer les contrôleurs pour la période de grâce


  - Créer `backend/functions/src/controllers/gracePeriod/gracePeriod.controller.ts`
  - Implémenter les endpoints de gestion des périodes de grâce
  - Ajouter l'endpoint de conversion (POST /grace-periods/:id/convert)
  - Créer les endpoints de statistiques pour les admins
  - Implémenter l'endpoint d'extension de période (admin seulement)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Mettre à jour les contrôleurs de billing



  - Modifier `backend/functions/src/controllers/billing/billing.controller.ts`
  - Supprimer les endpoints liés au plan gratuit
  - Mettre à jour les endpoints de changement de plan
  - Intégrer la gestion des codes promo dans les souscriptions
  - Ajouter la validation des périodes de grâce
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

## Phase 4: Routes et Middleware

- [x] 11. Créer les routes pour les codes promo


  - Créer `backend/functions/src/routes/promoCode/promoCode.routes.ts`
  - Définir toutes les routes avec les middlewares appropriés
  - Ajouter l'authentification et les permissions
  - Implémenter le rate limiting pour les validations
  - Ajouter la validation des données d'entrée
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.1, 10.2, 10.3, 10.4, 10.5_



- [x] 12. Créer les routes pour la période de grâce



  - Créer `backend/functions/src/routes/gracePeriod/gracePeriod.routes.ts`
  - Définir les routes avec authentification
  - Ajouter les middlewares de validation
  - Implémenter les permissions (utilisateur vs admin)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13. Mettre à jour les routes de billing



  - Modifier `backend/functions/src/routes/billing/billing.routes.ts`
  - Supprimer les routes du plan gratuit
  - Mettre à jour les routes existantes
  - Intégrer les nouvelles fonctionnalités
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 5: Migration et Scripts

- [ ] 14. Créer le script de migration des utilisateurs
  - Créer `backend/functions/src/scripts/migrateUsersFromFree.ts`
  - Identifier tous les utilisateurs avec plan gratuit
  - Créer automatiquement des périodes de grâce de 14 jours
  - Envoyer les notifications de migration par email
  - Logger toutes les opérations pour audit
  - Gérer les erreurs et rollback si nécessaire
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 15. Créer les tâches cron pour les notifications
  - Créer `backend/functions/src/jobs/graceNotifications.job.ts`
  - Implémenter la vérification quotidienne des périodes de grâce
  - Envoyer les notifications aux moments appropriés (7j, 3j, 1j)
  - Gérer l'expiration automatique des périodes
  - Ajouter les métriques et logs de performance
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 16. Créer les scripts d'administration
  - Créer `backend/functions/src/scripts/adminTools.ts`
  - Script de génération de codes promo en masse
  - Script de statistiques et rapports
  - Script de nettoyage des données expirées
  - Script de rollback d'urgence
  - _Requirements: 5.6, 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 6: Frontend - Types et Services

- [x] 17. Mettre à jour les types frontend


  - Modifier `frontend/src/shared/types/billing.types.ts`
  - Ajouter les interfaces pour PromoCode et GracePeriod
  - Supprimer les références au plan gratuit
  - Mettre à jour les énumérations et constantes
  - Ajouter les types pour les nouvelles APIs
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 4.1, 4.2, 5.1, 5.2_


- [x] 18. Mettre à jour le BillingService frontend



  - Modifier `frontend/src/services/billingService.ts`
  - Supprimer les méthodes liées au plan gratuit
  - Ajouter les méthodes pour les codes promo
  - Implémenter les méthodes de gestion de période de grâce
  - Mettre à jour les appels API existants
  - _Requirements: 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 19. Créer le PromoCodeService frontend



  - Créer `frontend/src/services/promoCodeService.ts`
  - Implémenter les méthodes de validation des codes
  - Ajouter les méthodes d'application et suppression
  - Créer les méthodes de gestion pour les admins
  - Gérer les erreurs et messages utilisateur
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 7: Frontend - Composants UI

- [x] 20. Mettre à jour la page de pricing


  - Modifier `frontend/src/pages/Pricing/Pricing.tsx`
  - Supprimer l'affichage du plan gratuit
  - Mettre en évidence les 3 plans payants
  - Ajouter le champ de saisie pour codes promo
  - Afficher la période de grâce disponible
  - Implémenter la validation en temps réel des codes
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2_

- [x] 21. Créer le composant PromoCodeInput


  - Créer `frontend/src/components/billing/PromoCodeInput.tsx`
  - Interface de saisie avec validation en temps réel
  - Affichage des réductions appliquées
  - Gestion des messages d'erreur
  - Animation et feedback visuel
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_


- [x] 22. Créer le composant GracePeriodBanner

  - Créer `frontend/src/components/billing/GracePeriodBanner.tsx`
  - Affichage du temps restant en période de grâce
  - Boutons d'action pour choisir un plan
  - Notifications visuelles selon l'urgence
  - Intégration dans le layout principal
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 23. Mettre à jour le dashboard de billing



  - Modifier `frontend/src/components/billing/BillingDashboard.tsx`
  - Afficher les codes promo actifs
  - Montrer l'historique des réductions
  - Intégrer les informations de période de grâce
  - Supprimer les références au plan gratuit
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

## Phase 8: Frontend - Pages d'Administration

- [x] 24. Créer la page de gestion des codes promo


  - Créer `frontend/src/pages/Admin/PromoCodeManagement.tsx`
  - Interface de création et modification des codes
  - Liste avec filtres et recherche
  - Statistiques d'utilisation en temps réel
  - Gestion des permissions et validation
  - Export des rapports d'utilisation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 25. Créer le dashboard de période de grâce


  - Créer `frontend/src/pages/Admin/GracePeriodDashboard.tsx`
  - Vue d'ensemble des utilisateurs en période de grâce
  - Statistiques de conversion et métriques
  - Outils d'extension et de gestion manuelle
  - Graphiques de tendances et performances
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 26. Mettre à jour le dashboard admin principal



  - Modifier `frontend/src/pages/Admin/Dashboard.tsx`
  - Ajouter les widgets pour codes promo et période de grâce
  - Intégrer les nouvelles métriques de billing
  - Supprimer les références au plan gratuit
  - Ajouter les alertes pour les conversions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 9: Notifications et Communications

- [x] 27. Créer les templates d'email pour la période de grâce




  - Créer les templates dans `backend/functions/src/templates/grace-period/`
  - Template de bienvenue avec explication de la période de grâce
  - Templates de rappel (7 jours, 3 jours, 1 jour)
  - Template d'expiration avec options de récupération
  - Template de conversion réussie
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 28. Créer les templates d'email pour les codes promo

  - Créer les templates dans `backend/functions/src/templates/promo-codes/`
  - Template de confirmation d'application de code
  - Template de notification d'expiration de réduction
  - Templates marketing pour les nouvelles promotions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_


- [x] 29. Implémenter le système de notifications push


  - Mettre à jour `frontend/src/services/notificationService.ts`
  - Ajouter les notifications pour période de grâce
  - Implémenter les alertes de codes promo
  - Gérer les préférences utilisateur
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_

## Phase 10: Intégrations et Sécurité

- [x] 30. Intégrer avec Stripe pour les codes promo


  - Mettre à jour `backend/functions/src/integrations/stripe/stripe.service.ts`
  - Créer les coupons Stripe automatiquement
  - Synchroniser les codes promo avec Stripe
  - Gérer les webhooks pour les événements de réduction
  - _Requirements: 5.4, 9.4, 10.1, 10.2, 10.3, 10.4, 10.5_


- [x] 31. Implémenter la sécurité et l'audit

  - Créer `backend/functions/src/services/billing/billingAudit.service.ts`
  - Logger toutes les opérations de billing
  - Implémenter le rate limiting pour les codes promo
  - Ajouter la détection de fraude
  - Créer les rapports de conformité
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_


- [x] 32. Créer les webhooks et intégrations


  - Mettre à jour `backend/functions/src/webhooks/billing.webhooks.ts`
  - Gérer les événements Stripe pour les codes promo
  - Intégrer avec les systèmes d'analytics
  - Ajouter les webhooks pour les partenaires
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 11: Tests et Validation

- [ ]* 33. Écrire les tests unitaires backend
  - Tests pour PromoCodeService (validation, application, limites)
  - Tests pour GracePeriodService (création, notifications, conversion)
  - Tests pour BillingService mis à jour
  - Tests des contrôleurs et routes
  - Tests de sécurité et edge cases
  - _Requirements: Tous les requirements_

- [ ]* 34. Écrire les tests d'intégration
  - Tests du workflow complet de période de grâce
  - Tests d'application et suppression de codes promo
  - Tests de migration des utilisateurs
  - Tests des notifications automatiques
  - Tests des intégrations Stripe
  - _Requirements: Tous les requirements_

- [ ]* 35. Écrire les tests frontend
  - Tests des composants de codes promo
  - Tests des composants de période de grâce
  - Tests des pages d'administration
  - Tests des services et hooks
  - Tests d'accessibilité et responsive
  - _Requirements: Tous les requirements_

## Phase 12: Déploiement et Migration

- [ ] 36. Préparer la migration en production
  - Créer le plan de déploiement étape par étape
  - Préparer les scripts de rollback d'urgence
  - Configurer les feature flags pour activation progressive
  - Préparer les communications utilisateurs
  - Tester la migration sur l'environnement de staging
  - _Requirements: Tous les requirements_

- [ ] 37. Exécuter la migration des utilisateurs
  - Activer les nouveaux modèles et services
  - Exécuter le script de migration des utilisateurs gratuits
  - Surveiller les métriques et erreurs
  - Envoyer les communications de migration
  - Activer les notifications automatiques
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 38. Finaliser le déploiement
  - Activer les nouvelles interfaces utilisateur
  - Supprimer définitivement les références au plan gratuit
  - Activer les codes promo et promotions de lancement
  - Surveiller les conversions et métriques
  - Documenter les nouvelles fonctionnalités
  - Former l'équipe support sur les nouveaux processus
  - _Requirements: Tous les requirements_

## Notes d'implémentation

### Priorités de développement
1. **Phase 1-3** : Infrastructure backend critique
2. **Phase 4-5** : APIs et migration des données
3. **Phase 6-8** : Interface utilisateur
4. **Phase 9-10** : Intégrations et sécurité
5. **Phase 11-12** : Tests et déploiement

### Dépendances critiques
- Les phases 1-2 doivent être complétées avant toute autre phase
- La migration (Phase 5) dépend des phases 1-4
- Les interfaces frontend (Phase 6-8) dépendent des APIs (Phase 3-4)
- Le déploiement (Phase 12) dépend de tous les tests (Phase 11)

### Points d'attention
- **Sécurité** : Validation rigoureuse des codes promo pour éviter les abus
- **Performance** : Cache des codes fréquents et optimisation des requêtes
- **UX** : Transition fluide pour les utilisateurs existants
- **Monitoring** : Surveillance continue des conversions et métriques
- **Rollback** : Plan de retour en arrière en cas de problème critique