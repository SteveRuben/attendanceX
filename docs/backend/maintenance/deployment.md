# Deployment

Procédures de déploiement du système.

## Environnements

### Development
- **URL** : https://dev-presence.web.app
- **Database** : Firestore Emulator
- **Functions** : Local emulation

### Staging
- **URL** : https://staging-presence.web.app
- **Database** : Firestore (staging)
- **Functions** : Cloud Functions (staging)

### Production
- **URL** : https://presence.web.app
- **Database** : Firestore (production)
- **Functions** : Cloud Functions (production)

## Processus de déploiement

### Frontend
```bash
# Build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Backend
```bash
# Build functions
npm run build:functions

# Deploy functions
firebase deploy --only functions
```

### Database
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

## CI/CD Pipeline

### GitHub Actions
1. **Tests** : Exécution des tests automatisés
2. **Build** : Compilation du code
3. **Deploy Staging** : Déploiement automatique sur staging
4. **Manual Approval** : Validation manuelle
5. **Deploy Production** : Déploiement en production

### Rollback
- **Frontend** : Retour à la version précédente via Firebase Console
- **Functions** : Redéploiement de la version précédente
- **Database** : Restauration depuis backup

## Monitoring post-déploiement

- Vérification des health checks
- Surveillance des métriques
- Validation des fonctionnalités critiques
- Monitoring des erreurs