# Plan d'implémentation - Gestion des Contacts

## Vue d'ensemble du plan

Ce plan d'implémentation transforme la conception en une série de tâches de développement incrémentales. Chaque tâche s'appuie sur les précédentes et se termine par l'intégration complète du système de gestion des contacts dans l'application existante.

## Tâches d'implémentation

- [ ] 1. Configuration de la base de données et des types
  - Ajouter les nouvelles collections Firestore (contacts, contact_categories, sms_campaigns, push_campaigns, unified_campaign_history)
  - Créer les interfaces TypeScript pour les modèles de données (Contact, SMSCampaign, PushCampaign)
  - Étendre les types EmailCampaign existants pour l'intégration avec les contacts
  - Configurer les index Firestore requis pour les performances
  - _Exigences: 1.1, 3.1, 6.1, 7.1_

- [ ] 1.1 Créer les interfaces et types de base
  - Définir les interfaces Contact, ContactCategory, Campaign, ContactFilter
  - Créer les types d'énumération pour gender, campaign status, etc.
  - Ajouter les types de requête et de réponse pour l'API
  - _Exigences: 3.1, 3.3_

- [ ]* 1.2 Écrire les tests de propriété pour les types de base
  - **Propriété 9: Stockage complet des attributs**
  - **Valide: Exigences 3.1**

- [ ]* 1.3 Écrire les tests de propriété pour la validation des données
  - **Propriété 10: Validation de l'âge**
  - **Valide: Exigences 3.2**

- [ ]* 1.4 Écrire les tests de propriété pour les valeurs énumérées
  - **Propriété 11: Validation des valeurs énumérées**
  - **Valide: Exigences 3.3**

- [ ] 2. Implémentation du service Contact backend
  - Créer la classe ContactService avec les méthodes CRUD de base
  - Implémenter la validation des données de contact
  - Ajouter la gestion des catégories personnalisées
  - _Exigences: 1.1, 1.2, 3.4_

- [ ] 2.1 Implémenter les opérations CRUD de base
  - Méthodes createContact, updateContact, deleteContact, getContact
  - Validation des champs obligatoires et optionnels
  - Gestion des erreurs avec codes d'erreur standardisés
  - _Exigences: 1.1, 1.2, 1.4_

- [ ]* 2.2 Écrire les tests de propriété pour la création de contacts
  - **Propriété 1: Création de contact avec champs obligatoires**
  - **Valide: Exigences 1.1, 1.3**

- [ ]* 2.3 Écrire les tests de propriété pour la validation
  - **Propriété 2: Validation des champs obligatoires**
  - **Valide: Exigences 1.2**

- [ ]* 2.4 Écrire les tests de propriété pour l'unicité des identifiants
  - **Propriété 3: Unicité des identifiants**
  - **Valide: Exigences 1.3**

- [ ] 2.5 Implémenter la recherche et le filtrage
  - Méthode searchContacts avec filtres multiples
  - Support des opérateurs logiques ET/OU
  - Pagination et tri des résultats
  - _Exigences: 4.1, 4.2, 5.1_

- [ ]* 2.6 Écrire les tests de propriété pour le filtrage
  - **Propriété 13: Filtrage par attributs**
  - **Valide: Exigences 4.1**

- [ ]* 2.7 Écrire les tests de propriété pour la combinaison de filtres
  - **Propriété 14: Combinaison logique des filtres**
  - **Valide: Exigences 4.2**

- [ ] 3. Implémentation du contrôleur Contact
  - Créer ContactController avec toutes les routes API
  - Ajouter la validation des requêtes avec middleware
  - Implémenter la gestion des permissions et de l'authentification
  - _Exigences: 1.1, 5.2, 6.2_

- [ ] 3.1 Créer les routes API principales
  - POST /contacts, GET /contacts, GET /contacts/:id
  - PUT /contacts/:id, DELETE /contacts/:id
  - Middleware de validation des données d'entrée
  - _Exigences: 1.1, 5.2_

- [ ]* 3.2 Écrire les tests de propriété pour le contrôle d'accès
  - **Propriété 22: Contrôle d'accès**
  - **Valide: Exigences 6.2**

- [ ] 3.3 Implémenter les routes de recherche et export
  - GET /contacts/search avec paramètres de filtrage
  - GET /contacts/export avec formats CSV/Excel
  - Logs d'audit pour les exports
  - _Exigences: 5.1, 6.3_

- [ ]* 3.4 Écrire les tests de propriété pour l'audit des exports
  - **Propriété 23: Audit des exports**
  - **Valide: Exigences 6.3**

- [ ] 4. Checkpoint - S'assurer que tous les tests passent
  - S'assurer que tous les tests passent, demander à l'utilisateur si des questions se posent.

- [ ] 5. Implémentation du service d'import
  - Créer ImportService pour traiter les fichiers CSV/Excel
  - Implémenter la validation des formats et des données
  - Ajouter la gestion des doublons et des erreurs partielles
  - _Exigences: 2.1, 2.2, 2.3, 2.5_

- [ ] 5.1 Créer le service de traitement des fichiers
  - Validation des formats de fichier (CSV, Excel)
  - Parsing et validation des données ligne par ligne
  - Gestion des erreurs avec continuation du traitement
  - _Exigences: 2.1, 2.3_

- [ ]* 5.2 Écrire les tests de propriété pour la validation des fichiers
  - **Propriété 5: Validation des formats de fichier d'import**
  - **Valide: Exigences 2.1**

- [ ]* 5.3 Écrire les tests de propriété pour l'import de données valides
  - **Propriété 6: Import de données valides**
  - **Valide: Exigences 2.2**

- [ ] 5.4 Implémenter la gestion des doublons et rapports
  - Détection des doublons avec options utilisateur
  - Génération de rapports détaillés d'import
  - Stockage des jobs d'import pour suivi
  - _Exigences: 2.4, 2.5_

- [ ]* 5.5 Écrire les tests de propriété pour la gestion des erreurs partielles
  - **Propriété 7: Gestion partielle des erreurs d'import**
  - **Valide: Exigences 2.3**

- [ ]* 5.6 Écrire les tests de propriété pour l'exactitude des rapports
  - **Propriété 8: Exactitude du rapport d'import**
  - **Valide: Exigences 2.4**

- [ ] 6. Intégration avec le système EmailCampaign existant et extension multi-canal
  - Créer UnifiedCampaignService pour orchestrer tous les types de campagnes
  - Intégrer avec le système EmailCampaign existant
  - Créer SMSCampaignService et PushCampaignService suivant le pattern existant
  - Implémenter la conversion entre filtres de contacts et RecipientCriteria
  - _Exigences: 4.1, 4.6, 4.7, 7.1, 7.2_

- [ ] 6.1 Créer le service de campagne unifié et l'intégration EmailCampaign
  - Implémenter UnifiedCampaignService comme orchestrateur principal
  - Créer ContactAwareEmailCampaignService pour étendre le système existant
  - Implémenter convertContactFiltersToRecipientCriteria pour la compatibilité
  - Application des filtres complexes aux contacts avec comptage précis
  - _Exigences: 4.1, 4.3, 7.1, 7.2_

- [ ]* 6.2 Écrire les tests de propriété pour le comptage de contacts
  - **Propriété 15: Exactitude du comptage de contacts**
  - **Valide: Exigences 4.3**

- [ ] 6.3 Créer les services SMS et Push Campaign
  - Implémenter SMSCampaignService suivant le pattern EmailCampaign
  - Implémenter PushCampaignService suivant le pattern EmailCampaign
  - Créer les collections Firestore sms_campaigns et push_campaigns
  - Ajouter les types SMSCampaign et PushCampaign dans les types communs
  - _Exigences: 7.3, 7.4_

- [ ] 6.4 Implémenter l'exécution unifiée des campagnes
  - Méthodes d'exécution pour chaque type de campagne (Email, SMS, Push)
  - Enregistrement de l'historique unifié pour chaque contact avec canal utilisé
  - Retry automatique et gestion des erreurs partielles par canal
  - Synchronisation des statistiques entre systèmes de campagne et contacts
  - _Exigences: 4.4, 4.5, 7.5_

- [ ]* 6.4 Écrire les tests de propriété pour l'historique des communications
  - **Propriété 16: Enregistrement de l'historique des communications**
  - **Valide: Exigences 4.4**

- [ ] 7. Implémentation des fonctionnalités avancées
  - Ajouter la suppression sécurisée (archivage)
  - Implémenter l'anonymisation RGPD
  - Créer les fonctionnalités d'audit et de sécurité
  - _Exigences: 5.4, 6.4, 6.5_

- [ ] 7.1 Implémenter la suppression sécurisée
  - Archivage des contacts au lieu de suppression définitive
  - Mécanisme de restauration des contacts archivés
  - Nettoyage automatique après période de rétention
  - _Exigences: 5.4_

- [ ]* 7.2 Écrire les tests de propriété pour l'archivage
  - **Propriété 20: Archivage lors de la suppression**
  - **Valide: Exigences 5.4**

- [ ] 7.3 Implémenter l'anonymisation RGPD
  - Méthode anonymizeContact pour conformité RGPD
  - Suppression/remplacement de toutes les données personnelles
  - Préservation des statistiques anonymisées
  - _Exigences: 6.4_

- [ ]* 7.4 Écrire les tests de propriété pour l'anonymisation
  - **Propriété 24: Anonymisation complète**
  - **Valide: Exigences 6.4**

- [ ] 8. Checkpoint - S'assurer que tous les tests passent
  - S'assurer que tous les tests passent, demander à l'utilisateur si des questions se posent.

- [ ] 9. Développement de l'interface utilisateur frontend
  - Créer les composants React pour la gestion des contacts
  - Implémenter les formulaires de création/modification
  - Ajouter l'interface d'import de fichiers
  - _Exigences: 1.1, 2.1, 5.2_

- [ ] 9.1 Créer le service frontend ContactService
  - Méthodes API pour toutes les opérations CRUD
  - Gestion des erreurs et des états de chargement
  - Types TypeScript partagés avec le backend
  - _Exigences: 1.1, 5.2_

- [ ] 9.2 Développer les composants de base
  - ContactList pour afficher la liste des contacts
  - ContactForm pour création/modification
  - ContactSearch avec filtres avancés
  - _Exigences: 1.1, 5.1, 5.2_

- [ ] 9.3 Créer l'interface d'import
  - FileUpload component pour les fichiers CSV/Excel
  - ImportProgress pour suivre le statut d'import
  - ImportReport pour afficher les résultats
  - _Exigences: 2.1, 2.4_

- [ ] 10. Développement de l'interface de campagnes
  - Créer les composants pour la gestion des campagnes
  - Implémenter le constructeur de filtres visuels
  - Ajouter l'aperçu des contacts ciblés
  - _Exigences: 4.1, 4.2, 4.3_

- [ ] 10.1 Créer les composants de campagne
  - CampaignBuilder pour créer des campagnes
  - FilterBuilder pour construire des filtres complexes
  - ContactPreview pour l'aperçu des contacts ciblés
  - _Exigences: 4.1, 4.2, 4.3_

- [ ] 10.2 Implémenter l'exécution des campagnes
  - CampaignExecution pour lancer les campagnes
  - CampaignStatus pour suivre le progrès
  - CampaignHistory pour l'historique des communications
  - _Exigences: 4.4, 4.5_

- [ ] 11. Intégration et routes frontend
  - Ajouter les nouvelles pages au système de navigation
  - Créer les routes pour toutes les fonctionnalités
  - Intégrer avec le système d'authentification existant
  - _Exigences: 6.2_

- [ ] 11.1 Créer les pages principales
  - /contacts - Liste et gestion des contacts
  - /contacts/import - Interface d'import
  - /campaigns - Gestion des campagnes
  - _Exigences: 1.1, 2.1, 4.1_

- [ ] 11.2 Intégrer la navigation et les permissions
  - Ajouter les liens dans le menu principal
  - Vérifier les permissions d'accès aux pages
  - Intégrer avec le système de tenant existant
  - _Exigences: 6.2_

- [ ] 12. Tests d'intégration et validation finale
  - Créer des tests end-to-end pour les flux complets
  - Valider l'intégration avec les systèmes existants
  - Tester les performances avec de gros volumes de données
  - _Exigences: Toutes_

- [ ]* 12.1 Écrire les tests d'intégration complets
  - Tests de flux utilisateur complets (création → campagne → historique)
  - Tests de performance pour l'import de gros fichiers
  - Tests de sécurité pour les permissions et l'accès
  - _Exigences: Toutes_

- [ ] 12.2 Validation des propriétés restantes
  - Valider toutes les propriétés de correction non encore testées
  - S'assurer de la cohérence entre frontend et backend
  - Tester la robustesse du système sous charge
  - _Exigences: Toutes_

- [ ]* 12.3 Écrire les tests de propriété pour la recherche
  - **Propriété 17: Recherche par attributs**
  - **Valide: Exigences 5.1**

- [ ]* 12.4 Écrire les tests de propriété pour la modification
  - **Propriété 18: Modification complète des attributs**
  - **Valide: Exigences 5.2**

- [ ]* 12.5 Écrire les tests de propriété pour la cohérence de validation
  - **Propriété 19: Cohérence de la validation**
  - **Valide: Exigences 5.3**

- [ ]* 12.6 Écrire les tests de propriété pour l'historique complet
  - **Propriété 21: Complétude de l'historique**
  - **Valide: Exigences 5.5**

- [ ] 13. Checkpoint final - S'assurer que tous les tests passent
  - S'assurer que tous les tests passent, demander à l'utilisateur si des questions se posent.

## Notes d'implémentation

### Ordre d'exécution recommandé
1. **Base de données et types** (Tâches 1-1.4) - Fondations du système
2. **Services backend** (Tâches 2-3.4) - Logique métier et API
3. **Import et campagnes** (Tâches 5-6.4) - Fonctionnalités avancées
4. **Sécurité et conformité** (Tâches 7-7.4) - Aspects réglementaires
5. **Interface utilisateur** (Tâches 9-11.2) - Expérience utilisateur
6. **Tests et validation** (Tâches 12-13) - Qualité et robustesse

### Intégration avec l'existant
- **EmailCampaign** : Réutiliser entièrement le système existant dans `backend/functions/src/common/types/email-campaign.types.ts`
- **Base de données** : Utiliser la configuration Firestore existante dans `database.ts`
- **Patterns** : Suivre les patterns des contrôleurs existants comme `event.controller.ts`
- **Authentification** : S'appuyer sur le système d'authentification et de permissions en place
- **Notifications** : Étendre les services de notification existants pour SMS et Push
- **Collections** : Ajouter les nouvelles collections (contacts, sms_campaigns, push_campaigns) aux collections existantes

### Considérations de performance
- Index Firestore optimisés pour les requêtes de filtrage complexes
- Pagination pour les listes de contacts importantes
- Traitement asynchrone des imports de gros fichiers
- Cache des résultats de filtrage fréquents