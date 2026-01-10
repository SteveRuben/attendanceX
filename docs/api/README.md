# AttendanceX API Documentation

Welcome to the AttendanceX API documentation. Our comprehensive RESTful API provides enterprise-grade access to all platform features with multi-tenant security, real-time capabilities, and complete TypeScript support.

## 🚀 Quick Start

### Base URLs
```
Production: https://api.attendancex.com/v1
Development: http://localhost:5001/api
GitHub Pages: https://steveRuben.github.io/attendanceX/api
```

### Authentication
All API requests require authentication using JWT tokens with tenant context:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "X-Tenant-ID: your-tenant-id" \
     https://api.attendancex.com/v1/users
```

### Interactive Documentation
- **Swagger UI**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)
- **OpenAPI Spec**: [http://localhost:5001/api/docs.json](http://localhost:5001/api/docs.json)
- **Postman Collection**: [Download Collection](https://api.attendancex.com/postman/collection.json)

## 📊 API Status & Performance

| Metric | Current Status | SLA Target |
|--------|---------------|------------|
| **Uptime** | 99.9% | 99.99% |
| **Response Time** | <200ms P95 | <100ms P95 |
| **Rate Limit** | 1000 req/hour | Per endpoint |
| **Error Rate** | <0.1% | <0.01% |

## 🏗️ Architecture Overview

### Multi-Tenant Design
- **Complete Data Isolation**: Each organization has separate data contexts
- **Tenant-Scoped Operations**: All endpoints automatically filter by tenant
- **Role-Based Access Control**: Granular permissions within each tenant
- **Audit Logging**: Comprehensive activity tracking per tenant

### TypeScript Integration
- **Full Type Safety**: Complete TypeScript definitions for all endpoints
- **Auto-Generated SDKs**: TypeScript, JavaScript, Python, and more
- **Schema Validation**: Runtime validation with compile-time safety
- **IDE Support**: IntelliSense and auto-completion for all API calls

## 📋 API Overview

### Core Endpoints

| Category | Endpoint | Description | Status |
|----------|----------|-------------|--------|
| **Authentication** | `/auth/*` | User login, registration, 2FA, OAuth | ✅ Stable |
| **Organizations** | `/organizations/*` | Multi-tenant management | ✅ Stable |
| **Users** | `/users/*` | User management and profiles | ✅ Stable |
| **Attendance** | `/attendance/*` | Check-in/out and time tracking | ✅ Stable |
| **CRM** | `/customers/*` | Customer relationship management | ✅ Stable |
| **Appointments** | `/appointments/*` | Scheduling and calendar | ✅ Stable |
| **Sales** | `/sales/*` | Orders, products, and invoicing | ✅ Stable |
| **Billing** | `/billing/*` | Subscription and payment management | ✅ Enhanced |
| **Permissions** | `/permissions/*` | Role-based access control | ✅ Enhanced |
| **Analytics** | `/analytics/*` | Reports and business intelligence | 🔄 Beta |
| **Integrations** | `/integrations/*` | Third-party connections | 🔄 Beta |
| **Webhooks** | `/webhooks/*` | Real-time event notifications | ✅ Stable |

### Response Format

All API responses follow a consistent structure with TypeScript definitions:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

### Error Handling

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid input data
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `RATE_LIMITED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Server error

## 🔐 Authentication API

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    }
  }
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "organizationName": "Acme Corp"
}
```

### Two-Factor Authentication
```http
POST /auth/2fa/enable
Authorization: Bearer YOUR_JWT_TOKEN

{
  "method": "totp"
}
```

## 🏢 Organizations API

### Get Organization
```http
GET /organizations/current
Authorization: Bearer YOUR_JWT_TOKEN
```

### Update Organization
```http
PUT /organizations/current
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Updated Company Name",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  }
}
```

### Invite User
```http
POST /organizations/invitations
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "manager",
  "message": "Welcome to our team!"
}
```

## 👥 Users API

### List Users
```http
GET /users?page=1&limit=20&role=employee
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create User
```http
POST /users
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "email": "employee@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "employee",
  "department": "Engineering"
}
```

### Update User Profile
```http
PUT /users/me
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "firstName": "Updated Name",
  "phone": "+1234567890",
  "preferences": {
    "notifications": true,
    "theme": "dark"
  }
}
```

## ⏰ Attendance API

### Check In
```http
POST /attendance/checkin
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "note": "Starting work day"
}
```

### Check Out
```http
POST /attendance/checkout
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "note": "End of work day"
}
```

### Get Attendance Records
```http
GET /attendance?startDate=2024-01-01&endDate=2024-01-31&userId=user_123
Authorization: Bearer YOUR_JWT_TOKEN
```

## 👤 CRM API

### List Customers
```http
GET /customers?page=1&limit=20&status=active
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create Customer
```http
POST /customers
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Customer",
  "email": "jane@customer.com",
  "phone": "+1234567890",
  "company": "Customer Corp",
  "tags": ["vip", "enterprise"]
}
```

### Update Customer
```http
PUT /customers/customer_123
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "active",
  "notes": "Updated customer information",
  "customFields": {
    "industry": "Technology",
    "size": "50-100 employees"
  }
}
```

## 📅 Appointments API

### List Appointments
```http
GET /appointments?date=2024-01-15&status=confirmed
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create Appointment
```http
POST /appointments
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "customerId": "customer_123",
  "title": "Product Demo",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "location": "Conference Room A",
  "notes": "Quarterly business review"
}
```

### Update Appointment
```http
PUT /appointments/appointment_123
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "confirmed",
  "startTime": "2024-01-15T10:30:00Z",
  "notes": "Updated meeting time"
}
```

## 💰 Sales API

### List Products
```http
GET /products?category=software&status=active
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create Order
```http
POST /orders
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "customerId": "customer_123",
  "items": [
    {
      "productId": "product_456",
      "quantity": 2,
      "price": 99.99
    }
  ],
  "discount": 10.00,
  "notes": "Bulk order discount applied"
}
```

### Generate Invoice
```http
POST /invoices
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "orderId": "order_789",
  "dueDate": "2024-02-15",
  "terms": "Net 30"
}
```

## 📊 Analytics API

### Get Dashboard Stats
```http
GET /analytics/dashboard?period=30d
Authorization: Bearer YOUR_JWT_TOKEN
```

### Attendance Report
```http
GET /analytics/attendance?startDate=2024-01-01&endDate=2024-01-31&groupBy=department
Authorization: Bearer YOUR_JWT_TOKEN
```

### Sales Report
```http
GET /analytics/sales?period=quarterly&year=2024
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔗 Integrations API

### List Integrations
```http
GET /integrations
Authorization: Bearer YOUR_JWT_TOKEN
```

### Connect OAuth Provider
```http
POST /integrations/oauth/google
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "scopes": ["calendar", "contacts"],
  "redirectUri": "https://app.attendancex.com/integrations/callback"
}
```

### Sync Data
```http
POST /integrations/sync/calendar
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "provider": "google",
  "syncDirection": "bidirectional"
}
```

## 📝 Webhooks

### Register Webhook
```http
POST /webhooks
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/attendancex",
  "events": ["user.created", "attendance.checkin", "order.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

| Event | Description | Payload |
|-------|-------------|---------|
| `user.created` | New user registered | User object |
| `attendance.checkin` | User checked in | Attendance record |
| `attendance.checkout` | User checked out | Attendance record |
| `appointment.created` | New appointment scheduled | Appointment object |
| `order.completed` | Order finalized | Order object |
| `invoice.paid` | Invoice payment received | Invoice object |

## 🚀 Rate Limits

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Authentication | 5 requests | 1 minute |
| General API | 1000 requests | 1 hour |
| Analytics | 100 requests | 1 hour |
| Webhooks | 50 requests | 1 minute |

## 📚 SDKs & Libraries

### Official SDKs
- **JavaScript/TypeScript**: `npm install @attendancex/sdk`
- **Python**: `pip install attendancex-sdk`
- **PHP**: `composer require attendancex/sdk`

### Community SDKs
- **Ruby**: `gem install attendancex`
- **Go**: `go get github.com/attendancex/go-sdk`
- **C#**: `Install-Package AttendanceX.SDK`

### Usage Example (JavaScript)
```javascript
import { AttendanceXClient } from '@attendancex/sdk';

const client = new AttendanceXClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.attendancex.com/v1'
});

// Get current user
const user = await client.users.getCurrentUser();

// Check in
const checkin = await client.attendance.checkIn({
  location: { latitude: 40.7128, longitude: -74.0060 }
});
```

## 🔧 Testing

### Postman Collection
Import our Postman collection for easy API testing:
- [Download Collection](https://api.attendancex.com/postman/collection.json)
- [Environment Variables](https://api.attendancex.com/postman/environment.json)

### cURL Examples
```bash
# Set your token
export TOKEN="your-jwt-token"

# Get current user
curl -H "Authorization: Bearer $TOKEN" \
     https://api.attendancex.com/v1/users/me

# Check in
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"location":{"latitude":40.7128,"longitude":-74.0060}}' \
     https://api.attendancex.com/v1/attendance/checkin
```

## 📞 Support

- **API Issues**: [GitHub Issues](https://github.com/SteveRuben/attendanceX/issues)
- **Documentation**: [docs@attendancex.com](mailto:docs@attendancex.com)
- **Enterprise Support**: [enterprise@attendancex.com](mailto:enterprise@attendancex.com)

---

*Last updated: January 2025*