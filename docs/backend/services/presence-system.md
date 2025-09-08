# Presence System

Documentation du système de gestion des présences.

## Vue d'ensemble

Le système de présences permet aux utilisateurs d'enregistrer leurs heures d'arrivée et de départ.

## Services

### PresenceService
- **Création** : Enregistrement d'une nouvelle présence
- **Modification** : Mise à jour des données de présence
- **Validation** : Vérification des règles métier
- **Reporting** : Génération de rapports

### PresenceValidationService
- **Règles métier** : Validation des contraintes temporelles
- **Géolocalisation** : Vérification de la position
- **Doublons** : Détection des présences multiples

### PresenceSecurityService
- **Authentification** : Vérification des droits d'accès
- **Audit** : Traçabilité des modifications
- **Chiffrement** : Protection des données sensibles

## Workflows

### Check-in
1. Validation de l'utilisateur
2. Vérification de la géolocalisation
3. Création de l'enregistrement
4. Notification aux managers

### Check-out
1. Recherche de la présence active
2. Calcul de la durée
3. Mise à jour de l'enregistrement
4. Génération du rapport

## Règles métier

- Une seule présence active par utilisateur
- Géolocalisation obligatoire si configurée
- Durée minimale et maximale configurable
- Validation des horaires de travail