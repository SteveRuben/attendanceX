# Guide de Déploiement - Architecture Multi-Tenant

## Vue d'ensemble

Ce guide décrit le processus de déploiement de l'architecture multi-tenant en production, incluant la configuration, les tests et la maintenance.

## Prérequis

### Infrastructure Requise

1. **Firebase Project**
   - Firestore en mode natif
   - Authentication activé
   - Cloud Functions activées
   - Storage activé

2. **Services Externes**
   - Compte Stripe (production)
   - Service email (SendGrid/Mailgun)
   - Service SMS (Twilio)
   - Monitoring (DataDog/New Relic)

3. **Outils de Développement**
   - Node.js 18+
   - Firebase CLI
   - Docker (optionnel)
   - Kubernetes CLI (pour scaling)

### Variables d'Environnement

```bash
# Firebase
FIREBASE_PROJECT_ID=attendance-x-prod
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Services externes
SENDGRID_API_KEY=SG....
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...

# Sécurité
JWT_SECRET=...
ENCRYPTION_KEY=...
```

## Phase 1 : Préparation

### 1.1 Configuration Firebase

```bash
# Installation Firebase CLI
npm install -g firebase-tools

# Connexion
firebase login

# Initialisation du projet
firebase init

# Configuration des fonctions
cd functions
npm install
```

### 1.2 Configuration Firestore

```javascript
// Règles de sécurité Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolation par tenant
    match /{collection}/{document} {
      allow read, write: if request.auth != null 
        && resource.data.tenantId == getUserTenant(request.auth.uid);
    }
  }
}
```

### 1.3 Index Firestore

```bash
# Créer les index nécessaires
firebase firestore:indexes

# Index composites critiques
# Collection: events - Fields: tenantId, startDate
# Collection: users - Fields: tenantId, role
# Collection: attendances - Fields: tenantId, eventId, userId
```

## Phase 2 : Déploiement Backend

### 2.1 Build et Tests

```bash
# Build du backend
npm run build:backend

# Tests unitaires
npm run test:backend

# Tests d'intégration
npm run test:integration

# Tests de sécurité tenant
npm run test:tenant-isolation
```### 
2.2 Déploiement des Cloud Functions

```bash
# Déploiement des fonctions
firebase deploy --only functions

# Vérification du déploiement
firebase functions:log

# Test des endpoints critiques
curl -X GET https://us-central1-attendance-x-prod.cloudfunctions.net/api/health
```

### 2.3 Configuration des Webhooks Stripe

```bash
# Configuration via Stripe CLI
stripe listen --forward-to https://your-domain.com/api/stripe/webhooks

# Ou via dashboard Stripe
# URL: https://your-domain.com/api/stripe/webhooks
# Événements: customer.subscription.*, invoice.*, payment_intent.*
```

## Phase 3 : Déploiement Frontend

### 3.1 Build Production

```bash
# Build optimisé
npm run build:frontend

# Vérification du build
npm run preview

# Tests E2E
npm run test:e2e:production
```

### 3.2 Déploiement Firebase Hosting

```bash
# Déploiement
firebase deploy --only hosting

# Configuration du domaine personnalisé
firebase hosting:channel:deploy production --expires 30d
```

## Phase 4 : Configuration Production

### 4.1 Plans d'Abonnement

```javascript
// Configuration des plans par défaut
const defaultPlans = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    limits: {
      maxUsers: 5,
      maxEvents: 10,
      maxStorage: 100
    }
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    limits: {
      maxUsers: 25,
      maxEvents: 100,
      maxStorage: 1000
    }
  }
  // ... autres plans
];
```

### 4.2 Configuration Monitoring

```yaml
# monitoring-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-config
data:
  alerts.yaml: |
    groups:
    - name: tenant-alerts
      rules:
      - alert: TenantDataLeak
        expr: tenant_isolation_violations > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Violation d'isolation tenant détectée"
```

## Phase 5 : Tests de Production

### 5.1 Tests d'Isolation

```bash
# Script de test d'isolation
#!/bin/bash

# Créer deux tenants de test
TENANT_A=$(curl -X POST /api/admin/tenants -d '{"name":"Test A"}' | jq -r '.id')
TENANT_B=$(curl -X POST /api/admin/tenants -d '{"name":"Test B"}' | jq -r '.id')

# Créer des données pour chaque tenant
curl -X POST /api/events -H "X-Tenant-ID: $TENANT_A" -d '{"title":"Event A"}'
curl -X POST /api/events -H "X-Tenant-ID: $TENANT_B" -d '{"title":"Event B"}'

# Vérifier l'isolation
EVENTS_A=$(curl -X GET /api/events -H "X-Tenant-ID: $TENANT_A" | jq '.data | length')
EVENTS_B=$(curl -X GET /api/events -H "X-Tenant-ID: $TENANT_B" | jq '.data | length')

if [ "$EVENTS_A" -eq 1 ] && [ "$EVENTS_B" -eq 1 ]; then
  echo "✅ Test d'isolation réussi"
else
  echo "❌ Échec du test d'isolation"
  exit 1
fi
```

### 5.2 Tests de Performance

```bash
# Test de charge avec Artillery
artillery run load-test.yml

# Monitoring des métriques
kubectl top pods -n production
```

## Phase 6 : Monitoring et Alertes

### 6.1 Métriques Critiques

```javascript
// Métriques à surveiller
const criticalMetrics = {
  // Performance
  'api_response_time_p95': { threshold: 2000, unit: 'ms' },
  'database_query_time_p95': { threshold: 1000, unit: 'ms' },
  
  // Disponibilité
  'uptime_percentage': { threshold: 99.9, unit: '%' },
  'error_rate': { threshold: 1, unit: '%' },
  
  // Sécurité
  'tenant_isolation_violations': { threshold: 0, unit: 'count' },
  'failed_auth_attempts': { threshold: 100, unit: 'count/hour' },
  
  // Business
  'active_tenants': { threshold: 'monitor', unit: 'count' },
  'revenue_per_tenant': { threshold: 'monitor', unit: 'currency' }
};
```

### 6.2 Configuration des Alertes

```yaml
# alerts.yaml
groups:
- name: production-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Taux d'erreur élevé détecté"
      
  - alert: TenantIsolationViolation
    expr: tenant_data_leak_count > 0
    for: 0m
    labels:
      severity: critical
    annotations:
      summary: "CRITIQUE: Violation d'isolation tenant"
```

## Phase 7 : Procédures de Rollback

### 7.1 Rollback Backend

```bash
#!/bin/bash
# rollback-backend.sh

# Obtenir la version précédente
PREVIOUS_VERSION=$(firebase functions:list --json | jq -r '.[0].versionId')

# Rollback des fonctions
firebase functions:delete --force
firebase deploy --only functions:$PREVIOUS_VERSION

# Vérification
curl -X GET https://api.attendance-x.com/health
```

### 7.2 Rollback Frontend

```bash
#!/bin/bash
# rollback-frontend.sh

# Rollback vers la version précédente
firebase hosting:clone source-site-id:channel-id target-site-id:live

# Vérification
curl -X GET https://attendance-x.com/health
```

## Phase 8 : Maintenance Continue

### 8.1 Sauvegarde Automatique

```bash
#!/bin/bash
# backup-daily.sh

DATE=$(date +%Y%m%d)
BACKUP_BUCKET="gs://attendance-x-backups"

# Export Firestore
gcloud firestore export $BACKUP_BUCKET/$DATE

# Sauvegarde des configurations
kubectl get configmaps -o yaml > configs-$DATE.yaml
kubectl get secrets -o yaml > secrets-$DATE.yaml

# Upload vers le stockage sécurisé
gsutil cp configs-$DATE.yaml $BACKUP_BUCKET/$DATE/
gsutil cp secrets-$DATE.yaml $BACKUP_BUCKET/$DATE/
```

### 8.2 Mise à Jour des Dépendances

```bash
#!/bin/bash
# update-dependencies.sh

# Backend
cd backend/functions
npm audit fix
npm update

# Frontend  
cd ../../frontend
npm audit fix
npm update

# Tests après mise à jour
npm run test:all
```

### 8.3 Nettoyage Périodique

```bash
#!/bin/bash
# cleanup-weekly.sh

# Supprimer les sessions expirées
firebase firestore:delete --recursive sessions \
  --where "expiresAt < $(date -d '7 days ago' +%s)"

# Nettoyer les logs anciens
gcloud logging sinks update cleanup-sink \
  --log-filter="timestamp < '$(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%SZ)'"

# Optimiser les index
firebase firestore:indexes --delete-unused
```

## Phase 9 : Scaling et Optimisation

### 9.1 Auto-scaling Configuration

```yaml
# autoscaling.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 9.2 Optimisation Base de Données

```javascript
// Optimisation des requêtes Firestore
const optimizeQueries = {
  // Utiliser des index composites
  events: ['tenantId', 'startDate', 'status'],
  users: ['tenantId', 'role', 'lastActive'],
  
  // Limiter les résultats
  defaultLimit: 50,
  maxLimit: 1000,
  
  // Cache des requêtes fréquentes
  cacheStrategy: {
    tenantInfo: '15m',
    userPermissions: '5m',
    planLimits: '1h'
  }
};
```

## Phase 10 : Sécurité Production

### 10.1 Audit de Sécurité

```bash
#!/bin/bash
# security-audit.sh

# Vérifier les règles Firestore
firebase firestore:rules:get > current-rules.txt
diff current-rules.txt expected-rules.txt

# Audit des permissions IAM
gcloud projects get-iam-policy $PROJECT_ID --format=json > iam-policy.json

# Scan des vulnérabilités
npm audit --audit-level high
```

### 10.2 Rotation des Clés

```bash
#!/bin/bash
# rotate-keys.sh

# Générer nouvelles clés
NEW_JWT_SECRET=$(openssl rand -base64 32)
NEW_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Mise à jour des secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=$NEW_JWT_SECRET \
  --from-literal=encryption-key=$NEW_ENCRYPTION_KEY \
  --dry-run=client -o yaml | kubectl apply -f -

# Redémarrage des services
kubectl rollout restart deployment/api-server
```

## Checklist de Déploiement

### Pré-déploiement
- [ ] Tests unitaires passés (100%)
- [ ] Tests d'intégration passés
- [ ] Tests de sécurité tenant validés
- [ ] Performance benchmarks validés
- [ ] Documentation mise à jour
- [ ] Plan de rollback préparé

### Déploiement
- [ ] Sauvegarde de l'état actuel
- [ ] Déploiement backend réussi
- [ ] Déploiement frontend réussi
- [ ] Configuration production appliquée
- [ ] Tests de fumée passés
- [ ] Monitoring activé

### Post-déploiement
- [ ] Métriques de performance normales
- [ ] Aucune alerte critique
- [ ] Tests utilisateur validés
- [ ] Documentation utilisateur mise à jour
- [ ] Équipe support informée
- [ ] Rollback plan validé

## Support et Escalade

### Contacts d'Urgence
- **DevOps Lead** : +33 1 XX XX XX XX
- **Security Team** : security@attendance-x.com
- **CTO** : cto@attendance-x.com

### Procédures d'Escalade
1. **Niveau 1** : Équipe technique (0-2h)
2. **Niveau 2** : Lead technique (2-4h)
3. **Niveau 3** : Management (4h+)

---

*Ce guide doit être mis à jour à chaque modification majeure de l'architecture.*