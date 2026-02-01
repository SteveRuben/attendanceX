# Audit Logs & Email Test Endpoint - Implémentation Complète

## ✅ Fonctionnalités Ajoutées

### 1. 🔍 Système d'Audit Logs

Un système complet de journalisation des actions pour tracer toutes les opérations importantes dans l'application.

#### Types d'Actions Tracées

**Authentification**
- Login/Logout utilisateur
- Enregistrement
- Réinitialisation mot de passe
- Vérification email

**Gestion Utilisateurs**
- Création/Modification/Suppression
- Changement de rôle
- Suspension/Activation

**Organisations/Tenants**
- Création/Modification/Suppression
- Mise à jour paramètres

**Événements**
- Création/Modification/Suppression
- Publication/Annulation

**Présences**
- Check-in/Check-out
- Modifications

**Permissions**
- Attribution/Révocation
- Gestion des rôles

**Email**
- Envoi/Échec
- Changement de configuration
- Changement de provider

**Sécurité**
- Tentatives d'intrusion
- Dépassement rate limit
- Accès non autorisés

**Système**
- Mises à jour configuration
- Sauvegardes/Restaurations

#### Structure d'un Log d'Audit

```typescript
{
  id: string;
  tenantId: string;
  action: AuditAction;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Acteur (qui a fait l'action)
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  actorIp?: string;
  actorUserAgent?: string;
  
  // Cible (ce qui a été affecté)
  targetType?: string;
  targetId?: string;
  targetName?: string;
  
  // Détails
  description: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  
  // Contexte
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
}
```

#### API Endpoints

**GET /api/v1/audit-logs**
- Récupérer les logs d'audit avec filtres
- Authentification requise (Admin/Owner uniquement)
- Pagination supportée

**Paramètres de requête** :
```
?actorId=user123
&action=user.create
&severity=error
&targetType=user
&targetId=user456
&startDate=2026-01-01
&endDate=2026-01-31
&success=true
&page=1
&limit=50
```

**Réponse** :
```json
{
  "success": true,
  "data": [
    {
      "id": "log123",
      "tenantId": "tenant456",
      "action": "user.create",
      "severity": "info",
      "actorId": "admin789",
      "actorEmail": "admin@example.com",
      "targetType": "user",
      "targetId": "user456",
      "description": "User created successfully",
      "timestamp": "2026-01-31T19:30:00Z",
      "success": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**GET /api/v1/audit-logs/:logId**
- Récupérer un log spécifique
- Authentification requise (Admin/Owner uniquement)

---

### 2. 📧 Endpoint Public de Test d'Email

Un endpoint public pour tester la configuration email sans authentification.

#### Endpoint

**POST /api/v1/public/test-email**

**Aucune authentification requise** - Endpoint public pour tests

#### Requête

```json
{
  "to": "test@example.com",
  "provider": "resend"  // optionnel: "resend", "smtp", "sendgrid"
}
```

#### Réponse Succès

```json
{
  "success": true,
  "message": "Test email sent successfully",
  "data": {
    "to": "test@example.com",
    "provider": "resend",
    "messageId": "msg_abc123",
    "timestamp": "2026-01-31T19:30:00Z",
    "duration": "245ms"
  }
}
```

#### Réponse Erreur

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_SEND_FAILED",
    "message": "Failed to send test email",
    "details": "API key invalid"
  }
}
```

#### Email de Test Envoyé

L'email de test contient :
- ✅ Confirmation que la configuration fonctionne
- 📊 Détails du test (provider, timestamp, IP)
- 📝 Informations sur ce que cela signifie
- 🎯 Prochaines étapes
- ⚠️ Note de sécurité

**Design** : Email HTML moderne avec :
- Header avec gradient bleu/violet
- Badge de succès
- Boîtes d'information
- Footer professionnel
- Version texte brut incluse

---

## 📁 Fichiers Créés

### Types
- `backend/functions/src/types/audit-log.types.ts`
  - Définitions TypeScript pour audit logs
  - Enums pour actions et sévérités
  - Interfaces pour logs et filtres

### Services
- `backend/functions/src/services/audit/audit-log.service.ts`
  - Service de gestion des audit logs
  - Création, récupération, filtrage
  - Nettoyage des logs anciens

### Controllers
- `backend/functions/src/controllers/audit/audit-log.controller.ts`
  - Controller HTTP pour audit logs
  - Gestion des permissions (admin/owner)
  - Pagination et filtres

- `backend/functions/src/controllers/email/email-test.controller.ts`
  - Controller public pour test d'email
  - Validation des entrées
  - Logging des tests

### Routes
- `backend/functions/src/routes/audit/audit-log.routes.ts`
  - Routes protégées pour audit logs
  - Middleware: rate limit + auth + tenant context

- `backend/functions/src/routes/public/email-test.routes.ts`
  - Route publique pour test d'email
  - Middleware: rate limit uniquement

### Configuration
- `backend/functions/src/routes/index.ts` (mis à jour)
  - Ajout des routes audit logs
  - Ajout de la route test email
  - Documentation API mise à jour

---

## 🔐 Sécurité

### Audit Logs
- ✅ Authentification requise
- ✅ Permissions admin/owner uniquement
- ✅ Scope par tenant (isolation multi-tenant)
- ✅ Rate limiting appliqué
- ✅ Logs critiques remontés en console

### Test Email
- ✅ Rate limiting pour éviter l'abus
- ✅ Validation format email
- ✅ Logging de tous les tests (IP, user agent)
- ✅ Audit log créé pour chaque test
- ⚠️ **Note** : Endpoint public - à sécuriser ou désactiver en production si nécessaire

---

## 🧪 Tests

### Test Audit Logs

```bash
# Récupérer les logs (authentifié)
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Récupérer un log spécifique
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs/log123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filtrer par action
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?action=user.create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filtrer par sévérité
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?severity=error" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Email Public

```bash
# Test avec Resend (provider par défaut)
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com"
  }'

# Test avec provider spécifique
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "provider": "smtp"
  }'

# Test avec email invalide (devrait échouer)
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "invalid-email"
  }'
```

---

## 📊 Utilisation

### Créer un Audit Log Manuellement

```typescript
import { auditLogService } from './services/audit/audit-log.service';
import { AuditAction, AuditSeverity } from './types/audit-log.types';

// Dans votre code
await auditLogService.createLog(tenantId, {
  action: AuditAction.USER_CREATE,
  severity: AuditSeverity.INFO,
  actorId: req.user.uid,
  actorEmail: req.user.email,
  actorRole: req.user.role,
  actorIp: req.ip,
  actorUserAgent: req.headers['user-agent'],
  targetType: 'user',
  targetId: newUser.id,
  targetName: newUser.email,
  description: `User ${newUser.email} created successfully`,
  metadata: {
    role: newUser.role,
    department: newUser.department,
  },
  success: true,
  endpoint: req.path,
  method: req.method,
});
```

### Récupérer les Logs avec Filtres

```typescript
import { auditLogService } from './services/audit/audit-log.service';

const result = await auditLogService.getLogs({
  tenantId: 'tenant123',
  actorId: 'user456',
  action: AuditAction.USER_CREATE,
  severity: AuditSeverity.ERROR,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
  success: false,
  page: 1,
  limit: 50,
});

console.log(`Found ${result.total} logs`);
console.log(`Page ${result.page} of ${Math.ceil(result.total / result.limit)}`);
result.logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.action} by ${log.actorEmail}`);
});
```

### Nettoyer les Logs Anciens

```typescript
// Supprimer les logs de plus de 90 jours
const deletedCount = await auditLogService.deleteOldLogs(tenantId, 90);
console.log(`Deleted ${deletedCount} old audit logs`);
```

---

## 🚀 Déploiement

### Prochaines Étapes

1. **Build et Test Local**
   ```bash
   cd backend/functions
   npm run build
   npm run test
   ```

2. **Déployer sur Firebase**
   ```bash
   cd backend
   firebase deploy --only functions
   ```

3. **Tester en Production**
   ```bash
   # Test email
   curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
     -H "Content-Type: application/json" \
     -d '{"to": "your-email@example.com"}'
   
   # Vérifier les audit logs (avec token admin)
   curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

4. **Configurer le Nettoyage Automatique**
   - Créer une fonction scheduled pour nettoyer les logs anciens
   - Exemple : tous les jours à minuit, supprimer logs > 90 jours

---

## 📝 Notes Importantes

### Audit Logs
- Les logs sont scopés par tenant (isolation multi-tenant)
- Seuls les admins et owners peuvent consulter les logs
- Les logs critiques sont également envoyés en console Firebase
- Prévoir un nettoyage régulier pour éviter l'accumulation

### Test Email
- ⚠️ **Endpoint public** - peut être abusé si non protégé
- Rate limiting appliqué pour limiter l'abus
- Tous les tests sont loggés dans les audit logs
- Considérer désactiver en production ou ajouter authentification

### Recommandations Production
1. **Audit Logs**
   - Configurer une rétention de 90 jours
   - Exporter les logs critiques vers un système externe
   - Monitorer les logs d'erreur et critiques
   - Créer des alertes pour actions sensibles

2. **Test Email**
   - Ajouter authentification ou désactiver en production
   - Limiter à certaines IPs si nécessaire
   - Monitorer l'utilisation via audit logs
   - Considérer un endpoint admin séparé

---

## ✅ Checklist de Validation

- [x] Types TypeScript créés
- [x] Service audit logs implémenté
- [x] Controller audit logs créé
- [x] Routes audit logs configurées
- [x] Controller test email créé
- [x] Route test email configurée
- [x] Routes ajoutées dans index.ts
- [x] Documentation API mise à jour
- [ ] Tests unitaires (à ajouter)
- [ ] Tests d'intégration (à ajouter)
- [ ] Build et déploiement
- [ ] Tests en production

---

## 📚 Ressources

- **Types**: `backend/functions/src/types/audit-log.types.ts`
- **Service**: `backend/functions/src/services/audit/audit-log.service.ts`
- **Controllers**: 
  - `backend/functions/src/controllers/audit/audit-log.controller.ts`
  - `backend/functions/src/controllers/email/email-test.controller.ts`
- **Routes**:
  - `backend/functions/src/routes/audit/audit-log.routes.ts`
  - `backend/functions/src/routes/public/email-test.routes.ts`
- **Configuration**: `backend/functions/src/routes/index.ts`

---

*Implémentation complétée le 31 Janvier 2026*
