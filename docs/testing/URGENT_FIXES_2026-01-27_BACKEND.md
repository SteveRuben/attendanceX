# Urgent Backend Fixes - Public Events API

**Date:** 2026-01-27  
**Status:** IN PROGRESS  
**Priority:** HIGH

## Current Issue

Public events endpoints still returning 500 errors after deployment:

```
GET /v1/public/events → 500 Internal Server Error
GET /v1/public/categories → 500 Internal Server Error  
GET /v1/public/locations → 500 Internal Server Error
```

## Possible Root Causes

### 1. Firestore Collection Doesn't Exist

The `events` collection might not exist in the production Firestore database.

**Solution:** Create the collection with at least one document.

### 2. Firestore Security Rules

The security rules might be blocking read access to the `events` collection.

**Check:** `backend/firestore.rules`

```javascript
// Should allow public read for published events
match /events/{eventId} {
  allow read: if resource.data.visibility == 'public' 
              && resource.data.status == 'published';
}
```

### 3. Missing Firestore Indexes

Complex queries require composite indexes.

**Check:** Firebase Console → Firestore → Indexes

Required indexes:
- `events` collection: `visibility` (ASC) + `status` (ASC) + `startDate` (ASC)

### 4. Environment Variables

Missing or incorrect Firebase configuration in production.

**Check:** Firebase Functions environment variables

### 5. Code Deployment Issue

The new code might not have deployed correctly.

**Verify:** Check Firebase Functions logs for the new logging statements

## Immediate Actions Needed

### 1. Check Firebase Functions Logs

```bash
firebase functions:log --only api --limit 50
```

Look for:
- 🔍 Starting getPublicEvents
- 📊 Base query constructed
- Any error messages with stack traces

### 2. Check Firestore Rules

```bash
firebase firestore:rules:get
```

Ensure public events are readable without authentication.

### 3. Check Firestore Data

Open Firebase Console → Firestore Database

Verify:
- `events` collection exists
- At least one document with:
  - `visibility: "public"`
  - `status: "published"`

### 4. Test with Simple Query

Create a minimal test endpoint that just counts documents:

```typescript
router.get('/test/events-count', async (req, res) => {
  try {
    const snapshot = await collections.events.get();
    res.json({
      success: true,
      total: snapshot.size,
      empty: snapshot.empty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 5. Add Sample Event Data

If no events exist, add a sample event via Firebase Console:

```json
{
  "title": "Sample Tech Event",
  "slug": "sample-tech-event-2026",
  "description": "A sample event for testing",
  "shortDescription": "Sample event",
  "visibility": "public",
  "status": "published",
  "category": "tech",
  "location": {
    "type": "online",
    "city": "Paris",
    "country": "France"
  },
  "startDate": "2026-06-15T10:00:00Z",
  "endDate": "2026-06-15T18:00:00Z",
  "timezone": "Europe/Paris",
  "pricing": {
    "type": "free"
  },
  "capacity": {
    "total": 100,
    "available": 100,
    "registered": 0
  },
  "rating": {
    "average": 0,
    "count": 0
  },
  "featured": false,
  "tags": ["tech", "online"],
  "images": [],
  "coverImage": "",
  "organizerId": "test-org",
  "organizerName": "Test Organizer",
  "organizerSlug": "test-organizer",
  "organizerRating": 0,
  "seo": {
    "metaTitle": "Sample Tech Event",
    "metaDescription": "A sample event for testing",
    "keywords": ["tech", "online"],
    "ogImage": ""
  },
  "publishedAt": "2026-01-27T00:00:00Z",
  "createdAt": "2026-01-27T00:00:00Z",
  "updatedAt": "2026-01-27T00:00:00Z"
}
```

## Debug Steps

### Step 1: Check Logs

```bash
cd backend
firebase functions:log --only api
```

### Step 2: Check Firestore

1. Open https://console.firebase.google.com/project/attendance-management-syst/firestore
2. Look for `events` collection
3. Check if any documents exist
4. Verify document structure

### Step 3: Check Security Rules

1. Open https://console.firebase.google.com/project/attendance-management-syst/firestore/rules
2. Verify rules allow public read for published events

### Step 4: Test Locally

```bash
cd backend
firebase emulators:start --only functions,firestore
```

Then test:
```bash
curl http://localhost:5001/attendance-management-syst/europe-west1/api/v1/public/events
```

## Expected Fix Timeline

1. **Immediate (5 min):** Check logs and identify exact error
2. **Short-term (15 min):** Fix Firestore rules or add sample data
3. **Medium-term (30 min):** Deploy fix and verify
4. **Long-term (1 hour):** Add comprehensive test data and documentation

## Rollback Plan

If the issue persists:

1. Revert to previous working version
2. Investigate locally with emulators
3. Fix and test thoroughly before redeploying

## Communication

**Frontend Impact:**
- Events page shows "Aucun événement trouvé"
- No console errors (handled gracefully)
- User experience: Acceptable but not ideal

**User Message:**
"We're currently setting up our events database. Check back soon for exciting events!"

## Next Session Tasks

1. [ ] Check Firebase Functions logs
2. [ ] Verify Firestore collection exists
3. [ ] Check Firestore security rules
4. [ ] Add sample event data
5. [ ] Test endpoints again
6. [ ] Update frontend if needed
7. [ ] Document final solution

---

**Status:** Waiting for Firebase Functions logs analysis  
**Blocker:** Need to identify exact error from production logs  
**ETA:** 30-60 minutes once logs are analyzed
