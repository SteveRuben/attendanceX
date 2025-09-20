# Guide de Test Rapide - AttendanceX v2.0

## 🚀 Configuration Rapide

### 1. Import dans Postman

1. **Importer la collection** : `AttendanceX-MultiTenant-v2.postman_collection.json`
2. **Importer l'environnement** : `AttendanceX-v2-Environment.postman_environment.json`
3. **Sélectionner l'environnement** AttendanceX v2.0

### 2. Configuration de l'URL de Base

Modifier la variable `baseUrl` selon votre environnement :

- **Local** : `http://localhost:5001/api/v1`
- **Développement** : `https://dev-api.attendance-x.com/api/v1`
- **Production** : `https://api.attendance-x.com/api/v1`

## 🧪 Scénarios de Test

### Scénario 1 : Flux Complet Nouveau Utilisateur

**Ordre d'exécution :**

1. **🔐 Authentication Flow**
   - `1. Register (Simplified)` - Créer un compte sans organisation
   - `2. Login` - Se connecter et récupérer les tokens

2. **🏢 Tenant Management**
   - `1. Create Tenant` - Créer son organisation (devient propriétaire)
   - `2. Get User Tenants` - Vérifier la liste des tenants

3. **📅 Events Management**
   - `Create Event` - Créer un événement de test
   - `List Events` - Vérifier que l'événement est isolé au tenant

**Résultat attendu :** ✅ Utilisateur créé → Tenant créé → Événements isolés

### Scénario 2 : Test des Routes Dépréciées

**Ordre d'exécution :**

1. **Authentification** (comme Scénario 1)
2. **⚠️ Deprecated Routes (Organizations)**
   - `Create Organization (DEPRECATED)` - Tester l'ancien endpoint
   - Vérifier les headers de dépréciation
   - Vérifier les warnings dans la réponse

**Résultat attendu :** ⚠️ Warnings de dépréciation + fonctionnalité maintenue

### Scénario 3 : Test Multi-Tenant

**Prérequis :** Avoir 2 tenants différents

1. **Créer le premier tenant** (Scénario 1)
2. **Créer des événements** dans le premier tenant
3. **Changer de contexte** : `Switch Tenant Context`
4. **Lister les événements** → Doit être vide (isolation)
5. **Créer des événements** dans le second tenant
6. **Revenir au premier tenant**
7. **Vérifier l'isolation** des données

**Résultat attendu :** 🔒 Isolation complète des données entre tenants

### Scénario 4 : Test d'Administration

**Prérequis :** Token admin dans `adminToken`

1. **📊 System Status**
   - `Health Check` - Vérifier l'état du système
   - `System Status` - Vérifier les services
   - `API Info` - Voir les informations de dépréciation

2. **🔧 Admin & Migration**
   - `Validate System Integrity` - Vérifier l'intégrité
   - `Run Full Migration` - Migrer les données (si nécessaire)

**Résultat attendu :** 🛠️ Système sain + migration réussie

## 🔍 Points de Vérification

### ✅ Authentification

- [ ] Inscription sans champ organisation
- [ ] Login retourne un token JWT valide
- [ ] Token contient les informations utilisateur
- [ ] Refresh token fonctionne

### ✅ Multi-Tenant

- [ ] Création de tenant génère un nouveau token avec contexte
- [ ] Changement de contexte met à jour le token
- [ ] Isolation des données entre tenants
- [ ] Permissions respectées par tenant

### ✅ Dépréciation

- [ ] Headers `Deprecation: true` présents
- [ ] Header `Sunset` avec date de suppression
- [ ] Header `Link` avec route de remplacement
- [ ] Warning `_deprecated` dans la réponse JSON

### ✅ Migration

- [ ] Validation d'intégrité sans erreurs
- [ ] Migration des organisations existantes
- [ ] Nettoyage des doublons
- [ ] Statistiques de migration correctes

## 🐛 Dépannage

### Erreur 401 - Non Autorisé

```bash
# Vérifier le token
echo "{{accessToken}}" | base64 -d
```

**Solutions :**
- Re-exécuter le login
- Vérifier l'expiration du token
- Utiliser le refresh token

### Erreur 403 - Accès Refusé

**Causes possibles :**
- Permissions insuffisantes pour le tenant
- Tenant suspendu ou inactif
- Rôle utilisateur insuffisant

**Solutions :**
- Vérifier le rôle dans `Get User Tenants`
- Changer de tenant si nécessaire
- Contacter l'administrateur du tenant

### Erreur 404 - Tenant Non Trouvé

**Solutions :**
- Vérifier que `tenantId` est correct
- Re-exécuter `Get User Tenants`
- Créer un nouveau tenant si nécessaire

### Warnings de Dépréciation

**Action recommandée :**
- Noter les endpoints utilisés
- Planifier la migration vers les nouveaux endpoints
- Tester les nouveaux endpoints équivalents

## 📊 Métriques de Performance

### Temps de Réponse Attendus

| Endpoint | Temps Moyen | Temps Max |
|----------|-------------|-----------|
| `/auth/login` | < 200ms | < 500ms |
| `/tenants/register` | < 300ms | < 800ms |
| `/tenants/switch-context` | < 150ms | < 400ms |
| `/events` (GET) | < 100ms | < 300ms |
| `/events` (POST) | < 200ms | < 500ms |

### Surveillance

```javascript
// Script de test Postman pour surveiller les performances
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

pm.test("No deprecation warnings in production", function () {
    if (pm.environment.get("baseUrl").includes("production")) {
        pm.expect(pm.response.headers.get("Deprecation")).to.not.exist;
    }
});
```

## 🔄 Automatisation

### Runner Postman

1. **Sélectionner la collection** AttendanceX v2.0
2. **Choisir l'environnement** approprié
3. **Configurer les itérations** (1 pour test manuel, 10+ pour stress test)
4. **Activer les délais** entre requêtes (100ms recommandé)
5. **Lancer le runner**

### Scripts CI/CD

```bash
# Newman (CLI Postman)
npm install -g newman

# Test complet
newman run AttendanceX-MultiTenant-v2.postman_collection.json \
  -e AttendanceX-v2-Environment.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json

# Test avec données dynamiques
newman run AttendanceX-MultiTenant-v2.postman_collection.json \
  -e AttendanceX-v2-Environment.postman_environment.json \
  --iteration-data test-data.csv \
  --iterations 5
```

## 📞 Support

### Logs Utiles

```bash
# Backend logs
tail -f backend/functions/logs/app.log | grep -E "(ERROR|WARN|DEPRECATED)"

# Firestore logs
gcloud logging read "resource.type=cloud_function" --limit 50
```

### Contacts

- **API Support** : api-support@attendance-x.com
- **Documentation** : https://docs.attendance-x.com
- **Status Page** : https://status.attendance-x.com

### Ressources

- [Guide API Complet](../api/multi-tenant-api-guide.md)
- [Documentation Swagger](http://localhost:5001/docs)
- [Collection Postman Complète](./AttendanceX-MultiTenant-v2.postman_collection.json)