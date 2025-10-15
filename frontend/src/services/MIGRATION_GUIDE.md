# Guide de Migration des Services

## 🔄 Refactoring des Services - Changements Majeurs

Ce refactoring unifie et centralise les services pour éliminer les incohérences et doublons.

## 📋 Résumé des Changements

### Services Supprimés/Remplacés

| Ancien Service | Nouveau Service | Raison |
|----------------|-----------------|---------|
| `attendanceService.ts` | `unified/attendanceService.ts` | Harmonisation API, fonctionnalités étendues |
| `presenceService.ts` | `unified/attendanceService.ts` | Doublon - même fonctionnalité |
| `analyticsService.ts` | `unified/analyticsService.ts` | Centralisation analytics |
| `organizationAnalyticsService.ts` | `unified/analyticsService.ts` | Doublon - fonctionnalités fusionnées |
| `reportService.ts` | `unified/reportService.ts` | Centralisation reporting |
| `qrCodeService.ts` | `unified/qrCodeService.ts` | Version améliorée et unifiée |

### Services Conservés (Inchangés)

- `eventService.ts` - Pas de problèmes majeurs
- `teamService.ts` - API cohérente
- `organizationService.ts` - Fonctionnalités spécifiques
- `participantService.ts` - Logique métier spécialisée
- `userService.ts` - Service utilisateur standard
- `authService.ts` - Authentification
- `apiService.ts` - Service de base

## 🔧 Changements d'API

### 1. AttendanceService

#### Avant (attendanceService.ts)
```typescript
import { attendanceService } from '../services/attendanceService';

// Endpoints incohérents
await attendanceService.getAttendances(); // /attendances
await attendanceService.getEventAttendances(eventId); // /attendances/events/{id}
```

#### Après (unified/attendanceService.ts)
```typescript
import { attendanceService } from '../services/unified';

// API unifiée et cohérente
await attendanceService.getAttendances(); // /api/attendance
await attendanceService.getEventAttendances(eventId); // /api/attendance/events/{id}

// Nouvelles fonctionnalités
await attendanceService.getCurrentAttendanceStatus();
await attendanceService.getAttendanceAlerts();
await attendanceService.canCheckIn(eventId);
```

### 2. AnalyticsService

#### Avant (analyticsService.ts + organizationAnalyticsService.ts)
```typescript
import { analyticsService } from '../services/analyticsService';
import { organizationAnalyticsService } from '../services/organizationAnalyticsService';

// Services séparés avec doublons
await analyticsService.getEventAnalytics(eventId);
await organizationAnalyticsService.getOrganizationStats(orgId);
```

#### Après (unified/analyticsService.ts)
```typescript
import { analyticsService } from '../services/unified';

// Service unifié
await analyticsService.getEventAnalytics(eventId);
await analyticsService.getOrganizationAnalytics(orgId, dateRange);

// Nouvelles fonctionnalités unifiées
await analyticsService.getInsights(orgId);
await analyticsService.getBenchmarkData(orgId);
await analyticsService.getPredictions(orgId, { metric: 'attendance', horizon: 'month' });
```

### 3. QRCodeService

#### Avant (qrCodeService.ts)
```typescript
import { qrCodeService } from '../services/qrCodeService';

// Fonctionnalités limitées
await qrCodeService.generateEventQRCode(eventId);
await qrCodeService.validateQRCode(qrCode);
```

#### Après (unified/qrCodeService.ts)
```typescript
import { qrCodeService } from '../services/unified';

// Fonctionnalités étendues
await qrCodeService.generateEventQRCode(eventId, options);
await qrCodeService.validateQRCode(qrCode, context);

// Nouvelles fonctionnalités
await qrCodeService.getRealtimeScanAnalytics(eventId);
await qrCodeService.diagnoseQRCodeIssues(eventId);
await qrCodeService.generateShareableLink(eventId);
```

### 4. ReportService

#### Avant (reportService.ts + exports dispersés)
```typescript
import { reportService } from '../services/reportService';
import { eventService } from '../services/eventService';
import { attendanceService } from '../services/attendanceService';

// Exports dispersés dans différents services
await reportService.generateReport(config);
await eventService.exportEvents(filters, format);
await attendanceService.exportAttendances(filters, format);
```

#### Après (unified/reportService.ts)
```typescript
import { reportService } from '../services/unified';

// Centralisation complète
await reportService.generateReport(type, filters, options);
await reportService.generateAttendanceReport(eventId);
await reportService.generateUserReport(userId);

// Nouvelles fonctionnalités
await reportService.scheduleReport(config);
await reportService.getReportTemplates();
await reportService.previewReport(type, filters);
```

## 🚀 Nouvelles Fonctionnalités

### 1. Service de Base (BaseService)
- Méthodes communes pour tous les services
- Gestion d'erreurs standardisée
- Opérations CRUD génériques
- Export unifié

### 2. Fonctionnalités Étendues

#### AttendanceService
- ✅ Diagnostics de présence
- ✅ Alertes en temps réel
- ✅ Patterns de comportement
- ✅ Validation avancée

#### AnalyticsService
- ✅ Insights automatiques
- ✅ Prédictions basées sur l'IA
- ✅ Benchmarking anonyme
- ✅ Alertes de performance

#### QRCodeService
- ✅ Analytics de scan en temps réel
- ✅ Diagnostics de problèmes
- ✅ Liens de partage
- ✅ Gestion avancée des permissions

#### ReportService
- ✅ Templates personnalisables
- ✅ Rapports planifiés
- ✅ Prévisualisation
- ✅ Système de santé

## 📝 Guide de Migration

### Étape 1: Mise à jour des Imports

```typescript
// ❌ Ancien
import { attendanceService } from '../services/attendanceService';
import { analyticsService } from '../services/analyticsService';
import { qrCodeService } from '../services/qrCodeService';
import { reportService } from '../services/reportService';

// ✅ Nouveau
import { 
  attendanceService, 
  analyticsService, 
  qrCodeService, 
  reportService 
} from '../services/unified';
```

### Étape 2: Mise à jour des Appels d'API

```typescript
// ❌ Ancien - API incohérente
const stats = await attendanceService.getAttendanceStats({
  userId: 'user-123',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// ✅ Nouveau - API cohérente avec types
const stats = await attendanceService.getAttendanceStats({
  userId: 'user-123',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### Étape 3: Utilisation des Nouvelles Fonctionnalités

```typescript
// Nouvelles fonctionnalités disponibles
const insights = await analyticsService.getInsights(organizationId);
const alerts = await attendanceService.getAttendanceAlerts();
const qrDiagnostics = await qrCodeService.diagnoseQRCodeIssues(eventId);
const reportPreview = await reportService.previewReport(type, filters);
```

## ⚠️ Points d'Attention

### 1. Changements d'Endpoints
- Tous les endpoints sont maintenant préfixés par `/api/`
- Harmonisation singulier/pluriel : `/api/attendance` (pas `/attendances`)

### 2. Gestion d'Erreurs
- Toutes les erreurs sont maintenant gérées de manière cohérente
- Utilisation de la méthode `handleError` du BaseService

### 3. Types TypeScript
- Nouveaux types unifiés et plus complets
- Meilleure intégration avec les types partagés

### 4. Formats de Dates
- Toutes les dates sont automatiquement sérialisées en ISO string
- Plus besoin de conversion manuelle

## 🧪 Tests

Les nouveaux services incluent une couverture de tests complète :

```typescript
// Tests disponibles
import { attendanceService } from '../services/unified';

// Tous les services ont des tests unitaires complets
describe('UnifiedAttendanceService', () => {
  // Tests pour toutes les méthodes
});
```

## 📚 Documentation

Chaque service unifié inclut :
- Documentation JSDoc complète
- Exemples d'utilisation
- Types TypeScript détaillés
- Gestion d'erreurs documentée

## 🔄 Rétrocompatibilité

Pour faciliter la migration, les anciens services restent disponibles temporairement mais sont marqués comme dépréciés. Il est recommandé de migrer vers les services unifiés dès que possible.

```typescript
// ⚠️ Déprécié - sera supprimé dans une version future
import { attendanceService } from '../services/attendanceService';

// ✅ Recommandé
import { attendanceService } from '../services/unified';
```