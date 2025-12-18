# Requirements Document - ReBAC Authorization System

## Introduction

Ce document définit les exigences pour implémenter un système d'autorisation basé sur les relations (ReBAC - Relationship-Based Access Control) dans AttendanceX. L'objectif est de remplacer le système RBAC actuel par un modèle plus flexible et granulaire qui reflète les relations réelles entre les entités du système.

## Glossary

- **ReBAC** : Relationship-Based Access Control - Contrôle d'accès basé sur les relations
- **Relation** : Lien entre deux entités (ex: user --member_of--> organization)
- **Tuple** : Représentation d'une relation (subject, relation, object)
- **Subject** : Entité qui effectue une action (généralement un utilisateur)
- **Object** : Ressource sur laquelle l'action est effectuée
- **Permission** : Capacité d'effectuer une action sur une ressource
- **Namespace** : Catégorie de ressources (organization, event, document, etc.)
- **Check** : Vérification si un subject a une permission sur un object
- **Expand** : Résolution de toutes les relations pour déterminer les permissions

## Requirements

### Requirement 1 - Modèle de Relations

**User Story:** En tant qu'architecte système, je veux définir un modèle de relations clair, afin de représenter toutes les interactions possibles entre les entités du système.

#### Acceptance Criteria

1. THE système SHALL définir les namespaces suivants : organization, event, client, project, document, timesheet, invoice, campaign, report
2. WHEN une relation est créée, THE système SHALL valider qu'elle respecte le schéma défini
3. WHILE les relations sont stockées, THE système SHALL utiliser un format tuple (subject, relation, object)
4. WHERE des relations hiérarchiques existent, THE système SHALL supporter l'héritage de permissions
5. THE système SHALL permettre des relations directes et indirectes (via d'autres relations)

### Requirement 2 - Schéma de Relations par Namespace

**User Story:** En tant que développeur, je veux un schéma clair des relations possibles, afin d'implémenter correctement les vérifications de permissions.

#### Acceptance Criteria

1. THE système SHALL définir pour chaque namespace les relations possibles (owner, member, viewer, editor, etc.)
2. WHEN un schéma est défini, THE système SHALL spécifier les permissions associées à chaque relation
3. WHILE des permissions sont vérifiées, THE système SHALL résoudre les relations transitives
4. WHERE des relations héritent d'autres relations, THE système SHALL documenter la hiérarchie
5. THE système SHALL supporter les relations conditionnelles (ex: can_edit if owner OR (member AND approved))

### Requirement 3 - Gestion des Tuples de Relations

**User Story:** En tant que système, je veux stocker et gérer efficacement les tuples de relations, afin de permettre des vérifications rapides de permissions.

#### Acceptance Criteria

1. THE système SHALL stocker les tuples dans une collection Firestore optimisée avec index composites
2. WHEN un tuple est créé, THE système SHALL valider le format : (subject:type:id, relation, object:type:id)
3. WHILE des tuples sont créés automatiquement, THE système SHALL les générer lors de la création d'entités
4. WHERE des tuples deviennent obsolètes, THE système SHALL les supprimer automatiquement
5. THE système SHALL maintenir un cache des tuples fréquemment utilisés

### Requirement 4 - API de Vérification de Permissions

**User Story:** En tant que développeur, je veux une API simple pour vérifier les permissions, afin d'intégrer facilement ReBAC dans le code existant.

#### Acceptance Criteria

1. THE système SHALL fournir une fonction check(subject, permission, object) retournant boolean
2. WHEN une vérification est effectuée, THE système SHALL résoudre toutes les relations nécessaires
3. WHILE des vérifications sont en cours, THE système SHALL utiliser le cache pour optimiser les performances
4. WHERE des relations transitives existent, THE système SHALL les résoudre récursivement avec limite de profondeur
5. THE système SHALL logger toutes les vérifications de permissions pour audit

### Requirement 5 - Intégration avec le Système Existant

**User Story:** En tant que développeur, je veux migrer progressivement du RBAC vers ReBAC, afin de ne pas casser le système existant.

#### Acceptance Criteria

1. THE système SHALL maintenir la compatibilité avec le middleware RBAC existant
2. WHEN ReBAC est activé, THE système SHALL vérifier d'abord ReBAC puis fallback sur RBAC
3. WHILE la migration est en cours, THE système SHALL permettre l'activation par namespace
4. WHERE des conflits existent, THE système SHALL prioriser ReBAC sur RBAC
5. THE système SHALL fournir un script de migration des permissions RBAC vers ReBAC

### Requirement 6 - Relations Multi-Tenant

**User Story:** En tant qu'administrateur, je veux que les relations respectent l'isolation multi-tenant, afin de garantir la sécurité des données.

#### Acceptance Criteria

1. THE système SHALL préfixer tous les tuples avec le tenantId
2. WHEN une vérification est effectuée, THE système SHALL filtrer automatiquement par tenant
3. WHILE des relations cross-tenant sont nécessaires, THE système SHALL les gérer explicitement
4. WHERE un utilisateur appartient à plusieurs tenants, THE système SHALL isoler les contextes
5. THE système SHALL empêcher toute fuite de données entre tenants via les relations

### Requirement 7 - Relations Hiérarchiques

**User Story:** En tant qu'utilisateur, je veux que mes permissions héritent des relations hiérarchiques, afin d'avoir un accès cohérent aux ressources.

#### Acceptance Criteria

1. THE système SHALL supporter les relations parent-child (organization -> team -> project)
2. WHEN une permission est vérifiée, THE système SHALL remonter la hiérarchie si nécessaire
3. WHILE des permissions sont héritées, THE système SHALL respecter les restrictions définies
4. WHERE des permissions sont révoquées, THE système SHALL les propager dans la hiérarchie
5. THE système SHALL permettre de bloquer l'héritage pour certaines permissions sensibles

### Requirement 8 - Relations Temporelles

**User Story:** En tant qu'administrateur, je veux pouvoir définir des relations temporaires, afin de donner des accès limités dans le temps.

#### Acceptance Criteria

1. THE système SHALL supporter des tuples avec expiration (TTL)
2. WHEN un tuple expire, THE système SHALL le supprimer automatiquement
3. WHILE des vérifications sont effectuées, THE système SHALL ignorer les tuples expirés
4. WHERE des accès temporaires sont nécessaires, THE système SHALL permettre leur création facile
5. THE système SHALL notifier les utilisateurs avant l'expiration de leurs accès

### Requirement 9 - API d'Expansion de Relations

**User Story:** En tant que développeur, je veux pouvoir lister toutes les ressources accessibles, afin d'afficher les listes filtrées correctement.

#### Acceptance Criteria

1. THE système SHALL fournir une fonction expand(subject, permission, namespace) retournant les IDs accessibles
2. WHEN une expansion est demandée, THE système SHALL résoudre toutes les relations applicables
3. WHILE l'expansion est effectuée, THE système SHALL paginer les résultats pour les grandes listes
4. WHERE des performances sont critiques, THE système SHALL utiliser des index optimisés
5. THE système SHALL cacher les résultats d'expansion avec invalidation intelligente

### Requirement 10 - Audit et Monitoring

**User Story:** En tant qu'administrateur sécurité, je veux auditer toutes les vérifications de permissions, afin de détecter les anomalies et tentatives d'accès non autorisées.

#### Acceptance Criteria

1. THE système SHALL logger toutes les vérifications de permissions avec contexte complet
2. WHEN des accès sont refusés, THE système SHALL enregistrer la raison détaillée
3. WHILE des patterns suspects sont détectés, THE système SHALL générer des alertes
4. WHERE des audits sont requis, THE système SHALL fournir des rapports détaillés
5. THE système SHALL permettre la recherche et filtrage des logs de permissions

### Requirement 11 - Performance et Scalabilité

**User Story:** En tant qu'architecte système, je veux que ReBAC soit performant à grande échelle, afin de supporter des millions de tuples et vérifications.

#### Acceptance Criteria

1. THE système SHALL répondre aux vérifications de permissions en < 50ms (P95)
2. WHEN le nombre de tuples augmente, THE système SHALL maintenir les performances via indexation
3. WHILE des vérifications complexes sont effectuées, THE système SHALL limiter la profondeur de récursion
4. WHERE le cache est utilisé, THE système SHALL invalider intelligemment lors des changements
5. THE système SHALL supporter au moins 10,000 vérifications/seconde par tenant

### Requirement 12 - Interface d'Administration

**User Story:** En tant qu'administrateur, je veux une interface pour gérer les relations, afin de déboguer et corriger les problèmes de permissions.

#### Acceptance Criteria

1. THE système SHALL fournir une UI pour visualiser les relations d'un utilisateur
2. WHEN un problème de permission survient, THE système SHALL permettre de tracer la résolution
3. WHILE des relations sont modifiées, THE système SHALL afficher l'impact sur les permissions
4. WHERE des incohérences existent, THE système SHALL les détecter et proposer des corrections
5. THE système SHALL permettre la création/modification/suppression manuelle de tuples

### Requirement 13 - Relations Conditionnelles

**User Story:** En tant que développeur, je veux définir des permissions conditionnelles, afin de gérer des cas complexes d'autorisation.

#### Acceptance Criteria

1. THE système SHALL supporter des conditions sur les relations (ex: can_edit if status == 'draft')
2. WHEN des conditions sont évaluées, THE système SHALL accéder aux attributs de l'objet
3. WHILE des conditions complexes existent, THE système SHALL les évaluer efficacement
4. WHERE des conditions échouent, THE système SHALL retourner la raison du refus
5. THE système SHALL permettre des opérateurs logiques (AND, OR, NOT) dans les conditions

### Requirement 14 - Délégation de Permissions

**User Story:** En tant qu'utilisateur, je veux pouvoir déléguer mes permissions, afin de permettre à d'autres d'agir en mon nom temporairement.

#### Acceptance Criteria

1. THE système SHALL permettre la création de relations de délégation
2. WHEN une délégation est créée, THE système SHALL copier les permissions avec restrictions
3. WHILE une délégation est active, THE système SHALL logger toutes les actions déléguées
4. WHERE une délégation expire, THE système SHALL révoquer automatiquement les permissions
5. THE système SHALL permettre la révocation manuelle des délégations à tout moment

### Requirement 15 - Migration et Compatibilité

**User Story:** En tant qu'administrateur système, je veux migrer les permissions existantes vers ReBAC, afin de ne pas perdre les configurations actuelles.

#### Acceptance Criteria

1. THE système SHALL fournir un script de migration RBAC -> ReBAC
2. WHEN la migration est exécutée, THE système SHALL créer les tuples équivalents
3. WHILE la migration est en cours, THE système SHALL maintenir le service disponible
4. WHERE des conflits existent, THE système SHALL les signaler pour résolution manuelle
5. THE système SHALL permettre un rollback en cas de problème

## Schéma de Relations Proposé

### Organization Namespace
```
Relations:
- owner: Propriétaire de l'organisation (toutes permissions)
- admin: Administrateur (presque toutes permissions)
- manager: Manager (gestion d'équipe et événements)
- member: Membre (accès de base)
- viewer: Observateur (lecture seule)

Permissions:
- view: owner, admin, manager, member, viewer
- edit: owner, admin
- delete: owner
- manage_members: owner, admin
- manage_billing: owner
- view_analytics: owner, admin, manager
```

### Event Namespace
```
Relations:
- creator: Créateur de l'événement
- organizer: Organisateur (peut gérer)
- participant: Participant (peut voir et marquer présence)
- viewer: Observateur (lecture seule)
- parent_organization: Organisation parente (héritage de permissions)

Permissions:
- view: creator, organizer, participant, viewer, member@parent_organization
- edit: creator, organizer, admin@parent_organization
- delete: creator, admin@parent_organization
- manage_participants: creator, organizer
- mark_attendance: participant
- view_analytics: creator, organizer, admin@parent_organization
```

### Client Namespace
```
Relations:
- owner: Propriétaire du client
- assigned_to: Assigné au client
- viewer: Peut voir le client
- parent_organization: Organisation parente

Permissions:
- view: owner, assigned_to, viewer, member@parent_organization
- edit: owner, assigned_to, admin@parent_organization
- delete: owner, admin@parent_organization
- manage_appointments: owner, assigned_to
- view_history: owner, assigned_to, manager@parent_organization
```

### Project Namespace
```
Relations:
- owner: Propriétaire du projet
- manager: Manager du projet
- contributor: Contributeur
- viewer: Observateur
- parent_organization: Organisation parente
- linked_client: Client lié

Permissions:
- view: owner, manager, contributor, viewer, member@parent_organization
- edit: owner, manager, admin@parent_organization
- delete: owner, admin@parent_organization
- manage_team: owner, manager
- log_time: owner, manager, contributor
- view_financials: owner, manager, admin@parent_organization
```

### Document Namespace
```
Relations:
- creator: Créateur du document
- editor: Éditeur
- viewer: Lecteur
- parent_resource: Ressource parente (event, project, etc.)

Permissions:
- view: creator, editor, viewer, viewer@parent_resource
- edit: creator, editor, editor@parent_resource
- delete: creator, admin@parent_resource
- share: creator, editor
- download: creator, editor, viewer
```

### Timesheet Namespace
```
Relations:
- owner: Propriétaire de la feuille de temps
- approver: Approbateur
- viewer: Observateur
- parent_organization: Organisation parente

Permissions:
- view: owner, approver, viewer, manager@parent_organization
- edit: owner (if status == 'draft')
- submit: owner
- approve: approver
- reject: approver
- export: approver, admin@parent_organization
```

### Invoice Namespace
```
Relations:
- creator: Créateur de la facture
- approver: Approbateur
- payer: Payeur (client)
- viewer: Observateur
- parent_organization: Organisation parente

Permissions:
- view: creator, approver, payer, viewer, member@parent_organization
- edit: creator (if status == 'draft'), admin@parent_organization
- approve: approver
- pay: payer
- cancel: creator, admin@parent_organization
- export: creator, approver, admin@parent_organization
```

## Exemples de Vérifications

### Exemple 1: Vérifier si un utilisateur peut éditer un événement
```typescript
const canEdit = await rebac.check(
  'user:123',
  'edit',
  'event:456'
);

// Résolution:
// 1. user:123 --creator--> event:456 ? OUI -> GRANTED
// OU
// 2. user:123 --organizer--> event:456 ? OUI -> GRANTED
// OU
// 3. event:456 --parent_organization--> org:789
//    user:123 --admin--> org:789 ? OUI -> GRANTED
```

### Exemple 2: Lister tous les événements visibles par un utilisateur
```typescript
const visibleEvents = await rebac.expand(
  'user:123',
  'view',
  'event'
);

// Retourne: ['event:456', 'event:789', 'event:101', ...]
// Basé sur toutes les relations qui donnent la permission 'view'
```

### Exemple 3: Vérifier une permission conditionnelle
```typescript
const canEdit = await rebac.check(
  'user:123',
  'edit',
  'timesheet:456'
);

// Résolution:
// 1. user:123 --owner--> timesheet:456 ? OUI
// 2. timesheet:456.status == 'draft' ? OUI -> GRANTED
// Sinon -> DENIED (même si owner, ne peut pas éditer si approuvé)
```

## Métriques de Succès

- Temps de réponse des vérifications < 50ms (P95)
- Support de 1M+ tuples par tenant
- 10,000+ vérifications/seconde
- Migration complète en < 1 heure
- 0 régression de fonctionnalités
- Réduction de 50% du code de gestion des permissions
