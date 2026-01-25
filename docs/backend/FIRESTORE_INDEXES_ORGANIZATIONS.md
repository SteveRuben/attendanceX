# Required Firestore Indexes for Organizations

## Composite Indexes Required

Add these indexes to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "organizations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "tenantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "organizations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "tenantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "organizations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "domain.subdomain",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "organizations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "domain.customDomain",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

## Single Field Indexes (Auto-created)

These are automatically created by Firestore:
- `tenantId` (ASCENDING)
- `status` (ASCENDING)
- `createdAt` (ASCENDING/DESCENDING)
- `updatedAt` (ASCENDING/DESCENDING)

## Performance Considerations

1. **Pagination Queries**: The composite index on `tenantId + createdAt` enables efficient pagination
2. **Domain Validation**: Single field indexes on subdomain and customDomain enable fast uniqueness checks
3. **Status Filtering**: The composite index on `tenantId + status + createdAt` enables filtered listings

## Query Patterns Supported

1. `where('tenantId', '==', tenantId).orderBy('createdAt', 'desc')`
2. `where('tenantId', '==', tenantId).where('status', '==', status).orderBy('createdAt', 'desc')`
3. `where('domain.subdomain', '==', subdomain)`
4. `where('domain.customDomain', '==', domain)`