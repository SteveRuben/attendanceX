# Guide des Collections Postman Multi-Tenant

## Vue d'ensemble

Ce guide décrit les collections Postman mises à jour pour tester l'architecture SaaS multi-tenant du système de gestion de présence.

## Collections Disponibles

### 1. SaaS Multi-Tenant APIs (`SaaS-Multi-Tenant-APIs.postman_collection.json`)

Collection principale pour tester toutes les fonctionnalités multi-tenant :

- **🏢 Tenant Management** : Enregistrement, configuration et gestion des tenants
- **💳 Subscription Management** : Plans, abonnements et facturation
- **🔐 Multi-Tenant Authentication** : Authentification avec contexte tenant
- **👥 Multi-Tenant Users** : Gestion des utilisateurs isolés par tenant
- **📅 Multi-Tenant Events** : Événements avec isolation des données
- **🔔 Multi-Tenant Notifications** : Notifications avec branding par tenant
- **📊 Multi-Tenant Analytics** : Rapports et analytics isolés
- **🔧 Platform Admin APIs** : APIs d'administration de la plateforme

### 2. Attendance Management System API v3 (`attendance-management-v2.postman_collection.json`)

Collection mise à jour avec support multi-tenant pour les tests de régression.

### 3. Tenant Isolation Tests (`Tenant-Isolation-Tests.postman_collection.json`)

Collection spécialisée pour tester l'isolation des données entre tenants :

- **Setup Test Tenants** : Création de tenants de test
- **Data Isolation Tests** : Vérification de l'isolation des données
- **Feature Isolation Tests** : Test des fonctionnalités par plan
- **Cleanup Test Data** : Nettoyage des données de test

## Environnement Multi-Tenant

### Variables d'environnement (`Multi-Tenant-Environment.postman_environment.json`)

```json
{
  "base_url": "http://localhost:5001/api/v1",
  "jwt_token": "",
  "refresh_token": "",
  "tenant_id": "",
  "user_id": "",
  "subscription_id": "",
  "platform_admin_token": ""
}
```

### Headers automatiques

Les collections incluent des scripts de pré-requête qui ajoutent automatiquement :

- `X-Tenant-ID` : Contexte du tenant actuel
- `Authorization` : Token JWT avec refresh automatique

## Guide d'utilisation

### 1. Configuration initiale

1. **Importer les collections** dans Postman
2. **Importer l'environnement** Multi-Tenant
3. **Configurer les variables** de base (base_url, etc.)

### 2. Workflow de test complet

#### Étape 1 : Enregistrement d'un tenant

```http
POST /tenants/register
{
  "name": "Test Company",
  "slug": "test-company",
  "adminUser": {
    "email": "admin@test.com",
    "firstName": "Admin",
    "lastName": "User",
    "password": "SecurePassword123!"
  },
  "planId": "basic"
}
```

#### Étape 2 : Authentification

```http
POST /auth/login
{
  "email": "admin@test.com",
  "password": "SecurePassword123!",
  "tenantId": "{{tenant_id}}"
}
```

#### Étape 3 : Test des fonctionnalités

Toutes les requêtes suivantes incluront automatiquement le header `X-Tenant-ID`.

### 3. Tests d'isolation

Utilisez la collection `Tenant-Isolation-Tests` pour :

1. **Créer deux tenants** de test
2. **Créer des données** dans chaque tenant
3. **Vérifier l'isolation** des données
4. **Tester les restrictions** de fonctionnalités par plan

## Fonctionnalités Multi-Tenant Testées

### Isolation des données

- ✅ Les utilisateurs ne voient que les données de leur tenant
- ✅ Les requêtes sont automatiquement filtrées par tenant
- ✅ L'accès cross-tenant est bloqué (403 Forbidden)

### Gestion des abonnements

- ✅ Plans avec fonctionnalités différentes
- ✅ Limites d'utilisation par plan
- ✅ Facturation automatisée
- ✅ Upgrade/downgrade de plans

### Authentification multi-tenant

- ✅ Login avec contexte tenant
- ✅ Utilisateurs multi-tenant
- ✅ Invitations par tenant
- ✅ Changement de contexte tenant

### Personnalisation par tenant

- ✅ Branding personnalisé
- ✅ Configuration par tenant
- ✅ Templates de notification personnalisés

## Scripts de test automatisés

### Validation de l'isolation

```javascript
pm.test('All events belong to current tenant', function () {
    const jsonData = pm.response.json();
    const currentTenantId = pm.environment.get('tenant_id');
    jsonData.data.events.forEach(event => {
        pm.expect(event.tenantId).to.equal(currentTenantId);
    });
});
```

### Validation des fonctionnalités

```javascript
pm.test('Feature access based on plan', function () {
    const jsonData = pm.response.json();
    if (pm.response.code === 403) {
        pm.expect(jsonData.error.code).to.equal('FEATURE_NOT_AVAILABLE');
    } else {
        pm.expect(pm.response.code).to.equal(200);
    }
});
```

### Auto-refresh des tokens

```javascript
// Script de pré-requête automatique
const token = pm.environment.get('jwt_token');
if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            console.log('Token expired, attempting refresh...');
            // Logique de refresh automatique
        }
    } catch (e) {
        console.log('Invalid token format');
    }
}
```

## Cas de test spécifiques

### Test 1 : Isolation des événements

1. Créer un événement dans le Tenant A
2. Créer un événement dans le Tenant B
3. Vérifier que chaque tenant ne voit que ses événements
4. Tenter d'accéder à l'événement de l'autre tenant (doit échouer)

### Test 2 : Limites de plan

1. Créer un tenant avec plan Basic
2. Tenter d'utiliser une fonctionnalité Premium (doit échouer)
3. Upgrader vers le plan Premium
4. Réessayer la fonctionnalité (doit réussir)

### Test 3 : Facturation

1. Créer un abonnement
2. Simuler l'utilisation de ressources
3. Vérifier la génération de factures
4. Tester les webhooks de paiement

## Monitoring et debugging

### Headers de debug

Ajoutez ces headers pour le debugging :

```
X-Debug-Mode: true
X-Trace-ID: {{$guid}}
```

### Logs de requêtes

Les collections incluent des scripts pour logger :

- Temps de réponse
- Codes d'erreur
- Contexte tenant
- Utilisation des ressources

## Bonnes pratiques

### 1. Isolation des tests

- Utilisez des données de test uniques
- Nettoyez après chaque test
- Utilisez des slugs de tenant aléatoires

### 2. Gestion des tokens

- Configurez le refresh automatique
- Utilisez des tokens séparés par tenant
- Gérez l'expiration des tokens

### 3. Validation des réponses

- Vérifiez toujours le `tenantId` dans les réponses
- Testez les codes d'erreur spécifiques
- Validez les permissions par rôle

## Dépannage

### Erreurs communes

#### 403 TENANT_ACCESS_DENIED
```json
{
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "Access denied to tenant resource"
  }
}
```
**Solution** : Vérifier le header `X-Tenant-ID` et les permissions

#### 403 FEATURE_NOT_AVAILABLE
```json
{
  "error": {
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "Feature not available in current plan"
  }
}
```
**Solution** : Upgrader le plan ou utiliser une fonctionnalité disponible

#### 429 RATE_LIMIT_EXCEEDED
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded for tenant"
  }
}
```
**Solution** : Attendre ou upgrader le plan pour des limites plus élevées

## Intégration CI/CD

### Newman (CLI Postman)

```bash
# Test d'isolation des tenants
newman run Tenant-Isolation-Tests.postman_collection.json \
  -e Multi-Tenant-Environment.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json

# Tests complets multi-tenant
newman run SaaS-Multi-Tenant-APIs.postman_collection.json \
  -e Multi-Tenant-Environment.postman_environment.json \
  --timeout 30000
```

### GitHub Actions

```yaml
- name: Run Multi-Tenant API Tests
  run: |
    newman run docs/api-testing/SaaS-Multi-Tenant-APIs.postman_collection.json \
      -e docs/api-testing/Multi-Tenant-Environment.postman_environment.json \
      --reporters cli,junit \
      --reporter-junit-export test-results.xml
```

Cette documentation fournit un guide complet pour utiliser les collections Postman mises à jour avec l'architecture SaaS multi-tenant.