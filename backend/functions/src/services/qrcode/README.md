# QR Code Service

## 📁 Structure

```
backend/functions/src/services/qrcode/
├── qrcode.service.ts    # Service principal
└── README.md           # Cette documentation
```

## 🎯 Fonctionnalités

### **Génération de QR codes**
- `generateQRCode()` - Génération avec sauvegarde en base
- Support des types : `check_in`, `event`, `participant`
- Expiration configurable
- Métadonnées complètes

### **Validation de QR codes**
- `validateQRCode()` - Validation complète avec vérifications
- Gestion de l'expiration
- Compteur d'usage
- Limite d'utilisation

### **Gestion des QR codes**
- `getQRCode()` - Récupération par ID
- `deactivateQRCode()` - Désactivation
- `getEventQRCodes()` - QR codes d'un événement
- `cleanupExpiredQRCodes()` - Nettoyage automatique

## 🔧 Améliorations apportées

### **Avant** (fonction `generateGenericQRCode`)
```typescript
// Mock simple avec données hardcodées
const qrCodeId = `qr_${type}_${eventId}_${Date.now()}_${randomId}`;
const qrCode = {
  qrCodeId,
  url: `https://api.example.com/qr/${qrCodeId}`,
  imageBase64: null, // Pas d'image
  expiresAt: expiresAt || defaultDate,
  token: qrCodeId
};
```

### **Après** (service complet)
```typescript
// Service robuste avec base de données
const qrCode = await qrCodeService.generateQRCode({
  type,
  eventId,
  userId,
  expiresAt,
  options
});

// Sauvegarde automatique en Firestore
// Génération d'image SVG/base64
// Métadonnées complètes
// Gestion des permissions
```

## 📊 Modèles de données

### **QRCodeData** (contenu du QR)
```typescript
interface QRCodeData {
  id: string;                    // ID unique
  type: 'check_in' | 'event' | 'participant';
  eventId: string;               // ID de l'événement
  userId: string;                // Créateur
  createdAt: string;             // Date de création
  expiresAt: string;             // Date d'expiration
  version: string;               // Version du format
}
```

### **QRCodeRecord** (enregistrement complet)
```typescript
interface QRCodeRecord {
  qrCodeId: string;              // ID unique
  url: string;                   // URL de scan
  imageBase64?: string;          // Image encodée
  expiresAt: string;             // Expiration
  token: string;                 // Token d'accès
  data: QRCodeData;              // Données encodées
  metadata: {                    // Métadonnées
    createdBy: string;
    createdAt: string;
    type: string;
    eventId: string;
    format: string;
    size: number;
  };
  isActive: boolean;             // Statut actif
  usageCount: number;            // Nombre d'utilisations
  maxUsage?: number;             // Limite d'usage
}
```

## 🔄 Validation robuste

### **Vérifications automatiques**
1. **Existence** : QR code existe en base
2. **Statut** : QR code actif
3. **Expiration** : Pas expiré
4. **Usage** : Limite non dépassée
5. **Compteur** : Incrémentation automatique

### **Exemple de validation**
```typescript
const result = await qrCodeService.validateQRCode(qrCodeId, userId, location);

if (result.valid) {
  // QR code valide
  const qrCode = result.qrCode;
  console.log(`Usage: ${qrCode.usageCount}/${qrCode.maxUsage || '∞'}`);
} else {
  // QR code invalide
  console.log(`Erreur: ${result.message}`);
}
```

## 🎨 Génération d'images

### **Actuel** (SVG temporaire)
```typescript
// SVG simple avec ID du QR code
const svg = `<svg>...</svg>`;
return Buffer.from(svg).toString('base64');
```

### **À implémenter** (vraie librairie)
```typescript
// Avec la librairie 'qrcode'
const QRCode = require('qrcode');
const qrString = JSON.stringify(qrData);
const qrBuffer = await QRCode.toBuffer(qrString, { 
  width: size,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});
return qrBuffer.toString('base64');
```

## 🔗 Intégration avec le contrôleur

### **Génération**
```typescript
// Contrôleur QR code
static generateGenericQRCode = asyncHandler(async (req, res) => {
  const qrCode = await qrCodeService.generateQRCode({
    type: req.body.type,
    eventId: req.body.eventId,
    userId: req.user.uid,
    expiresAt: req.body.expiresAt,
    options: req.body.options
  });

  res.json({
    success: true,
    data: {
      qrCodeId: qrCode.qrCodeId,
      url: qrCode.url,
      imageBase64: qrCode.imageBase64,
      expiresAt: qrCode.expiresAt
    }
  });
});
```

### **Validation**
```typescript
// Contrôleur QR code
static validateQRCode = asyncHandler(async (req, res) => {
  const result = await qrCodeService.validateQRCode(
    req.body.qrCodeId,
    req.user.uid,
    req.body.location
  );

  if (result.valid) {
    // Créer enregistrement de check-in
    const checkIn = await createCheckInRecord(result.qrCode);
    res.json({ success: true, data: { valid: true, checkIn } });
  } else {
    res.json({ success: true, data: result });
  }
});
```

## 🚀 Prochaines étapes

### 1. **Intégrer une vraie librairie QR**
```bash
npm install qrcode @types/qrcode
```

### 2. **Ajouter la géolocalisation**
```typescript
// Vérification de proximité
if (qrCode.geofencing?.enabled) {
  const distance = calculateDistance(location, qrCode.geofencing.center);
  if (distance > qrCode.geofencing.radius) {
    return { valid: false, message: 'Outside geofence area' };
  }
}
```

### 3. **Implémenter le cache Redis**
```typescript
// Cache pour les validations fréquentes
const cached = await redis.get(`qr:${qrCodeId}`);
if (cached) return JSON.parse(cached);
```

### 4. **Ajouter les webhooks**
```typescript
// Notifications en temps réel
await webhookService.notify('qr_code_used', {
  qrCodeId,
  eventId,
  userId,
  timestamp: new Date()
});
```

## 🧪 Tests

### **Test de génération**
```bash
curl -X POST "http://localhost:5001/api/v1/qr-codes/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "check_in",
    "eventId": "event123",
    "options": {"size": 256, "format": "png"}
  }'
```

### **Test de validation**
```bash
curl -X POST "http://localhost:5001/api/v1/qr-codes/validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qrCodeId": "qr_check_in_event123_1234567890_abc123"
  }'
```

## 📈 Métriques

Le service track automatiquement :
- Nombre de QR codes générés
- Taux d'utilisation
- QR codes expirés
- Erreurs de validation
- Performance des scans

Ces métriques sont disponibles via `getQRCodeStats(eventId)`.