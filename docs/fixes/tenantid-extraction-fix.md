# Fix: TenantId Extraction in Permission Middleware

## 🔍 **Problème identifié**

Dans les logs, nous voyions :
```
📝 No tenantId provided, using basic permission check
❌ Permission denied
```

Le problème était que le middleware `requirePermission` n'extrayait pas le `tenantId` depuis toutes les sources disponibles.

## 🎯 **Cause racine**

Le middleware `requirePermission` extrayait le tenantId uniquement depuis :
- `req.params.tenantId` (paramètres d'URL)
- `req.body.tenantId` (corps de la requête)

Mais **PAS** depuis :
- `req.query.tenantId` (query parameters comme `?tenantId=xxx`)
- `req.headers['x-tenant-id']` (headers personnalisés)
- `req.tenantContext.tenant.id` (contexte injecté par tenantContextMiddleware)

## ✅ **Solution appliquée**

### 1. **Amélioration de l'extraction du tenantId**

Mis à jour les middlewares `requirePermission` et `requireTenantPermission` pour extraire le tenantId depuis **5 sources** (par ordre de priorité) :

```typescript
const tenantId = req.params.tenantId 
  || req.query.tenantId as string           // ✅ NOUVEAU
  || req.body.tenantId
  || req.headers['x-tenant-id'] as string   // ✅ NOUVEAU
  || (authReq.tenantContext?.tenant?.id);   // ✅ NOUVEAU
```

### 2. **Logs de debugging ajoutés**

Ajouté des logs détaillés pour voir d'où vient le tenantId :

```typescript
logger.info('🔍 TenantId extraction in requirePermission', {
  userId: authReq.user.uid,
  endpoint: req.path,
  tenantIdSources: {
    fromParams: req.params.tenantId,
    fromQuery: req.query.tenantId,           // ✅ NOUVEAU
    fromBody: req.body.tenantId,
    fromHeader: req.headers['x-tenant-id'],  // ✅ NOUVEAU
    fromTenantContext: authReq.tenantContext?.tenant?.id, // ✅ NOUVEAU
    finalTenantId: tenantId
  }
});
```

## 🔄 **Flux corrigé**

### Avant (❌)
1. Route `/v1/resolutions/my-tasks?tenantId=xxx`
2. `tenantContextMiddleware` extrait le tenantId depuis query params
3. `requirePermission` ne trouve pas le tenantId (ne regarde que params/body)
4. `hasPermission` appelé sans tenantId → utilise basic permission check
5. ❌ Permission refusée

### Après (✅)
1. Route `/v1/resolutions/my-tasks?tenantId=xxx`
2. `tenantContextMiddleware` extrait le tenantId et injecte le contexte
3. `requirePermission` trouve le tenantId depuis `req.tenantContext.tenant.id`
4. `hasPermission` appelé avec tenantId → utilise tenant permission service
5. ✅ Permission accordée selon le rôle tenant

## 📋 **Fichiers modifiés**

- `backend/functions/src/middleware/auth.ts`
  - Fonction `requirePermission`
  - Fonction `requireTenantPermission`

## 🧪 **Test de validation**

Pour tester que la correction fonctionne, surveillez les logs :

```
🔍 TenantId extraction in requirePermission
🏢 Using tenant permission service
🔍 TenantPermissionService.checkPermission called
👤 Tenant membership retrieved
✅ Permission granted by role
```

Au lieu de :
```
📝 No tenantId provided, using basic permission check
❌ Permission denied
```

## 🎯 **Impact**

- ✅ Les routes avec query parameters `?tenantId=xxx` fonctionnent maintenant
- ✅ Les routes avec headers `x-tenant-id` fonctionnent
- ✅ Les routes utilisant `tenantContextMiddleware` fonctionnent
- ✅ Compatibilité maintenue avec les routes existantes (params/body)
- ✅ Logs détaillés pour debugging futur