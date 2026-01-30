# Activated Cloud Functions

## ⚠️ IMPORTANT: Region Limitation Notice

**Cloud Functions scheduled functions are NOT supported in the `africa-south1` region.**

All scheduled and background job functions have been **commented out** in `backend/functions/src/index.ts` due to this limitation.

### Current Status: Only API Function Active

## Active Functions: 1

### 1. Main API Function
- **`api`** - Main Express API endpoint (HTTP) - ✅ **ACTIVE**

## Disabled Functions: 15

The following functions are **commented out** and will NOT be deployed:

### 2. Analytics Functions (3) - ❌ DISABLED
- **`collectIntegrationMetrics`** - Scheduled hourly to collect integration metrics
- **`cleanupOldMetrics`** - Scheduled daily at 2AM to cleanup metrics older than 90 days
- **`generateWeeklyReport`** - Scheduled weekly on Mondays at 8AM to generate reports

### 3. Dunning Processor Functions (5) - ❌ DISABLED
- **`processDunningDaily`** - Scheduled daily at 9AM UTC to process payment reminders
- **`cleanupDunningWeekly`** - Scheduled weekly on Sundays at 2AM UTC to cleanup old processes
- **`generateDunningReportsMonthly`** - Scheduled monthly on 1st at 3AM UTC to generate reports
- **`sendDunningNotifications`** - Scheduled every 4 hours to send pending notifications
- **`processDunningManual`** - Manual trigger for immediate dunning processing

### 4. Maintenance Functions (3) - ❌ DISABLED
- **`scheduledMaintenance`** - Scheduled at 1AM, 2AM, 3AM, 4AM UTC for daily/weekly/monthly maintenance
- **`triggerMaintenance`** - Manual trigger for maintenance (callable, admin only)
- **`getMaintenanceStatus`** - Get maintenance status and health checks (callable, admin/manager)

### 5. Metrics Functions (3) - ❌ DISABLED
- **`scheduledMetricsCollection`** - Scheduled hourly for metrics collection
- **`triggerMetricsCollection`** - Manual trigger for metrics collection (callable, admin only)
- **`getMetricsDashboard`** - Get metrics dashboard data (callable, admin/manager)

### 6. Scheduled Cleanup Functions (1) - ❌ DISABLED
- **`cleanupHealthChecks`** - Scheduled hourly to cleanup old health check documents

---

## Solutions to Enable Scheduled Functions

### Option 1: Deploy to a Supported Region (Recommended)

Change the region in all function files to a supported region:

**Supported regions for Cloud Functions:**
- `us-central1` (Iowa, USA)
- `us-east1` (South Carolina, USA)
- `us-east4` (Northern Virginia, USA)
- `us-west1` (Oregon, USA)
- `europe-west1` (Belgium)
- `europe-west2` (London, UK)
- `europe-west3` (Frankfurt, Germany)
- `asia-east1` (Taiwan)
- `asia-east2` (Hong Kong)
- `asia-northeast1` (Tokyo, Japan)
- `asia-northeast2` (Osaka, Japan)
- `asia-south1` (Mumbai, India)

**Steps:**
1. Update region in all function files from `africa-south1` to a supported region (e.g., `europe-west1`)
2. Uncomment the exports in `backend/functions/src/index.ts`
3. Deploy: `firebase deploy --only functions`

### Option 2: Set Up App Engine

1. Go to https://console.cloud.google.com/appengine
2. Create an App Engine instance in `africa-south1`
3. Uncomment the exports in `backend/functions/src/index.ts`
4. Deploy: `firebase deploy --only functions`

### Option 3: Use Cloud Scheduler with HTTP Triggers

Convert scheduled functions to HTTP endpoints and use Cloud Scheduler:

1. Create HTTP callable functions instead of scheduled functions
2. Set up Cloud Scheduler jobs to call these HTTP endpoints
3. This approach works in any region

### Option 4: Use Cloud Run (Alternative)

Deploy scheduled functions as Cloud Run services with Cloud Scheduler triggers.

---

## Current Deployment

To deploy the current configuration (API only):

```bash
cd backend/functions
npm run build
firebase deploy --only functions
```

This will deploy only the `api` function, which is the main Express API endpoint.

---

## Region Configuration

- **API Function**: `africa-south1` ✅ (HTTP functions are supported)
- **Scheduled Functions**: Commented out ❌ (Not supported in africa-south1)

---

## Function Types

### HTTP Functions (1) - ✅ ACTIVE
- `api` - Main API endpoint

### Scheduled Functions (9) - ❌ DISABLED
- All scheduled functions are commented out

### Callable Functions (5) - ❌ DISABLED
- All callable functions are commented out

---

## Build Status

✅ **Build successful** - TypeScript compilation passed without errors.

---

## Recommendation

**For production use, we recommend deploying scheduled functions to `europe-west1` region**, which is:
- Geographically close to Africa
- Fully supports all Cloud Functions features
- Has lower latency than US regions
- Complies with GDPR requirements

The main API can remain in `africa-south1` for optimal performance for African users, while scheduled background jobs run in `europe-west1`.

