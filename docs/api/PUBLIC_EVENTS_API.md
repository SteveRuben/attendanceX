# 📚 API Documentation - Public Events Endpoints

**Version:** 2.0.0  
**Base URL:** `https://api-rvnxjp7idq-ew.a.run.app/v1`  
**Authentication:** None required (public endpoints)

---

## 🎯 Overview

The Public Events API provides unauthenticated access to discover and explore public events. These endpoints are designed for:

- **SEO optimization** - Crawlable by search engines
- **Public discovery** - Anyone can browse events without login
- **Marketing** - Share event links on social media
- **Acquisition** - Convert visitors to registered users

---

## 📋 Endpoints

### 1. List Public Events

Get a paginated list of public events with filtering and sorting.

**Endpoint:** `GET /public/events`

**Rate Limit:** 60 requests/minute

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Search in title, description, tags | `tech conference` |
| `city` | string | Filter by city | `Paris` |
| `country` | string | Filter by country | `France` |
| `locationType` | enum | `physical`, `online`, `hybrid` | `online` |
| `startDate` | ISO date | Events starting after this date | `2026-02-01` |
| `endDate` | ISO date | Events starting before this date | `2026-03-01` |
| `category` | string | Filter by category | `tech` |
| `tags` | string | Comma-separated tags | `ai,machine-learning` |
| `priceType` | enum | `free` or `paid` | `free` |
| `minPrice` | number | Minimum price (EUR) | `0` |
| `maxPrice` | number | Maximum price (EUR) | `100` |
| `featured` | boolean | Only featured events | `true` |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 20, max: 100) | `20` |
| `sortBy` | enum | `date`, `popular`, `rating`, `price` | `date` |
| `sortOrder` | enum | `asc` or `desc` | `asc` |

**Example Request:**

```bash
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?city=Paris&category=tech&priceType=free&page=1&limit=20"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "evt_123456",
        "slug": "tech-conference-2026-paris",
        "title": "Tech Conference 2026",
        "description": "Join us for the biggest tech conference...",
        "shortDescription": "The biggest tech conference of 2026",
        "coverImage": "https://storage.googleapis.com/...",
        "images": ["https://..."],
        "organizerId": "org_789",
        "organizerName": "TechOrg",
        "organizerSlug": "techorg",
        "organizerAvatar": "https://...",
        "organizerRating": 4.8,
        "startDate": "2026-02-15T09:00:00Z",
        "endDate": "2026-02-15T18:00:00Z",
        "timezone": "Europe/Paris",
        "location": {
          "type": "physical",
          "venue": "Paris Convention Center",
          "address": "123 Rue de Paris",
          "city": "Paris",
          "country": "France",
          "coordinates": {
            "lat": 48.8566,
            "lng": 2.3522
          }
        },
        "category": "tech",
        "tags": ["ai", "machine-learning", "cloud"],
        "pricing": {
          "type": "paid",
          "amount": 50,
          "currency": "EUR",
          "earlyBird": {
            "amount": 40,
            "deadline": "2026-01-31T23:59:59Z"
          }
        },
        "capacity": {
          "total": 300,
          "available": 50,
          "registered": 250
        },
        "rating": {
          "average": 4.8,
          "count": 120
        },
        "visibility": "public",
        "featured": true,
        "seo": {
          "metaTitle": "Tech Conference 2026 - Paris",
          "metaDescription": "Join us for the biggest tech conference...",
          "keywords": ["tech", "conference", "ai", "paris"],
          "ogImage": "https://..."
        },
        "publishedAt": "2026-01-01T00:00:00Z",
        "createdAt": "2025-12-01T00:00:00Z",
        "updatedAt": "2026-01-15T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 245,
      "totalPages": 13
    },
    "filters": {
      "categories": ["tech", "business", "education", "arts", "sports", "health", "other"],
      "cities": ["Paris", "London", "Berlin", "Madrid", "Rome"],
      "countries": ["France", "United Kingdom", "Germany", "Spain", "Italy"]
    }
  }
}
```

---

### 2. Get Event Detail

Get detailed information about a specific public event.

**Endpoint:** `GET /public/events/:slug`

**Rate Limit:** 60 requests/minute

**Path Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `slug` | string | URL-friendly event identifier | `tech-conference-2026-paris` |

**Example Request:**

```bash
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events/tech-conference-2026-paris"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "event": {
      "id": "evt_123456",
      "slug": "tech-conference-2026-paris",
      "title": "Tech Conference 2026",
      // ... (same fields as list endpoint)
    },
    "organizer": {
      "id": "org_789",
      "slug": "techorg",
      "name": "TechOrg",
      "avatar": "https://...",
      "coverImage": "https://...",
      "bio": "Leading tech event organizer in Europe",
      "location": {
        "city": "Paris",
        "country": "France"
      },
      "website": "https://techorg.com",
      "social": {
        "facebook": "https://facebook.com/techorg",
        "twitter": "https://twitter.com/techorg",
        "linkedin": "https://linkedin.com/company/techorg"
      },
      "stats": {
        "totalEvents": 50,
        "upcomingEvents": 12,
        "totalAttendees": 10000,
        "rating": 4.9,
        "reviewCount": 250
      },
      "verified": true,
      "createdAt": "2020-01-01T00:00:00Z"
    },
    "similarEvents": [
      {
        "id": "evt_234567",
        "slug": "ai-summit-2026-paris",
        "title": "AI Summit 2026",
        // ... (abbreviated event data)
      }
    ]
  }
}
```

---

### 3. Get Organizer Profile

Get public profile of an event organizer.

**Endpoint:** `GET /public/organizers/:slug`

**Rate Limit:** 60 requests/minute

**Path Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `slug` | string | URL-friendly organizer identifier | `techorg` |

**Example Request:**

```bash
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/organizers/techorg"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "organizer": {
      "id": "org_789",
      "slug": "techorg",
      "name": "TechOrg",
      // ... (same as organizer object above)
    },
    "upcomingEvents": [
      {
        "id": "evt_123456",
        "slug": "tech-conference-2026-paris",
        "title": "Tech Conference 2026",
        // ... (abbreviated event data)
      }
    ],
    "pastEvents": [
      {
        "id": "evt_000001",
        "slug": "tech-conference-2025-paris",
        "title": "Tech Conference 2025",
        // ... (abbreviated event data)
      }
    ]
  }
}
```

---

### 4. Get Categories

Get list of available event categories.

**Endpoint:** `GET /public/categories`

**Rate Limit:** 100 requests/5 minutes

**Example Request:**

```bash
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/categories"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "tech",
        "name": "Technology",
        "slug": "tech",
        "count": 150,
        "icon": "💻"
      },
      {
        "id": "business",
        "name": "Business",
        "slug": "business",
        "count": 120,
        "icon": "💼"
      },
      {
        "id": "education",
        "name": "Education",
        "slug": "education",
        "count": 80,
        "icon": "📚"
      }
    ]
  }
}
```

---

### 5. Get Locations

Get list of popular event locations.

**Endpoint:** `GET /public/locations`

**Rate Limit:** 100 requests/5 minutes

**Example Request:**

```bash
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/locations"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "city": "Paris",
        "country": "France",
        "count": 85
      },
      {
        "city": "London",
        "country": "United Kingdom",
        "count": 72
      },
      {
        "city": "Berlin",
        "country": "Germany",
        "count": 65
      }
    ]
  }
}
```

---

## 🔒 Security

### Rate Limiting

All public endpoints have rate limiting to prevent abuse:

- **Events list:** 60 requests/minute per IP
- **Event detail:** 60 requests/minute per IP
- **Organizer profile:** 60 requests/minute per IP
- **Categories:** 100 requests/5 minutes per IP
- **Locations:** 100 requests/5 minutes per IP

### Data Privacy

Public endpoints only expose:
- Events marked as `visibility: "public"`
- Events with `status: "published"`
- No personal data of attendees
- No sensitive organizer information

---

## 🎨 SEO Optimization

### Meta Tags

Each event detail page should include:

```html
<title>Tech Conference 2026 - Paris | AttendanceX</title>
<meta name="description" content="Join us for the biggest tech conference of 2026 in Paris..." />
<meta property="og:title" content="Tech Conference 2026 - Paris" />
<meta property="og:type" content="event" />
<meta property="og:url" content="https://attendance-x.vercel.app/events/tech-conference-2026-paris" />
<meta property="og:image" content="https://..." />
```

### Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Tech Conference 2026",
  "startDate": "2026-02-15T09:00:00+01:00",
  "endDate": "2026-02-15T18:00:00+01:00",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "Paris Convention Center",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Rue de Paris",
      "addressLocality": "Paris",
      "postalCode": "75001",
      "addressCountry": "FR"
    }
  },
  "image": "https://...",
  "description": "...",
  "offers": {
    "@type": "Offer",
    "url": "https://...",
    "price": "50",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  },
  "organizer": {
    "@type": "Organization",
    "name": "TechOrg",
    "url": "https://..."
  }
}
```

---

## 📊 Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Event slug is required"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Event not found"
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Failed to get public events"
  }
}
```

---

## 🚀 Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch public events
const response = await fetch('https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?city=Paris&category=tech');
const data = await response.json();

if (data.success) {
  console.log(`Found ${data.data.pagination.total} events`);
  data.data.events.forEach(event => {
    console.log(`${event.title} - ${event.startDate}`);
  });
}
```

### Python

```python
import requests

response = requests.get(
    'https://api-rvnxjp7idq-ew.a.run.app/v1/public/events',
    params={
        'city': 'Paris',
        'category': 'tech',
        'priceType': 'free'
    }
)

data = response.json()
if data['success']:
    print(f"Found {data['data']['pagination']['total']} events")
    for event in data['data']['events']:
        print(f"{event['title']} - {event['startDate']}")
```

### cURL

```bash
# Get free tech events in Paris
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events?city=Paris&category=tech&priceType=free"

# Get event detail
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/events/tech-conference-2026-paris"

# Get organizer profile
curl -X GET "https://api-rvnxjp7idq-ew.a.run.app/v1/public/organizers/techorg"
```

---

## 📈 Performance

### Caching

- Server-side caching with 5-minute TTL for categories and locations
- Client-side caching recommended for event lists (10 minutes)
- Event details can be cached for 1 hour

### Pagination

- Default: 20 items per page
- Maximum: 100 items per page
- Use pagination for better performance

### Optimization Tips

1. Use specific filters to reduce result set
2. Implement client-side caching
3. Use pagination instead of fetching all results
4. Prefetch event details on hover
5. Lazy load images

---

## 🔗 Related Documentation

- [Main API Documentation](./README.md)
- [Authentication Guide](../security/authentication-security.md)
- [Public Events Page Spec](../features/PUBLIC_EVENTS_PAGE_SPEC.md)
- [SEO Best Practices](../deployment/DEPLOYMENT_READY.md)

---

**Last Updated:** January 26, 2026  
**Maintained by:** AttendanceX Team

