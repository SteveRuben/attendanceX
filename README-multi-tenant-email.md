# Configuration Email Multi-Tenant - AttendanceX

## 🎯 Objectif

Cette fonctionnalité permet à chaque tenant (organisation) d'avoir ses propres paramètres SMTP/Email avec un fallback automatique vers les configurations globales en cas d'absence de configuration spécifique.

## 🏗️ Architecture

### Hiérarchie de Configuration (par ordre de priorité)

1. **Configuration Tenant** (priorité haute) - Spécifique à chaque organisation
2. **Configuration Globale** (priorité moyenne) - Partagée entre tous les tenants  
3. **Configuration Statique** (priorité basse) - Définie dans le code

### Avantages

✅ **Isolation complète** - Chaque tenant peut avoir ses propres paramètres SMTP  
✅ **Fallback intelligent** - Utilise automatiquement les paramètres globaux si pas de config tenant  
✅ **Rétrocompatibilité** - Les appels existants continuent de fonctionner  
✅ **Performance optimisée** - Cache par tenant pour éviter les requêtes répétées  
✅ **Flexibilité maximale** - Support de tous les providers (SendGrid, Mailgun, AWS SES, SMTP)  

## 🚀 Installation et Configuration

### 1. Mise à Jour du Code

Les modifications ont été apportées aux fichiers suivants :
- `backend/functions/src/services/external/email-providers/EmailProviderFactory.ts`
- `backend/functions/src/services/notification/EmailService.ts`
- `backend/functions/src/services/user/user-invitation.service.ts`

### 2. Structure Firestore

```
tenants/{tenantId}/emailProviders/{providerId}
  type: "sendgrid" | "mailgun" | "aws_ses" | "smtp"
  isActive: true
  priority: 1
  name: "SendGrid Config for ACME Corp"
  config: {
    apiKey: "tenant_specific_key",
    fromEmail: "noreply@tenant-domain.com",
    fromName: "Tenant Organization"
  }
  createdAt: timestamp
  updatedAt: timestamp

emailProviders/{providerId}  // Configuration globale (existante)
  type: "sendgrid"
  isActive: true
  priority: 1
  config: { ... }
```

### 3. Migration des Configurations Existantes

```bash
# Lister toutes les configurations actuelles
node scripts/migrate-email-config-to-tenant.js --list

# Menu interactif pour la migration
node scripts/migrate-email-config-to-tenant.js

# Exemples de migration
node scripts/migrate-email-config-to-tenant.js --examples
```

## 📧 Utilisation

### 1. Envoi d'Email avec Tenant

```typescript
import { EmailService } from '../services/notification/EmailService';

const emailService = new EmailService();

// Méthode 1: Utiliser sendEmailWithTenant (recommandée)
await emailService.sendEmailWithTenant(
  'tenant-123',
  'user@example.com',
  'Welcome!',
  { html: '<h1>Welcome to our platform</h1>' }
);

// Méthode 2: Passer tenantId dans les options
await emailService.sendEmail(
  'user@example.com',
  'Welcome!',
  { html: '<h1>Welcome to our platform</h1>' },
  { tenantId: 'tenant-123' }
);

// Méthode 3: Templates avec tenant
await emailService.sendFromTemplate(
  'user@example.com',
  'user_invitation',
  { organizationName: 'ACME Corp' },
  { tenantId: 'tenant-123' }
);
```

### 2. Dans les Controllers

```typescript
export const sendInvitationController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    const tenantId = req.user.tenantId; // Extrait du token JWT
    
    // Le service utilisera automatiquement la config du tenant
    await userInvitationService.sendInvitation({
      tenantId,
      email,
      role,
      invitedBy: req.user.uid
    });

    res.json({
      success: true,
      message: 'Invitation envoyée avec succès'
    });
  } catch (error) {
    handleError(error, res);
  }
};
```

### 3. Méthodes Spécialisées

```typescript
// Invitation avec tenant
await emailService.sendInvitationEmail(
  'newuser@example.com',
  {
    organizationName: 'ACME Corp',
    inviterName: 'John Doe',
    role: 'admin',
    invitationUrl: 'https://app.example.com/accept/abc123',
    expiresIn: '7 jours'
  },
  'tenant-123' // ID du tenant
);

// Vérification avec tenant
await emailService.sendVerificationEmail(
  'user@example.com',
  {
    organizationName: 'ACME Corp',
    adminName: 'John Doe',
    verificationUrl: 'https://app.example.com/verify/xyz',
    expiresIn: '24 heures'
  },
  'tenant-123'
);
```

## ⚙️ Configuration des Providers par Tenant

### 1. SendGrid Tenant-Specific

```javascript
// Ajouter dans Firestore: tenants/{tenantId}/emailProviders/
{
  type: "sendgrid",
  isActive: true,
  priority: 1,
  name: "SendGrid Config for ACME Corp",
  config: {
    apiKey: "SG.tenant_specific_key...",
    fromEmail: "noreply@acme-corp.com",
    fromName: "ACME Corporation",
    replyTo: "support@acme-corp.com"
  }
}
```

### 2. SMTP Tenant-Specific

```javascript
{
  type: "smtp",
  isActive: true,
  priority: 2,
  name: "SMTP Config for ACME Corp",
  config: {
    host: "smtp.acme-corp.com",
    port: 587,
    secure: false,
    auth: {
      user: "noreply@acme-corp.com",
      pass: "tenant_password"
    },
    fromEmail: "noreply@acme-corp.com",
    fromName: "ACME Corporation"
  }
}
```

### 3. AWS SES Tenant-Specific

```javascript
{
  type: "aws_ses",
  isActive: true,
  priority: 1,
  name: "AWS SES Config for ACME Corp",
  config: {
    accessKeyId: "tenant_access_key",
    secretAccessKey: "tenant_secret_key",
    region: "us-east-1",
    fromEmail: "noreply@acme-corp.com",
    fromName: "ACME Corporation"
  }
}
```

## 🔧 Scripts Utilitaires

### 1. Test de la Configuration

```bash
# Tester la nouvelle fonctionnalité
node test-multi-tenant-email.js
```

### 2. Migration Interactive

```bash
# Menu interactif pour configurer les tenants
node scripts/migrate-email-config-to-tenant.js
```

### 3. Gestion via Code

```javascript
const { EmailProviderFactory } = require('./backend/functions/src/services/external/email-providers/EmailProviderFactory');

// Tester tous les providers pour un tenant
const results = await EmailProviderFactory.testAllProviders('tenant-123');
console.log(results); // { sendgrid: true, smtp: false }

// Recharger le cache d'un tenant
EmailProviderFactory.reloadTenantProviders('tenant-123');

// Obtenir tous les providers d'un tenant
const providers = await EmailProviderFactory.getAllProviders('tenant-123');
```

## 📊 Comportement de Fallback

### Logs de Fallback

```
INFO: Email provider config loaded from tenant: sendgrid (tenantId: tenant-123)
INFO: Email provider config loaded from global: sendgrid (tenantId: tenant-456)  
INFO: Email provider config loaded from static: sendgrid (tenantId: tenant-789)
```

### Exemples de Comportement

1. **Tenant avec config spécifique** → Utilise la config tenant
2. **Tenant sans config** → Utilise la config globale
3. **Aucune config globale** → Utilise la config statique
4. **Aucune config** → Erreur

## 🧪 Tests

### 1. Test Unitaire

```typescript
describe('Multi-Tenant Email Configuration', () => {
  it('should use tenant config when available', async () => {
    const provider = await EmailProviderFactory.getProviderForTenant('sendgrid', 'tenant-123');
    expect(provider.config.fromEmail).toBe('noreply@tenant-domain.com');
  });

  it('should fallback to global config when tenant config not found', async () => {
    const provider = await EmailProviderFactory.getProviderForTenant('sendgrid', 'tenant-without-config');
    expect(provider.config.fromEmail).toBe('noreply@global-domain.com');
  });
});
```

### 2. Test d'Intégration

```bash
# Tester l'envoi d'email avec différents tenants
npm run test:backend:integration -- --grep "multi-tenant email"
```

## 🚨 Résolution de Problèmes

### Problèmes Courants

1. **Email non envoyé**
   - Vérifier les logs pour voir quelle config est utilisée
   - Tester la config avec `EmailProviderFactory.testAllProviders(tenantId)`

2. **Fallback non fonctionnel**
   - Vérifier que la config globale existe
   - Vérifier les permissions Firestore

3. **Cache non mis à jour**
   - Utiliser `EmailProviderFactory.reloadTenantProviders(tenantId)`
   - Redémarrer les émulateurs en développement

### Debug

```typescript
// Activer les logs détaillés
process.env.DEBUG = 'email:*';

// Vérifier quelle config est chargée
const config = await EmailProviderFactory.getProviderConfig('sendgrid', 'tenant-123');
console.log('Config utilisée:', config);
```

## 📚 Documentation Complète

- [Configuration Multi-Tenant Détaillée](./docs/features/multi-tenant-email-config.md)
- [Guide de Migration](./scripts/migrate-email-config-to-tenant.js)
- [Tests de Fonctionnalité](./test-multi-tenant-email.js)

## 🔄 Migration depuis l'Ancien Système

### Étapes de Migration

1. **Sauvegarder** les configurations existantes
2. **Tester** la nouvelle fonctionnalité en développement
3. **Migrer** progressivement les tenants
4. **Valider** que les emails sont envoyés correctement
5. **Nettoyer** les anciennes configurations si nécessaire

### Rétrocompatibilité

- ✅ Les appels existants continuent de fonctionner
- ✅ Pas de changement breaking dans l'API
- ✅ Migration progressive possible
- ✅ Rollback facile si nécessaire

## 🎉 Conclusion

Cette implémentation offre une solution flexible et évolutive pour la gestion des configurations email multi-tenant tout en maintenant la simplicité d'utilisation et la rétrocompatibilité avec le système existant.

Pour toute question ou problème, consultez la documentation détaillée ou créez une issue dans le repository.