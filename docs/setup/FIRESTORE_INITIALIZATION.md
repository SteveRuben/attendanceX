# Firestore Collections Initialization Guide

## Problem

The `events` collection does not exist in Firestore, causing the public events API to return 500 errors.

## Solution

This guide provides scripts to initialize all essential Firestore collections with sample data.

## Prerequisites

### 1. Node.js
Ensure Node.js is installed:
```bash
node --version
```

### 2. Firebase Service Account Key

You need a Firebase service account key to run the initialization script.

#### Option A: Download from Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **attendance-management-syst**
3. Click the gear icon ⚙️ > **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the file as `serviceAccountKey.json` in `backend/functions/`

#### Option B: Use Environment Variable

If you already have a service account key elsewhere:
```powershell
# PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccountKey.json"

# CMD
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\serviceAccountKey.json

# Bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

## Usage

### Windows (PowerShell)

```powershell
cd backend
.\init-firestore-collections.ps1
```

### Windows (CMD)

```cmd
cd backend
init-firestore-collections.bat
```

### Linux/Mac

```bash
cd backend
node functions/scripts/init-all-collections.js
```

## What Gets Created

### 1. Events Collection (5 sample events)
- **Tech Conference Paris 2026** - Paid tech conference (€299)
- **Business Summit London 2026** - Business summit (£450)
- **Free Yoga in the Park** - Free health event
- **Art Exhibition Berlin 2026** - Arts event (€15)
- **Online Web Development Bootcamp** - Online education ($1999)

All events have:
- `visibility: "public"`
- `status: "published"`
- Complete metadata (location, pricing, capacity, ratings)
- SEO fields
- Proper timestamps

### 2. Tenants Collection (5 organizers)
- Tech Events Paris
- Business Events UK
- Wellness Madrid
- Berlin Arts Collective
- Code Academy Online

All with:
- Public profiles
- Stats and ratings
- Social media links
- Verified status

### 3. Subscription Plans Collection (3 plans)
- **Free** - €0/month (3 events, 100 attendees)
- **Pro** - €49/month (unlimited events, 1000 attendees)
- **Enterprise** - €199/month (unlimited everything)

## Verification

After running the script, verify the data:

### 1. Check Firestore Console
https://console.firebase.google.com/project/attendance-management-syst/firestore

Navigate to:
- `events` collection - should have 5 documents
- `tenants` collection - should have 5 documents
- `subscription_plans` collection - should have 3 documents

### 2. Test the API

```bash
# Get all public events
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events"

# Get categories
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/categories"

# Get locations
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/locations"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "events": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    },
    "filters": {...}
  }
}
```

### 3. Check Frontend

Visit: https://attendance-x.vercel.app/fr/events

You should see the 5 sample events displayed.

## Troubleshooting

### Error: "Service account key not found"

**Solution:** Download the service account key from Firebase Console and place it in `backend/functions/serviceAccountKey.json`

### Error: "PERMISSION_DENIED"

**Solution:** Ensure the service account has the correct permissions:
1. Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam)
2. Find the service account email
3. Ensure it has **Firebase Admin** or **Cloud Datastore User** role

### Error: "14 UNAVAILABLE: No connection established"

**Possible causes:**
1. Firestore API not enabled
2. Network/firewall issues
3. Invalid credentials

**Solution:**
1. Enable Firestore API: https://console.cloud.google.com/apis/library/firestore.googleapis.com
2. Check your internet connection
3. Verify service account credentials

### Collections Already Exist

The script will skip existing collections and only create missing ones. This is safe to run multiple times.

## Next Steps

Once the collections are created and verified:

### 1. Commit the Changes

The following files have been modified but NOT committed:
- `backend/functions/src/services/public/public-events.service.ts` (enhanced logging)
- `backend/functions/src/routes/public/events.routes.ts` (rate limiting disabled)
- `backend/firestore.rules` (already deployed separately)

```bash
git add .
git commit -m "fix: initialize Firestore collections and fix public events API

- Created init scripts for Firestore collections
- Added sample events, tenants, and subscription plans
- Enhanced error handling and logging in public events service
- Temporarily disabled rate limiting for debugging
- Updated Firestore security rules (already deployed)"
git push origin master
```

### 2. Deploy Backend

```bash
cd backend
.\deploy-backend-fix.bat
```

Or manually:
```bash
cd backend/functions
npm run build
firebase deploy --only functions
```

### 3. Re-enable Rate Limiting (Optional)

Once everything is working, you can re-enable rate limiting in:
`backend/functions/src/routes/public/events.routes.ts`

Uncomment the rate limiting middleware and redeploy.

## Script Details

### Files Created

1. **`backend/functions/scripts/init-all-collections.js`**
   - Main initialization script
   - Creates collections with sample data
   - Verifies creation
   - Runs public events query test

2. **`backend/init-firestore-collections.ps1`**
   - PowerShell wrapper script
   - Checks prerequisites
   - Sets environment variables
   - Provides user-friendly output

3. **`backend/init-firestore-collections.bat`**
   - Batch file wrapper script
   - Same functionality as PowerShell version
   - For CMD users

### Safety Features

- **Non-destructive:** Skips existing collections
- **Verification:** Tests queries after creation
- **Confirmation:** Asks for user confirmation before proceeding
- **Error handling:** Clear error messages and troubleshooting hints

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Service Accounts](https://firebase.google.com/docs/admin/setup#initialize-sdk)

## Support

If you encounter issues:

1. Check the error message carefully
2. Verify service account permissions
3. Ensure Firestore API is enabled
4. Check Firebase Console for quota limits
5. Review the logs in Firebase Functions console

---

**Project:** AttendanceX  
**Firebase Project:** attendance-management-syst  
**Date:** 2026-01-27
