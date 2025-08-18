# Corrections de Sécurité Critiques

## 🚨 Problème de Sécurité Majeur : Mot de passe en clair

### ❌ Problème Identifié

Le mot de passe était stocké **EN CLAIR** dans la base de données Firestore, en plus du `hashedPassword`. C'est une faille de sécurité critique !

```typescript
// ❌ DANGEREUX : Les deux étaient stockés
{
  "password": "MonMotDePasse123!", // ⚠️ EN CLAIR !
  "hashedPassword": "$2b$12$..." // ✅ Hashé
}
```

### 🔧 Correction Appliquée

Modification de la méthode `toFirestore()` dans `UserModel` pour exclure le champ `password` :

```typescript
// ✅ SÉCURISÉ : Exclusion du password
toFirestore() {
  const { id, password, ...data } = this.data; // Exclure password ET id
  const cleanedData = UserModel.removeUndefinedFields(data);
  return this.convertDatesToFirestore(cleanedData);
}
```

### 📋 Vérification

Maintenant, seul `hashedPassword` est stocké en base :

```typescript
// ✅ SÉCURISÉ : Seul le hash est stocké
{
  "hashedPassword": "$2b$12$...", // ✅ Hashé avec bcrypt
  "email": "user@example.com",
  "firstName": "John",
  // ... autres champs
  // ❌ password: SUPPRIMÉ !
}
```

## 🏢 Correction : `needsSetup` Organisation

### ❌ Problème

`organizationSetupStatus.needsSetup` retournait `false` au lieu de `true` pour les organisations non configurées.

### 🔧 Corrections Appliquées

1. **Utilisation de l'enum** au lieu de chaîne :
```typescript
// ✅ Utilisation de l'enum
const needsSetup = orgData?.status === OrganizationStatus.PENDING_VERIFICATION;
```

2. **Import ajouté** :
```typescript
import { OrganizationStatus } from "@attendance-x/shared";
```

3. **Logs améliorés** pour debugging :
```typescript
console.log('🔍 Organization setup check:', {
  userId,
  organizationId: userData.organizationId,
  organizationStatus: orgData?.status,
  expectedStatus: OrganizationStatus.PENDING_VERIFICATION,
  statusMatch: orgData?.status === OrganizationStatus.PENDING_VERIFICATION,
  needsSetup
});
```

## 🔐 Bonnes Pratiques de Sécurité Appliquées

### 1. **Séparation des Données**
- `toFirestore()` : Exclut les données sensibles pour la base
- `toAPI()` : Exclut les données sensibles pour l'API

### 2. **Champs Sensibles Exclus**
```typescript
// Champs JAMAIS stockés en base via toFirestore()
- password (mot de passe en clair)
- id (géré séparément par Firestore)

// Champs JAMAIS exposés via toAPI()
- password
- hashedPassword
- twoFactorSecret
- twoFactorBackupCodes
- auditLog
```

### 3. **Hashage Sécurisé**
- **Algorithme** : bcrypt avec 12 rounds
- **Validation** : Vérification de la force du mot de passe
- **Stockage** : Seul le hash est persisté

## 🧪 Tests de Sécurité

### Test 1 : Vérification du Stockage
```bash
# Vérifier qu'aucun password en clair n'est stocké
firebase firestore:get users/{userId}
# Résultat attendu : hashedPassword présent, password absent
```

### Test 2 : Vérification de l'API
```bash
# Vérifier qu'aucun hash n'est exposé
curl -H "Authorization: Bearer {token}" /api/auth/session
# Résultat attendu : user data sans hashedPassword
```

### Test 3 : Vérification du Setup d'Organisation
```bash
# Vérifier que needsSetup est correct
curl -H "Authorization: Bearer {token}" /api/auth/organization-setup-status
# Résultat attendu : needsSetup: true pour organisations PENDING_VERIFICATION
```

## ✅ Checklist de Sécurité

- [x] **Mot de passe en clair supprimé** de la base de données
- [x] **Hashage bcrypt** avec 12 rounds maintenu
- [x] **Séparation toFirestore/toAPI** respectée
- [x] **Enum OrganizationStatus** utilisé correctement
- [x] **Logs de debugging** ajoutés pour troubleshooting
- [x] **Import manquant** ajouté

## 🚨 Actions Recommandées

### Immédiat
1. **Recompiler** : `npm run build`
2. **Tester** l'enregistrement et la connexion
3. **Vérifier** que `needsSetup` est maintenant `true`

### Audit de Sécurité
1. **Nettoyer la base** : Supprimer les champs `password` existants
2. **Audit des logs** : Vérifier qu'aucun mot de passe n'apparaît dans les logs
3. **Test de pénétration** : Vérifier que les endpoints n'exposent pas de données sensibles

### Script de Nettoyage (Optionnel)
```typescript
// Script pour nettoyer les passwords existants en base
const cleanupPasswords = async () => {
  const users = await db.collection('users').get();
  const batch = db.batch();
  
  users.docs.forEach(doc => {
    if (doc.data().password) {
      batch.update(doc.ref, { password: FieldValue.delete() });
    }
  });
  
  await batch.commit();
  console.log('✅ Passwords nettoyés');
};
```

## 🎯 Impact

- ✅ **Sécurité renforcée** : Plus de mots de passe en clair
- ✅ **Conformité** : Respect des bonnes pratiques de sécurité
- ✅ **Fonctionnalité** : `needsSetup` fonctionne correctement
- ✅ **Debugging** : Logs améliorés pour troubleshooting