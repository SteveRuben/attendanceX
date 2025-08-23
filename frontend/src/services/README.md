# Services Architecture

## 🏗️ Architecture des Services

Cette architecture unifie et centralise les services frontend pour éliminer les incohérences et doublons identifiés.

## 📁 Structure

```
services/
├── core/
│   └── baseService.ts          # Service de base avec fonctionnalités communes
├── unified/                    # Services unifiés (recommandés)
│   ├── attendanceService.ts    # Gestion des présences (unifié)
│   ├── analyticsService.ts     # Analytics et métriques (unifié)
│   ├── qrCodeService.ts        # Gestion QR codes (amélioré)
│   ├── reportService.ts        # Rapports et exports (centralisé)
│   └── index.ts               # Exports unifiés
├── legacy/                     # Services legacy (dépréciés)
│   ├── attendanceService.ts    # ⚠️ Déprécié
│   ├── presenceService.ts      # ⚠️ Déprécié (doublon)
│   ├── analyticsService.ts     # ⚠️ Déprécié
│   ├── organizationAnalyticsService.ts # ⚠️ Déprécié (doublon)
│   ├── reportService.ts        # ⚠️ Déprécié
│   └── qrCodeService.ts        # ⚠️ Déprécié
├── apiService.ts              # Service API de base
├── authService.ts             # Authentification
├── eventService.ts            # Gestion des événements
├── organizationService.ts     # Gestion des organisations
├── teamService.ts             # Gestion des équipes
├── participantService.ts      # Gestion des participants
├── userService.ts             # Gestion des utilisateurs
├── notificationService.ts     # Notifications
├── appointmentService.ts      # Rendez-vous
├── clientService.ts           # Gestion des clients
├── integrationService.ts      # Intégrations
├── invitationService.ts       # Invitations
├── mlService.ts               # Machine Learning
├── multiLanguageNotificationService.ts # Notifications multilingues
├── offlineSync.service.ts     # Synchronisation hors ligne
├── publicBookingService.ts    # Réservations publiques
├── index.ts                   # Point d'entrée principal
├── MIGRATION_GUIDE.md         # Guide de migration
└── README.md                  # Ce fichier
```

## 🚀 Utilisation Recommandée

### Services Unifiés (Nouveaux)

```typescript
// ✅ Recommandé - Services unifiés
import { 
  attendanceService,    // Gestion complète des présences
  analyticsService,     // Analytics et métriques unifiées
  qrCodeService,        // QR codes avec fonctionnalités avancées
  reportService         // Rapports et exports centralisés
} from '@/services/unified';

// Utilisation
const attendance = await attendanceService.checkIn({
  eventId: 'event-123',
  method: 'qr_code',
  location: { latitude: 48.8566, longitude: 2.3522 }
});

const analytics = await analyticsService.getOrganizationAnalytics(
  'org-123',
  { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') }
);
```

### Services Standards (Inchangés)

```typescript
// Services qui n'ont pas changé
import { 
  eventService,
  organizationService,
  teamService,
  participantService,
  userService
} from '@/services';
```

## 🔧 Fonctionnalités Principales

### 1. BaseService

Classe de base pour tous les services unifiés :

- **Méthodes CRUD génériques** : `getItems()`, `getItemById()`, `createItem()`, etc.
- **Gestion d'erreurs standardisée** : `handleError()`
- **Export unifié** : `exportData()`, `downloadFile()`
- **Opérations en masse** : `bulkOperation()`

### 2. AttendanceService (Unifié)

Remplace `attendanceService.ts` et `presenceService.ts` :

```typescript
// Fonctionnalités principales
await attendanceService.checkIn(request);
await attendanceService.getAttendances(filters);
await attendanceService.getRealtimeMetrics(eventId);
await attendanceService.validateAttendance(id, approved);

// Nouvelles fonctionnalités
await attendanceService.getCurrentAttendanceStatus();
await attendanceService.getAttendanceAlerts();
await attendanceService.diagnoseAttendanceIssues(eventId);
await attendanceService.canCheckIn(eventId);
```

### 3. AnalyticsService (Unifié)

Remplace `analyticsService.ts` et `organizationAnalyticsService.ts` :

```typescript
// Analytics événements
await analyticsService.getEventAnalytics(eventId);
await analyticsService.compareEvents(eventIds);

// Analytics organisation
await analyticsService.getOrganizationAnalytics(orgId, dateRange);
await analyticsService.getRealtimeStats(orgId);

// Analytics équipes
await analyticsService.getTeamAnalytics(orgId, teamId, dateRange);
await analyticsService.getTeamParticipationTrends(orgId, teamIds, dateRange);

// Insights et recommandations
await analyticsService.getInsights(orgId);
await analyticsService.getRecommendations(orgId);
await analyticsService.getBenchmarkData(orgId);
await analyticsService.getPredictions(orgId, params);
```

### 4. QRCodeService (Amélioré)

Version unifiée et étendue :

```typescript
// Génération et gestion
await qrCodeService.generateEventQRCode(eventId, options);
await qrCodeService.regenerateQRCode(eventId);
await qrCodeService.updateValidationRules(eventId, rules);

// Validation et check-in
await qrCodeService.validateQRCode(qrData, context);
await qrCodeService.processQRCodeCheckIn(qrData, context);

// Analytics et diagnostics
await qrCodeService.getQRCodeStats(eventId);
await qrCodeService.getRealtimeScanAnalytics(eventId);
await qrCodeService.diagnoseQRCodeIssues(eventId);

// Utilitaires
await qrCodeService.checkCameraSupport();
await qrCodeService.requestCameraPermission();
await qrCodeService.getCurrentLocation();
```

### 5. ReportService (Centralisé)

Centralise toutes les fonctionnalités de reporting :

```typescript
// Génération de rapports
await reportService.generateReport(type, filters, options);
await reportService.previewReport(type, filters);

// Rapports rapides
await reportService.generateAttendanceReport(eventId);
await reportService.generateUserReport(userId);
await reportService.generateTeamReport(teamId);
await reportService.generateMonthlySummary(orgId, options);

// Templates
await reportService.getReportTemplates();
await reportService.createReportTemplate(template);

// Rapports planifiés
await reportService.scheduleReport(config);
await reportService.getScheduledReports();
await reportService.runScheduledReport(id);
```

## 🔄 Migration

### Étape 1: Mise à jour des imports

```typescript
// ❌ Ancien
import { attendanceService } from '@/services/attendanceService';
import { analyticsService } from '@/services/analyticsService';

// ✅ Nouveau
import { attendanceService, analyticsService } from '@/services/unified';
```

### Étape 2: Vérification des appels d'API

La plupart des appels restent identiques, mais certains ont été améliorés :

```typescript
// ✅ Fonctionne dans les deux versions
const stats = await attendanceService.getAttendanceStats(filters);

// ✅ Nouvelles fonctionnalités disponibles
const alerts = await attendanceService.getAttendanceAlerts();
const insights = await analyticsService.getInsights(orgId);
```

## 📊 Avantages

### 1. Cohérence
- API unifiée avec conventions cohérentes
- Gestion d'erreurs standardisée
- Types TypeScript harmonisés

### 2. Réduction des Doublons
- Élimination des services redondants
- Centralisation des fonctionnalités d'export
- Logique métier unifiée

### 3. Maintenabilité
- Architecture modulaire avec BaseService
- Code réutilisable
- Tests centralisés

### 4. Fonctionnalités Étendues
- Nouvelles capacités d'analytics
- Diagnostics avancés
- Rapports planifiés
- Insights automatiques

## 🧪 Tests

Chaque service unifié inclut :

```typescript
// Tests complets pour tous les services
describe('UnifiedAttendanceService', () => {
  // Tests unitaires pour toutes les méthodes
});

describe('UnifiedAnalyticsService', () => {
  // Tests d'intégration et mocks
});
```

## 📚 Documentation

- **JSDoc complet** sur toutes les méthodes
- **Types TypeScript** détaillés
- **Exemples d'utilisation** dans les commentaires
- **Guide de migration** détaillé

## ⚠️ Notes Importantes

1. **Services Legacy** : Les anciens services restent disponibles temporairement avec le préfixe `legacy*`
2. **Rétrocompatibilité** : La plupart des appels existants continuent de fonctionner
3. **Migration Progressive** : Vous pouvez migrer service par service
4. **Performance** : Les nouveaux services sont optimisés et incluent la mise en cache

## 🔮 Roadmap

- [ ] Migration complète des composants existants
- [ ] Suppression des services legacy
- [ ] Ajout de fonctionnalités d'IA avancées
- [ ] Optimisations de performance
- [ ] Support WebSocket pour le temps réel