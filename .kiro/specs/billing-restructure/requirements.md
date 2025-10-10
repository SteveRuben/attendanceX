# Requirements Document - Restructuration du Système de Billing

## Introduction

Cette spécification définit les exigences pour restructurer le système de billing d'AttendanceX en supprimant l'offre gratuite et en introduisant trois offres payantes avec une période de grâce de X jours pour tous les nouveaux utilisateurs. Le nombre de jour de grâce est variable et le système inclut un système de codes promotionnels.

## Requirements

### Requirement 1 - Suppression de l'Offre Gratuite

**User Story:** En tant qu'administrateur système, je veux supprimer l'offre gratuite existante, afin de migrer vers un modèle entièrement payant avec période d'essai.

#### Acceptance Criteria

1. WHEN un nouvel utilisateur s'inscrit THEN il SHALL être automatiquement placé en période de grâce de X jours
2. WHEN l'utilisateur s'inscrit en fonction de son choix then il a X nombres de jour de grâce
3. WHEN l'offre gratuite est supprimée THEN elle SHALL disparaître de toutes les interfaces utilisateur
4. WHEN les APIs sont appelées THEN elles SHALL ne plus référencer le plan gratuit

### Requirement 2 - Trois Offres Payantes

**User Story:** En tant qu'utilisateur, je veux choisir parmi trois offres payantes adaptées à mes besoins, afin d'avoir des options flexibles selon la taille de mon organisation.

#### Acceptance Criteria

1. WHEN je consulte les plans THEN je SHALL voir exactement trois offres payantes
2. WHEN je compare les plans THEN chaque plan SHALL avoir des fonctionnalités et limites clairement définies
3. WHEN je sélectionne un plan THEN les tarifs SHALL être transparents et compétitifs
4. WHEN je change de plan THEN la transition SHALL être fluide avec proratisation
5. WHEN je dépasse les limites de mon plan THEN je SHALL être notifié et invité à upgrader

### Requirement 3 - Période de Grâce de X Jours

**User Story:** En tant que nouvel utilisateur, je veux bénéficier d'une période d'essai de X jours, afin de tester toutes les fonctionnalités avant de m'engager financièrement.

#### Acceptance Criteria

1. WHEN je m'inscris THEN je SHALL avoir accès à toutes les fonctionnalités pendant 14 jours
2. WHEN ma période de grâce approche de la fin THEN je SHALL recevoir des notifications de rappel
3. WHEN ma période de grâce expire THEN mon accès SHALL être limité jusqu'au choix d'un plan
4. WHEN je choisis un plan pendant la période de grâce THEN la transition SHALL être immédiate
5. WHEN je ne choisis pas de plan THEN mon compte SHALL être suspendu avec possibilité de réactivation



### Requirement 4 - Interface de Sélection des Plans

**User Story:** En tant qu'utilisateur, je veux une interface claire pour comparer et sélectionner les plans payants, afin de faire un choix éclairé selon mes besoins.

#### Acceptance Criteria

1. WHEN j'accède à la page de pricing THEN je SHALL voir les trois plans clairement présentés
2. WHEN je compare les plans THEN les différences SHALL être mises en évidence
3. WHEN je sélectionne un plan THEN le processus de paiement SHALL être sécurisé et simple
4. WHEN je consulte mon plan actuel THEN je SHALL voir les détails de mon abonnement
5. WHEN je veux changer de plan THEN les options SHALL être facilement accessibles

### Requirement 6 - Gestion des Notifications et Rappels

**User Story:** En tant qu'utilisateur en période de grâce, je veux être informé régulièrement du temps restant, afin de pouvoir prendre une décision éclairée avant l'expiration.

#### Acceptance Criteria

1. WHEN il me reste 7 jours THEN je SHALL recevoir une première notification
2. WHEN il me reste 3 jours THEN je SHALL recevoir une notification de rappel
3. WHEN il me reste 1 jour THEN je SHALL recevoir une notification urgente
4. WHEN ma période expire THEN je SHALL recevoir une notification finale avec les options
5. WHEN je reçois une notification THEN elle SHALL inclure un lien direct vers la sélection de plan


### Requirement 7 - Mise à Jour des APIs et Modèles de Données

**User Story:** En tant que développeur, je veux que toutes les APIs et modèles de données soient mis à jour pour refléter le nouveau système de billing, afin d'assurer la cohérence du système.

#### Acceptance Criteria

1. WHEN les APIs de billing sont appelées THEN elles SHALL ne plus retourner d'option gratuite
2. WHEN les modèles de données sont consultés THEN ils SHALL inclure les nouveaux statuts de période de grâce
3. WHEN les validations sont effectuées THEN elles SHALL prendre en compte les nouvelles règles
4. WHEN les rapports sont générés THEN ils SHALL refléter la nouvelle structure tarifaire
5. WHEN les webhooks sont déclenchés THEN ils SHALL inclure les nouveaux événements de billing

### Requirement 8 - Tableau de Bord Administrateur

**User Story:** En tant qu'administrateur, je veux un tableau de bord pour suivre les conversions et les utilisateurs en période de grâce, afin d'optimiser la stratégie commerciale.

#### Acceptance Criteria

1. WHEN j'accède au dashboard admin THEN je SHALL voir le nombre d'utilisateurs en période de grâce
2. WHEN je consulte les statistiques THEN je SHALL voir les taux de conversion par plan
3. WHEN j'analyse les données THEN je SHALL voir les tendances d'adoption des plans
4. WHEN je veux agir THEN je SHALL pouvoir envoyer des communications ciblées
5. WHEN je génère des rapports THEN ils SHALL inclure les métriques de performance commerciale

### Requirement 5 - Système de Codes Promotionnels

**User Story:** En tant qu'administrateur marketing, je veux créer et gérer des codes promotionnels, afin d'offrir des réductions et d'attirer de nouveaux clients.

#### Acceptance Criteria

1. WHEN je crée un code promo THEN je SHALL pouvoir définir le type de réduction (pourcentage ou montant fixe)
2. WHEN je configure un code promo THEN je SHALL pouvoir définir une date d'expiration et un nombre d'utilisations maximum
3. WHEN je crée un code promo THEN je SHALL pouvoir le limiter à certains plans ou à certains utilisateurs
4. WHEN un utilisateur saisit un code promo valide THEN la réduction SHALL être appliquée automatiquement
5. WHEN un code promo expire ou atteint sa limite d'utilisation THEN il SHALL devenir invalide
6. WHEN je consulte les statistiques THEN je SHALL voir l'utilisation et l'efficacité de chaque code promo

### Requirement 9 - Application des Codes Promotionnels

**User Story:** En tant qu'utilisateur, je veux pouvoir utiliser des codes promotionnels lors de mon inscription ou changement de plan, afin de bénéficier de réductions.

#### Acceptance Criteria

1. WHEN je m'inscris THEN je SHALL pouvoir saisir un code promotionnel
2. WHEN je saisis un code promo valide THEN je SHALL voir la réduction appliquée avant le paiement
3. WHEN je saisis un code promo invalide THEN je SHALL recevoir un message d'erreur explicite
4. WHEN j'utilise un code promo THEN il SHALL être associé à mon compte pour le suivi
5. WHEN je change de plan THEN je SHALL pouvoir utiliser un nouveau code promo si éligible
6. WHEN ma réduction expire THEN je SHALL être notifié avant le retour au tarif normal

### Requirement 10 - Sécurité et Conformité

**User Story:** En tant qu'utilisateur, je veux que mes données de paiement soient sécurisées et que le système respecte les réglementations, afin d'avoir confiance dans le service.

#### Acceptance Criteria

1. WHEN je saisis mes informations de paiement THEN elles SHALL être chiffrées et sécurisées
2. WHEN mes données sont stockées THEN elles SHALL respecter les normes PCI DSS
3. WHEN je demande la suppression de mes données THEN elle SHALL être effectuée conformément au RGPD
4. WHEN des transactions sont effectuées THEN elles SHALL être auditées et tracées
5. WHEN des erreurs surviennent THEN elles SHALL être gérées sans exposer d'informations sensibles