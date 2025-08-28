# Guide de Déploiement en Production - Système de Gestion de Présence aux Événements

## Vue d'ensemble

Ce guide détaille le processus de déploiement du système de gestion de présence aux événements en environnement de production.

## Prérequis

### Infrastructure
- **Firebase Project** configuré avec :
  - Firestore Database
  - Firebase Authentication
  - Firebase Functions
  - Firebase Hosting
  - Firebase Storage
- **Domaine personnalisé** configuré
- **Certificats SSL** valides
- **CDN** configuré (Firebase Hosting ou CloudFlare)

### Services Externes
- **Service Email** (SendGrid, Mailgun, ou SMTP)
- **Service SMS** (Twilio, AWS SNS)
- **Stockage de fichiers** (Firebase Storage ou AWS S3)
- **Monitoring** (Firebase Performance, Sentry)

## Configuration de l'Environnement

### 1. Variables d'Environnement

Créer le fichier `.env.production` :

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-production-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-domain.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# API Configuration
API_BASE_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Email Service
EMAIL_SERVICE_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=AttendanceX

# SMS Service
SMS_SERVICE_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Security
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=your-encryption-key
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX

# Performance
REDIS_URL=redis://your-redis-instance:6379
CDN_URL=https://cdn.yourdomain.com

# Features
ENABLE_BIOMETRIC=true
ENABLE_NFC=true
ENABLE_OFFLINE_MODE=true
ENABLE_ANALYTICS=true
```

### 2. Configuration Firebase

#### firebase.json
```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/api/**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "https://yourdomain.com"
          },
          {
            "key": "Access-Control-Allow-Methods",
            "value": "GET,POST,PUT,DELETE,OPTIONS"
          },
          {
            "key": "Access-Control-Allow-Headers",
            "value": "Content-Type,Authorization"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "functions": {
    "source": "backend/functions",
    "runtime": "nodejs18",
    "memory": "1GB",
    "timeout": "60s",
    "env": {
      "NODE_ENV": "production"
    }
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

#### firestore.rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Organization members can read organization data
    match /organizations/{orgId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members;
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.admins;
    }
    
    // Event access based on organization membership
    match /events/{eventId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.organizers;
    }
    
    // Attendance records
    match /attendance_records/{recordId} {
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.userId ||
        request.auth.uid in get(/databases/$(database)/documents/events/$(resource.data.eventId)).data.organizers
      );
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Certificates
    match /certificates/{certId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // System metrics (admin only)
    match /system_metrics/{metricId} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

#### firestore.indexes.json
```json
{
  "indexes": [
    {
      "collectionGroup": "attendance_records",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "checkInTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "startDateTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "session_attendances",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "certificates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "generatedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Scripts de Déploiement

### 1. Script de Build

```bash
#!/bin/bash
# scripts/build-production.sh

set -e

echo "🏗️  Building for production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefix frontend
npm ci --prefix backend/functions

# Build frontend
echo "🎨 Building frontend..."
cd frontend
npm run build
cd ..

# Build backend
echo "⚙️  Building backend..."
cd backend/functions
npm run build
cd ../..

# Run tests
echo "🧪 Running tests..."
npm run test:ci

echo "✅ Build completed successfully!"
```

### 2. Script de Déploiement

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Deploying to production..."

# Verify environment
if [ "$NODE_ENV" != "production" ]; then
  echo "❌ NODE_ENV must be set to 'production'"
  exit 1
fi

# Build project
./scripts/build-production.sh

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase use production
firebase deploy --only hosting,functions,firestore:rules,storage:rules

# Deploy database migrations
echo "📊 Running database migrations..."
npm run migrate:production

# Warm up functions
echo "🔥 Warming up functions..."
curl -X GET "https://api.yourdomain.com/health" || true

# Verify deployment
echo "✅ Verifying deployment..."
./scripts/verify-deployment.sh

echo "🎉 Deployment completed successfully!"
```

### 3. Script de Vérification

```bash
#!/bin/bash
# scripts/verify-deployment.sh

set -e

echo "🔍 Verifying deployment..."

API_URL="https://api.yourdomain.com"
FRONTEND_URL="https://yourdomain.com"

# Check API health
echo "🏥 Checking API health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HEALTH_RESPONSE" != "200" ]; then
  echo "❌ API health check failed (HTTP $HEALTH_RESPONSE)"
  exit 1
fi

# Check frontend
echo "🌐 Checking frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_RESPONSE" != "200" ]; then
  echo "❌ Frontend check failed (HTTP $FRONTEND_RESPONSE)"
  exit 1
fi

# Check database connectivity
echo "💾 Checking database connectivity..."
DB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health/database")
if [ "$DB_RESPONSE" != "200" ]; then
  echo "❌ Database connectivity check failed"
  exit 1
fi

# Check critical functions
echo "⚡ Checking critical functions..."
FUNCTIONS=(
  "qr/generate"
  "attendance/stats"
  "events/list"
)

for func in "${FUNCTIONS[@]}"; do
  FUNC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/$func")
  if [ "$FUNC_RESPONSE" != "200" ] && [ "$FUNC_RESPONSE" != "401" ]; then
    echo "❌ Function $func check failed (HTTP $FUNC_RESPONSE)"
    exit 1
  fi
done

echo "✅ All checks passed!"
```

## Configuration du Monitoring

### 1. Monitoring des Performances

```typescript
// backend/functions/src/monitoring/performance.ts
import { onRequest } from 'firebase-functions/v2/https';
import { monitoringService } from '../services/monitoring.service';

export const performanceMonitor = onRequest(async (req, res) => {
  try {
    const metrics = await monitoringService.collectMetrics();
    const healthChecks = await monitoringService.performHealthChecks();
    const systemStatus = await monitoringService.getSystemStatus();

    res.json({
      success: true,
      data: {
        metrics,
        healthChecks: Array.from(healthChecks.values()),
        systemStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to collect performance metrics'
    });
  }
});
```

### 2. Alertes Automatiques

```typescript
// backend/functions/src/monitoring/alerts.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { monitoringService } from '../services/monitoring.service';

export const healthCheckScheduler = onSchedule('every 5 minutes', async () => {
  try {
    await monitoringService.performHealthChecks();
    await monitoringService.collectMetrics();
  } catch (error) {
    console.error('Health check failed:', error);
  }
});

export const cleanupScheduler = onSchedule('every 24 hours', async () => {
  try {
    await monitoringService.cleanup(30); // Keep 30 days of data
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
});
```

## Configuration de Sécurité

### 1. HTTPS et Certificats

```bash
# Configuration automatique via Firebase Hosting
firebase hosting:channel:deploy production --expires 30d
```

### 2. CORS et Headers de Sécurité

```typescript
// backend/functions/src/middleware/security.ts
import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // HTTPS Redirect
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.yourdomain.com wss://api.yourdomain.com"
  ].join('; '));

  next();
};
```

## Sauvegarde et Récupération

### 1. Sauvegarde Automatique

```bash
#!/bin/bash
# scripts/backup-production.sh

set -e

echo "💾 Creating production backup..."

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/production_$BACKUP_DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Export Firestore data
gcloud firestore export gs://your-backup-bucket/firestore/$BACKUP_DATE \
  --project=your-production-project-id

# Backup configuration files
cp -r deployment/production "$BACKUP_DIR/config"
cp .env.production "$BACKUP_DIR/"

# Backup certificates and keys
cp -r certificates "$BACKUP_DIR/" 2>/dev/null || true

echo "✅ Backup completed: $BACKUP_DIR"
```

### 2. Plan de Récupération

```bash
#!/bin/bash
# scripts/restore-production.sh

set -e

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  exit 1
fi

echo "🔄 Restoring from backup: $BACKUP_DATE"

# Restore Firestore data
gcloud firestore import gs://your-backup-bucket/firestore/$BACKUP_DATE \
  --project=your-production-project-id

# Restore configuration
cp "backups/production_$BACKUP_DATE/.env.production" .
cp -r "backups/production_$BACKUP_DATE/config" deployment/production

echo "✅ Restore completed"
```

## Checklist de Déploiement

### Pré-déploiement
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Tests de charge passent
- [ ] Configuration de production vérifiée
- [ ] Variables d'environnement configurées
- [ ] Certificats SSL valides
- [ ] Sauvegarde de l'environnement actuel

### Déploiement
- [ ] Build de production créé
- [ ] Déploiement des fonctions Firebase
- [ ] Déploiement du frontend
- [ ] Mise à jour des règles Firestore
- [ ] Migration de base de données
- [ ] Configuration du CDN

### Post-déploiement
- [ ] Vérification de l'API
- [ ] Vérification du frontend
- [ ] Tests de santé des services
- [ ] Monitoring activé
- [ ] Alertes configurées
- [ ] Documentation mise à jour
- [ ] Équipe notifiée

## Maintenance

### 1. Mises à jour de sécurité

```bash
# Mise à jour mensuelle des dépendances
npm audit fix
npm update

# Vérification des vulnérabilités
npm audit --audit-level high
```

### 2. Optimisation des performances

```bash
# Analyse des performances
firebase functions:log --limit 100
firebase hosting:channel:list

# Optimisation des images
npm run optimize:images

# Minification des assets
npm run build:optimize
```

### 3. Nettoyage des données

```bash
# Nettoyage automatique des anciennes données
firebase functions:shell
> cleanupOldData({daysToKeep: 90})
```

## Support et Dépannage

### Logs et Debugging

```bash
# Logs des fonctions Firebase
firebase functions:log --limit 50

# Logs en temps réel
firebase functions:log --follow

# Logs spécifiques à une fonction
firebase functions:log --only api
```

### Contacts d'urgence

- **Équipe DevOps**: devops@yourdomain.com
- **Support Firebase**: Support Firebase Console
- **Monitoring**: alerts@yourdomain.com

### Procédures d'urgence

1. **Rollback rapide**: `firebase hosting:channel:deploy previous`
2. **Mode maintenance**: Activer la page de maintenance
3. **Escalade**: Contacter l'équipe de support selon la matrice d'escalade

---

Ce guide doit être maintenu à jour avec chaque modification de l'infrastructure ou des procédures de déploiement.