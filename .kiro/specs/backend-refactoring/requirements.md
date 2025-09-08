# Requirements Document

## Introduction

Ce projet vise à refactorer l'organisation du backend du système de gestion des présences en consolidant tous les fichiers de documentation markdown dans une structure cohérente sous le dossier `docs/`. L'objectif est d'améliorer la lisibilité, la maintenance et l'organisation de la documentation technique.

## Requirements

### Requirement 1

**User Story:** En tant que développeur, je veux que toute la documentation markdown soit centralisée dans le dossier `docs/`, afin de pouvoir facilement trouver et maintenir la documentation du projet.

#### Acceptance Criteria

1. WHEN je navigue dans le projet THEN tous les fichiers markdown de documentation SHOULD être localisés sous `docs/`
2. WHEN je cherche la documentation backend THEN elle SHOULD être organisée sous `docs/backend/`
3. WHEN je cherche la documentation des tests THEN elle SHOULD être organisée sous `docs/testing/`

### Requirement 2

**User Story:** En tant que développeur, je veux une structure de documentation cohérente, afin de comprendre rapidement l'organisation du projet.

#### Acceptance Criteria

1. WHEN j'accède au dossier `docs/` THEN je SHOULD voir une structure claire avec des sous-dossiers thématiques
2. WHEN je consulte `docs/backend/` THEN je SHOULD trouver toute la documentation technique du backend
3. WHEN je consulte `docs/testing/` THEN je SHOULD trouver toute la documentation relative aux tests
4. WHEN je consulte `docs/` THEN je SHOULD voir un fichier README.md principal qui référence les autres documentations

### Requirement 3

**User Story:** En tant que développeur, je veux que les références aux fichiers déplacés soient mises à jour, afin que tous les liens restent fonctionnels.

#### Acceptance Criteria

1. WHEN un fichier markdown est déplacé THEN toutes les références à ce fichier dans le code SHOULD être mises à jour
2. WHEN un fichier markdown est déplacé THEN toutes les références dans d'autres fichiers markdown SHOULD être mises à jour
3. WHEN je clique sur un lien vers un fichier déplacé THEN le lien SHOULD fonctionner correctement

### Requirement 4

**User Story:** En tant que développeur, je veux que la structure du backend soit nettoyée, afin d'avoir un code plus maintenable.

#### Acceptance Criteria

1. WHEN je navigue dans le dossier backend THEN je SHOULD voir uniquement les fichiers de code source et de configuration
2. WHEN je cherche des fichiers de documentation THEN ils NE SHOULD PAS être mélangés avec le code source
3. WHEN je consulte l'arborescence du projet THEN la séparation entre code et documentation SHOULD être claire

### Requirement 5

**User Story:** En tant que développeur, je veux une organisation du code plus cohérente, afin de naviguer plus facilement dans la codebase.

#### Acceptance Criteria

1. WHEN je cherche des utilitaires THEN ils SHOULD être regroupés par domaine fonctionnel dans `src/shared/utils/`
2. WHEN je cherche des scripts de maintenance THEN ils SHOULD être organisés par catégorie dans `src/scripts/`
3. WHEN je consulte les services THEN ils SHOULD être organisés en sous-dossiers thématiques
4. WHEN je cherche des fichiers de vérification/test THEN ils SHOULD être déplacés vers un dossier approprié

### Requirement 6

**User Story:** En tant que développeur, je veux que les dossiers de services soient mieux organisés, afin de trouver rapidement les services liés à un domaine.

#### Acceptance Criteria

1. WHEN je cherche des services de présence THEN ils SHOULD être dans `src/services/presence/`
2. WHEN je cherche des services d'organisation THEN ils SHOULD être dans `src/services/organization/`
3. WHEN je cherche des services d'authentification THEN ils SHOULD être dans `src/services/auth/`
4. WHEN je cherche des services de campagne email THEN ils SHOULD être dans `src/services/campaigns/`
5. WHEN je cherche des services d'intégration THEN ils SHOULD être dans `src/services/integrations/`

### Requirement 7

**User Story:** En tant que développeur, je veux que les fichiers de vérification et de test soient mieux organisés, afin de séparer les outils de développement du code de production.

#### Acceptance Criteria

1. WHEN je cherche des scripts de vérification THEN ils SHOULD être dans `src/dev-tools/` ou déplacés vers le dossier de tests
2. WHEN je consulte le dossier `src/check/` THEN il NE SHOULD PAS exister dans le code de production
3. WHEN je cherche des outils de développement THEN ils SHOULD être clairement séparés du code de production

### Requirement 8

**User Story:** En tant que développeur, je veux optimiser le nombre de Cloud Functions déployées, afin de réduire les coûts et améliorer les performances.

#### Acceptance Criteria

1. WHEN je déploie les fonctions THEN le nombre total de fonctions SHOULD être réduit à moins de 15
2. WHEN je consulte les fonctions de maintenance THEN elles SHOULD être consolidées en une seule fonction avec des paramètres
3. WHEN je consulte les fonctions de nettoyage THEN elles SHOULD être regroupées par fréquence (daily, weekly, monthly)
4. WHEN je consulte les fonctions de métriques THEN elles SHOULD être consolidées en une fonction générique

### Requirement 9

**User Story:** En tant que développeur, je veux une gestion d'erreur robuste pour les connexions Firestore, afin d'éviter les timeouts et les erreurs de connexion.

#### Acceptance Criteria

1. WHEN une connexion Firestore échoue THEN le système SHOULD implémenter un retry avec backoff exponentiel
2. WHEN l'émulateur Firestore n'est pas disponible THEN le système SHOULD basculer vers la base de données de production ou afficher un message d'erreur clair
3. WHEN une opération Firestore timeout THEN le système SHOULD logger l'erreur avec des détails utiles pour le debugging
4. WHEN je configure l'environnement THEN les paramètres de connexion Firestore SHOULD être clairement documentés

### Requirement 10

**User Story:** En tant que développeur, je veux une initialisation robuste des templates d'email, afin d'éviter les erreurs au démarrage de l'application.

#### Acceptance Criteria

1. WHEN l'application démarre THEN l'initialisation des templates d'email SHOULD être optionnelle et ne pas bloquer le démarrage
2. WHEN un template d'email n'existe pas THEN le système SHOULD le créer de manière asynchrone
3. WHEN l'initialisation des templates échoue THEN le système SHOULD continuer à fonctionner avec des templates par défaut
4. WHEN je consulte les logs THEN les erreurs d'initialisation des templates SHOULD être clairement identifiées et non critiques