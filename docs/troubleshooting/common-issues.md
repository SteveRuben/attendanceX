# Guide de Dépannage - Architecture Multi-Tenant

## Problèmes d'Isolation des Tenants

### Symptôme : Fuite de données entre tenants

**Description** : Un utilisateur voit des données d'un autre tenant

**Diagnostic** :
```bash
# Vérifier les logs d'accès suspects
gcloud logging read "resource.type=cloud_function AND 
  jsonPayload.tenantId!=jsonPayload.requestedTenantId" --limit=100

# Analyser les requêtes Firestore
firebase firestore:query events --where tenantId==null
```

**Solutions** :
1. **Vérifier les règles Firestore** :
   ```javascript
   // Règle correcte
   match /{collection}/{document} {
     allow read, write: if request.auth != null 
       && resource.data.tenantId == getUserTenant(request.auth.uid);
   }
   ```

2. **Contrôler le middleware tenant** :
   ```typescript
   // Vérifier que le middleware est appliqué
   router.use('/api/*', tenantContextMiddleware.enforceTenantIsolation());
   ```

3. **Audit des requêtes** :
   ```bash
   # Rechercher les requêtes sans filtre tenantId
   grep -r "collection(" src/ | grep -v "tenantId"
   ```

### Symptôme : Erreur "Tenant not found"

**Causes possibles** :
- Token JWT corrompu ou expiré
- Tenant supprimé ou suspendu
- Problème de synchronisation cache

**Solutions** :
```bash
# Vérifier l'existence du tenant
firebase firestore:get tenants/$TENANT_ID

# Régénérer le token JWT
curl -X POST /api/auth/refresh -H "Authorization: Bearer $REFRESH_TOKEN"

# Vider le cache tenant
redis-cli DEL "tenant:$TENANT_ID"
```

## Problèmes de Performance

### Symptôme : Requêtes lentes

**Diagnostic** :
```bash
# Analyser les métriques Firestore
gcloud logging read "resource.type=firestore_database AND 
  jsonPayload.duration > 1000" --limit=50

# Vérifier les index manquants
firebase firestore:indexes:list
```

**Solutions** :
1. **Créer des index composites** :
   ```bash
   # Index pour requêtes tenant-scoped
   firebase firestore:indexes:create \
     --collection-group=events \
     --field-config field-path=tenantId,order=ascending \
     --field-config field-path=startDate,order=descending
   ```

2. **Optimiser les requêtes** :
   ```typescript
   // Mauvais : requête sans limite
   const events = await db.collection('events')
     .where('tenantId', '==', tenantId)
     .get();

   // Bon : requête avec limite et pagination
   const events = await db.collection('events')
     .where('tenantId', '==', tenantId)
     .orderBy('startDate', 'desc')
     .limit(50)
     .get();
   ```

### Symptôme : Timeout des Cloud Functions

**Causes** :
- Requêtes Firestore non optimisées
- Boucles infinies dans le code
- Problèmes de réseau externe

**Solutions** :
```bash
# Augmenter le timeout temporairement
firebase functions:config:set timeout.duration=540

# Analyser les logs de performance
firebase functions:log --only=function-name --lines=100
```

## Problèmes de Facturation

### Symptôme : Calcul d'usage incorrect

**Diagnostic** :
```bash
# Vérifier les métriques d'usage
curl -X GET /api/admin/tenants/$TENANT_ID/usage \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Comparer avec les données Firestore
firebase firestore:query users --where tenantId==$TENANT_ID --count
```

**Solutions** :
1. **Recalculer l'usage** :
   ```bash
   curl -X POST /api/admin/tenants/$TENANT_ID/recalculate-usage \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. **Vérifier les jobs de calcul** :
   ```bash
   # Vérifier les logs des jobs
   gcloud scheduler jobs describe tenant-usage-calculation
   ```

### Symptôme : Webhooks Stripe non reçus

**Diagnostic** :
```bash
# Vérifier les logs des webhooks
firebase functions:log --only=stripeWebhooks

# Tester l'endpoint manuellement
curl -X POST https://your-domain.com/api/stripe/webhooks \
  -H "Stripe-Signature: test" \
  -d '{"type":"test"}'
```

**Solutions** :
1. **Vérifier la configuration Stripe** :
   - URL correcte dans le dashboard Stripe
   - Secret webhook configuré
   - Événements sélectionnés

2. **Retraiter les événements manqués** :
   ```bash
   # Via Stripe CLI
   stripe events resend evt_1234567890
   ```

## Problèmes d'Authentification

### Symptôme : Utilisateur ne peut pas se connecter

**Diagnostic** :
```bash
# Vérifier l'utilisateur dans Firebase Auth
firebase auth:export users.json
jq '.users[] | select(.email=="user@example.com")' users.json

# Vérifier l'appartenance au tenant
firebase firestore:query tenant_memberships \
  --where userId==user_id --where tenantId==tenant_id
```

**Solutions** :
1. **Réinitialiser le mot de passe** :
   ```bash
   firebase auth:import users.json --hash-algo=SCRYPT
   ```

2. **Vérifier les permissions** :
   ```typescript
   // Ajouter l'utilisateur au tenant
   await tenantMembershipService.addUserToTenant({
     userId: 'user_id',
     tenantId: 'tenant_id',
     role: 'member'
   });
   ```

### Symptôme : Token JWT invalide

**Causes** :
- Token expiré
- Clé de signature modifiée
- Format de token incorrect

**Solutions** :
```bash
# Décoder le token pour diagnostic
echo $JWT_TOKEN | base64 -d | jq .

# Vérifier la configuration JWT
firebase functions:config:get jwt
```

## Problèmes de Déploiement

### Symptôme : Échec du déploiement des fonctions

**Diagnostic** :
```bash
# Vérifier les logs de déploiement
firebase functions:log --only=deploy

# Vérifier la taille des fonctions
du -sh functions/lib/
```

**Solutions** :
1. **Optimiser la taille** :
   ```bash
   # Supprimer les dépendances inutiles
   npm prune --production
   
   # Utiliser webpack pour bundler
   npm run build:optimize
   ```

2. **Déploiement par étapes** :
   ```bash
   # Déployer fonction par fonction
   firebase deploy --only functions:api
   firebase deploy --only functions:webhooks
   ```

### Symptôme : Règles Firestore rejetées

**Diagnostic** :
```bash
# Tester les règles localement
firebase emulators:start --only firestore
firebase firestore:rules:test
```

**Solutions** :
```javascript
// Corriger les règles problématiques
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonction helper pour obtenir le tenant
    function getUserTenant(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.tenantId;
    }
    
    // Règle corrigée
    match /{collection}/{document} {
      allow read, write: if request.auth != null 
        && resource.data.tenantId == getUserTenant(request.auth.uid);
    }
  }
}
```

## Problèmes de Monitoring

### Symptôme : Métriques manquantes

**Diagnostic** :
```bash
# Vérifier la configuration de monitoring
kubectl get configmap monitoring-config -o yaml

# Tester les endpoints de métriques
curl -X GET https://api.attendance-x.com/metrics
```

**Solutions** :
1. **Redémarrer les agents de monitoring** :
   ```bash
   kubectl rollout restart daemonset/monitoring-agent
   ```

2. **Vérifier les permissions** :
   ```bash
   kubectl auth can-i get pods --as=system:serviceaccount:monitoring:default
   ```

### Symptôme : Alertes non déclenchées

**Diagnostic** :
```bash
# Vérifier les règles d'alerte
kubectl get prometheusrules -o yaml

# Tester manuellement les conditions
curl -X GET 'http://prometheus:9090/api/v1/query?query=up{job="api-server"}'
```

## Scripts de Diagnostic

### Script de santé globale

```bash
#!/bin/bash
# health-check.sh

echo "=== Vérification de santé globale ==="

# API Health
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.attendance-x.com/health)
echo "API Status: $API_STATUS"

# Database connectivity
DB_STATUS=$(firebase firestore:get tenants/test 2>/dev/null && echo "OK" || echo "FAIL")
echo "Database: $DB_STATUS"

# Authentication
AUTH_STATUS=$(curl -s -X POST https://api.attendance-x.com/auth/test 2>/dev/null && echo "OK" || echo "FAIL")
echo "Auth: $AUTH_STATUS"

# Stripe connectivity
STRIPE_STATUS=$(curl -s https://api.stripe.com/v1/account -u $STRIPE_SECRET_KEY: 2>/dev/null && echo "OK" || echo "FAIL")
echo "Stripe: $STRIPE_STATUS"
```

### Script de diagnostic tenant

```bash
#!/bin/bash
# tenant-diagnostic.sh

TENANT_ID=$1

if [ -z "$TENANT_ID" ]; then
  echo "Usage: $0 <tenant_id>"
  exit 1
fi

echo "=== Diagnostic pour tenant: $TENANT_ID ==="

# Vérifier l'existence du tenant
TENANT_EXISTS=$(firebase firestore:get tenants/$TENANT_ID 2>/dev/null && echo "YES" || echo "NO")
echo "Tenant exists: $TENANT_EXISTS"

# Compter les utilisateurs
USER_COUNT=$(firebase firestore:query users --where tenantId==$TENANT_ID --count 2>/dev/null || echo "0")
echo "User count: $USER_COUNT"

# Vérifier l'usage
USAGE=$(curl -s -X GET /api/admin/tenants/$TENANT_ID/usage -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.users // "N/A"')
echo "Current usage: $USAGE users"

# Vérifier le statut de facturation
BILLING_STATUS=$(curl -s -X GET /api/admin/tenants/$TENANT_ID/billing -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.status // "N/A"')
echo "Billing status: $BILLING_STATUS"
```

## Contacts d'Escalade

### Équipe Technique
- **Slack** : #tech-support
- **Email** : tech-support@attendance-x.com
- **Astreinte** : +33 1 XX XX XX XX

### Équipe Sécurité
- **Email** : security@attendance-x.com
- **Urgence** : +33 1 XX XX XX XX

### Fournisseurs Externes
- **Firebase Support** : Via console Firebase
- **Stripe Support** : Via dashboard Stripe
- **Monitoring** : support@monitoring-provider.com

## Procédures d'Urgence

### Incident de Sécurité
1. **Isolation immédiate** du tenant affecté
2. **Notification** de l'équipe sécurité
3. **Analyse** des logs d'accès
4. **Communication** avec les clients affectés
5. **Rapport** d'incident post-mortem

### Panne Généralisée
1. **Activation** de la page de statut
2. **Basculement** vers l'infrastructure de secours
3. **Communication** sur tous les canaux
4. **Diagnostic** et résolution
5. **Post-mortem** et amélioration

---

*Ce guide est mis à jour régulièrement. Dernière révision : Janvier 2024*