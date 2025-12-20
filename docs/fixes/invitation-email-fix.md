# Correction de l'envoi d'email dans resendInvitation

## Problème identifié

La fonction `resendInvitation` n'envoyait pas d'email car le `TenantController` utilisait le mauvais service d'invitation.

## Analyse du problème

Il y avait **deux services d'invitation différents** :

1. **`backend/functions/src/services/user/user-invitation.service.ts`** ✅
   - Implémentation complète avec envoi d'email
   - Méthode `sendInvitationEmail()` implémentée
   - Service complet et fonctionnel

2. **`backend/functions/src/services/invitation/user-invitation.service.ts`** ❌
   - Implémentation incomplète **SANS** envoi d'email
   - Met seulement à jour la base de données
   - Service incomplet

## Problème de routage

- **`UserInvitationController`** : Utilisait le bon service (avec email) ✅
- **`TenantController`** : Utilisait le mauvais service (sans email) ❌

## Solution implémentée

### 1. Correction des imports dans TenantController

**Avant** :
```typescript
const { userInvitationService } = await import("../../services/invitation/user-invitation.service");
```

**Après** :
```typescript
const { default: userInvitationService } = await import("../../services/user/user-invitation.service");
```

### 2. Ajout de méthodes manquantes

Ajout de méthodes publiques dans le service complet :

```typescript
// Méthode pour marquer les invitations expirées
async markExpiredInvitations(tenantId: string): Promise<void>

// Méthode publique pour récupérer une invitation par ID
async getInvitationById(invitationId: string): Promise<InvitationStatus | null>
```

### 3. Correction des appels de méthodes

- `getInvitation()` → `getInvitationById()` (méthode publique)
- `getInvitations()` → `getTenantInvitations()` (nom correct)
- `deleteInvitation()` → `cancelInvitation()` (méthode avec logging)

### 4. Correction de la structure de retour

Adaptation de la structure de pagination :
```typescript
// Avant
result.pagination.total

// Après  
result.total
```

## Méthodes corrigées

1. **`TenantController.resendInvitation`** : Maintenant envoie l'email ✅
2. **`TenantController.deleteInvitation`** : Utilise le bon service ✅
3. **`TenantController.getUserInvitations`** : Utilise le bon service ✅

## Flux d'envoi d'email

```
TenantController.resendInvitation()
  ↓
UserInvitationService.resendInvitation()
  ↓
UserInvitationService.sendInvitationEmail()
  ↓
EmailService.sendInvitationEmail()
  ↓
📧 Email envoyé
```

## Tests recommandés

1. **Renvoyer une invitation** via l'interface tenant
2. **Vérifier la réception de l'email** d'invitation
3. **Tester l'acceptation** de l'invitation renvoyée
4. **Vérifier les logs** pour confirmer l'envoi

## Résultat

✅ La fonction `resendInvitation` envoie maintenant correctement l'email d'invitation
✅ Tous les services utilisent la même implémentation complète
✅ Cohérence entre les différents contrôleurs