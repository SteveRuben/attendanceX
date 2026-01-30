# Health Check Implementation - AttendanceX Backend

## Overview

Comprehensive health monitoring system for the AttendanceX backend API, providing detailed server status, service health, and performance metrics.

## Endpoints

### 1. Detailed Health Check
**Endpoint:** `GET /api/health`  
**Authentication:** None (Public)  
**Description:** Returns comprehensive server health status with service checks and metrics

#### Response Format
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-30T12:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "firestore": {
        "status": "operational",
        "responseTime": 45,
        "message": "Firestore connection successful"
      },
      "auth": {
        "status": "operational",
        "message": "Firebase Auth operational"
      },
      "functions": {
        "status": "operational",
        "responseTime": 120,
        "message": "Cloud Functions operational"
      }
    },
    "metrics": {
      "memory": {
        "used": 128,
        "total": 256,
        "percentage": 50,
        "unit": "MB"
      },
      "collections": {
        "events": 1234,
        "tenants": 45,
        "users": 0
      }
    }
  }
}
```

#### Status Codes
- **200 OK** - All services healthy
- **503 Service Unavailable** - One or more services degraded
- **500 Internal Server Error** - Critical failure

#### Overall Status Values
- **healthy** - All services operational
- **degraded** - Some services experiencing issues
- **unhealthy** - Critical services down

### 2. Simple Ping
**Endpoint:** `GET /api/health/ping`  
**Authentication:** None (Public)  
**Description:** Simple ping endpoint for uptime monitoring

#### Response Format
```json
{
  "success": true,
  "message": "pong",
  "timestamp": "2026-01-30T12:00:00.000Z"
}
```

### 3. Legacy Health Check (Deprecated)
**Endpoint:** `GET /api/health-legacy`  
**Authentication:** None (Public)  
**Description:** Legacy health check endpoint maintained for backward compatibility

**Note:** Use `/api/health` for new implementations.

## Service Checks

### Firestore Health
- Tests database connectivity by querying subscription_plans collection
- Measures response time
- Returns operational/down status with error details

### Auth Health
- Basic Firebase Auth availability check
- Returns operational/down status

### Functions Health
- Measures overall function response time
- Always operational if endpoint responds

## Metrics

### Memory Metrics
- **used**: Heap memory used (MB)
- **total**: Total heap memory (MB)
- **percentage**: Memory usage percentage
- **unit**: Measurement unit (MB)

### Collection Metrics
- **events**: Total event count
- **tenants**: Total tenant count
- **users**: User count (optimized - set to 0 for performance)

**Note:** User count removed from expensive collectionGroup query for performance optimization.

## Implementation Details

### File Structure
```
backend/functions/src/
├── controllers/health/
│   └── health.controller.ts    # Health check logic
├── routes/health/
│   └── health.routes.ts        # Health endpoints
└── routes/
    └── index.ts                # Route registration
```

### Controller Functions

#### `getHealthStatus()`
Main health check function that:
1. Checks Firestore connectivity
2. Validates Auth service
3. Collects memory metrics
4. Gathers collection counts
5. Determines overall status
6. Returns comprehensive health report

#### `ping()`
Simple ping function for uptime monitoring.

### Helper Functions

#### `checkFirestoreHealth()`
Tests Firestore connectivity by attempting to read from subscription_plans collection.

#### `checkAuthHealth()`
Basic Firebase Auth availability check.

#### `getMemoryMetrics()`
Collects Node.js process memory usage statistics.

#### `getCollectionMetrics()`
Counts documents in key collections (optimized for performance).

#### `determineOverallStatus()`
Aggregates service statuses to determine overall health.

## Usage Examples

### cURL
```bash
# Detailed health check
curl https://api.attendancex.com/api/health

# Simple ping
curl https://api.attendancex.com/api/health/ping
```

### JavaScript/TypeScript
```typescript
// Detailed health check
const response = await fetch('https://api.attendancex.com/api/health');
const health = await response.json();

if (health.data.status === 'healthy') {
  console.log('All systems operational');
} else {
  console.warn('System degraded:', health.data.services);
}

// Simple ping
const pingResponse = await fetch('https://api.attendancex.com/api/health/ping');
const ping = await pingResponse.json();
console.log(ping.message); // "pong"
```

### Monitoring Integration

#### Uptime Robot
```
Monitor Type: HTTP(s)
URL: https://api.attendancex.com/api/health/ping
Interval: 5 minutes
```

#### Datadog
```yaml
init_config:

instances:
  - url: https://api.attendancex.com/api/health
    name: attendancex_health
    timeout: 10
    http_response_status_code: 200
```

#### Prometheus
```yaml
- job_name: 'attendancex'
  metrics_path: '/api/health'
  static_configs:
    - targets: ['api.attendancex.com']
```

## Performance Considerations

### Optimizations
1. **Collection Counts**: Uses Firestore count() aggregation for efficiency
2. **User Count**: Removed expensive collectionGroup query (set to 0)
3. **Timeout Protection**: Firestore check has implicit timeout
4. **Parallel Checks**: Service checks run concurrently with Promise.all

### Response Times
- **Target**: < 500ms for healthy system
- **Typical**: 100-200ms
- **Degraded**: > 1000ms indicates issues

## Error Handling

### Graceful Degradation
- Individual service failures don't crash the endpoint
- Returns partial health information even on errors
- Logs all errors for debugging

### Error Response Format
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "timestamp": "2026-01-30T12:00:00.000Z",
    "services": {
      "firestore": {
        "status": "down",
        "message": "Connection timeout"
      }
    }
  },
  "error": {
    "code": "HEALTH_CHECK_FAILED",
    "message": "Health check failed",
    "details": "Connection timeout"
  }
}
```

## Logging

### Log Levels
- **INFO**: Successful health checks with response time
- **WARN**: Collection metrics failures (non-critical)
- **ERROR**: Critical health check failures

### Log Format
```typescript
logger.info('✅ Health check completed in 120ms', {
  status: 'healthy',
  responseTime: 120
});

logger.error('❌ Health check failed', {
  error: 'Connection timeout',
  responseTime: 5000
});
```

## Security Considerations

### Public Access
- Health endpoints are intentionally public (no authentication)
- Do not expose sensitive information in responses
- Internal notes and audit logs excluded from metrics

### Rate Limiting
- Health endpoints should be excluded from aggressive rate limiting
- Allow frequent checks from monitoring services
- Consider separate rate limit for health endpoints

## Testing

### Manual Testing
```bash
# Local development
curl http://localhost:5001/api/health

# Production
curl https://api.attendancex.com/api/health
```

### Automated Testing
```typescript
describe('Health Check API', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('healthy');
    expect(response.body.data.services.firestore.status).toBe('operational');
  });

  it('should respond to ping', async () => {
    const response = await request(app)
      .get('/api/health/ping')
      .expect(200);

    expect(response.body.message).toBe('pong');
  });
});
```

## Maintenance

### Adding New Service Checks
1. Create check function in health.controller.ts
2. Add to service checks in getHealthStatus()
3. Update determineOverallStatus() logic
4. Update documentation

### Modifying Metrics
1. Update interface definitions
2. Modify metric collection functions
3. Update response format documentation
4. Test performance impact

## Troubleshooting

### Common Issues

#### High Response Times
- Check Firestore connectivity
- Verify collection count queries are optimized
- Review memory usage

#### Intermittent Failures
- Check network connectivity
- Verify Firebase credentials
- Review rate limiting settings

#### Incorrect Status
- Verify service check logic
- Check determineOverallStatus() thresholds
- Review error handling

## Future Enhancements

### Planned Features
- [ ] Storage service health check
- [ ] Advanced Auth checks (user creation test)
- [ ] Cache service health (Redis)
- [ ] External API dependency checks
- [ ] Historical health metrics
- [ ] Alerting integration
- [ ] Custom health check plugins

### Performance Improvements
- [ ] Cache health status (5-10 second TTL)
- [ ] Async metric collection
- [ ] Configurable check timeouts
- [ ] Selective service checks based on query params

## References

- **Controller**: `backend/functions/src/controllers/health/health.controller.ts`
- **Routes**: `backend/functions/src/routes/health/health.routes.ts`
- **Main Routes**: `backend/functions/src/routes/index.ts`
- **Project Status**: `PROJECT_STATUS_2026-01-30.md`

---

**Last Updated**: January 30, 2026  
**Version**: 1.0.0  
**Status**: ✅ Implemented and Operational
