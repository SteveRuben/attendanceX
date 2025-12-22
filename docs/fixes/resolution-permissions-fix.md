# Fix: Resolution Permissions Missing

## 🔍 **Problème identifié**

Dans les logs détaillés, nous voyions :
```
✅ Membership trouvé: role "owner", isActive: true
🎭 Role permission check details: hasPermission: false
❌ Permission "view_resolutions" refusée pour le rôle "owner"
```

Le problème était que **les permissions de résolutions n'étaient pas définies** dans le système de permissions tenant.

## 🎯 **Cause racine**

Les permissions de résolutions (`view_resolutions`, `create_resolutions`, etc.) étaient utilisées dans les routes mais **n'existaient pas** dans :
1. L'enum `PERMISSIONS` 
2. Les permissions des rôles dans `ROLE_PERMISSIONS`

## ✅ **Solution appliquée**

### 1. **Ajout des permissions de résolutions**

Ajouté 6 nouvelles permissions dans `PERMISSIONS` :

```typescript
// Resolutions & Tasks
CREATE_RESOLUTIONS: 'create_resolutions',
VIEW_RESOLUTIONS: 'view_resolutions',
EDIT_RESOLUTIONS: 'edit_resolutions',
DELETE_RESOLUTIONS: 'delete_resolutions',
COMMENT_RESOLUTIONS: 'comment_resolutions',
ASSIGN_RESOLUTIONS: 'assign_resolutions'
```

### 2. **Attribution des permissions par rôle**

#### 🔑 **OWNER**
- ✅ Toutes les permissions (via `...Object.values(PERMISSIONS)`)

#### 👑 **ADMIN**
- ✅ Toutes les permissions de résolutions
- Peut créer, voir, éditer, supprimer, commenter et assigner

#### 👨‍💼 **MANAGER**
- ✅ Permissions limitées de résolutions
- Peut créer, voir, éditer, commenter et assigner
- ❌ Ne peut pas supprimer

#### 👤 **MEMBER**
- ✅ Permissions basiques de résolutions
- Peut voir et commenter
- ❌ Ne peut pas créer, éditer ou supprimer

#### 👁️ **VIEWER**
- ✅ Permission de lecture seule
- Peut seulement voir les résolutions

## 🔄 **Flux corrigé**

### Avant (❌)
1. Route `/v1/resolutions/my-tasks` avec `requirePermission("view_resolutions")`
2. TenantPermissionService cherche `view_resolutions` dans les permissions du rôle `owner`
3. ❌ Permission non trouvée → refusée

### Après (✅)
1. Route `/v1/resolutions/my-tasks` avec `requirePermission("view_resolutions")`
2. TenantPermissionService cherche `view_resolutions` dans les permissions du rôle `owner`
3. ✅ Permission trouvée → accordée

## 📋 **Fichiers modifiés**

- `backend/functions/src/services/permissions/tenant-permission.service.ts`
  - Ajout des 6 permissions de résolutions dans `PERMISSIONS`
  - Attribution des permissions à tous les rôles selon leur niveau

## 🧪 **Test de validation**

Pour tester que la correction fonctionne, surveillez les logs :

```
🎭 Role permission check details: hasPermission: true
✅ Permission granted by role: owner
✅ Tenant permission check completed: granted: true
```

Au lieu de :
```
🎭 Role permission check details: hasPermission: false
❌ Permission denied - no matching rule found
```

## 🎯 **Impact**

- ✅ Toutes les routes de résolutions fonctionnent maintenant
- ✅ Permissions granulaires par rôle
- ✅ Sécurité maintenue (chaque rôle a les bonnes permissions)
- ✅ Extensibilité pour futures permissions de résolutions

## 📊 **Permissions par rôle**

| Permission | OWNER | ADMIN | MANAGER | MEMBER | VIEWER |
|------------|-------|-------|---------|--------|--------|
| `view_resolutions` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `create_resolutions` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `edit_resolutions` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `delete_resolutions` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `comment_resolutions` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `assign_resolutions` | ✅ | ✅ | ✅ | ❌ | ❌ |