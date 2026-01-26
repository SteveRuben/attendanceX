# 🧪 Public Events API - Testing Guide

**Quick reference for testing the public events endpoints**

---

## 🚀 Base URL

```
Production: https://api-rvnxjp7idq-ew.a.run.app/v1
Local: http://localhost:5001/attendance-management-syst/europe-west1/api/v1
```

---

## 📋 Quick Test Commands

### 1. List Public Events

```bash
# Basic list
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events"

# With filters
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?city=Paris&category=tech&page=1&limit=10"

# Search
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?search=conference"

# Free events only
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?priceType=free"

# Featured events
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?featured=true"

# Sort by rating
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?sortBy=rating&sortOrder=desc"
```

### 2. Get Event Detail

```bash
# By slug
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events/tech-conference-2026-paris"

# Test 404
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events/non-existent-event"
```

### 3. Get Organizer Profile

```bash
# By slug
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/organizers/techorg"

# Test 404
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/organizers/non-existent-org"
```

### 4. Get Categories

```bash
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/categories"
```

### 5. Get Locations

```bash
curl "https://api-rvnxjp7idq-ew.a.run.app/v1/public/locations"
```

---

## 🧪 Postman Collection

### Import this JSON into Postman:

```json
{
  "info": {
    "name": "AttendanceX - Public Events API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "List Public Events",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/public/events?page=1&limit=20",
          "host": ["{{baseUrl}}"],
          "path": ["public", "events"],
          "query": [
            {"key": "page", "value": "1"},
            {"key": "limit", "value": "20"},
            {"key": "city", "value": "Paris", "disabled": true},
            {"key": "category", "value": "tech", "disabled": true},
            {"key": "search", "value": "conference", "disabled": true},
            {"key": "priceType", "value": "free", "disabled": true},
            {"key": "featured", "value": "true", "disabled": true},
            {"key": "sortBy", "value": "date", "disabled": true},
            {"key": "sortOrder", "value": "asc", "disabled": true}
          ]
        }
      }
    },
    {
      "name": "Get Event Detail",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/public/events/:slug",
          "host": ["{{baseUrl}}"],
          "path": ["public", "events", ":slug"],
          "variable": [
            {"key": "slug", "value": "tech-conference-2026-paris"}
          ]
        }
      }
    },
    {
      "name": "Get Organizer Profile",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/public/organizers/:slug",
          "host": ["{{baseUrl}}"],
          "path": ["public", "organizers", ":slug"],
          "variable": [
            {"key": "slug", "value": "techorg"}
          ]
        }
      }
    },
    {
      "name": "Get Categories",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/public/categories",
          "host": ["{{baseUrl}}"],
          "path": ["public", "categories"]
        }
      }
    },
    {
      "name": "Get Locations",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/public/locations",
          "host": ["{{baseUrl}}"],
          "path": ["public", "locations"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://api-rvnxjp7idq-ew.a.run.app/v1",
      "type": "string"
    }
  ]
}
```

---

## ✅ Test Checklist

### Functional Tests

- [ ] **List Events**
  - [ ] Returns 200 with valid response structure
  - [ ] Pagination works (page, limit, total, totalPages)
  - [ ] Search filter works
  - [ ] City filter works
  - [ ] Country filter works
  - [ ] Category filter works
  - [ ] Price type filter works (free/paid)
  - [ ] Featured filter works
  - [ ] Date range filters work
  - [ ] Sorting works (date, popular, rating)
  - [ ] Returns only public events
  - [ ] Returns only published events

- [ ] **Event Detail**
  - [ ] Returns 200 with valid event
  - [ ] Returns 404 for non-existent slug
  - [ ] Includes organizer information
  - [ ] Includes similar events (max 4)
  - [ ] All fields populated correctly

- [ ] **Organizer Profile**
  - [ ] Returns 200 with valid organizer
  - [ ] Returns 404 for non-existent slug
  - [ ] Includes upcoming events (max 10)
  - [ ] Includes past events (max 10)
  - [ ] Stats are accurate

- [ ] **Categories**
  - [ ] Returns 200 with categories list
  - [ ] Each category has count
  - [ ] Sorted by count (descending)

- [ ] **Locations**
  - [ ] Returns 200 with locations list
  - [ ] Each location has count
  - [ ] Sorted by count (descending)

### Security Tests

- [ ] **Rate Limiting**
  - [ ] Events list: 60 req/min limit enforced
  - [ ] Event detail: 60 req/min limit enforced
  - [ ] Organizer: 60 req/min limit enforced
  - [ ] Categories: 100 req/5min limit enforced
  - [ ] Locations: 100 req/5min limit enforced
  - [ ] Returns 429 when limit exceeded

- [ ] **Data Privacy**
  - [ ] No private events exposed
  - [ ] No draft events exposed
  - [ ] No attendee personal data
  - [ ] No sensitive organizer data

### Performance Tests

- [ ] **Response Times**
  - [ ] List events: < 500ms
  - [ ] Event detail: < 300ms
  - [ ] Organizer profile: < 400ms
  - [ ] Categories: < 200ms
  - [ ] Locations: < 200ms

- [ ] **Load Testing**
  - [ ] 100 concurrent users
  - [ ] 1000 requests/minute
  - [ ] No errors under load
  - [ ] Response times stable

### Error Handling

- [ ] **400 Bad Request**
  - [ ] Invalid slug format
  - [ ] Invalid query parameters
  - [ ] Returns proper error structure

- [ ] **404 Not Found**
  - [ ] Non-existent event slug
  - [ ] Non-existent organizer slug
  - [ ] Returns proper error structure

- [ ] **500 Internal Server Error**
  - [ ] Database connection issues
  - [ ] Returns proper error structure
  - [ ] No sensitive data in error

---

## 📊 Expected Responses

### Success Response (200)

```json
{
  "success": true,
  "data": {
    // ... endpoint-specific data
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## 🔍 Debugging

### Check Logs

```bash
# Firebase Functions logs
firebase functions:log --only api

# Filter by function
firebase functions:log --only api | grep "public/events"
```

### Common Issues

1. **404 on all endpoints**
   - Check if routes are registered in `routes/index.ts`
   - Verify deployment was successful
   - Check Firebase Functions logs

2. **Empty results**
   - Verify events have `visibility: "public"`
   - Verify events have `status: "published"`
   - Check Firestore indexes are created

3. **Slow responses**
   - Check Firestore indexes
   - Enable server-side caching
   - Optimize queries

4. **Rate limit errors**
   - Wait for rate limit window to reset
   - Implement exponential backoff
   - Use caching on client side

---

## 🚀 Next Steps After Testing

1. **If tests pass:**
   - Deploy to production
   - Update documentation
   - Notify frontend team
   - Start frontend implementation

2. **If tests fail:**
   - Review error logs
   - Fix identified issues
   - Re-run tests
   - Update documentation

---

**Last Updated:** January 26, 2026

