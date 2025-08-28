# Requirements Document

## Introduction

Ce document définit les exigences pour corriger les problèmes d'authentification dans le middleware d'authentification du système. Les problèmes identifiés incluent des erreurs 401 intermittentes, des problèmes de validation des tokens, et des erreurs lors de la déconnexion des utilisateurs.

## Requirements

### Requirement 1

**User Story:** En tant qu'utilisateur authentifié, je veux que ma session reste valide de manière cohérente, afin de ne pas être déconnecté de manière inattendue.

#### Acceptance Criteria

1. WHEN un utilisateur a un token valide THEN le middleware SHALL permettre l'accès aux ressources protégées
2. WHEN un token contient un userId valide THEN le middleware SHALL récupérer les informations utilisateur depuis Firestore
3. WHEN le token est expiré THEN le middleware SHALL retourner une erreur 401 avec le code SESSION_EXPIRED
4. WHEN le userId dans le token est invalide (null, undefined, ou chaîne vide) THEN le middleware SHALL retourner une erreur 401 avec des logs détaillés

### Requirement 2

**User Story:** En tant que développeur, je veux des logs détaillés lors des erreurs d'authentification, afin de pouvoir diagnostiquer rapidement les problèmes.

#### Acceptance Criteria

1. WHEN une erreur d'authentification se produit THEN le système SHALL logger les détails du token (sans données sensibles)
2. WHEN un userId est invalide THEN le système SHALL logger le type, la longueur et la valeur de l'userId
3. WHEN une erreur Firestore se produit THEN le système SHALL logger l'erreur complète avec le contexte
4. WHEN un token ne peut pas être décodé THEN le système SHALL logger les premières caractères du token pour identification

### Requirement 3

**User Story:** En tant qu'utilisateur, je veux pouvoir me déconnecter proprement, afin que ma session soit correctement terminée.

#### Acceptance Criteria

1. WHEN un utilisateur se déconnecte THEN le système SHALL invalider sa session dans Firestore
2. WHEN une session n'existe pas lors de la déconnexion THEN le système SHALL gérer l'erreur gracieusement
3. WHEN la déconnexion échoue THEN le système SHALL retourner une erreur appropriée sans planter
4. WHEN la déconnexion réussit THEN le système SHALL retourner un statut 200

### Requirement 4

**User Story:** En tant que système, je veux valider de manière robuste les tokens JWT, afin d'éviter les erreurs de validation intermittentes.

#### Acceptance Criteria

1. WHEN un token est reçu THEN le système SHALL vérifier sa structure avant décodage
2. WHEN le token contient des caractères invisibles THEN le système SHALL les nettoyer
3. WHEN le token est malformé THEN le système SHALL retourner une erreur claire
4. WHEN la vérification Firebase échoue THEN le système SHALL distinguer les différents types d'erreurs

### Requirement 5

**User Story:** En tant qu'administrateur système, je veux que les erreurs d'authentification soient gérées de manière cohérente, afin d'assurer la sécurité et la stabilité du système.

#### Acceptance Criteria

1. WHEN une erreur d'authentification se produit THEN le système SHALL utiliser les codes d'erreur standardisés
2. WHEN un utilisateur n'existe pas THEN le système SHALL retourner USER_NOT_FOUND
3. WHEN un compte est inactif THEN le système SHALL retourner ACCOUNT_INACTIVE
4. WHEN un compte est verrouillé THEN le système SHALL retourner ACCOUNT_LOCKED
5. WHEN le token est invalide THEN le système SHALL retourner INVALID_TOKEN