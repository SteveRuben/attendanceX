# Requirements Document - Email Verification Flow

## Introduction

Ce spec vise à modifier le comportement d'inscription existant pour implémenter un flux de validation par email obligatoire. Actuellement, l'inscription tente de connecter automatiquement l'utilisateur, mais nous voulons exiger une vérification d'email avant toute connexion.

## Requirements

### Requirement 1 - Modification du flux d'inscription

**User Story:** En tant qu'utilisateur qui s'inscrit, je veux recevoir un email de validation après mon inscription, afin de vérifier mon adresse email avant de pouvoir me connecter.

#### Acceptance Criteria

1. WHEN un utilisateur s'inscrit THEN un compte doit être créé avec le statut "PENDING"
2. WHEN l'inscription est réussie THEN un email de validation doit être envoyé automatiquement
3. WHEN l'inscription est réussie THEN l'utilisateur ne doit PAS être connecté automatiquement
4. WHEN l'inscription est réussie THEN une réponse de succès doit indiquer qu'un email de validation a été envoyé
5. IF l'envoi d'email échoue THEN l'inscription doit quand même réussir mais avec un avertissement

### Requirement 2 - Validation d'email obligatoire pour la connexion

**User Story:** En tant qu'utilisateur avec un email non vérifié, je ne peux pas me connecter, afin de garantir la validité de mon adresse email.

#### Acceptance Criteria

1. WHEN un utilisateur tente de se connecter THEN le système doit vérifier si son email est validé
2. IF l'email n'est pas vérifié THEN la connexion doit être refusée avec un message explicite
3. WHEN la connexion est refusée THEN l'utilisateur doit recevoir des instructions pour valider son email
4. IF l'utilisateur demande un nouveau lien THEN un nouvel email de validation doit être envoyé
5. WHEN l'email est vérifié THEN l'utilisateur doit pouvoir se connecter normalement

### Requirement 3 - Processus de validation d'email

**User Story:** En tant qu'utilisateur, je veux pouvoir valider mon email en cliquant sur un lien sécurisé, afin d'activer mon compte.

#### Acceptance Criteria

1. WHEN un email de validation est généré THEN il doit contenir un token sécurisé unique
2. WHEN l'utilisateur clique sur le lien THEN le token doit être validé
3. IF le token est valide THEN le statut de l'utilisateur doit passer à "ACTIVE"
4. IF le token est valide THEN l'email doit être marqué comme vérifié
5. WHEN la validation réussit THEN l'utilisateur doit être redirigé vers une page de succès
6. IF le token est expiré ou invalide THEN une erreur appropriée doit être affichée
7. WHEN un token est utilisé THEN il doit être invalidé pour éviter la réutilisation

### Requirement 4 - Gestion des tokens de validation

**User Story:** En tant qu'administrateur système, je veux que les tokens de validation soient sécurisés et aient une durée de vie limitée, afin de maintenir la sécurité du système.

#### Acceptance Criteria

1. WHEN un token est généré THEN il doit avoir une durée de vie de 24 heures maximum
2. WHEN un token est généré THEN il doit être cryptographiquement sécurisé
3. WHEN un token expire THEN il ne doit plus être accepté pour la validation
4. IF un utilisateur demande plusieurs validations THEN seul le dernier token doit être valide
5. WHEN un token est utilisé avec succès THEN il doit être supprimé de la base de données

### Requirement 5 - Renvoi d'email de validation

**User Story:** En tant qu'utilisateur dont l'email de validation a expiré ou est perdu, je veux pouvoir demander un nouveau lien de validation, afin de pouvoir activer mon compte.

#### Acceptance Criteria

1. WHEN un utilisateur demande un nouveau lien THEN son statut doit être vérifié
2. IF l'email est déjà vérifié THEN une erreur appropriée doit être retournée
3. IF l'utilisateur existe et n'est pas vérifié THEN un nouveau token doit être généré
4. WHEN un nouveau token est généré THEN l'ancien doit être invalidé
5. WHEN le nouvel email est envoyé THEN l'utilisateur doit être informé du succès
6. IF l'envoi échoue THEN une erreur doit être retournée avec possibilité de réessayer

### Requirement 6 - Messages et notifications utilisateur

**User Story:** En tant qu'utilisateur, je veux recevoir des messages clairs à chaque étape du processus de validation, afin de comprendre ce que je dois faire.

#### Acceptance Criteria

1. WHEN l'inscription réussit THEN le message doit expliquer qu'un email de validation a été envoyé
2. WHEN la connexion échoue pour email non vérifié THEN le message doit expliquer comment résoudre le problème
3. WHEN la validation réussit THEN une page de confirmation doit s'afficher
4. WHEN un nouveau lien est demandé THEN l'utilisateur doit être informé de l'envoi
5. IF une erreur survient THEN les messages d'erreur doivent être informatifs et actionnables