# Ingénierie des Caractéristiques pour les Modèles ML (Backend)

Ce document décrit les processus d'extraction et de transformation des données (feature engineering) implémentés dans le service ML (`backend/functions/src/services/ml.service.ts`) pour les différents types d'analyses : Prédiction de Présence, Analyse de Comportement et Optimisation d'Événements.

Ces caractéristiques servent d'entrée aux modèles de Machine Learning pour réaliser les prédictions, identifier les patterns ou détecter les anomalies.

## 1. Extraction des Caractéristiques de Prédiction de Présence (`extractAttendanceFeatures`)

**Objectif :** Préparer les données pour prédire la probabilité qu'un utilisateur participe à un événement donné.

**Sources de données :** Données de présence historiques, données utilisateur, données événementielles.

**Caractéristiques extraites :**

*   **Caractéristiques Utilisateur (basées sur l'historique) :**
    *   Taux de présence historique.
    *   Score de ponctualité (fréquence des arrivées à l'heure).
    *   Niveau hiérarchique de l'utilisateur (encodé numériquement).
    *   Ancienneté de l'utilisateur dans le système (en jours).
    *   Score d'activité récente (fréquence de participation sur une période courte).
*   **Caractéristiques Événement :**
    *   Type d'événement (encodé numériquement).
    *   Durée de l'événement (en heures).
    *   Jour de la semaine de l'événement.
    *   Heure de début de l'événement.
    *   Indicateur si l'événement a lieu le weekend.
    *   Nombre de participants invités.
*   **Caractéristiques Contextuelles :**
    *   Score météorologique (simulation basée sur la saison).
    *   Saison (encodée numériquement).
    *   Mois de l'année.
    *   Score de popularité de l'événement (simulation basée sur le jour de la semaine).

**Processus :**

1.  Récupération des données de présence, utilisateurs et événements pertinents selon les filtres.
2.  Calcul de statistiques historiques agrégées par utilisateur.
3.  Extraction des caractéristiques pour chaque paire utilisateur-événement.
4.  Normalisation simple des caractéristiques.
5.  Attribution d'un label binaire (1 si présent/en retard, 0 si absent/excusé) pour l'entraînement.

## 2. Extraction des Caractéristiques d'Analyse de Comportement (`extractBehaviorFeatures` - **Implémenté** )

**Objectif :** Identifier les patterns de comportement des utilisateurs basés sur leurs interactions avec les événements de présence. Utile pour la segmentation utilisateur ou la détection de changements de comportement.

**Sources de données :** Données de présence historiques.

**Caractéristiques extraites :**

*   Nombre total d'événements auxquels l'utilisateur a assisté dans la période.
*   Taux de présence moyen.
*   Score de ponctualité moyen.
*   Score de diversité des types d'événements fréquentés.
*   Score de diversité des méthodes de check-in utilisées.
*   Durée moyenne des événements fréquentés.
*   Variabilité de l'activité par jour de la semaine (écart-type).
*   Variabilité de l'activité par heure de la journée (écart-type).
*   Plus longue série de présences consécutives.
*   Temps moyen entre deux événements consécutifs (en jours).

**Processus :**

1.  Récupération des données de présence filtrées par utilisateur et plage de dates.
2.  Regroupement des présences par utilisateur.
3.  Calcul des statistiques comportementales listées ci-dessus pour chaque utilisateur.
4.  Normalisation des caractéristiques.
5.  Les labels ne sont pas générés automatiquement ici ; ils dépendraient de la tâche ML spécifique (ex: labels de segmentation définis manuellement ou par clustering).

**Limitations / Hypothèses :**

*   Certains calculs (ex: durée moyenne des événements) reposent sur l'accès aux données d'événement liées aux présences.
*   La signification et l'utilité de ces caractéristiques dépendent de la tâche d'analyse comportementale envisagée.

## 3. Extraction des Caractéristiques d'Optimisation d'Événements (`extractOptimizationFeatures` - **Implémenté** )

**Objectif :** Identifier les caractéristiques d'un événement qui sont corrélées avec un taux de participation ou un engagement élevé. Utile pour fournir des recommandations lors de la création ou la planification de nouveaux événements.

**Sources de données :** Données événementielles, données de présence associées.

**Caractéristiques extraites :**

*   Type d'événement (encodé numériquement).
*   Durée de l'événement (en heures).
*   Jour de la semaine de l'événement.
*   Heure de début de l'événement.
*   Indicateur si l'événement a lieu le weekend.
*   Nombre de participants *invités* à l'événement.
*   Score météorologique simulé au moment de l'événement.
*   Saison encodée au moment de l'événement.
*   Mois de l'année de l'événement.
*   Score de popularité simulé de l'événement.
*   Score de spécificité de la localisation (basé sur le format de la localisation).
*   Indicateur si l'événement est récurrent.
*   Nombre de jours écoulés depuis le dernier événement similaire organisé par la même personne.
*   Taux de succès historique de l'organisateur (taux de présence moyen de ses événements passés).

**Processus :**

1.  Récupération des événements et de leurs présences associées dans la plage de dates.
2.  Calcul du taux de présence pour chaque événement (utilisé comme label).
3.  Extraction des caractéristiques de l'événement et calcul des caractéristiques dérivées (jours depuis le dernier événement similaire, taux de succès de l'organisateur).
4.  Normalisation des caractéristiques.

**Labels :** Taux de présence réel de l'événement (nombre de participants présents / nombre de participants invités).

**Limitations / Hypothèses :**

*   Certains calculs (ex: jours depuis le dernier événement similaire, taux de succès de l'organisateur) dépendent de l'accès et de la structure des données d'événements et de présence historiques.
*   Le "score de popularité" et le "score météorologique" sont simulés. Une implémentation réelle nécessiterait des données externes ou une analyse plus approfondie.
*   La méthode `getOrganizerHistoricalSuccessRate` suppose l'existence d'une méthode pour récupérer les présences par événement (`getAttendancesForEvent`) dans `attendanceService`.

## 4. Détection des Caractéristiques d'Anomalie (`extractAnomalyFeatures`)

*(Cette section était déjà présente dans le code initial et est incluse ici pour complétude de la documentation sur l'ingénierie des caractéristiques ML.)*

**Objectif :** Identifier les caractéristiques qui signalent un comportement de présence potentiellement frauduleux ou anormal.

**Sources de données :** Données de présence, baselines comportementales des utilisateurs.

**Caractéristiques extraites (indicateurs d'anomalie) :**

*   Heure de check-in inhabituelle par rapport à l'historique de l'utilisateur.
*   Retard extrême par rapport à l'heure de début de l'événement et à l'habitude de l'utilisateur.
*   Check-ins multiples rapprochés pour le même utilisateur.
*   Activité en dehors des heures de travail normales.
*   Écart de localisation suspect par rapport aux lieux habituels.
*   Changement inhabituel de méthode de check-in.
*   Score d'anomalie de l'appareil utilisé (nouveau device, etc.).
*   Rupture dans le pattern de présence habituel (jour de la semaine, etc.).
*   Temps de réponse anormal entre la création de la présence et le check-in.
*   Participation à des types d'événements inhabituels pour l'utilisateur.
*   Pic d'activité inhabituel sur une courte période.
*   Retour après une longue absence.
*   Activité weekend anormale pour l'utilisateur.
*   Score d'isolement (check-in seul à un événement).
*   Indicateur de possibles opérations en lot suspectes.

**Processus :**

1.  Récupération des données de présence.
2.  Calcul des baselines comportementales pour chaque utilisateur sur une période de référence.
3.  Pour chaque présence, calcul des indicateurs d'anomalie en comparant la présence avec la baseline de l'utilisateur.
4.  Labellisation heuristique des présences comme "anomalie" ou "normale" basée sur un score composite des indicateurs pour l'entraînement (si un modèle supervisé est utilisé).

**Limitations / Hypothèses :**

*   Nombreuses simulations et heuristiques sont utilisées pour calculer les scores d'anomalie (localisation, appareil, etc.) en l'absence de données réelles ou de systèmes de tracking plus sophistiqués.
*   La labellisation est basée sur des règles heuristiques, ce qui peut ne pas capturer toutes les anomalies réelles et pourrait nécessiter une validation manuelle pour un entraînement supervisé fiable.

## Résumé

L'ingénierie des caractéristiques est une étape cruciale pour les capacités ML d'Attendance-X. Les extracteurs implémentés fournissent une base solide pour les modèles de prédiction, d'analyse comportementale et d'optimisation d'événements, en tirant parti des données de présence, utilisateurs et événements. L'amélioration de la précision et de la richesse de ces caractéristiques, notamment en intégrant des données externes ou en affinant les méthodes de calcul, augmentera la performance globale des modèles ML.
