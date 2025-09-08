# Configuration Régionale Optimisée

## Stratégie Régionale

### Objectifs
- **Latence minimale** pour l'Afrique et l'Europe
- **Coûts optimisés** avec les régions les plus économiques
- **Cohérence** entre les services

### Configuration Actuelle

#### Base de Données
- **Firestore**: `africa-south1` (Johannesburg) - Optimal pour l'Afrique
- **Avantages**: Latence minimale pour l'Afrique, conformité GDPR

#### Functions
- **Région**: `europe-west1` (Belgique)
- **Avantages**: 
  - Coût réduit par rapport à `us-central1`
  - Latence acceptable pour l'Afrique (150-200ms)
  - Conformité GDPR européenne
  - Proximité avec Firestore africa-south1

#### Storage
- **Région**: Par défaut (sera configuré en `europe-west1`)

## Fonctions Mises à Jour

### Fonctions Planifiées (onSchedule)
✅ Toutes configurées avec `region: "europe-west1"`

1. **Analytics Functions**
   - `collectIntegrationMetrics`
   - `generateWeeklyReport` 
   - `cleanupOldMetrics`

2. **Cleanup Jobs**
   - `dailyCleanup`
   - `weeklyCleanup`
   - `monthlyCleanup`

3. **Email Verification**
   - `collectEmailVerificationMetrics`
   - `dailyEmailVerificationCleanup`
   - `weeklyEmailVerificationReport`

4. **Monitoring**
   - `collectMetrics`
   - `metrics` (HTTP)

5. **Organization Metrics**
   - `collectOrganizationMetrics`
   - `cleanupOldMetrics`
   - `generateWeeklyReport`

6. **Presence Maintenance**
   - `weeklyPresenceMaintenance`
   - `dailyPresenceMaintenance`
   - `cleanupSecurityDataScheduled`

7. **Report Jobs**
   - `generateWeeklyReports`

### Fonctions Callable (onCall)
✅ Déjà configurées avec `region: "europe-west1"`

- `triggerPresenceMaintenance`
- `checkPresenceDataHealth`
- `generateMaintenanceReport`

## Estimation des Coûts

### Avant (us-central1)
- Invocations: $0.40/million
- GB-sec: $0.0000025
- Réseau: $0.12/GB

### Après (europe-west1)
- Invocations: $0.40/million (même prix)
- GB-sec: $0.0000025 (même prix)
- Réseau: $0.12/GB (même prix)
- **Latence**: Réduite de ~50ms pour l'Europe/Afrique

## Latence Estimée

### Depuis l'Afrique du Sud
- Firestore (africa-south1): ~10-20ms
- Functions (europe-west1): ~150-200ms

### Depuis l'Europe
- Firestore (africa-south1): ~150-200ms
- Functions (europe-west1): ~10-50ms

### Depuis l'Afrique de l'Ouest
- Firestore (africa-south1): ~200-250ms
- Functions (europe-west1): ~100-150ms

## Recommandations Futures

1. **Multi-région**: Considérer `europe-west3` (Frankfurt) pour l'Europe
2. **CDN**: Utiliser Firebase Hosting avec CDN global
3. **Cache**: Implémenter Redis/Memcache en `europe-west1`
4. **Monitoring**: Surveiller les métriques de latence par région