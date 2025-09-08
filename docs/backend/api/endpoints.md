# API Endpoints

Documentation des endpoints de l'API du système de gestion des présences.

## Authentication Endpoints

### POST /auth/login
Authentification d'un utilisateur.

### POST /auth/logout
Déconnexion d'un utilisateur.

### POST /auth/refresh
Renouvellement du token d'authentification.

## Presence Endpoints

### GET /presence
Récupération des données de présence.

### POST /presence
Enregistrement d'une présence.

### PUT /presence/:id
Modification d'une présence.

### DELETE /presence/:id
Suppression d'une présence.

## Organization Endpoints

### GET /organizations
Liste des organisations.

### POST /organizations
Création d'une organisation.

### PUT /organizations/:id
Modification d'une organisation.

### DELETE /organizations/:id
Suppression d'une organisation.

## Status Codes

- `200` - Succès
- `201` - Créé
- `400` - Requête invalide
- `401` - Non autorisé
- `403` - Interdit
- `404` - Non trouvé
- `500` - Erreur serveur