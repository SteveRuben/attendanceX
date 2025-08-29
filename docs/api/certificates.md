# 📜 Certificates API

## Vue d'ensemble

L'API Certificates d'Attendance-X permet la génération, la gestion et la validation de certificats de présence avec support pour les templates personnalisés, la génération en masse, et la validation sécurisée.

**Base URL:** `/api/certificates`

## Fonctionnalités principales

- 📜 Génération automatique de certificats de présence
- 🎨 Templates personnalisables avec branding organisationnel
- 🔐 Validation sécurisée avec codes uniques
- 📊 Statistiques et analytics des certificats
- 📥 Téléchargement en multiple formats (PDF, PNG, SVG)
- 🏢 Gestion des templates au niveau organisation

## Génération de certificats

### POST /certificates/attendance/:attendanceId/generate
Génère un certificat pour une présence spécifique.

**Permissions requises :** Manager, Admin, ou organisateur de l'événement

**Paramètres de chemin :**
- `attendanceId` (string) - ID de la présence

**Requête :**
```json
{
  "templateId": "template-123",
  "customFields": {
    "instructor": "Dr. Marie Dubois",
    "grade": "Excellent",
    "additionalNotes": "Participation active et excellente compréhension"
  },
  "format": "pdf",
  "language": "fr",
  "sendEmail": true
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "id": "cert-456",
    "certificateNumber": "CERT-2024-000456",
    "attendanceId": "att-789",
    "participant": {
      "id": "user-123",
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@example.com"
    },
    "event": {
      "id": "event-123",
      "name": "Formation React Avancé",
      "startDate": "2024-03-15T09:00:00Z",
      "duration": "8 heures"
    },
    "template": {
      "id": "template-123",
      "name": "Certificat de Formation Standard"
    },
    "urls": {
      "download": "https://api.attendance-x.com/certificates/cert-456/download",
      "view": "https://app.attendance-x.com/certificates/cert-456",
      "validate": "https://app.attendance-x.com/certificates/validate/cert-456"
    },
    "qrCode": "https://api.qrserver.com/v1/create-qr-code/?data=https://app.attendance-x.com/certificates/validate/cert-456",
    "issuedAt": "2024-03-15T18:00:00Z",
    "expiresAt": null,
    "status": "active",
    "emailSent": true
  }
}
```

### POST /certificates/events/:eventId/bulk-generate
Génère des certificats en masse pour tous les participants d'un événement.

**Permissions requises :** Manager ou Admin

**Paramètres de chemin :**
- `eventId` (string) - ID de l'événement

**Requête :**
```json
{
  "templateId": "template-123",
  "criteria": {
    "minAttendanceRate": 0.8,
    "requireCheckOut": true,
    "minDuration": "4h"
  },
  "customFields": {
    "instructor": "Dr. Marie Dubois",
    "location": "Centre de Formation Paris"
  },
  "format": "pdf",
  "sendEmails": true,
  "batchSize": 10
}
```

**Réponse (202) :**
```json
{
  "success": true,
  "data": {
    "jobId": "job-bulk-cert-789",
    "status": "processing",
    "totalParticipants": 45,
    "eligibleParticipants": 38,
    "estimatedDuration": "5-10 minutes",
    "progress": {
      "processed": 0,
      "successful": 0,
      "failed": 0,
      "percentage": 0
    },
    "statusUrl": "/api/certificates/jobs/job-bulk-cert-789/status"
  }
}
```

### GET /certificates/jobs/:jobId/status
Récupère le statut d'une génération en masse.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "jobId": "job-bulk-cert-789",
    "status": "completed",
    "startedAt": "2024-03-15T18:00:00Z",
    "completedAt": "2024-03-15T18:07:32Z",
    "progress": {
      "processed": 38,
      "successful": 36,
      "failed": 2,
      "percentage": 100
    },
    "results": {
      "certificates": [
        {
          "participantId": "user-123",
          "certificateId": "cert-456",
          "status": "success"
        }
      ],
      "errors": [
        {
          "participantId": "user-789",
          "error": "Insufficient attendance duration",
          "details": "Required 4h, actual 3h45m"
        }
      ]
    },
    "downloadUrl": "/api/certificates/jobs/job-bulk-cert-789/download"
  }
}
```

## Gestion des certificats

### GET /certificates/validate/:certificateId
Valide un certificat et récupère ses informations.

**Permissions requises :** Aucune (endpoint public)

**Paramètres de chemin :**
- `certificateId` (string) - ID du certificat

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "certificate": {
      "id": "cert-456",
      "certificateNumber": "CERT-2024-000456",
      "participant": {
        "firstName": "Jean",
        "lastName": "Dupont"
      },
      "event": {
        "name": "Formation React Avancé",
        "startDate": "2024-03-15T09:00:00Z",
        "duration": "8 heures",
        "location": "Centre de Formation Paris"
      },
      "organization": {
        "name": "TechCorp Solutions",
        "logo": "https://storage.example.com/logos/org-123.png"
      },
      "issuedAt": "2024-03-15T18:00:00Z",
      "status": "active",
      "verificationCode": "VER-ABC123DEF456"
    },
    "validation": {
      "timestamp": "2024-03-16T10:30:00Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  }
}
```

### GET /certificates/user/:userId
Récupère tous les certificats d'un utilisateur.

**Permissions requises :** Utilisateur lui-même, Manager, ou Admin

**Paramètres de requête :**
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Éléments par page (défaut: 20)
- `status` (string) - Filtrer par statut: `active`, `revoked`, `expired`
- `eventType` (string) - Filtrer par type d'événement
- `startDate` (string) - Date de début (ISO 8601)
- `endDate` (string) - Date de fin (ISO 8601)
- `sort` (string) - Tri: `issuedAt`, `eventDate`, `eventName`

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "cert-456",
      "certificateNumber": "CERT-2024-000456",
      "event": {
        "id": "event-123",
        "name": "Formation React Avancé",
        "startDate": "2024-03-15T09:00:00Z",
        "type": "training",
        "duration": "8 heures"
      },
      "template": {
        "id": "template-123",
        "name": "Certificat de Formation Standard"
      },
      "urls": {
        "download": "https://api.attendance-x.com/certificates/cert-456/download",
        "view": "https://app.attendance-x.com/certificates/cert-456"
      },
      "issuedAt": "2024-03-15T18:00:00Z",
      "status": "active",
      "downloadCount": 3,
      "lastDownloaded": "2024-03-16T09:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### GET /certificates/events/:eventId
Récupère tous les certificats d'un événement.

**Permissions requises :** Manager, Admin, ou organisateur de l'événement

**Paramètres de requête :**
- `status` (string) - Filtrer par statut
- `format` (string) - Format de téléchargement: `individual`, `zip`
- `includeStats` (boolean) - Inclure les statistiques

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-123",
      "name": "Formation React Avancé",
      "startDate": "2024-03-15T09:00:00Z"
    },
    "statistics": {
      "totalCertificates": 36,
      "activeCertificates": 36,
      "revokedCertificates": 0,
      "downloadCount": 108,
      "averageDownloads": 3
    },
    "certificates": [
      {
        "id": "cert-456",
        "certificateNumber": "CERT-2024-000456",
        "participant": {
          "id": "user-123",
          "firstName": "Jean",
          "lastName": "Dupont",
          "email": "jean.dupont@example.com"
        },
        "issuedAt": "2024-03-15T18:00:00Z",
        "status": "active",
        "downloadCount": 3
      }
    ]
  }
}
```

### GET /certificates/:certificateId/download
Télécharge un certificat.

**Permissions requises :** Propriétaire du certificat, Manager, ou Admin

**Paramètres de requête :**
- `format` (string) - Format: `pdf`, `png`, `svg` (défaut: pdf)
- `size` (string) - Taille: `a4`, `letter`, `custom`
- `quality` (string) - Qualité: `low`, `medium`, `high`

**Réponse (200) :**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="certificat-jean-dupont-formation-react.pdf"

[Contenu binaire du certificat PDF]
```

## Templates de certificats

### POST /certificates/templates
Crée un nouveau template de certificat.

**Permissions requises :** Admin

**Requête :**
```json
{
  "name": "Certificat de Formation Avancée",
  "description": "Template pour les formations techniques avancées",
  "category": "training",
  "language": "fr",
  "format": "a4",
  "orientation": "landscape",
  "design": {
    "backgroundColor": "#ffffff",
    "borderColor": "#007bff",
    "borderWidth": 3,
    "headerHeight": 120,
    "footerHeight": 80,
    "margins": {
      "top": 40,
      "right": 40,
      "bottom": 40,
      "left": 40
    }
  },
  "elements": [
    {
      "type": "logo",
      "position": { "x": 50, "y": 50 },
      "size": { "width": 100, "height": 60 },
      "source": "organization_logo"
    },
    {
      "type": "title",
      "position": { "x": 200, "y": 150 },
      "text": "CERTIFICAT DE FORMATION",
      "style": {
        "fontSize": 28,
        "fontWeight": "bold",
        "color": "#007bff",
        "textAlign": "center"
      }
    },
    {
      "type": "participant_name",
      "position": { "x": 200, "y": 250 },
      "style": {
        "fontSize": 24,
        "fontWeight": "bold",
        "color": "#333333",
        "textAlign": "center"
      }
    },
    {
      "type": "event_name",
      "position": { "x": 200, "y": 320 },
      "prefix": "a suivi avec succès la formation :",
      "style": {
        "fontSize": 18,
        "color": "#666666",
        "textAlign": "center"
      }
    },
    {
      "type": "date",
      "position": { "x": 200, "y": 400 },
      "format": "DD MMMM YYYY",
      "prefix": "Le ",
      "style": {
        "fontSize": 16,
        "color": "#666666",
        "textAlign": "center"
      }
    },
    {
      "type": "qr_code",
      "position": { "x": 650, "y": 450 },
      "size": { "width": 80, "height": 80 }
    }
  ],
  "variables": [
    {
      "name": "instructor",
      "label": "Instructeur",
      "type": "text",
      "required": false
    },
    {
      "name": "grade",
      "label": "Note/Mention",
      "type": "select",
      "options": ["Excellent", "Très bien", "Bien", "Satisfaisant"],
      "required": false
    }
  ]
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "id": "template-789",
    "name": "Certificat de Formation Avancée",
    "category": "training",
    "language": "fr",
    "previewUrl": "https://api.attendance-x.com/certificates/templates/template-789/preview",
    "createdAt": "2024-03-15T20:00:00Z",
    "updatedAt": "2024-03-15T20:00:00Z"
  }
}
```

### GET /certificates/templates
Récupère la liste des templates de certificats.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `category` (string) - Filtrer par catégorie: `training`, `conference`, `workshop`, `meeting`
- `language` (string) - Filtrer par langue: `fr`, `en`, `es`, `de`
- `active` (boolean) - Filtrer par statut actif

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "template-123",
      "name": "Certificat de Formation Standard",
      "description": "Template standard pour les formations",
      "category": "training",
      "language": "fr",
      "format": "a4",
      "orientation": "landscape",
      "isDefault": true,
      "isActive": true,
      "usageCount": 156,
      "previewUrl": "https://api.attendance-x.com/certificates/templates/template-123/preview",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-03-10T14:30:00Z"
    }
  ]
}
```

### PUT /certificates/templates/:templateId
Met à jour un template de certificat.

**Permissions requises :** Admin

**Requête :**
```json
{
  "name": "Certificat de Formation Avancée v2",
  "description": "Version mise à jour du template",
  "design": {
    "backgroundColor": "#f8f9fa"
  }
}
```

### DELETE /certificates/templates/:templateId
Supprime un template de certificat.

**Permissions requises :** Admin

**Note :** Un template ne peut être supprimé que s'il n'est utilisé par aucun certificat existant.

### GET /certificates/templates/:templateId/preview
Génère un aperçu du template avec des données d'exemple.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `format` (string) - Format: `pdf`, `png`, `svg`
- `sampleData` (string) - Données d'exemple JSON encodées

## Statistiques des certificats

### GET /certificates/stats/organization
Récupère les statistiques des certificats de l'organisation.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `period` (string) - Période: `week`, `month`, `quarter`, `year`
- `startDate` (string) - Date de début
- `endDate` (string) - Date de fin

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCertificates": 1234,
      "activeCertificates": 1198,
      "revokedCertificates": 36,
      "totalDownloads": 3456,
      "uniqueRecipients": 567
    },
    "trends": {
      "certificatesIssued": [
        {
          "date": "2024-03-01",
          "count": 45,
          "downloads": 123
        }
      ],
      "growthRate": 0.15,
      "downloadRate": 2.8
    },
    "distribution": {
      "byEventType": {
        "training": 678,
        "conference": 234,
        "workshop": 189,
        "meeting": 133
      },
      "byTemplate": {
        "template-123": 456,
        "template-456": 234,
        "template-789": 189
      },
      "byMonth": {
        "2024-01": 123,
        "2024-02": 156,
        "2024-03": 189
      }
    },
    "topRecipients": [
      {
        "userId": "user-123",
        "name": "Jean Dupont",
        "certificateCount": 12,
        "downloadCount": 36
      }
    ],
    "validation": {
      "totalValidations": 2345,
      "uniqueValidators": 456,
      "averageValidationsPerCertificate": 1.9
    }
  }
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `CERTIFICATE_NOT_FOUND` | Certificat introuvable |
| `ATTENDANCE_NOT_FOUND` | Présence introuvable |
| `TEMPLATE_NOT_FOUND` | Template introuvable |
| `CERTIFICATE_ALREADY_EXISTS` | Certificat déjà généré pour cette présence |
| `INSUFFICIENT_ATTENDANCE` | Présence insuffisante pour générer le certificat |
| `TEMPLATE_IN_USE` | Template utilisé, impossible de supprimer |
| `INVALID_TEMPLATE_FORMAT` | Format de template invalide |
| `GENERATION_FAILED` | Échec de la génération du certificat |
| `CERTIFICATE_REVOKED` | Certificat révoqué |
| `DOWNLOAD_LIMIT_EXCEEDED` | Limite de téléchargement dépassée |

## Exemples d'utilisation

### Générer un certificat pour une présence
```javascript
const certificate = await fetch(`/api/certificates/attendance/${attendanceId}/generate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateId: 'template-123',
    customFields: {
      instructor: 'Dr. Marie Dubois',
      grade: 'Excellent'
    },
    sendEmail: true
  })
});

const result = await certificate.json();
console.log('Certificat généré:', result.data.certificateNumber);
console.log('URL de téléchargement:', result.data.urls.download);
```

### Génération en masse pour un événement
```javascript
const bulkGeneration = await fetch(`/api/certificates/events/${eventId}/bulk-generate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateId: 'template-123',
    criteria: {
      minAttendanceRate: 0.8,
      requireCheckOut: true
    },
    sendEmails: true
  })
});

const job = await bulkGeneration.json();
console.log('Job de génération créé:', job.data.jobId);

// Vérifier le statut
const checkStatus = async () => {
  const status = await fetch(`/api/certificates/jobs/${job.data.jobId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statusData = await status.json();
  
  if (statusData.data.status === 'completed') {
    console.log(`${statusData.data.progress.successful} certificats générés`);
  } else {
    setTimeout(checkStatus, 5000); // Vérifier à nouveau dans 5 secondes
  }
};

checkStatus();
```

### Valider un certificat
```javascript
const validation = await fetch(`/api/certificates/validate/${certificateId}`);
const result = await validation.json();

if (result.data.valid) {
  console.log('Certificat valide pour:', result.data.certificate.participant.firstName);
  console.log('Événement:', result.data.certificate.event.name);
  console.log('Émis le:', result.data.certificate.issuedAt);
} else {
  console.log('Certificat invalide ou révoqué');
}
```

### Créer un template personnalisé
```javascript
const template = await fetch('/api/certificates/templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Mon Template Personnalisé',
    category: 'training',
    language: 'fr',
    design: {
      backgroundColor: '#ffffff',
      borderColor: '#007bff'
    },
    elements: [
      {
        type: 'title',
        position: { x: 200, y: 150 },
        text: 'CERTIFICAT DE RÉUSSITE',
        style: {
          fontSize: 28,
          fontWeight: 'bold',
          color: '#007bff'
        }
      }
    ]
  })
});

const newTemplate = await template.json();
console.log('Template créé:', newTemplate.data.id);
```