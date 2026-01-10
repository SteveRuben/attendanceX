# Debugging hasPermission Function

## Logs détaillés ajoutés

J'ai ajouté des logs détaillés avec des emojis pour faciliter le debugging de la fonction `hasPermission` et du système de permissions tenant.

### 🔍 Logs dans AuthService.hasPermission

- `🔍 hasPermission called` - Point d'entrée avec tous les paramètres
- `📝 No tenantId provided, using basic permission check` - Quand pas de tenant
- `🏢 Using tenant permission service` - Quand utilisation du service tenant
- `✅ Tenant permission check completed` - Résultat final
- `❌ Failed to check user permission` - Erreur dans la fonction

### 👤 Logs dans TenantPermissionService

#### Vérification des permissions
- `🔍 TenantPermissionService.checkPermission called` - Point d'entrée
- `👤 Tenant membership retrieved` - Membership récupéré avec détails complets
- `❌ User is not a member of this tenant` - Pas de membership
- `❌ User membership is inactive` - Membership inactif

#### Vérifications par source
- `🎭 Role-based permission check` - Vérification par rôle
- `🔧 Feature permission check` - Vérification par feature permissions
- `📁 Resource permission check` - Vérification par ressource

#### Résultats
- `✅ Permission granted by role` - Accordé par rôle
- `✅ Permission granted by feature override` - Accordé par feature
- `✅ Permission granted by resource access` - Accordé par ressource
- `❌ Permission denied - no matching rule found` - Refusé

### 💾 Logs dans getTenantMembership

#### Cache
- `📋 Using cached membership` - Utilisation du cache
- `⏰ Cache expired, fetching fresh data` - Cache expiré
- `🆕 No cache entry found, fetching from database` - Pas de cache

#### Base de données
- `🔍 Querying tenant_memberships collection` - Requête DB
- `📊 Database query results` - Résultats de la requête
- `❌ No tenant membership found in database` - Pas de membership trouvé
- `📄 Raw membership document data` - Données brutes du document
- `✅ Processed membership object` - Objet membership traité
- `💾 Membership cached successfully` - Mise en cache réussie

### 🎭 Logs dans roleHasPermission

- `🎭 Role permission check details` - Détails de la vérification de rôle avec permissions disponibles

## Comment utiliser ces logs

### 1. Activer les logs Firebase Functions
```bash
firebase functions:log --only functions
```

### 2. Déclencher une requête avec permissions
Faites une requête API qui nécessite des permissions, par exemple :
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5001/your-project/us-central1/api/v1/events?tenantId=YOUR_TENANT_ID
```

### 3. Analyser les logs
Recherchez les emojis dans les logs pour suivre le flux :

```
🔍 hasPermission called
🏢 Using tenant permission service  
🔍 TenantPermissionService.checkPermission called
🆕 No cache entry found, fetching from database
🔍 Querying tenant_memberships collection
📊 Database query results
📄 Raw membership document data
✅ Processed membership object
💾 Membership cached successfully
👤 Tenant membership retrieved
🎭 Role-based permission check
🎭 Role permission check details
✅ Permission granted by role
✅ Tenant permission check completed
```

### 4. Problèmes courants à vérifier

#### Pas de membership trouvé
```
❌ No tenant membership found in database
```
→ Vérifier que l'utilisateur a bien un TenantMembership pour ce tenant

#### Membership inactif
```
❌ User membership is inactive
```
→ Vérifier que `isActive: true` dans le TenantMembership

#### Permission refusée par rôle
```
🎭 Role permission check details: hasPermission: false
❌ Permission denied - no matching rule found
```
→ Vérifier que le rôle a bien cette permission dans `ROLE_PERMISSIONS`

#### Erreur de base de données
```
❌ Error fetching tenant membership from database
```
→ Vérifier la connexion Firestore et les règles de sécurité

## Script de test

Utilisez le script `debug-permissions.js` pour tester manuellement :

```bash
cd backend/functions
node debug-permissions.js
```

Ce script testera différents scénarios et affichera tous les logs détaillés.

## Désactiver les logs détaillés

Une fois le debugging terminé, vous pouvez réduire le niveau de logging en modifiant les `logger.info` en `logger.debug` dans :
- `backend/functions/src/services/auth/auth.service.ts`
- `backend/functions/src/services/permissions/tenant-permission.service.ts`