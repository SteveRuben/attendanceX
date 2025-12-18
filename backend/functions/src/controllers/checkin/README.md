# Check-in Controller

## 📁 Structure

```
backend/functions/src/controllers/checkin/
├── checkin.controller.ts    # Contrôleur principal
└── README.md               # Cette documentation
```

## 🎯 Responsabilités

Le `CheckInController` gère toutes les opérations liées au check-in des événements :

### **Configuration**
- `getCheckInConfig()` - Récupérer la configuration de check-in
- `updateCheckInConfig()` - Mettre à jour la configuration

### **Codes PIN**
- `generatePinCode()` - Générer un code PIN pour un participant
- `validatePinCode()` - Valider un code PIN

### **Check-in manuel**
- `manualCheckIn()` - Check-in manuel par l'organisateur

### **Rapports et statistiques**
- `getCheckInRecords()` - Récupérer l'historique des check-ins
- `getCheckInStats()` - Récupérer les statistiques de check-in

### **Notifications**
- `sendQrCodesToParticipants()` - Envoyer les QR codes aux participants

## 🔧 État actuel

**Status** : ⚠️ **Implémentation temporaire**

Toutes les méthodes utilisent actuellement des données mockées et des logiques simplifiées. Les commentaires `// TODO:` indiquent où intégrer les vrais services.

## 🚀 Prochaines étapes

### 1. **Créer les services**
```typescript
// backend/functions/src/services/checkin/
├── checkin.service.ts       # Service principal
├── pin-code.service.ts      # Gestion des codes PIN
├── config.service.ts        # Configuration des événements
└── stats.service.ts         # Statistiques et rapports
```

### 2. **Intégrer la base de données**
```typescript
// Exemple d'intégration
static getCheckInConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { tenantId, eventId } = req.params;
  
  // Remplacer le mock par :
  const config = await checkInService.getConfig(tenantId, eventId);
  
  res.json({
    success: true,
    data: config
  });
});
```

### 3. **Ajouter la validation**
- Vérifier les permissions utilisateur
- Valider l'existence des événements
- Vérifier les limites de taux

### 4. **Intégrer les services externes**
- Service d'email pour l'envoi de QR codes
- Service SMS pour les codes PIN
- Service de génération de QR codes

## 📊 Modèles de données

### **CheckInConfig**
```typescript
interface CheckInConfig {
  eventId: string
  methods: {
    qrCode: {
      enabled: boolean
      expirationHours?: number
      allowMultipleScans?: boolean
    }
    pinCode: {
      enabled: boolean
      codeLength?: number
      expirationMinutes?: number
    }
    manual: {
      enabled: boolean
      requiresApproval?: boolean
    }
    geofencing: {
      enabled: boolean
      latitude?: number
      longitude?: number
      radiusMeters?: number
    }
  }
  notifications: {
    sendQrByEmail?: boolean
    sendQrBySms?: boolean
    sendReminder?: boolean
    reminderHoursBefore?: number
  }
}
```

### **CheckInRecord**
```typescript
interface CheckInRecord {
  id: string
  eventId: string
  userId: string
  userName: string
  method: 'qr_code' | 'pin_code' | 'manual' | 'geofencing'
  timestamp: string
  status: 'checked_in' | 'checked_out' | 'late' | 'early'
  location?: {
    latitude: number
    longitude: number
  }
  notes?: string
  checkedInBy?: string // Pour les check-ins manuels
}
```

### **CheckInStats**
```typescript
interface CheckInStats {
  total: number
  checkedIn: number
  pending: number
  late: number
  onTime: number
  checkInRate: number
}
```

## 🔗 Routes associées

Ce contrôleur est utilisé par les routes dans `tenant.routes.ts` :

```typescript
// Configuration
GET    /tenants/:tenantId/check-in/config/:eventId
PUT    /tenants/:tenantId/check-in/config/:eventId

// Codes PIN
POST   /tenants/:tenantId/check-in/generate-pin
POST   /tenants/:tenantId/check-in/validate-pin

// Check-in manuel
POST   /tenants/:tenantId/check-in/manual

// Rapports
GET    /tenants/:tenantId/check-in/records/:eventId
GET    /tenants/:tenantId/check-in/stats/:eventId

// Notifications
POST   /tenants/:tenantId/check-in/send-qr-codes/:eventId
```

## 🧪 Tests

Pour tester les endpoints :

```bash
# Configuration
curl -X GET "http://localhost:5001/api/v1/tenants/test/check-in/config/event123" \
  -H "Authorization: Bearer $TOKEN"

# Génération PIN
curl -X POST "http://localhost:5001/api/v1/tenants/test/check-in/generate-pin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"event123","userId":"user456"}'

# Check-in manuel
curl -X POST "http://localhost:5001/api/v1/tenants/test/check-in/manual" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"event123","userId":"user456","notes":"Late arrival"}'
```