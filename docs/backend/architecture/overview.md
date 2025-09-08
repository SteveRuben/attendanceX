# Architecture Overview

Vue d'ensemble de l'architecture du système de gestion des présences.

## Architecture générale

Le système est basé sur une architecture serverless utilisant Firebase et Google Cloud Functions.

## Composants principaux

### Frontend
- **Framework** : React/Vue.js
- **Hosting** : Firebase Hosting
- **Build** : Vite/Webpack

### Backend
- **Runtime** : Node.js
- **Framework** : Express.js
- **Hosting** : Google Cloud Functions
- **Database** : Firestore

### Services externes
- **Authentication** : Firebase Auth
- **Storage** : Firebase Storage
- **Monitoring** : Google Cloud Monitoring

## Flow de données

1. **Client** → **Cloud Functions** → **Firestore**
2. **Triggers Firestore** → **Background Functions**
3. **Scheduled Functions** → **Maintenance Tasks**

## Sécurité

- **HTTPS** : Toutes les communications
- **CORS** : Configuration restrictive
- **Authentication** : JWT + Firebase Auth
- **Validation** : Zod/Joi pour les données

## Scalabilité

- **Auto-scaling** : Cloud Functions
- **Caching** : Redis pour les données fréquentes
- **CDN** : Firebase Hosting avec CDN global