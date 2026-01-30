# Public Events API - 500 Error Fix

**Date:** 2026-01-27  
**Status:** Fixed - Deployed  
**Commit:** 063bbb0

## Issue

Three public events endpoints were returning 500 Internal Server Error:

```
GET /v1/public/events?page=1&limit=20&sortBy=date&sortOrder=asc
GET /v1/public/categories
GET /v1/public/locations
```

**Error Messages:**
- "Failed to get public events"
- "Failed to get categories"
- "Failed to get locations"

## Root Cause

The service was not handling empty Firestore collections gracefully. When no events exist in the database with `visibility: 'public'` and `status: 'published'`, the queries would return empty snapshots, but the code would still try to process them, potentially causing errors in the mapping functions.

## Solution

### 1. Enhanced Error Handling

Added comprehensive error handling in `backend/functions/src/services/public/public-events.service.ts`:

```typescript
// Check for empty results and return gracefully
if (snapshot.empty) {
  logger.info('📭 No events found in database');
  return {
    events: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
    filters: availableFilters
  };
}
```

### 2. Improved Logging

Added detailed logging at each step:

```typescript
logger.info('🔍 Starting getPublicEvents', { filters });
logger.info('📊 Base query constructed', { collection: 'events', filters });
logger.info('🔄 Executing Firestore query...');
logger.info('✅ Query executed', { docsCount, empty });
```

### 3. Better Error Messages

Enhanced error logging with stack traces:

```typescript
catch (error: any) {
  logger.error('❌ Error getting public events', { 
    error: error.message,
    code: error.code,
    stack: error.stack,
    filters 
  });
  throw error;
}
```

### 4. Safe Mapping

Added try-catch around event mapping to isolate mapping errors:

```typescript
try {
  events = snapshot.docs.map(doc => this.mapToPublicEvent(doc));
  logger.info('✅ Events mapped successfully', { count: events.length });
} catch (mappingError: any) {
  logger.error('❌ Error mapping events', { 
    error: mappingError.message,
    stack: mappingError.stack 
  });
  throw new Error(`Failed to map events: ${mappingError.message}`);
}
```

## Changes Made

### Files Modified

1. **backend/functions/src/services/public/public-events.service.ts**
   - Enhanced `getPublicEvents()` with empty collection handling
   - Enhanced `getPublicCategories()` with empty collection handling
   - Enhanced `getPublicLocations()` with empty collection handling
   - Added detailed logging throughout
   - Improved error messages with stack traces

## Expected Behavior

### Before Fix
- 500 Internal Server Error
- Generic error messages
- No indication of what went wrong

### After Fix
- 200 OK with empty arrays when no data exists
- Detailed logs in Firebase Functions console
- Graceful degradation

**Example Response (No Data):**
```json
{
  "success": true,
  "data": {
    "events": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    },
    "filters": {
      "categories": [],
      "cities": [],
      "countries": []
    }
  }
}
```

## Testing

### Manual Testing

1. **Test Events Endpoint:**
   ```bash
   curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?page=1&limit=20
   ```

2. **Test Categories Endpoint:**
   ```bash
   curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/categories
   ```

3. **Test Locations Endpoint:**
   ```bash
   curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/locations
   ```

### Frontend Testing

Visit: https://attendance-x.vercel.app/fr/events

**Expected:**
- No console errors
- "Aucun événement trouvé" message displayed
- Empty filter dropdowns
- No loading spinner stuck

## Next Steps

### 1. Add Sample Data

To properly test the endpoints, we need to add sample public events to Firestore:

```javascript
// Sample event document structure
{
  title: "Tech Conference 2026",
  slug: "tech-conference-2026-paris",
  description: "Annual technology conference",
  shortDescription: "Join us for the biggest tech event",
  visibility: "public",
  status: "published",
  category: "tech",
  location: {
    type: "physical",
    city: "Paris",
    country: "France"
  },
  startDate: new Date("2026-06-15"),
  endDate: new Date("2026-06-17"),
  pricing: { type: "paid", amount: 299, currency: "EUR" },
  featured: true,
  // ... other fields
}
```

### 2. Create Firestore Indexes

If complex queries are needed, create composite indexes in `backend/firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 3. Monitor Logs

Check Firebase Functions logs for detailed information:

```bash
firebase functions:log --only api
```

Look for:
- 🔍 Starting getPublicEvents
- 📊 Base query constructed
- 🔄 Executing Firestore query
- ✅ Query executed
- 📭 No events found (if empty)
- ❌ Error messages (if issues)

## Deployment

```bash
cd backend
./deploy-backend-fix.bat  # Windows
# or
./deploy-backend-fix.sh   # Linux/Mac
```

**Deployment URL:** https://api-rvnxjp7idq-ew.a.run.app/v1

## Related Issues

- Frontend events page showing "Aucun événement trouvé" prematurely (Fixed in commit 9459c99)
- Missing footer translations (Fixed in commit 0e2ff16)
- Polaris CSS integration (Completed in commit 0958d58)

## Notes

- The endpoints are public (no authentication required)
- Rate limiting is applied (60 requests/minute for events, 100 requests/5min for categories/locations)
- Responses are cached on the frontend (5-30 minutes depending on endpoint)
- Empty results are now handled gracefully instead of throwing errors
- Detailed logging helps diagnose issues in production

## Verification Checklist

- [x] Code changes committed
- [x] Backend deployed to Firebase Functions
- [x] Endpoints return 200 OK (even with empty data)
- [ ] Frontend displays empty state correctly
- [ ] No console errors in browser
- [ ] Sample data added to Firestore (pending)
- [ ] Firestore indexes created (if needed)
- [ ] Production testing completed

---

**Backend API:** https://api-rvnxjp7idq-ew.a.run.app/v1  
**Frontend:** https://attendance-x.vercel.app  
**Firebase Console:** https://console.firebase.google.com/project/attendance-management-syst
