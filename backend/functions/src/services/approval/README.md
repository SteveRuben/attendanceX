# Service de Notifications d'Approbation

Ce service gère l'envoi de notifications par email pour les workflows d'approbation des feuilles de temps.

## Fonctionnalités

### ✅ Intégration Email Réelle
- **Service d'email intégré** : Utilise le `EmailService` existant pour l'envoi réel d'emails
- **Support multi-providers** : SendGrid, Mailgun, AWS SES avec failover automatique
- **Templates personnalisables** : Templates HTML et texte avec variables dynamiques
- **Tracking et audit** : Suivi des envois avec logs détaillés

### 📧 Types de Notifications
- **Soumission** : Confirmation à l'employé + notification à l'approbateur
- **Demande d'approbation** : Notification aux approbateurs
- **Approbation** : Confirmation à l'employé + notification au prochain niveau
- **Rejet** : Notification à l'employé avec raison et commentaires
- **Escalation** : Notification en cas de dépassement de délai
- **Délégation** : Notification lors de délégation d'approbation
- **Rappels** : Rappels automatiques pour les approbations en attente

### 🎯 Priorités Email
- **Critique (1)** : Escalations
- **Élevée (2)** : Demandes d'approbation, rejets, délégations
- **Normal (3)** : Soumissions, approbations
- **Faible (4)** : Rappels

## Utilisation

### Envoi de Notification de Soumission

```typescript
import { approvalNotificationsService } from '../services/approval';

// Contexte de notification
const context = {
  workflow: approvalWorkflow,
  employee: {
    userId: 'emp123',
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    role: 'employee'
  },
  approver: {
    userId: 'mgr456',
    name: 'Marie Martin',
    email: 'marie.martin@example.com',
    role: 'approver'
  }
};

// Envoyer les notifications
await approvalNotificationsService.notifySubmission('tenant123', context);
```

### Notification de Rejet

```typescript
await approvalNotificationsService.notifyRejection(
  'tenant123',
  context,
  'Heures manquantes',
  'Veuillez ajouter les heures du vendredi après-midi'
);
```

### Notification d'Escalation

```typescript
const escalatedTo = {
  userId: 'dir789',
  name: 'Pierre Directeur',
  email: 'pierre.directeur@example.com',
  role: 'manager'
};

await approvalNotificationsService.notifyEscalation(
  'tenant123',
  context,
  escalatedTo,
  'Délai d\'approbation dépassé'
);
```

## Templates par Défaut

Le service inclut des templates par défaut pour tous les types de notifications :

### Variables Disponibles
- `{{recipient.name}}` - Nom du destinataire
- `{{employee.name}}` - Nom de l'employé
- `{{approver.name}}` - Nom de l'approbateur
- `{{workflow.status}}` - Statut du workflow
- `{{timesheet.totalHours}}` - Total des heures
- `{{period.start}}` - Date de début de période
- `{{period.end}}` - Date de fin de période
- `{{rejectionReason}}` - Raison du rejet (pour les rejets)
- `{{daysPending}}` - Jours en attente (pour les rappels)

### Exemple de Template

```html
<h1>Demande d'approbation - {{employee.name}}</h1>
<p>Bonjour {{recipient.name}},</p>
<p>Une feuille de temps nécessite votre approbation.</p>
<ul>
  <li><strong>Employé:</strong> {{employee.name}}</li>
  <li><strong>Période:</strong> {{period.start}} au {{period.end}}</li>
  <li><strong>Total des heures:</strong> {{timesheet.totalHours}}h</li>
</ul>
<p>Veuillez vous connecter pour traiter cette demande.</p>
```

## Configuration

### Templates Personnalisés

Vous pouvez créer des templates personnalisés :

```typescript
const customTemplate = {
  type: 'approval_request',
  name: 'Demande d\'approbation personnalisée',
  subject: 'Nouvelle demande - {{employee.name}}',
  bodyHtml: '<h1>Votre template HTML personnalisé</h1>',
  bodyText: 'Votre template texte personnalisé',
  isActive: true,
  language: 'fr'
};

await approvalNotificationsService.createNotificationTemplate(
  'tenant123',
  customTemplate,
  'admin123'
);
```

### Statistiques

```typescript
const stats = await approvalNotificationsService.getNotificationStatistics(
  'tenant123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

console.log(`Emails envoyés: ${stats.totalSent}`);
console.log(`Taux de livraison: ${stats.deliveryRate}%`);
console.log(`Répartition par type:`, stats.byType);
```

## Intégration avec EmailService

Le service utilise le `EmailService` existant qui offre :

- **Multi-providers** : Failover automatique entre SendGrid, Mailgun, AWS SES
- **Gestion des erreurs** : Retry automatique et gestion des échecs
- **Tracking** : Suivi des envois et des ouvertures
- **Templates** : Support des templates HTML/texte
- **Pièces jointes** : Support des attachments (si nécessaire)
- **Catégorisation** : Classification des emails pour l'analyse

## Logs et Audit

Tous les envois sont automatiquement loggés avec :
- ID du workflow
- Type de notification
- Destinataires
- Statut d'envoi
- Horodatage
- ID de message du provider

Ces logs permettent le suivi et l'analyse des notifications d'approbation.