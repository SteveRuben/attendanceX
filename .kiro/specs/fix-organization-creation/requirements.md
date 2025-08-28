# Requirements Document

## Introduction

Ce spec vise à résoudre le problème critique où l'ID de l'organisation créée est `undefined`, causant des erreurs dans l'URL et les appels API subséquents. Actuellement, après la création d'une organisation, l'utilisateur est redirigé vers `/organization/undefined/dashboard` au lieu de l'ID réel de l'organisation.

## Requirements

### Requirement 1

**User Story:** En tant qu'utilisateur créant une nouvelle organisation, je veux que l'ID de l'organisation soit correctement récupéré et utilisé pour la redirection, afin que je puisse accéder au dashboard de mon organisation sans erreurs.

#### Acceptance Criteria

1. WHEN une organisation est créée avec succès THEN l'ID de l'organisation SHALL être correctement retourné par l'API
2. WHEN l'ID de l'organisation est reçu THEN il SHALL être utilisé pour la redirection vers le dashboard
3. WHEN la redirection se produit THEN l'URL SHALL contenir l'ID réel de l'organisation et non "undefined"
4. WHEN l'utilisateur accède au dashboard THEN les appels API subséquents SHALL utiliser l'ID correct de l'organisation

### Requirement 2

**User Story:** En tant que développeur, je veux que les erreurs de création d'organisation soient correctement gérées et loggées, afin de pouvoir diagnostiquer et résoudre les problèmes rapidement.

#### Acceptance Criteria

1. WHEN la création d'organisation échoue THEN l'erreur SHALL être loggée avec des détails suffisants
2. WHEN l'API retourne une réponse inattendue THEN le système SHALL gérer gracieusement l'erreur
3. WHEN l'ID de l'organisation est manquant ou invalide THEN un message d'erreur approprié SHALL être affiché à l'utilisateur
4. WHEN une erreur se produit THEN l'utilisateur SHALL être informé et guidé vers une action corrective

### Requirement 3

**User Story:** En tant qu'utilisateur, je veux que la création des équipes par défaut fonctionne correctement après la création de l'organisation, afin que mon organisation soit configurée avec les équipes appropriées.

#### Acceptance Criteria

1. WHEN une organisation est créée avec succès THEN les équipes par défaut SHALL être créées avec l'ID correct de l'organisation
2. WHEN la création des équipes échoue THEN l'utilisateur SHALL être informé mais la création de l'organisation SHALL rester valide
3. WHEN toutes les équipes sont créées THEN l'utilisateur SHALL voir un message de confirmation
4. WHEN l'utilisateur accède au dashboard THEN les équipes créées SHALL être visibles et fonctionnelles