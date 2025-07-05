## Structure de la base de données (Firestore)

### Collections principales

```
users/
├── {userId}
    ├── email: string
    ├── displayName: string
    ├── role: string (super_admin|admin|organizer|participant)
    ├── department: string
    ├── photoURL: string
    ├── createdAt: timestamp
    ├── lastLogin: timestamp
    └── isActive: boolean

events/
├── {eventId}
    ├── title: string
    ├── description: string
    ├── startDateTime: timestamp
    ├── endDateTime: timestamp
    ├── location: object
    │   ├── address: string
    │   ├── latitude: number
    │   ├── longitude: number
    │   └── radius: number
    ├── organizerId: string
    ├── type: string
    ├── status: string (draft|published|cancelled|completed)
    ├── qrCode: string
    ├── participants: array[userId]
    ├── createdAt: timestamp
    └── updatedAt: timestamp

attendances/
├── {attendanceId}
    ├── eventId: string
    ├── userId: string
    ├── status: string (present|absent|excused|late|left_early)
    ├── markedAt: timestamp
    ├── markedBy: string
    ├── method: string (qr|geo|manual|auto)
    ├── location: geopoint (si géo)
    ├── notes: string
    └── createdAt: timestamp

notifications/
├── {notificationId}
    ├── userId: string
    ├── title: string
    ├── message: string
    ├── type: string
    ├── channels: array[string] (email|sms|push|in_app)
    ├── read: boolean
    ├── sent: boolean
    ├── data: object
    └── createdAt: timestamp

smsTemplates/
├── {templateId}
    ├── name: string
    ├── content: string
    ├── variables: array[string]
    ├── eventType: string
    ├── isActive: boolean
    ├── createdBy: string
    └── createdAt: timestamp

smsProviders/
├── {providerId}
    ├── name: string (twilio|nexmo|aws_sns|custom)
    ├── config: object
    │   ├── apiKey: string (encrypted)
    │   ├── apiSecret: string (encrypted)
    │   ├── senderId: string
    │   └── endpoint: string (for custom providers)
    ├── isActive: boolean
    ├── priority: number
    └── rateLimit: object
        ├── maxPerMinute: number
        └── maxPerDay: number
```

## Sécurité et règles Firestore

### Règles d'accès
- Authentification obligatoire pour toutes les opérations
- Vérification des rôles pour les actions sensibles
- Isolation des données par organisation/département
- Audit logs pour la traçabilité

### Validation des données
- Schémas de validation pour toutes les collections
- Sanitisation des entrées utilisateur
- Limite de taux pour les API
- Protection contre les injections

## Interface utilisateur (UI/UX)

### Design system
- **Couleurs** : Palette moderne et professionnelle
- **Typographie** : Hiérarchie claire et lisible
- **Composants** : Système de design cohérent
- **Responsive** : Mobile-first approach

### Pages principales
1. **Dashboard** : Vue d'ensemble personnalisée par rôle
2. **Événements** : Liste, création, gestion
3. **Présences** : Marquage et historique
4. **Utilisateurs** : Gestion des comptes et rôles
5. **Rapports** : Analytiques et exports
6. **Profil** : Paramètres personnels
7. **Notifications** : Centre de notifications

### Fonctionnalités UX
- Mode sombre/clair
- Recherche et filtres avancés
- Pagination intelligente
- États de chargement et erreurs
- Offline support (PWA)

## Déploiement et DevOps

### Environnements
- **Développement** : Local avec émulateurs Firebase
- **Staging** : Projet Firebase de test
- **Production** : Projet Firebase principal

### CI/CD Pipeline
- Tests automatisés (unitaires et intégration)
- Déploiement automatique sur Firebase
- Monitoring et alertes
- Backup automatique des données

## Roadmap de développement

### Phase 1 : Backend Foundation (2-3 semaines)
1. Configuration Firebase (Auth, Firestore, Functions)
2. API REST avec Express.js
3. Modèles de données et validation
4. Système d'authentification et rôles
5. CRUD pour utilisateurs et événements

### Phase 2 : Core Features (3-4 semaines)
1. Système de présences
2. Génération de codes QR
3. Géolocalisation
4. Notifications de base

### Phase 3 : Frontend Development (4-5 semaines)
1. Configuration Vite + TailwindCSS
2. Pages principales et navigation
3. Composants réutilisables
4. Intégration API

### Phase 4 : Advanced Features (3-4 semaines)
1. Rapports et analytiques
2. Système de notifications avancé
3. Export de données
4. Optimisations et PWA

### Phase 5 : Testing & Deployment (2-3 semaines)
1. Tests complets
2. Optimisations performances
3. Déploiement production
4. Documentation utilisateur

## Estimation totale : 14-19 semaines

Cette spécification fournit une base solide pour développer une application de gestion des présences moderne et complète. Nous pouvons ajuster les détails selon vos besoins spécifiques.