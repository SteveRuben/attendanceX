# Intégration Campagnes-Événements avec QR/PIN Codes

## Vue d'Ensemble

Ce document décrit l'implémentation du système d'intégration entre les campagnes de notification et les événements, permettant la génération automatique de codes d'accès personnalisés (QR codes et PIN codes) pour chaque participant.

## Objectifs

- **Association optionnelle** : Lier une campagne à un événement spécifique
- **Codes personnalisés** : Générer des QR codes (email) et PIN codes (SMS) uniques par participant
- **Intégration bidirectionnelle** : Créer des campagnes depuis les événements et vice versa
- **Validation automatique** : Respecter les paramètres de validation de l'événement

## Architecture Technique

### Composants Backend

```
backend/functions/src/
├── services/
│   ├── campaign/
│   │   └── event-campaign.service.ts     # Service principal d'intégration
│   └── pin/
│       └── pin-code.service.ts           # Gestion des codes PIN
├── controllers/
│   └── campaign/
│       └── event-campaign.controller.ts  # Endpoints API
├── routes/
│   └── campaign/
│       └── event-campaign.routes.ts      # Routes d'intégration
└── common/
    ├── types/
    │   └── campaign.types.ts             # Types TypeScript
    └── validators/
        └── campaign.validators.ts        # Validation des données
```

### Composants Frontend

```
frontend-v2/src/
├── pages/app/
│   ├── campaigns/
│   │   ├── create.tsx                    # Création avec sélecteur d'événement
│   │   └── [id]/edit.tsx                 # Modification de campagne
│   └── events/
│       └── [id].tsx                      # Page événement avec bouton campagne
├── components/
│   ├── campaigns/
│   │   ├── EventSelector.tsx             # Sélecteur d'événement
│   │   ├── AccessCodePreview.tsx         # Aperçu des codes générés
│   │   └── ParticipantsList.tsx          # Liste avec codes d'accès
│   └── events/
│       └── CreateCampaignButton.tsx      # Bouton création campagne
├── services/
│   └── campaignService.ts                # Service API étendu
├── hooks/
│   ├── useCampaigns.ts                   # Hook campagnes étendu
│   └── useEventCampaigns.ts              # Hook spécifique événements
└── types/
    └── campaign.types.ts                 # Types frontend
```

## Modèle de Données

### Campagne Étendue

```typescript
interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  subject: string;
  content: CampaignContent;
  
  // Nouvelle intégration événement
  eventId?: string;                       // ID événement associé (optionnel)
  eventIntegration?: {
    generateQRCodes: boolean;             // Générer QR codes pour emails
    generatePINCodes: boolean;            // Générer PIN codes pour SMS
    qrExpirationHours: number;            // Expiration QR (défaut: 24h)
    pinExpirationMinutes: number;         // Expiration PIN (défaut: 60min)
  };
  
  recipientCriteria: RecipientCriteria;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  status: CampaignStatus;
}
```

### Participant avec Codes d'Accès

```typescript
interface ParticipantWithAccessCodes {
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  preferredMethod: 'email' | 'sms' | 'both';
  
  // Codes d'accès générés
  qrCode?: {
    qrCodeId: string;
    imageBase64: string;                  // Image QR en base64
    url: string;                          // URL de validation
    expiresAt: string;
  };
  
  pinCode?: {
    code: string;                         // Code PIN à 6 chiffres
    expiresAt: string;
  };
}
```

### Enregistrement de Campagne d'Événement

```typescript
interface EventCampaign {
  id: string;
  eventId: string;
  tenantId: string;
  emailCampaignId?: string;               // ID campagne email
  smsCampaignId?: string;                 // ID campagne SMS
  participantCount: number;
  
  // Statistiques de génération
  qrCodesGenerated: number;
  pinCodesGenerated: number;
  
  // Métadonnées
  createdAt: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  
  // Erreurs éventuelles
  errors?: string[];
}
```

## API Endpoints

### Routes Principales

```typescript
// Campagnes avec événements
POST   /api/campaigns                     # Créer campagne (eventId optionnel)
PUT    /api/campaigns/:id                 # Modifier campagne
GET    /api/campaigns/:id/preview         # Aperçu avec codes d'accès

// Intégration événements
POST   /api/events/:eventId/campaigns     # Créer campagne depuis événement
GET    /api/events/:eventId/campaigns     # Lister campagnes d'un événement

// Gestion des codes d'accès
POST   /api/campaigns/:id/generate-codes  # Générer codes pour participants
GET    /api/campaigns/:id/access-codes    # Lister codes générés
POST   /api/campaigns/:id/send            # Envoyer avec codes intégrés

// Validation des codes
POST   /api/events/:eventId/validate-qr   # Valider QR code
POST   /api/events/:eventId/validate-pin  # Valider PIN code
```

### Exemples de Requêtes

#### Créer Campagne avec Événement

```json
POST /api/campaigns
{
  "name": "Confirmation Événement - Conférence Tech 2024",
  "type": "EVENT_NOTIFICATION",
  "subject": "Votre accès à la Conférence Tech 2024",
  "eventId": "event_123",
  "eventIntegration": {
    "generateQRCodes": true,
    "generatePINCodes": true,
    "qrExpirationHours": 48,
    "pinExpirationMinutes": 120
  },
  "content": {
    "htmlContent": "Template avec {{qrCodeImage}} et {{eventDetails}}",
    "textContent": "Votre code PIN: {{pinCode}}"
  },
  "scheduledAt": "2024-01-15T09:00:00Z"
}
```

#### Créer Campagne depuis Événement

```json
POST /api/events/event_123/campaigns
{
  "type": "confirmation",
  "notificationMethods": {
    "email": {
      "enabled": true,
      "generateQR": true,
      "templateId": "event-confirmation-qr"
    },
    "sms": {
      "enabled": true,
      "generatePIN": true,
      "templateId": "event-confirmation-pin"
    }
  },
  "scheduledAt": "2024-01-14T18:00:00Z"
}
```

## Logique de Génération des Codes

### Conditions de Génération

```typescript
// QR Codes (pour emails)
const shouldGenerateQR = (event, participant) => {
  return (
    (participant.preferredMethod === 'email' || participant.preferredMethod === 'both') &&
    (event.attendanceSettings?.requireQRCode || 
     event.attendanceSettings?.allowedMethods?.includes('qr_code'))
  );
};

// PIN Codes (pour SMS)
const shouldGeneratePIN = (event, participant) => {
  return (
    (participant.preferredMethod === 'sms' || participant.preferredMethod === 'both') &&
    (event.attendanceSettings?.requireQRCode || 
     event.attendanceSettings?.allowedMethods?.includes('qr_code') ||
     event.attendanceSettings?.allowedMethods?.includes('pin_code'))
  );
};
```

### Algorithme de Génération

1. **Récupération des participants** depuis l'événement
2. **Analyse des préférences** de notification (email/SMS)
3. **Vérification des paramètres** de validation de l'événement
4. **Génération des codes** selon les conditions
5. **Sauvegarde en base** pour validation ultérieure
6. **Intégration dans les templates** de campagne

## Templates de Notification

### Template Email avec QR Code

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Confirmation de votre inscription</h2>
  <h3>{{eventName}}</h3>
  
  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <p><strong>Date:</strong> {{eventDate}}</p>
    <p><strong>Lieu:</strong> {{eventLocation}}</p>
    <p><strong>Organisateur:</strong> {{organizerName}}</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <h4>Votre QR Code d'accès</h4>
    <img src="data:image/png;base64,{{qrCodeImage}}" alt="QR Code" style="max-width: 200px;">
    <p style="font-size: 12px; color: #666;">
      Présentez ce QR code à l'entrée de l'événement
    </p>
    <p style="font-size: 10px; color: #999;">
      Code valide jusqu'au {{qrExpiresAt}}
    </p>
  </div>

  <p>Nous avons hâte de vous voir à l'événement !</p>
</div>
```

### Template SMS avec PIN Code

```
Confirmation: {{eventName}} le {{eventDate}} à {{eventLocation}}. 
Votre code PIN: {{pinCode}} (valide jusqu'à {{pinExpiresAt}}). 
Présentez ce code à l'entrée.
```

## Sécurité et Validation

### Sécurité des Codes

- **QR Codes** : Chiffrés avec données événement + participant + timestamp
- **PIN Codes** : Générés aléatoirement, stockés hashés en base
- **Expiration** : Automatique selon paramètres événement
- **Usage unique** : Marqués comme utilisés après validation
- **Rate limiting** : Protection contre les tentatives de force brute

### Validation lors du Check-in

```typescript
// Validation QR Code
const validateQRCode = async (qrCodeId: string, eventId: string) => {
  const qrCode = await getQRCode(qrCodeId);
  
  // Vérifications
  if (!qrCode.isActive) return { valid: false, reason: 'deactivated' };
  if (new Date() > new Date(qrCode.expiresAt)) return { valid: false, reason: 'expired' };
  if (qrCode.data.eventId !== eventId) return { valid: false, reason: 'wrong_event' };
  if (qrCode.usageCount >= (qrCode.maxUsage || 1)) return { valid: false, reason: 'used' };
  
  // Marquer comme utilisé
  await markQRCodeUsed(qrCodeId);
  
  return { valid: true, participantId: qrCode.data.userId };
};

// Validation PIN Code
const validatePINCode = async (pinCode: string, eventId: string) => {
  const pin = await getPINCode(eventId, pinCode);
  
  if (!pin) return { valid: false, reason: 'not_found' };
  if (pin.isUsed) return { valid: false, reason: 'already_used' };
  if (new Date() > new Date(pin.expiresAt)) return { valid: false, reason: 'expired' };
  
  // Marquer comme utilisé
  await markPINCodeUsed(pin.id);
  
  return { valid: true, participantId: pin.userId };
};
```

## Interface Utilisateur

### Workflow Création de Campagne

1. **Page campagne** : Formulaire standard
2. **Sélection événement** : Liste déroulante optionnelle
3. **Configuration automatique** : Analyse des paramètres événement
4. **Aperçu participants** : Liste avec codes générés
5. **Prévisualisation** : Templates avec codes intégrés
6. **Planification** : Envoi immédiat ou programmé

### Workflow depuis Événement

1. **Page événement** : Bouton "Créer campagne de notification"
2. **Modal configuration** : Choix email/SMS, templates
3. **Génération automatique** : Codes selon validation événement
4. **Aperçu campagne** : Pré-remplie avec données événement
5. **Finalisation** : Personnalisation et envoi

## Métriques et Analytics

### Suivi des Campagnes d'Événements

- **Taux de génération** : Codes générés vs participants
- **Taux d'ouverture** : Emails/SMS ouverts
- **Taux d'utilisation** : Codes utilisés lors du check-in
- **Performance par méthode** : QR vs PIN codes
- **Temps de validation** : Délai entre envoi et utilisation

### Dashboard Analytics

```typescript
interface EventCampaignAnalytics {
  campaignId: string;
  eventId: string;
  
  // Génération
  totalParticipants: number;
  qrCodesGenerated: number;
  pinCodesGenerated: number;
  
  // Envoi
  emailsSent: number;
  smsSent: number;
  deliveryRate: number;
  
  // Engagement
  emailsOpened: number;
  smsOpened: number;
  openRate: number;
  
  // Utilisation
  qrCodesUsed: number;
  pinCodesUsed: number;
  usageRate: number;
  
  // Timing
  averageUsageDelay: number; // minutes entre envoi et utilisation
  peakUsageTime: string;     // heure de pic d'utilisation
}
```

## Tests et Validation

### Tests Backend

- **Tests unitaires** : Services de génération de codes
- **Tests d'intégration** : API endpoints complets
- **Tests de sécurité** : Validation et expiration des codes
- **Tests de performance** : Génération en masse

### Tests Frontend

- **Tests composants** : Sélecteur d'événement, aperçu codes
- **Tests d'intégration** : Workflow complet création campagne
- **Tests E2E** : Parcours utilisateur depuis événement

## Déploiement et Migration

### Étapes de Déploiement

1. **Backend** : Services, routes, controllers
2. **Base de données** : Collections pour codes PIN et campagnes événements
3. **Frontend** : Interfaces et composants
4. **Tests** : Validation complète du système
5. **Documentation** : Guides utilisateur

### Migration des Données

- **Campagnes existantes** : Ajout champ `eventId` optionnel
- **Événements existants** : Pas de modification nécessaire
- **Participants** : Enrichissement avec préférences notification

## Maintenance et Évolutions

### Tâches de Maintenance

- **Nettoyage automatique** : Suppression codes expirés
- **Monitoring** : Surveillance taux d'échec génération
- **Optimisation** : Performance génération en masse
- **Sécurité** : Audit régulier des codes d'accès

### Évolutions Futures

- **Templates avancés** : Éditeur visuel avec QR codes
- **Intégrations** : Calendriers, réseaux sociaux
- **Analytics avancées** : Prédictions, recommandations
- **Multi-événements** : Campagnes pour plusieurs événements

---

**Date de création** : Décembre 2024  
**Version** : 1.0  
**Auteur** : Équipe AttendanceX  
**Statut** : En développement