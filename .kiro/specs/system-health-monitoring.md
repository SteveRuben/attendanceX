# System Health Monitoring - Complete Implementation Spec

## Status: 🟡 In Progress
**Created**: 2026-01-30  
**Updated**: 2026-01-30  
**Priority**: High  
**Type**: System Infrastructure  
**Estimated Effort**: 3-5 days

## Executive Summary

Complete implementation of system-level health monitoring following the full MVC pattern from `code-review-guidelines.md`. This feature provides global system health metrics and monitoring capabilities that bypass tenant scoping for system administrators only.

## Overview

Implementation of system-level health monitoring collections that bypass tenant scoping to provide global system health metrics and monitoring capabilities. This is a **CRITICAL SECURITY FEATURE** that requires strict access control and comprehensive audit logging.

## Context

### Current State (✅ Completed)
1. **Database Collections** - Added to `database.ts`:
   - `_system_health_checks` - Stores health check test documents
   - `_system_metrics` - Stores system-wide performance metrics
2. **Types** - Complete TypeScript interfaces in `system-health.types.ts` (417 lines)
3. **Health Check Endpoint** - Basic implementation in `health.controller.ts`
4. **Scheduled Cleanup** - Hourly cleanup function in `cleanup-health-checks.ts`

### What's Missing (🔴 Required)
Following the **7-step MVC pattern** from code review guidelines:
- ✅ Step 1: Database collections (DONE)
- ✅ Step 2: Types (DONE)
- 🔴 Step 3: Models with BaseModel validation
- 🔴 Step 4: Service layer with business logic
- 🔴 Step 5: Controllers with proper error handling
- 🔴 Step 6: Routes with complete middleware chain
- 🔴 Step 7: System admin middleware for access control

### Security Context

These collections use underscore prefix (`_`) to indicate system-level scope and **do not include tenantId**, making them fundamentally different from standard tenant-scoped collections.

**⚠️ CRITICAL**: This bypasses the core multi-tenant security model and requires exceptional security measures.

## Security Architecture

### ⚠️ CRITICAL: Tenant Scoping Bypass

These collections bypass the standard tenant isolation model, which introduces **CRITICAL SECURITY RISKS**:

| Risk | Severity | Impact |
|------|----------|--------|
| No Tenant Isolation | 🔴 Critical | Data accessible across all tenants |
| Privilege Escalation | 🔴 Critical | Could grant unauthorized system access |
| Data Leakage | 🔴 Critical | Cross-tenant data exposure |
| Resource Exhaustion | 🟡 Medium | Unbounded data accumulation |

### Required Security Controls (Non-Negotiable)

#### 1. Access Control
- ✅ **System Admin Role**: Firebase custom claims with `systemAdmin: true`
- ✅ **Middleware**: `systemAdminMiddleware` (NOT `tenantContextMiddleware`)
- ✅ **Firestore Rules**: Explicit deny for non-system-admins
- ✅ **Audit Logging**: All operations logged with user context

#### 2. Rate Limiting
```typescript
// Stricter limits for system endpoints
const systemRateLimits = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many system requests'
};
```

#### 3. Data Retention
- Health checks: 1 hour TTL (auto-cleanup)
- Metrics: 30 days retention (configurable)
- Audit logs: 90 days retention (compliance)

#### 4. Monitoring & Alerting
- Alert on unauthorized access attempts
- Alert on unusual query patterns
- Alert on cleanup failures
- Dashboard for system admin activity

## User Stories & Acceptance Criteria

### Epic: System Health Monitoring Infrastructure

#### US-1: System Health Check Endpoint ✅ COMPLETED
**As a** system administrator  
**I want** to check the overall system health  
**So that** I can monitor service availability and performance

**Acceptance Criteria**:
- ✅ Endpoint returns comprehensive health status
- ✅ Checks Firestore connectivity with 5s timeout
- ✅ Checks Firebase Auth availability
- ✅ Returns memory metrics (used, total, percentage)
- ✅ Returns collection counts (optimized, no collectionGroup)
- ✅ Cleanup of test documents after check
- ✅ Proper error handling and structured logging
- ✅ No authentication required (public endpoint)

**Status**: ✅ Implemented in `health.controller.ts`  
**Endpoint**: `GET /api/health/status`

---

#### US-2: Scheduled Health Check Cleanup ✅ COMPLETED
**As a** system  
**I want** to automatically cleanup old health check documents  
**So that** the database doesn't accumulate test data

**Acceptance Criteria**:
- ✅ Scheduled function runs every hour
- ✅ Removes documents older than 1 hour
- ✅ Uses batch operations (max 100 docs per batch)
- ✅ Structured logging with duration metrics
- ✅ Handles errors gracefully without crashing
- ✅ Returns count of deleted documents

**Status**: ✅ Implemented in `cleanup-health-checks.ts`  
**Schedule**: `every 1 hours`

---

#### US-3: System Metrics Recording 🔴 NOT STARTED
**As a** system administrator  
**I want** to record system-wide performance metrics  
**So that** I can track trends and identify performance issues

**Acceptance Criteria**:
- [ ] POST endpoint to record metrics
- [ ] Validates metric type against enum
- [ ] Validates value is a valid number
- [ ] Stores with timestamp and environment
- [ ] Returns created metric with ID
- [ ] Requires system admin authentication
- [ ] Rate limited (100 requests per 15 min)
- [ ] Audit logged with user context

**Endpoint**: `POST /api/system/health/metrics`  
**Request Body**:
```typescript
{
  metricType: SystemMetricType,
  value: number,
  unit: string,
  metadata?: Record<string, any>
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    timestamp: Date,
    metricType: SystemMetricType,
    value: number,
    unit: string,
    environment: string
  }
}
```

---

#### US-4: System Metrics Query 🔴 NOT STARTED
**As a** system administrator  
**I want** to query historical system metrics  
**So that** I can analyze performance trends

**Acceptance Criteria**:
- [ ] GET endpoint with query parameters
- [ ] Filter by metric type
- [ ] Filter by date range (startDate, endDate)
- [ ] Filter by environment
- [ ] Pagination support (limit, offset)
- [ ] Default limit: 100, max: 1000
- [ ] Ordered by timestamp DESC
- [ ] Requires system admin authentication
- [ ] Returns array of metrics with pagination meta

**Endpoint**: `GET /api/system/health/metrics`  
**Query Parameters**:
```typescript
{
  metricType?: SystemMetricType,
  startDate?: ISO8601,
  endDate?: ISO8601,
  environment?: string,
  limit?: number,  // default: 100, max: 1000
  offset?: number  // default: 0
}
```

**Response**:
```typescript
{
  success: true,
  data: SystemMetric[],
  pagination: {
    limit: number,
    offset: number,
    total: number
  }
}
```

---

#### US-5: System Admin Access Control 🔴 NOT STARTED
**As a** system  
**I want** to restrict system health endpoints to system admins only  
**So that** unauthorized users cannot access system-level data

**Acceptance Criteria**:
- [ ] Middleware checks `user.customClaims.systemAdmin === true`
- [ ] Returns 403 FORBIDDEN if not system admin
- [ ] Logs unauthorized access attempts with user context
- [ ] Logs successful system admin access for audit
- [ ] Works with existing authMiddleware
- [ ] Does NOT use tenantContextMiddleware

**Middleware**: `systemAdminMiddleware`  
**Location**: `backend/functions/src/middleware/system-admin.middleware.ts`

---

#### US-6: Metrics Cleanup Scheduled Function 🔴 NOT STARTED
**As a** system  
**I want** to automatically cleanup old metrics  
**So that** storage costs remain manageable

**Acceptance Criteria**:
- [ ] Scheduled function runs daily
- [ ] Removes metrics older than 30 days (configurable)
- [ ] Uses batch operations (max 500 docs per batch)
- [ ] Structured logging with count and duration
- [ ] Handles errors gracefully
- [ ] Configurable retention period via environment variable

**Schedule**: `every 24 hours`  
**Function**: `cleanupSystemMetrics`  
**Location**: `backend/functions/src/functions/scheduled/cleanup-system-metrics.ts`

## Complete MVC Implementation Plan

Following the **7-step pattern** from `code-review-guidelines.md`:

### Step 1: ✅ Database Collections (COMPLETED)

**File**: `backend/functions/src/config/database.ts`

```typescript
// System-level collections (no tenant scoping)
system_health_checks: db.collection("_system_health_checks"),
system_metrics: db.collection("_system_metrics")
```

**Collection Names**:
```typescript
SYSTEM_HEALTH_CHECKS: "_system_health_checks",
SYSTEM_METRICS: "_system_metrics"
```

**Status**: ✅ Already implemented

---

### Step 2: ✅ Types (COMPLETED)

**File**: `backend/functions/src/types/system-health.types.ts` (417 lines)

**Key Interfaces**:
- `SystemHealthCheck` - Health check document structure
- `SystemMetric` - Metric document structure
- `SystemMetricType` - Enum of metric types (15 types)
- `SystemHealthStatus` - Complete health status response
- `ServiceStatus` - Individual service health
- `CreateSystemMetricRequest` - API request body
- `SystemMetricsQuery` - Query parameters
- `SystemAdminUser` - Admin user structure
- `SystemAuditLog` - Audit logging structure

**Status**: ✅ Complete with comprehensive types

---

### Step 3: 🔴 Models (REQUIRED)

**File**: `backend/functions/src/models/system-health.model.ts`

**Required Classes**:

#### SystemHealthCheckModel
```typescript
export class SystemHealthCheckModel extends BaseModel<SystemHealthCheck> {
  constructor(data: Partial<SystemHealthCheck>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const check = this.data;

    // Required fields validation
    BaseModel.validateRequired(check, [
      'timestamp', 
      'checkId', 
      'environment'
    ]);

    // Environment validation
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(check.environment)) {
      throw new ValidationError(
        `Invalid environment: ${check.environment}. Must be one of: ${validEnvironments.join(', ')}`,
        'environment'
      );
    }

    // Timestamp validation
    if (!BaseModel.validateDate(check.timestamp)) {
      throw new ValidationError('Invalid timestamp', 'timestamp');
    }

    // ExpiresAt validation
    if (check.expiresAt && !BaseModel.validateDate(check.expiresAt)) {
      throw new ValidationError('Invalid expiresAt date', 'expiresAt');
    }

    // ExpiresAt must be after timestamp
    if (check.expiresAt && check.expiresAt <= check.timestamp) {
      throw new ValidationError(
        'expiresAt must be after timestamp',
        'expiresAt'
      );
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = SystemHealthCheckModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  static fromFirestore(doc: DocumentSnapshot): SystemHealthCheckModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SystemHealthCheckModel.prototype
      .convertDatesFromFirestore(data);

    return new SystemHealthCheckModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static createHealthCheck(environment: string): SystemHealthCheckModel {
    const checkId = `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600000); // 1 hour

    return new SystemHealthCheckModel({
      timestamp: now,
      test: true,
      environment,
      checkId,
      expiresAt
    });
  }
}
```

#### SystemMetricModel
```typescript
export class SystemMetricModel extends BaseModel<SystemMetric> {
  constructor(data: Partial<SystemMetric>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const metric = this.data;

    // Required fields validation
    BaseModel.validateRequired(metric, [
      'timestamp',
      'metricType',
      'value',
      'unit',
      'environment'
    ]);

    // Metric type validation
    if (!Object.values(SystemMetricType).includes(metric.metricType)) {
      throw new ValidationError(
        `Invalid metric type: ${metric.metricType}`,
        'metricType'
      );
    }

    // Value validation
    if (typeof metric.value !== 'number' || isNaN(metric.value)) {
      throw new ValidationError(
        'Metric value must be a valid number',
        'value'
      );
    }

    // Value must be non-negative for most metrics
    if (metric.value < 0) {
      throw new ValidationError(
        'Metric value cannot be negative',
        'value'
      );
    }

    // Unit validation
    if (!metric.unit || metric.unit.trim().length === 0) {
      throw new ValidationError(
        'Unit is required and cannot be empty',
        'unit'
      );
    }

    // Timestamp validation
    if (!BaseModel.validateDate(metric.timestamp)) {
      throw new ValidationError('Invalid timestamp', 'timestamp');
    }

    // Environment validation
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(metric.environment)) {
      throw new ValidationError(
        `Invalid environment: ${metric.environment}`,
        'environment'
      );
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = SystemMetricModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  static fromFirestore(doc: DocumentSnapshot): SystemMetricModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SystemMetricModel.prototype
      .convertDatesFromFirestore(data);

    return new SystemMetricModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateSystemMetricRequest
  ): SystemMetricModel {
    const environment = process.env.APP_ENV || 
                       process.env.NODE_ENV || 
                       'production';

    const metricData = {
      ...request,
      timestamp: new Date(),
      environment,
    };

    return new SystemMetricModel(metricData);
  }

  // Helper method to remove undefined fields
  protected static removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  }
}
```

**Validation Rules**:
- ✅ All required fields validated
- ✅ Enum values validated against SystemMetricType
- ✅ Numeric values validated (no NaN, no negative)
- ✅ Date validation with proper error messages
- ✅ Environment validation (development/staging/production)
- ✅ Field-specific error messages with field names

**Status**: 🔴 Needs implementation

---

### Step 4: 🔴 Service Layer (REQUIRED)

**File**: `backend/functions/src/services/system-health/system-health.service.ts`

**Service Class**: `SystemHealthService`

**Methods Required**:

#### 1. recordMetric()
```typescript
/**
 * Record a system metric
 * NOTE: No tenant scoping - system-level operation
 * 
 * @param request - Metric data to record
 * @returns Created metric with ID
 * @throws ValidationError if data is invalid
 */
async recordMetric(request: CreateSystemMetricRequest): Promise<SystemMetric> {
  const startTime = Date.now();
  
  try {
    // Create model from request
    const metricModel = SystemMetricModel.fromCreateRequest(request);
    
    // Validate model
    await metricModel.validate();
    
    // Save to Firestore
    const metricRef = collections.system_metrics.doc();
    await metricRef.set(metricModel.toFirestore());
    
    const duration = Date.now() - startTime;
    logger.info('✅ System metric recorded', {
      metricId: metricRef.id,
      metricType: request.metricType,
      value: request.value,
      duration
    });
    
    return {
      id: metricRef.id,
      ...metricModel.data
    } as SystemMetric;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('❌ Failed to record metric', {
      error: error.message,
      metricType: request.metricType,
      duration
    });
    
    if (error instanceof ValidationError) throw error;
    throw new Error(`Failed to record metric: ${error.message}`);
  }
}
```

#### 2. queryMetrics()
```typescript
/**
 * Query system metrics with filters
 * NOTE: No tenant scoping - system-level operation
 * 
 * @param query - Query parameters (type, dates, limit)
 * @returns Array of metrics matching query
 * @throws Error if query fails
 */
async queryMetrics(query: SystemMetricsQuery): Promise<SystemMetric[]> {
  const startTime = Date.now();
  
  try {
    // Build Firestore query
    let firestoreQuery = collections.system_metrics
      .orderBy('timestamp', 'desc')
      .limit(Math.min(query.limit || 100, 1000)); // Max 1000

    // Apply filters
    if (query.metricType) {
      firestoreQuery = firestoreQuery.where('metricType', '==', query.metricType);
    }

    if (query.environment) {
      firestoreQuery = firestoreQuery.where('environment', '==', query.environment);
    }

    if (query.startDate) {
      firestoreQuery = firestoreQuery.where('timestamp', '>=', query.startDate);
    }

    if (query.endDate) {
      firestoreQuery = firestoreQuery.where('timestamp', '<=', query.endDate);
    }

    // Execute query
    const snapshot = await firestoreQuery.get();
    
    // Convert to models
    const metrics = snapshot.docs
      .map(doc => SystemMetricModel.fromFirestore(doc))
      .filter(model => model !== null)
      .map(model => model!.data as SystemMetric);
    
    const duration = Date.now() - startTime;
    logger.info('✅ Metrics queried successfully', {
      count: metrics.length,
      filters: query,
      duration
    });
    
    return metrics;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('❌ Failed to query metrics', {
      error: error.message,
      query,
      duration
    });
    throw new Error(`Failed to query metrics: ${error.message}`);
  }
}
```

#### 3. cleanupOldHealthChecks()
```typescript
/**
 * Cleanup old health check documents
 * NOTE: No tenant scoping - system-level operation
 * 
 * @param olderThanHours - Age threshold in hours (default: 1)
 * @returns Number of documents deleted
 */
async cleanupOldHealthChecks(olderThanHours: number = 1): Promise<number> {
  const startTime = Date.now();
  
  try {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 3600000));
    
    logger.info('🧹 Starting health check cleanup', {
      cutoffTime: cutoffTime.toISOString(),
      olderThanHours
    });
    
    // Query old documents (limit to 100 per batch)
    const snapshot = await collections.system_health_checks
      .where('timestamp', '<', cutoffTime)
      .limit(100)
      .get();
    
    if (snapshot.empty) {
      logger.info('✅ No old health check documents to cleanup');
      return 0;
    }
    
    // Batch delete
    const batch = collections.system_health_checks.firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    
    const duration = Date.now() - startTime;
    logger.info(`✅ Cleaned up ${snapshot.size} health check documents`, {
      count: snapshot.size,
      duration
    });
    
    return snapshot.size;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('❌ Failed to cleanup health checks', {
      error: error.message,
      duration
    });
    throw new Error(`Failed to cleanup health checks: ${error.message}`);
  }
}
```

#### 4. cleanupOldMetrics()
```typescript
/**
 * Cleanup old metrics documents
 * NOTE: No tenant scoping - system-level operation
 * 
 * @param olderThanDays - Age threshold in days (default: 30)
 * @returns Number of documents deleted
 */
async cleanupOldMetrics(olderThanDays: number = 30): Promise<number> {
  const startTime = Date.now();
  
  try {
    const cutoffTime = new Date(Date.now() - (olderThanDays * 24 * 3600000));
    
    logger.info('🧹 Starting metrics cleanup', {
      cutoffTime: cutoffTime.toISOString(),
      olderThanDays
    });
    
    // Query old documents (limit to 500 per batch)
    const snapshot = await collections.system_metrics
      .where('timestamp', '<', cutoffTime)
      .limit(500)
      .get();
    
    if (snapshot.empty) {
      logger.info('✅ No old metrics to cleanup');
      return 0;
    }
    
    // Batch delete
    const batch = collections.system_metrics.firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    
    const duration = Date.now() - startTime;
    logger.info(`✅ Cleaned up ${snapshot.size} metric documents`, {
      count: snapshot.size,
      duration
    });
    
    return snapshot.size;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('❌ Failed to cleanup metrics', {
      error: error.message,
      duration
    });
    throw new Error(`Failed to cleanup metrics: ${error.message}`);
  }
}
```

**Export**:
```typescript
export const systemHealthService = new SystemHealthService();
```

**Status**: 🔴 Needs implementation

---

### Step 5: 🔴 Controllers (REQUIRED)

**File**: `backend/functions/src/controllers/system-health/system-health.controller.ts`

**Controller Class**: `SystemHealthController`

**Methods Required**:

#### 1. recordMetric()
```typescript
/**
 * POST /api/system/health/metrics
 * Record a new system metric
 * 
 * @requires systemAdmin role
 * @body CreateSystemMetricRequest
 * @returns 201 with created metric
 */
static recordMetric = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const userId = req.user?.uid;

  try {
    // Verify system admin (already done by middleware, but double-check)
    if (!req.user?.customClaims?.systemAdmin) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(
        res,
        ERROR_CODES.FORBIDDEN,
        'System administrator access required'
      );
    }

    const metricRequest: CreateSystemMetricRequest = req.body;

    // Validate required fields
    if (!metricRequest.metricType) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'metricType is required'
      );
    }

    if (metricRequest.value === undefined || metricRequest.value === null) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'value is required'
      );
    }

    if (!metricRequest.unit) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'unit is required'
      );
    }

    logger.info('🚀 Recording system metric', {
      userId,
      metricType: metricRequest.metricType,
      value: metricRequest.value
    });

    const metric = await systemHealthService.recordMetric(metricRequest);

    const duration = Date.now() - startTime;
    logger.info(`✅ Metric recorded successfully in ${duration}ms`, {
      metricId: metric.id,
      userId,
      duration
    });

    res.status(201).json({
      success: true,
      message: 'Metric recorded successfully',
      data: metric
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    logger.error(`❌ Error recording metric after ${duration}ms`, {
      userId,
      error: error.message,
      duration
    });

    if (error.code === 'VALIDATION_ERROR') {
      return errorHandler.sendError(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        error.message
      );
    }

    return errorHandler.sendError(
      res,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Failed to record metric'
    );
  }
});
```

#### 2. getMetrics()
```typescript
/**
 * GET /api/system/health/metrics
 * Query system metrics with filters
 * 
 * @requires systemAdmin role
 * @query metricType, startDate, endDate, environment, limit, offset
 * @returns 200 with metrics array and pagination
 */
static getMetrics = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const userId = req.user?.uid;

  try {
    // Verify system admin
    if (!req.user?.customClaims?.systemAdmin) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(
        res,
        ERROR_CODES.FORBIDDEN,
        'System administrator access required'
      );
    }

    // Parse query parameters
    const query: SystemMetricsQuery = {
      metricType: req.query.metricType as SystemMetricType,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      environment: req.query.environment as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    // Validate limit
    if (query.limit && (query.limit < 1 || query.limit > 1000)) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(
        res,
        ERROR_CODES.VALIDATION_ERROR,
        'limit must be between 1 and 1000'
      );
    }

    logger.info('🔍 Querying system metrics', {
      userId,
      query
    });

    const metrics = await systemHealthService.queryMetrics(query);

    const duration = Date.now() - startTime;
    logger.info(`✅ Metrics retrieved successfully in ${duration}ms`, {
      count: metrics.length,
      userId,
      duration
    });

    res.json({
      success: true,
      data: metrics,
      pagination: {
        limit: query.limit || 100,
        offset: query.offset || 0,
        total: metrics.length
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

    logger.error(`❌ Error querying metrics after ${duration}ms`, {
      userId,
      error: error.message,
      duration
    });

    return errorHandler.sendError(
      res,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Failed to query metrics'
    );
  }
});
```

**Status**: 🔴 Needs implementation

---

### Step 6: 🔴 Routes (REQUIRED)

**File**: `backend/functions/src/routes/system-health/system-health.routes.ts`

```typescript
import { Router } from "express";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { authMiddleware } from "../../middleware/auth";
import { systemAdminMiddleware } from "../../middleware/system-admin.middleware";
import { SystemHealthController } from "../../controllers/system-health/system-health.controller";

const router = Router();

// ============================================
// PUBLIC ENDPOINTS (No authentication)
// ============================================
router.get("/ping", SystemHealthController.ping);
router.get("/status", SystemHealthController.getHealthStatus);

// ============================================
// SYSTEM ADMIN ENDPOINTS (Strict access control)
// ============================================
// Apply middleware chain for protected endpoints
router.use(smartRateLimit);      // Rate limiting
router.use(authMiddleware);      // JWT authentication
router.use(systemAdminMiddleware); // System admin verification

// Metrics endpoints
router.post("/metrics", SystemHealthController.recordMetric);
router.get("/metrics", SystemHealthController.getMetrics);

export { router as systemHealthRoutes };
```

**Integration in `routes/index.ts`**:
```typescript
import { systemHealthRoutes } from "./system-health/system-health.routes";

// In setupRoutes function
export const setupRoutes = (app: Express) => {
  // ... existing routes ...
  
  // System health routes (system-level, no tenant scoping)
  app.use("/api/system/health", systemHealthRoutes);
  
  // ... other routes ...
};
```

**Status**: 🔴 Needs implementation

---

### Step 7: 🔴 System Admin Middleware (REQUIRED)

**File**: `backend/functions/src/middleware/system-admin.middleware.ts`

```typescript
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { logger } from 'firebase-functions';
import { AuthErrorHandler } from '../utils/auth';
import { ERROR_CODES } from '../common/constants';

/**
 * System Admin Middleware
 * 
 * Verifies that the authenticated user has system-level admin privileges.
 * 
 * CRITICAL SECURITY:
 * - This middleware bypasses tenant scoping
 * - Grants access to system-level collections
 * - Only use for system administration endpoints
 * - All access attempts are logged for audit
 * 
 * Requirements:
 * - User must be authenticated (authMiddleware must run first)
 * - User must have customClaims.systemAdmin === true
 * 
 * @param req - Authenticated request with user context
 * @param res - Express response
 * @param next - Next middleware function
 */
export const systemAdminMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const user = req.user;

    // Check authentication
    if (!user) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.warn('❌ System admin access attempt without authentication', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return errorHandler.sendError(
        res,
        ERROR_CODES.UNAUTHORIZED,
        'Authentication required'
      );
    }

    // Check for system admin role in custom claims
    const isSystemAdmin = user.customClaims?.systemAdmin === true;

    if (!isSystemAdmin) {
      const duration = Date.now() - startTime;
      
      // Log unauthorized access attempt for security audit
      logger.warn('🚨 Unauthorized system admin access attempt', {
        userId: user.uid,
        email: user.email,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        duration
      });

      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(
        res,
        ERROR_CODES.FORBIDDEN,
        'System administrator access required'
      );
    }

    const duration = Date.now() - startTime;
    
    // Log successful system admin access for audit trail
    logger.info('✅ System admin access granted', {
      userId: user.uid,
      email: user.email,
      path: req.path,
      method: req.method,
      duration
    });

    next();
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    logger.error('❌ System admin middleware error', {
      error: error.message,
      path: req.path,
      method: req.method,
      duration
    });
    
    const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
    return errorHandler.sendError(
      res,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'System admin verification failed'
    );
  }
};

/**
 * Helper function to check if user is system admin
 * 
 * @param user - User object with custom claims
 * @returns true if user has system admin role
 */
export const isSystemAdmin = (user: any): boolean => {
  return user?.customClaims?.systemAdmin === true;
};
```

**Status**: 🔴 Needs implementation

---

## Security Risks & Mitigations

### Risk 1: Unauthorized Access to System Data
**Severity**: 🔴 Critical  
**Mitigation**:
- Implement `systemAdminMiddleware` with strict role verification
- Use Firebase custom claims for system admin role
- Add Firestore security rules to block non-admin access
- Log all system admin operations for audit trail

### Risk 2: Data Leakage Across Tenants
**Severity**: 🔴 Critical  
**Mitigation**:
- Never expose system collections through tenant-scoped endpoints
- Separate routing: `/api/system/*` vs `/api/tenants/:tenantId/*`
- Document clearly that these collections bypass tenant isolation
- Regular security audits

### Risk 3: Resource Exhaustion
**Severity**: 🟡 Medium  
**Mitigation**:
- Implement strict rate limiting on system endpoints
- Scheduled cleanup functions to prevent data accumulation
- TTL on health check documents (1 hour)
- TTL on metrics documents (30 days default)

### Risk 4: Privilege Escalation
**Severity**: 🔴 Critical  
**Mitigation**:
- System admin role cannot be self-assigned
- Require manual admin intervention to grant system admin role
- Separate from tenant owner/admin roles
- Regular review of system admin accounts

## Performance Considerations

### Health Check Optimization
- ✅ Timeout protection (5 seconds default, configurable)
- ✅ Automatic cleanup of test documents
- ✅ Scheduled cleanup every hour
- ✅ Batch operations for deletions
- ✅ Optimized collection counts (removed expensive collectionGroup query)

### Metrics Collection
- Use batch writes for multiple metrics
- Implement sampling for high-frequency metrics
- Aggregate metrics before storage
- Scheduled cleanup of old metrics (30 days retention)

## Monitoring & Alerting

### Health Check Monitoring
- Alert if health check fails 3 consecutive times
- Alert if Firestore response time > 5 seconds
- Alert if memory usage > 80%
- Alert if cleanup function fails

### Metrics Monitoring
- Track metrics collection rate
- Monitor storage growth
- Alert on unusual patterns
- Dashboard for real-time visualization

## Deployment Steps

1. **Deploy Database Changes** ✅
   - Collections already added to `database.ts`

2. **Deploy Scheduled Functions** ✅
   - `cleanup-health-checks` already deployed

3. **Deploy Security Rules** 🔴
   - Update `firestore.rules`
   - Deploy with `firebase deploy --only firestore:rules`

4. **Create Firestore Indexes** 🔴
   - Update `firestore.indexes.json`
   - Deploy with `firebase deploy --only firestore:indexes`

5. **Deploy Backend Code** 🔴
   - Implement remaining MVC layers
   - Deploy with `firebase deploy --only functions`

6. **Configure System Admins** 🔴
   - Create admin script to set custom claims
   - Grant system admin role to authorized users

7. **Verify Security** 🔴
   - Test unauthorized access attempts
   - Verify audit logging
   - Test rate limiting

## Testing Strategy

### Unit Tests
```typescript
describe('SystemHealthService', () => {
  it('should record metric with valid data', async () => {
    const metric = await systemHealthService.recordMetric({
      metricType: SystemMetricType.API_RESPONSE_TIME,
      value: 150,
      unit: 'ms'
    });
    
    expect(metric.id).toBeDefined();
    expect(metric.metricType).toBe(SystemMetricType.API_RESPONSE_TIME);
  });
});
```

### Integration Tests
```typescript
describe('System Health API', () => {
  it('should reject non-admin access to metrics', async () => {
    const response = await request(app)
      .get('/api/system/health/metrics')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .expect(403);
    
    expect(response.body.success).toBe(false);
  });
  
  it('should allow system admin to record metrics', async () => {
    const response = await request(app)
      .post('/api/system/health/metrics')
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({
        metricType: 'api_response_time',
        value: 150,
        unit: 'ms'
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
  });
});
```

## Next Steps

1. **Immediate** (This Session):
   - Review and approve this spec
   - Decide on system admin role implementation approach
   - Prioritize remaining implementation tasks

2. **Short Term** (Next 1-2 Days):
   - Implement types and models
   - Create system admin middleware
   - Add Firestore security rules

3. **Medium Term** (Next Week):
   - Complete service layer
   - Implement metrics endpoints
   - Add comprehensive tests

4. **Long Term** (Next Sprint):
   - Build system admin dashboard
   - Implement advanced metrics
   - Add alerting system

## Questions for Review

1. **System Admin Role**: Should we use Firebase custom claims or a separate `system_admins` collection?
2. **Metrics Retention**: Is 30 days appropriate, or should it be configurable?
3. **Rate Limiting**: What limits should we set for system endpoints?
4. **IP Whitelisting**: Should we implement this for production?
5. **Alerting**: What alerting system should we integrate with?

## References

- Code Review Guidelines: `.kiro/steering/code-review-guidelines.md`
- Health Controller: `backend/functions/src/controllers/health/health.controller.ts`
- Cleanup Function: `backend/functions/src/functions/scheduled/cleanup-health-checks.ts`
- Database Config: `backend/functions/src/config/database.ts`

### Step 8: 🔴 Firestore Security Rules (REQUIRED)

**File**: `backend/firestore.rules`

Add these rules to restrict access to system-level collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // ============================================
    // SYSTEM-LEVEL COLLECTIONS
    // ============================================
    // These collections bypass tenant scoping
    // Access restricted to system administrators only
    
    // System Health Checks Collection
    match /_system_health_checks/{document} {
      // Only system admins can read/write
      allow read, write: if request.auth != null 
        && request.auth.token.systemAdmin == true;
    }
    
    // System Metrics Collection
    match /_system_metrics/{document} {
      // Only system admins can read/write
      allow read, write: if request.auth != null 
        && request.auth.token.systemAdmin == true;
    }
    
    // System Audit Logs Collection (if implemented)
    match /_system_audit_logs/{document} {
      // Only system admins can read
      // System can write (via admin SDK)
      allow read: if request.auth != null 
        && request.auth.token.systemAdmin == true;
      allow write: if false; // Only via admin SDK
    }
  }
}
```

**Deployment**:
```bash
firebase deploy --only firestore:rules
```

**Status**: 🔴 Needs implementation

---

### Step 9: 🔴 Firestore Indexes (REQUIRED)

**File**: `backend/firestore.indexes.json`

Add these composite indexes for efficient queries:

```json
{
  "indexes": [
    {
      "collectionGroup": "_system_health_checks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "ASCENDING" },
        { "fieldPath": "environment", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "_system_health_checks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "environment", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "_system_metrics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "metricType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "_system_metrics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "environment", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "_system_metrics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "metricType", "order": "ASCENDING" },
        { "fieldPath": "environment", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "_system_metrics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Deployment**:
```bash
firebase deploy --only firestore:indexes
```

**Status**: 🔴 Needs implementation

---

### Step 10: 🔴 Scheduled Cleanup Function (REQUIRED)

**File**: `backend/functions/src/functions/scheduled/cleanup-system-metrics.ts`

```typescript
/**
 * Scheduled Cleanup for System Metrics
 * Removes old metric documents to manage storage costs
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { systemHealthService } from '../../services/system-health/system-health.service';
import { logger } from 'firebase-functions';

/**
 * Scheduled function to cleanup old system metrics
 * Runs daily to remove metrics older than 30 days (configurable)
 * 
 * Environment Variables:
 * - METRICS_RETENTION_DAYS: Number of days to retain metrics (default: 30)
 */
export const cleanupSystemMetrics = onSchedule('every 24 hours', async () => {
  const startTime = Date.now();
  
  try {
    const retentionDays = parseInt(
      process.env.METRICS_RETENTION_DAYS || '30',
      10
    );
    
    logger.info('🧹 Starting system metrics cleanup', {
      retentionDays,
      cutoffDate: new Date(Date.now() - (retentionDays * 24 * 3600000)).toISOString()
    });
    
    const deletedCount = await systemHealthService.cleanupOldMetrics(retentionDays);
    
    const duration = Date.now() - startTime;
    
    if (deletedCount > 0) {
      logger.info(`✅ Cleaned up ${deletedCount} old metric documents in ${duration}ms`, {
        count: deletedCount,
        retentionDays,
        duration
      });
    } else {
      logger.info('✅ No old metrics to cleanup', {
        retentionDays,
        duration
      });
    }
    
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('❌ Failed to cleanup system metrics', { 
      error: errorMessage,
      duration
    });
  }
});
```

**Export in `index.ts`**:
```typescript
export { cleanupSystemMetrics } from './functions/scheduled/cleanup-system-metrics';
```

**Status**: 🔴 Needs implementation

---

## Implementation Checklist

### Phase 1: Core Infrastructure ✅ COMPLETED
- [x] Database collections defined in `database.ts`
- [x] Types defined in `system-health.types.ts` (417 lines)
- [x] Health check endpoint implemented in `health.controller.ts`
- [x] Scheduled cleanup function for health checks

### Phase 2: Complete MVC Pattern 🔴 IN PROGRESS
- [x] Step 1: Database collections (DONE)
- [x] Step 2: Types (DONE)
- [ ] Step 3: Models (`system-health.model.ts`)
  - [ ] SystemHealthCheckModel with validation
  - [ ] SystemMetricModel with validation
  - [ ] Unit tests for models
- [ ] Step 4: Service layer (`system-health.service.ts`)
  - [ ] recordMetric() method
  - [ ] queryMetrics() method
  - [ ] cleanupOldHealthChecks() method
  - [ ] cleanupOldMetrics() method
  - [ ] Unit tests for services
- [ ] Step 5: Controllers (`system-health.controller.ts`)
  - [ ] recordMetric endpoint
  - [ ] getMetrics endpoint
  - [ ] Integration tests for endpoints
- [ ] Step 6: Routes (`system-health.routes.ts`)
  - [ ] Route definitions
  - [ ] Middleware chain configuration
  - [ ] Integration in `routes/index.ts`
- [ ] Step 7: System admin middleware (`system-admin.middleware.ts`)
  - [ ] Custom claims verification
  - [ ] Audit logging
  - [ ] Security tests

### Phase 3: Security & Access Control 🔴 NOT STARTED
- [ ] Firestore security rules updated
- [ ] Firestore indexes created
- [ ] System admin role implementation
  - [ ] Custom claims setup script
  - [ ] Admin management endpoints
  - [ ] Role assignment documentation
- [ ] Audit logging for system operations
- [ ] Rate limiting configuration
- [ ] Security testing

### Phase 4: Scheduled Functions 🔴 NOT STARTED
- [ ] Metrics cleanup scheduled function
- [ ] Environment variable configuration
- [ ] Monitoring and alerting setup
- [ ] Function deployment

### Phase 5: Testing 🔴 NOT STARTED
- [ ] Unit Tests
  - [ ] SystemHealthCheckModel tests
  - [ ] SystemMetricModel tests
  - [ ] SystemHealthService tests
  - [ ] Validation tests
- [ ] Integration Tests
  - [ ] POST /api/system/health/metrics
  - [ ] GET /api/system/health/metrics
  - [ ] Authentication tests
  - [ ] Authorization tests
- [ ] Security Tests
  - [ ] Unauthorized access attempts
  - [ ] Invalid system admin claims
  - [ ] Rate limiting tests
  - [ ] Firestore rules tests
- [ ] Performance Tests
  - [ ] Cleanup function performance
  - [ ] Query performance with large datasets
  - [ ] Batch operation efficiency

### Phase 6: Documentation 🔴 NOT STARTED
- [ ] API Documentation
  - [ ] OpenAPI/Swagger spec
  - [ ] Request/response examples
  - [ ] Error codes documentation
- [ ] System Admin Guide
  - [ ] How to grant system admin role
  - [ ] How to use metrics endpoints
  - [ ] Security best practices
- [ ] Deployment Guide
  - [ ] Environment variables
  - [ ] Firestore rules deployment
  - [ ] Index deployment
  - [ ] Function deployment
- [ ] Monitoring Guide
  - [ ] Metrics to monitor
  - [ ] Alert configuration
  - [ ] Dashboard setup

---

## Testing Strategy

### Unit Tests

**File**: `backend/functions/src/tests/unit/models/system-health.model.test.ts`

```typescript
import { SystemHealthCheckModel, SystemMetricModel } from '../../../models/system-health.model';
import { SystemMetricType } from '../../../types/system-health.types';
import { ValidationError } from '../../../models/base.model';

describe('SystemHealthCheckModel', () => {
  describe('validate()', () => {
    it('should validate with all required fields', async () => {
      const model = SystemHealthCheckModel.createHealthCheck('production');
      const isValid = await model.validate();
      expect(isValid).toBe(true);
    });

    it('should throw ValidationError for invalid environment', async () => {
      const model = new SystemHealthCheckModel({
        timestamp: new Date(),
        checkId: 'test-123',
        environment: 'invalid',
        test: true,
        expiresAt: new Date(Date.now() + 3600000)
      });

      await expect(model.validate()).rejects.toThrow(ValidationError);
      await expect(model.validate()).rejects.toThrow('Invalid environment');
    });

    it('should throw ValidationError for missing required fields', async () => {
      const model = new SystemHealthCheckModel({
        timestamp: new Date()
      });

      await expect(model.validate()).rejects.toThrow(ValidationError);
      await expect(model.validate()).rejects.toThrow('Missing required fields');
    });
  });

  describe('toFirestore()', () => {
    it('should convert to Firestore format', () => {
      const model = SystemHealthCheckModel.createHealthCheck('production');
      const firestoreData = model.toFirestore();

      expect(firestoreData).not.toHaveProperty('id');
      expect(firestoreData).toHaveProperty('timestamp');
      expect(firestoreData).toHaveProperty('checkId');
    });
  });
});

describe('SystemMetricModel', () => {
  describe('validate()', () => {
    it('should validate with all required fields', async () => {
      const model = SystemMetricModel.fromCreateRequest({
        metricType: SystemMetricType.API_RESPONSE_TIME,
        value: 150,
        unit: 'ms'
      });

      const isValid = await model.validate();
      expect(isValid).toBe(true);
    });

    it('should throw ValidationError for invalid metric type', async () => {
      const model = new SystemMetricModel({
        timestamp: new Date(),
        metricType: 'invalid_type' as SystemMetricType,
        value: 100,
        unit: 'ms',
        environment: 'production'
      });

      await expect(model.validate()).rejects.toThrow(ValidationError);
      await expect(model.validate()).rejects.toThrow('Invalid metric type');
    });

    it('should throw ValidationError for negative value', async () => {
      const model = new SystemMetricModel({
        timestamp: new Date(),
        metricType: SystemMetricType.MEMORY_USAGE,
        value: -100,
        unit: 'MB',
        environment: 'production'
      });

      await expect(model.validate()).rejects.toThrow(ValidationError);
      await expect(model.validate()).rejects.toThrow('cannot be negative');
    });

    it('should throw ValidationError for NaN value', async () => {
      const model = new SystemMetricModel({
        timestamp: new Date(),
        metricType: SystemMetricType.ERROR_RATE,
        value: NaN,
        unit: '%',
        environment: 'production'
      });

      await expect(model.validate()).rejects.toThrow(ValidationError);
      await expect(model.validate()).rejects.toThrow('must be a valid number');
    });
  });
});
```

### Integration Tests

**File**: `backend/functions/src/tests/integration/system-health.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../index';
import { SystemMetricType } from '../../types/system-health.types';

describe('System Health API', () => {
  let systemAdminToken: string;
  let regularUserToken: string;

  beforeAll(async () => {
    // Setup test tokens
    systemAdminToken = await getSystemAdminToken();
    regularUserToken = await getRegularUserToken();
  });

  describe('POST /api/system/health/metrics', () => {
    it('should reject non-admin access', async () => {
      const response = await request(app)
        .post('/api/system/health/metrics')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          metricType: SystemMetricType.API_RESPONSE_TIME,
          value: 150,
          unit: 'ms'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow system admin to record metrics', async () => {
      const response = await request(app)
        .post('/api/system/health/metrics')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          metricType: SystemMetricType.API_RESPONSE_TIME,
          value: 150,
          unit: 'ms'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.metricType).toBe(SystemMetricType.API_RESPONSE_TIME);
      expect(response.body.data.value).toBe(150);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/system/health/metrics')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          metricType: SystemMetricType.MEMORY_USAGE
          // Missing value and unit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/system/health/metrics', () => {
    it('should reject non-admin access', async () => {
      const response = await request(app)
        .get('/api/system/health/metrics')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow system admin to query metrics', async () => {
      const response = await request(app)
        .get('/api/system/health/metrics')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter by metric type', async () => {
      const response = await request(app)
        .get('/api/system/health/metrics')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .query({ 
          metricType: SystemMetricType.API_RESPONSE_TIME,
          limit: 10
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((metric: any) => {
        expect(metric.metricType).toBe(SystemMetricType.API_RESPONSE_TIME);
      });
    });
  });
});
```

---

## Deployment Steps

### 1. Deploy Database Changes ✅
Collections already added to `database.ts` - no deployment needed.

### 2. Deploy Types ✅
Types already created - no deployment needed.

### 3. Deploy Models 🔴
```bash
cd backend/functions
npm run build
# Verify no TypeScript errors
```

### 4. Deploy Service Layer 🔴
```bash
cd backend/functions
npm run build
npm run test:unit
# Verify all tests pass
```

### 5. Deploy Controllers & Routes 🔴
```bash
cd backend/functions
npm run build
npm run test:integration
# Verify all tests pass
```

### 6. Deploy Firestore Rules 🔴
```bash
cd backend
firebase deploy --only firestore:rules
# Verify rules deployed successfully
```

### 7. Deploy Firestore Indexes 🔴
```bash
cd backend
firebase deploy --only firestore:indexes
# Wait for indexes to build (can take several minutes)
```

### 8. Deploy Functions 🔴
```bash
cd backend
firebase deploy --only functions
# Verify all functions deployed successfully
```

### 9. Configure System Admin Role 🔴
```bash
# Create admin script to set custom claims
node backend/functions/scripts/set-system-admin.js <user-email>
```

### 10. Verify Deployment 🔴
```bash
# Test health check endpoint
curl https://your-project.cloudfunctions.net/api/health/status

# Test metrics endpoint (requires system admin token)
curl -H "Authorization: Bearer <system-admin-token>" \
  https://your-project.cloudfunctions.net/api/system/health/metrics
```

---

## Security Risks & Mitigations

### Risk Matrix

| Risk | Severity | Likelihood | Impact | Mitigation Status |
|------|----------|------------|--------|-------------------|
| Unauthorized Access to System Data | 🔴 Critical | Medium | Critical | ✅ Middleware + Rules |
| Data Leakage Across Tenants | 🔴 Critical | Low | Critical | ✅ No tenant data stored |
| Privilege Escalation | 🔴 Critical | Low | Critical | 🔴 Custom claims needed |
| Resource Exhaustion | 🟡 Medium | Medium | Medium | ✅ Cleanup functions |
| Audit Trail Gaps | 🟡 Medium | Low | Medium | ✅ Comprehensive logging |

### Detailed Mitigations

#### 1. Unauthorized Access
**Mitigation**:
- ✅ `systemAdminMiddleware` with strict role verification
- ✅ Firebase custom claims for system admin role
- 🔴 Firestore security rules (needs deployment)
- ✅ Comprehensive audit logging

**Verification**:
- Security tests for unauthorized access attempts
- Manual penetration testing
- Regular security audits

#### 2. Data Leakage
**Mitigation**:
- ✅ System collections contain no tenant-specific data
- ✅ Separate routing: `/api/system/*` vs `/api/tenants/:tenantId/*`
- ✅ Clear documentation of system-level scope
- Regular code reviews

**Verification**:
- Code review checklist
- Automated tests for data isolation
- Regular security audits

#### 3. Privilege Escalation
**Mitigation**:
- 🔴 System admin role cannot be self-assigned (needs implementation)
- 🔴 Manual admin intervention required (needs script)
- ✅ Separate from tenant owner/admin roles
- Regular review of system admin accounts

**Verification**:
- Attempt self-assignment (should fail)
- Review admin grant logs
- Quarterly access reviews

#### 4. Resource Exhaustion
**Mitigation**:
- ✅ Strict rate limiting on system endpoints
- ✅ Scheduled cleanup functions (health checks: 1h, metrics: 30d)
- ✅ TTL on health check documents
- ✅ Configurable retention periods

**Verification**:
- Monitor storage growth
- Alert on cleanup failures
- Performance testing

---

## Monitoring & Alerting

### Metrics to Monitor

1. **System Health**
   - Health check success rate
   - Firestore response time
   - Auth service availability
   - Memory usage trends

2. **Metrics Collection**
   - Metrics recording rate
   - Storage growth rate
   - Query performance
   - Cleanup success rate

3. **Security**
   - Unauthorized access attempts
   - System admin access frequency
   - Failed authentication attempts
   - Unusual query patterns

4. **Performance**
   - API response times
   - Cleanup function duration
   - Batch operation efficiency
   - Index performance

### Alert Configuration

```typescript
// Example alert rules
const alertRules = {
  healthCheckFailure: {
    condition: 'health_check_failures > 3 in 15 minutes',
    severity: 'critical',
    channels: ['email', 'slack']
  },
  unauthorizedAccess: {
    condition: 'unauthorized_system_access > 5 in 5 minutes',
    severity: 'high',
    channels: ['email', 'slack', 'sms']
  },
  cleanupFailure: {
    condition: 'cleanup_failures > 2 in 24 hours',
    severity: 'medium',
    channels: ['email']
  },
  storageGrowth: {
    condition: 'metrics_storage_growth > 10GB in 7 days',
    severity: 'medium',
    channels: ['email']
  }
};
```

---

## Next Steps & Recommendations

### Immediate Actions (This Sprint)
1. ✅ Review and approve this spec
2. 🔴 Implement Step 3: Models with validation
3. 🔴 Implement Step 4: Service layer
4. 🔴 Implement Step 5: Controllers
5. 🔴 Implement Step 6: Routes
6. 🔴 Implement Step 7: System admin middleware

### Short Term (Next Sprint)
1. Deploy Firestore security rules
2. Deploy Firestore indexes
3. Create system admin setup script
4. Implement comprehensive tests
5. Deploy to staging environment

### Medium Term (Next Month)
1. Build system admin dashboard
2. Implement advanced metrics aggregation
3. Add alerting system integration
4. Performance optimization
5. Documentation completion

### Long Term (Next Quarter)
1. Machine learning for anomaly detection
2. Predictive analytics for capacity planning
3. Advanced visualization dashboards
4. Integration with external monitoring tools

---

## Questions for Review

### Technical Decisions
1. **System Admin Role**: Use Firebase custom claims or separate `system_admins` collection?
   - **Recommendation**: Custom claims (simpler, more secure)
   
2. **Metrics Retention**: Is 30 days appropriate, or should it be configurable per metric type?
   - **Recommendation**: Configurable via environment variable

3. **Rate Limiting**: What limits for system endpoints?
   - **Recommendation**: 100 requests per 15 minutes per user

4. **IP Whitelisting**: Should we implement for production?
   - **Recommendation**: Optional, document for high-security deployments

5. **Alerting System**: What system should we integrate with?
   - **Recommendation**: Start with email, add Slack integration later

### Process Questions
1. Who will be granted system admin role initially?
2. What is the approval process for granting system admin access?
3. How often should we review system admin accounts?
4. What is the incident response plan for security breaches?

---

## References

### Internal Documentation
- Code Review Guidelines: `.kiro/steering/code-review-guidelines.md`
- API Development Guidelines: `.kiro/steering/api-development.md`
- Health Controller: `backend/functions/src/controllers/health/health.controller.ts`
- Cleanup Function: `backend/functions/src/functions/scheduled/cleanup-health-checks.ts`
- Database Config: `backend/functions/src/config/database.ts`
- BaseModel: `backend/functions/src/models/base.model.ts`

### External Resources
- Firebase Custom Claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firestore Indexes: https://firebase.google.com/docs/firestore/query-data/indexing
- Cloud Scheduler: https://cloud.google.com/scheduler/docs

---

## Approval & Sign-off

**Spec Author**: Kiro AI Assistant  
**Date Created**: 2026-01-30  
**Last Updated**: 2026-01-30  
**Status**: 🟡 Awaiting Review

**Reviewers**:
- [ ] Technical Lead
- [ ] Security Team
- [ ] DevOps Team
- [ ] Product Owner

**Approval Criteria**:
- [ ] Architecture follows established patterns
- [ ] Security controls are comprehensive
- [ ] Testing strategy is adequate
- [ ] Documentation is complete
- [ ] Deployment plan is clear

---

**END OF SPECIFICATION**
