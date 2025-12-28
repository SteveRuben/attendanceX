# Configuration Email Multi-Tenant

Ce document explique comment configurer et utiliser les paramètres SMTP/Email par tenant avec fallback automatique vers les configurations globales.

## Architecture

### Hiérarchie de Configuration
1. **Configuration Tenant** (priorité haute) - Spécifique à chaque organisation
2. **Configuration Globale** (priorité moyenne) - Partagée entre tous les tenants
3. **Configuration Statique** (priorité basse) - Définie dans le code

### Structure Firestore

```
tenants/{tenantId}/emailProviders/{providerId}
  type: "sendgrid" | "mailgun" | "aws_ses" | "smtp"
  isActive: true
  priority: 1
  config: {
    apiKey: "tenant_specific_key",
    fromEmail: "noreply@tenant-domain.com",
    fromName: "Tenant Organization"
  }

emailProviders/{providerId}  // Configuration globale
  type: "sendgrid"
  isActive: true
  priority: 1
  config: { ... }
```

## Utilisation

### 1. Envoi d'Email avec Tenant

```typescript
import { EmailService } from '../services/notification/EmailService';

const emailService = new EmailService();

// Méthode 1: Utiliser sendEmailWithTenant
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

### 2. Envoi d'Invitation avec Tenant

```typescript
// Dans le service d'invitation
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
```

### 3. Configuration dans les Controllers

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

## Configuration des Providers par Tenant

### 1. SendGrid Tenant-Specific

```javascript
// Ajouter dans Firestore: tenants/{tenantId}/emailProviders/
{
  type: "sendgrid",
  isActive: true,
  priority: 1,
  config: {
    apiKey: "SG.tenant_specific_key...",
    fromEmail: "noreply@tenant-domain.com",
    fromName: "Tenant Organization",
    replyTo: "support@tenant-domain.com"
  }
}
```

### 2. SMTP Tenant-Specific

```javascript
{
  type: "smtp",
  isActive: true,
  priority: 2,
  config: {
    host: "smtp.tenant-domain.com",
    port: 587,
    secure: false,
    auth: {
      user: "noreply@tenant-domain.com",
      pass: "tenant_password"
    },
    fromEmail: "noreply@tenant-domain.com",
    fromName: "Tenant Organization"
  }
}
```

### 3. AWS SES Tenant-Specific

```javascript
{
  type: "aws_ses",
  isActive: true,
  priority: 1,
  config: {
    accessKeyId: "tenant_access_key",
    secretAccessKey: "tenant_secret_key",
    region: "us-east-1",
    fromEmail: "noreply@tenant-domain.com",
    fromName: "Tenant Organization"
  }
}
```

## Fallback Automatique

### Comportement par Défaut

1. **Tenant Config Trouvée** → Utilise la config tenant
2. **Tenant Config Absente** → Utilise la config globale
3. **Config Globale Absente** → Utilise la config statique
4. **Aucune Config** → Erreur

### Logs de Fallback

```
INFO: Email provider config loaded from tenant: sendgrid (tenantId: tenant-123)
INFO: Email provider config loaded from global: sendgrid (tenantId: tenant-456)
INFO: Email provider config loaded from static: sendgrid (tenantId: tenant-789)
```

## Interface d'Administration

### API Endpoints pour la Configuration

```typescript
// Récupérer les providers d'un tenant
GET /api/admin/tenants/{tenantId}/email-providers

// Configurer un provider pour un tenant
POST /api/admin/tenants/{tenantId}/email-providers
{
  type: "sendgrid",
  config: { ... }
}

// Tester la configuration
POST /api/admin/tenants/{tenantId}/email-providers/test
{
  type: "sendgrid",
  testEmail: "admin@tenant.com"
}

// Supprimer la config tenant (retour au global)
DELETE /api/admin/tenants/{tenantId}/email-providers/{providerId}
```

### Interface Frontend

```typescript
// Hook pour gérer les providers email
const useEmailProviders = (tenantId: string) => {
  const [providers, setProviders] = useState([]);
  
  const testProvider = async (type: string) => {
    const result = await emailService.testAllProviders(tenantId);
    return result[type];
  };
  
  const saveProvider = async (config: EmailProviderConfig) => {
    await api.post(`/admin/tenants/${tenantId}/email-providers`, config);
    // Recharger les providers
    EmailProviderFactory.reloadTenantProviders(tenantId);
  };
  
  return { providers, testProvider, saveProvider };
};
```

## Avantages

### ✅ **Isolation Complète**
- Chaque tenant peut avoir ses propres paramètres SMTP
- Pas de risque de mélange entre les configurations

### ✅ **Fallback Intelligent**
- Pas de configuration tenant = utilise les paramètres globaux
- Transition en douceur pour les tenants existants

### ✅ **Performance Optimisée**
- Cache par tenant pour éviter les requêtes répétées
- Invalidation granulaire du cache

### ✅ **Flexibilité Maximale**
- Support de tous les providers (SendGrid, Mailgun, AWS SES, SMTP)
- Configuration par tenant ou globale selon les besoins

### ✅ **Rétrocompatibilité**
- Les appels existants continuent de fonctionner
- Migration progressive possible

## Exemples d'Utilisation

### Cas d'Usage 1: Organisation avec Domaine Propre

```typescript
// Tenant "acme-corp" avec domaine propre
await emailService.sendInvitationEmail(
  'newuser@example.com',
  {
    organizationName: 'ACME Corporation',
    inviterName: 'John Doe',
    role: 'manager',
    invitationUrl: 'https://acme.attendancex.com/accept/xyz',
    expiresIn: '7 jours'
  },
  'acme-corp'
);
// → Envoyé depuis noreply@acme-corp.com via leur SMTP
```

### Cas d'Usage 2: Tenant sans Configuration

```typescript
// Tenant "startup-xyz" sans config spécifique
await emailService.sendInvitationEmail(
  'newuser@example.com',
  { /* ... */ },
  'startup-xyz'
);
// → Envoyé via la configuration globale (SendGrid partagé)
```

### Cas d'Usage 3: Test de Configuration

```typescript
// Tester tous les providers pour un tenant
const results = await emailService.testAllProviders('tenant-123');
console.log(results);
// → { sendgrid: true, mailgun: false, aws_ses: true }
```

Cette architecture permet une gestion flexible et évolutive des configurations email tout en maintenant la simplicité d'utilisation.