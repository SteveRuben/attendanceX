# Design Document - Auth Middleware Fixes

## Overview

Ce document présente la conception technique pour corriger les problèmes d'authentification dans le middleware d'authentification du système. Les corrections visent à résoudre les erreurs 401 intermittentes, améliorer la validation des tokens, renforcer la gestion des logs, et stabiliser le processus de déconnexion.

Le design s'appuie sur l'architecture existante utilisant Firebase Auth, Express.js middleware, et Firestore pour la persistance des données utilisateur et des sessions.

## Architecture

### Architecture Actuelle
- **Middleware d'authentification** : `requireAuth`, `authenticate` dans `auth.ts`
- **Service d'authentification** : `AuthService` pour la vérification des tokens JWT
- **Stockage** : Firestore pour les données utilisateur et sessions
- **Logging** : Firebase Functions logger

### Améliorations Architecturales
1. **Validation robuste des tokens** avec nettoyage des caractères invisibles
2. **Logging structuré** avec contexte détaillé pour le debugging
3. **Gestion d'erreurs standardisée** avec codes d'erreur cohérents
4. **Validation des données utilisateur** avant traitement

## Components and Interfaces

### 1. Token Validation Component

**Responsabilité** : Validation robuste et nettoyage des tokens JWT

```typescript
interface TokenValidationResult {
  isValid: boolean;
  decodedToken?: any;
  error?: string;
  errorCode?: string;
}

interface TokenValidator {
  validateTokenStructure(token: string): boolean;
  cleanToken(token: string): string;
  verifyToken(token: string): Promise<TokenValidationResult>;
}
```

**Rationale** : La validation actuelle ne gère pas les tokens malformés ou contenant des caractères invisibles, causant des erreurs intermittentes.

### 2. Enhanced Logging Component

**Responsabilité** : Logging détaillé et structuré pour le debugging

```typescript
interface AuthLogContext {
  userId?: string;
  userIdType?: string;
  userIdLength?: number;
  tokenPrefix?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  error?: any;
}

interface AuthLogger {
  logTokenValidationFailure(context: AuthLogContext): void;
  logUserValidationFailure(context: AuthLogContext): void;
  logAuthenticationSuccess(context: AuthLogContext): void;
  logLogoutAttempt(context: AuthLogContext): void;
}
```

**Rationale** : Les logs actuels manquent de détails pour diagnostiquer les problèmes d'authentification intermittents.

### 3. User Validation Component

**Responsabilité** : Validation des données utilisateur récupérées de Firestore

```typescript
interface UserValidationResult {
  isValid: boolean;
  user?: any;
  errorCode?: string;
  message?: string;
}

interface UserValidator {
  validateUserId(userId: any): boolean;
  validateUserData(userData: any): UserValidationResult;
  checkAccountStatus(userData: any): UserValidationResult;
}
```

**Rationale** : Centraliser la validation des données utilisateur pour éviter les erreurs liées aux données corrompues ou manquantes.

### 4. Session Management Component

**Responsabilité** : Gestion robuste des sessions utilisateur

```typescript
interface SessionManager {
  invalidateSession(sessionId: string): Promise<boolean>;
  invalidateUserSessions(userId: string): Promise<number>;
  validateSession(sessionId: string): Promise<boolean>;
}
```

**Rationale** : Améliorer la gestion des sessions pour éviter les erreurs lors de la déconnexion.

## Data Models

### Enhanced AuthenticatedRequest
```typescript
interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email: string;
    role: UserRole;
    permissions: Record<string, boolean>;
    sessionId?: string;
    // Ajout de métadonnées pour le debugging
    validatedAt: Date;
    tokenSource: 'header' | 'cookie';
  };
}
```

### Error Response Model
```typescript
interface AuthErrorResponse {
  success: false;
  error: string; // Code d'erreur standardisé
  message: string; // Message utilisateur
  details?: {
    userId?: string;
    timestamp: Date;
    requestId?: string;
  };
}
```

### Logging Context Model
```typescript
interface AuthLogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context: {
    userId?: string;
    userIdDetails?: {
      type: string;
      length: number;
      value?: string; // Tronqué pour sécurité
    };
    token?: {
      prefix: string;
      isValid: boolean;
      errorType?: string;
    };
    request: {
      ip: string;
      userAgent: string;
      endpoint: string;
    };
    firestore?: {
      operation: string;
      success: boolean;
      error?: string;
    };
  };
  timestamp: Date;
}
```

## Error Handling

### Stratégie de Gestion d'Erreurs

1. **Classification des erreurs** :
   - **Token invalide** : Structure malformée, signature invalide, expiré
   - **Utilisateur invalide** : userId manquant, utilisateur inexistant, compte inactif
   - **Erreurs système** : Firestore indisponible, erreurs réseau

2. **Codes d'erreur standardisés** :
   - `INVALID_TOKEN` : Token malformé ou invalide
   - `SESSION_EXPIRED` : Token expiré
   - `USER_NOT_FOUND` : Utilisateur inexistant
   - `ACCOUNT_INACTIVE` : Compte non actif
   - `ACCOUNT_LOCKED` : Compte verrouillé

3. **Gestion gracieuse** :
   - Logs détaillés sans exposer d'informations sensibles
   - Messages d'erreur cohérents pour l'utilisateur
   - Fallback appropriés pour les erreurs système

### Error Recovery Mechanisms

```typescript
interface ErrorRecoveryStrategy {
  // Retry logic pour les erreurs temporaires
  retryFirestoreOperation<T>(operation: () => Promise<T>, maxRetries: number): Promise<T>;
  
  // Fallback pour les erreurs de session
  handleSessionError(error: any, req: Request): AuthErrorResponse;
  
  // Nettoyage automatique des données corrompues
  cleanupCorruptedData(userId: string): Promise<void>;
}
```

## Testing Strategy

### 1. Unit Tests

**Token Validation Tests** :
- Tokens valides et invalides
- Tokens avec caractères invisibles
- Tokens expirés
- Tokens malformés

**User Validation Tests** :
- UserIds valides et invalides (null, undefined, chaîne vide)
- Données utilisateur corrompues
- Statuts de compte différents

**Logging Tests** :
- Vérification des logs générés
- Contexte approprié dans les logs
- Pas de données sensibles dans les logs

### 2. Integration Tests

**Middleware Integration** :
- Tests end-to-end du middleware d'authentification
- Scénarios de connexion/déconnexion
- Gestion des erreurs Firestore

**Session Management** :
- Création et invalidation de sessions
- Gestion des sessions multiples
- Nettoyage des sessions expirées

### 3. Error Scenario Tests

**Resilience Testing** :
- Firestore indisponible
- Tokens corrompus
- Données utilisateur manquantes
- Erreurs réseau intermittentes

### 4. Performance Tests

**Load Testing** :
- Performance du middleware sous charge
- Impact des logs détaillés
- Temps de réponse des validations

## Implementation Phases

### Phase 1 : Token Validation Enhancement
- Amélioration de la validation des tokens
- Nettoyage des caractères invisibles
- Gestion des tokens malformés

### Phase 2 : Logging Infrastructure
- Implémentation du logging structuré
- Ajout du contexte détaillé
- Tests de non-exposition des données sensibles

### Phase 3 : User Validation Robustness
- Validation robuste des userIds
- Gestion des données utilisateur corrompues
- Amélioration des vérifications de statut

### Phase 4 : Session Management Fixes
- Correction des erreurs de déconnexion
- Amélioration de la gestion des sessions
- Tests de robustesse

### Phase 5 : Error Handling Standardization
- Standardisation des codes d'erreur
- Messages d'erreur cohérents
- Documentation des erreurs

## Security Considerations

1. **Logging Security** :
   - Aucune donnée sensible dans les logs
   - Troncature appropriée des tokens
   - Hachage des identifiants sensibles

2. **Token Security** :
   - Validation stricte des signatures
   - Vérification de l'expiration
   - Protection contre les attaques de replay

3. **Session Security** :
   - Invalidation sécurisée des sessions
   - Protection contre les sessions concurrentes
   - Audit trail des actions de session

## Monitoring and Observability

1. **Métriques clés** :
   - Taux d'erreurs d'authentification
   - Temps de réponse du middleware
   - Nombre de sessions actives

2. **Alertes** :
   - Pic d'erreurs d'authentification
   - Erreurs Firestore répétées
   - Tentatives d'authentification suspectes

3. **Dashboards** :
   - Vue d'ensemble de la santé de l'authentification
   - Analyse des patterns d'erreurs
   - Performance du middleware