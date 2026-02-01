# Quick Reference - Audit Logs & Email Test

## 🚀 Production API
**Base URL:** `https://api-rvnxjp7idq-bq.a.run.app`

---

## 📋 Audit Logs API

### Get All Audit Logs
```bash
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get Specific Audit Log
```bash
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs/LOG_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Filter Audit Logs
```bash
# By action
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?action=USER_LOGIN" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# By severity
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?severity=ERROR" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# By date range
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?startDate=2026-01-01&endDate=2026-02-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Pagination
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Combined filters
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?action=USER_LOGIN&severity=INFO&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Response Format
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-uuid",
        "tenantId": "tenant-id",
        "action": "USER_LOGIN",
        "severity": "INFO",
        "actorId": "user-id",
        "actorIp": "192.168.1.1",
        "actorUserAgent": "Mozilla/5.0...",
        "targetType": "user",
        "targetId": "user-id",
        "description": "User logged in successfully",
        "metadata": {
          "loginMethod": "email",
          "deviceType": "desktop"
        },
        "success": true,
        "endpoint": "/api/v1/auth/login",
        "method": "POST",
        "createdAt": "2026-02-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 📧 Email Test API

### Send Test Email (PUBLIC - No Auth Required)
```bash
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com"
  }'
```

### With Provider Selection
```bash
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "provider": "resend"
  }'
```

### Response Format
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "data": {
    "to": "your-email@example.com",
    "provider": "resend",
    "notificationId": "notification-uuid",
    "timestamp": "2026-02-01T00:52:06.933Z",
    "duration": "1234ms"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "to"
  }
}
```

---

## 🔑 Authentication

### Get Admin Token
```bash
# Login as admin
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": "user-id",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

---

## 📊 Audit Action Types

### Authentication (10+ actions)
- `USER_LOGIN` - User logged in
- `USER_LOGOUT` - User logged out
- `USER_REGISTER` - User registered
- `PASSWORD_RESET_REQUEST` - Password reset requested
- `PASSWORD_RESET_COMPLETE` - Password reset completed
- `EMAIL_VERIFICATION_SENT` - Email verification sent
- `EMAIL_VERIFICATION_COMPLETE` - Email verified
- `TOKEN_REFRESH` - Token refreshed
- `SESSION_EXPIRED` - Session expired
- `ACCOUNT_LOCKED` - Account locked

### User Management (10+ actions)
- `USER_CREATE` - User created
- `USER_UPDATE` - User updated
- `USER_DELETE` - User deleted
- `USER_SUSPEND` - User suspended
- `USER_ACTIVATE` - User activated
- `USER_ROLE_CHANGE` - User role changed
- `USER_PERMISSION_GRANT` - Permission granted
- `USER_PERMISSION_REVOKE` - Permission revoked
- `USER_PROFILE_UPDATE` - Profile updated
- `USER_PASSWORD_CHANGE` - Password changed

### Event Management (10+ actions)
- `EVENT_CREATE` - Event created
- `EVENT_UPDATE` - Event updated
- `EVENT_DELETE` - Event deleted
- `EVENT_PUBLISH` - Event published
- `EVENT_CANCEL` - Event cancelled
- `EVENT_DUPLICATE` - Event duplicated
- `EVENT_REGISTRATION_OPEN` - Registration opened
- `EVENT_REGISTRATION_CLOSE` - Registration closed
- `EVENT_CHECKIN_START` - Check-in started
- `EVENT_CHECKIN_END` - Check-in ended

### Attendance (5+ actions)
- `ATTENDANCE_MARK` - Attendance marked
- `ATTENDANCE_UPDATE` - Attendance updated
- `ATTENDANCE_VALIDATE` - Attendance validated
- `ATTENDANCE_REJECT` - Attendance rejected
- `ATTENDANCE_EXPORT` - Attendance exported

### Email Operations (3+ actions)
- `EMAIL_SEND` - Email sent
- `EMAIL_FAIL` - Email failed
- `EMAIL_BOUNCE` - Email bounced

### System Operations (5+ actions)
- `SYSTEM_START` - System started
- `SYSTEM_STOP` - System stopped
- `SYSTEM_ERROR` - System error
- `SYSTEM_CONFIG_CHANGE` - Configuration changed
- `SYSTEM_BACKUP` - Backup created

---

## 🎯 Severity Levels

- **INFO** - Normal operations (login, create, update)
- **WARNING** - Potential issues (failed login attempts, rate limits)
- **ERROR** - Errors that occurred (email failures, validation errors)
- **CRITICAL** - Critical security events (account locked, unauthorized access)

---

## 🔒 Permissions Required

### Audit Logs Endpoints
- **Required Role:** `admin` or `owner`
- **Middleware Chain:**
  1. Rate limiting
  2. Authentication
  3. Tenant context injection
  4. Role verification

### Email Test Endpoint
- **Required Role:** None (PUBLIC endpoint)
- **Middleware Chain:**
  1. Rate limiting only

---

## 💡 Usage Examples

### Monitor Failed Logins
```bash
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?action=USER_LOGIN&success=false&severity=WARNING" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Track User Activity
```bash
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?actorId=USER_ID&startDate=2026-01-01" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Monitor Critical Events
```bash
curl -X GET "https://api-rvnxjp7idq-bq.a.run.app/api/v1/audit-logs?severity=CRITICAL" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Email Configuration
```bash
# Test with default provider (Resend)
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}'

# Test with specific provider
curl -X POST "https://api-rvnxjp7idq-bq.a.run.app/api/v1/public/test-email" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "provider": "smtp"}'
```

---

## 🐛 Troubleshooting

### Audit Logs Not Showing
1. Verify you have admin/owner role
2. Check authentication token is valid
3. Verify tenant context is correct
4. Check rate limits haven't been exceeded

### Email Test Failing
1. Verify email format is valid
2. Check Resend API key is configured
3. Verify rate limits haven't been exceeded
4. Check audit logs for error details

### Authentication Issues
1. Verify token hasn't expired
2. Check user has correct role
3. Verify tenant context is correct
4. Try refreshing the token

---

## 📚 Related Documentation

- Full deployment guide: `AUDIT_LOGS_EMAIL_TEST_DEPLOYED.md`
- Project status: `STATUS_PROJET_2026-01-31.md`
- API documentation: `docs/api/README.md`
- Backend setup: `docs/setup/backend-setup.md`

---

**Last Updated:** 2026-02-01  
**Production API:** https://api-rvnxjp7idq-bq.a.run.app
