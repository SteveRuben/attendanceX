# Design Document

## Overview

Ce document décrit la solution technique pour résoudre le problème où l'ID de l'organisation créée est `undefined`, causant des erreurs dans l'URL et les appels API subséquents. Le problème principal réside dans la gestion des erreurs et la récupération de l'ID de l'organisation après sa création.

## Architecture

### Problème Identifié

1. **Gestion des erreurs défaillante** : La fonction `executeWithErrorHandling` peut retourner `undefined` en cas d'erreur, mais le code continue à utiliser `organization.id`
2. **API Backend manquante** : Les routes pour les équipes n'existent pas dans le backend, causant des erreurs 404
3. **Validation insuffisante** : Pas de vérification que l'organisation a été créée avec succès avant de continuer

### Solution Proposée

1. **Améliorer la gestion des erreurs** dans `OrganizationSetup.tsx`
2. **Implémenter les routes backend** pour les équipes
3. **Ajouter des validations** pour s'assurer que l'ID de l'organisation est valide

## Components and Interfaces

### Frontend Components

#### OrganizationSetup.tsx
- **Fonction `createOrganization`** : Améliorer la gestion des erreurs et la validation de l'ID
- **Fonction `createDefaultTeams`** : Ajouter des vérifications de l'ID d'organisation
- **Gestion des états** : Améliorer les états de chargement et d'erreur

#### teamService.ts
- **Méthodes existantes** : Vérifier que les endpoints correspondent au backend
- **Gestion des erreurs** : Améliorer les messages d'erreur

### Backend Components

#### Nouveaux fichiers créés
1. **models/team.model.ts** : Modèle Firestore pour les équipes
2. **services/team.service.ts** : Logique métier pour les équipes
3. **controllers/team.controller.ts** : Contrôleurs HTTP pour les équipes
4. **routes/teams.routes.ts** : Routes Express pour les équipes

#### Routes API
```
POST   /api/organizations/:organizationId/teams
GET    /api/organizations/:organizationId/teams
GET    /api/organizations/:organizationId/teams/:teamId
PUT    /api/organizations/:organizationId/teams/:teamId
DELETE /api/organizations/:organizationId/teams/:teamId
GET    /api/organizations/:organizationId/teams/:teamId/stats
POST   /api/organizations/:organizationId/teams/:teamId/members
GET    /api/organizations/:organizationId/teams/:teamId/members
DELETE /api/organizations/:organizationId/teams/:teamId/members/:userId
PUT    /api/organizations/:organizationId/teams/:teamId/members/:userId
GET    /api/organizations/:organizationId/users/:userId/teams
POST   /api/organizations/:organizationId/users/:userId/teams/bulk-assign
POST   /api/organizations/:organizationId/users/:userId/teams/bulk-remove
POST   /api/organizations/:organizationId/teams/bulk-assign
POST   /api/organizations/:organizationId/teams/create-defaults
GET    /api/team-templates/:sector
```

## Data Models

### Team Model
```typescript
interface Team extends BaseEntity {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  department?: string;
  managerId: string;
  settings: TeamSettings;
  isActive: boolean;
}
```

### TeamMember Model
```typescript
interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  joinedAt: Date;
  isActive: boolean;
  permissions: Permission[];
}
```

### TeamSettings Model
```typescript
interface TeamSettings {
  canValidateAttendance: boolean;
  canCreateEvents: boolean;
  canInviteParticipants: boolean;
  canViewAllEvents: boolean;
  canExportData: boolean;
  maxEventsPerMonth?: number;
  allowedEventTypes?: string[];
}
```

## Error Handling

### Frontend Error Handling
1. **Validation préalable** : Vérifier que tous les champs requis sont présents
2. **Gestion des réponses** : Vérifier que l'organisation a été créée avec succès
3. **Fallback gracieux** : En cas d'erreur, rediriger vers une page d'erreur appropriée
4. **Messages utilisateur** : Afficher des messages d'erreur clairs et actionables

### Backend Error Handling
1. **Validation des paramètres** : Utiliser express-validator pour valider les entrées
2. **Gestion des erreurs Firestore** : Capturer et transformer les erreurs Firestore
3. **Codes de statut HTTP** : Retourner les codes de statut appropriés
4. **Logging** : Logger toutes les erreurs pour le debugging

## Testing Strategy

### Tests Unitaires
1. **Services** : Tester la logique métier des services
2. **Modèles** : Tester les opérations CRUD des modèles
3. **Contrôleurs** : Tester les réponses HTTP des contrôleurs

### Tests d'Intégration
1. **API Endpoints** : Tester tous les endpoints avec des données réelles
2. **Flux complet** : Tester le flux de création d'organisation + équipes
3. **Gestion des erreurs** : Tester les cas d'erreur et les fallbacks

### Tests End-to-End
1. **Interface utilisateur** : Tester le flux complet depuis l'interface
2. **Scénarios d'erreur** : Tester les cas où l'API est indisponible
3. **Performance** : Tester avec de gros volumes de données

## Security Considerations

### Authentification
- Toutes les routes nécessitent une authentification JWT
- Vérification des permissions d'organisation

### Autorisation
- Seuls les membres d'une organisation peuvent voir ses équipes
- Seuls les managers peuvent modifier les équipes
- Validation des IDs d'organisation dans les middlewares

### Validation des Données
- Validation stricte de tous les paramètres d'entrée
- Sanitisation des données utilisateur
- Protection contre les injections

## Performance Optimizations

### Base de Données
- Index sur `organizationId` pour les requêtes d'équipes
- Index composé sur `teamId` + `userId` pour les membres
- Pagination pour les listes importantes

### Caching
- Cache des templates d'équipes par secteur
- Cache des permissions utilisateur
- Cache des statistiques d'équipe

### API
- Compression gzip des réponses
- Rate limiting par utilisateur
- Pagination des résultats

## Deployment Considerations

### Environment Variables
- Configuration des limites de rate limiting
- Configuration des timeouts de base de données
- Configuration des templates par défaut

### Monitoring
- Métriques de performance des endpoints
- Alertes sur les erreurs de création d'organisation
- Monitoring de l'utilisation des équipes

### Rollback Strategy
- Possibilité de désactiver les nouvelles routes
- Fallback vers l'ancien comportement
- Scripts de nettoyage en cas de problème