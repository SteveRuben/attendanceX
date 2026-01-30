# Spec: Appointment Template Service Refactor

## Status: 🔴 CRITICAL - Security Issues Identified

## Overview
Complete refactoring of the appointment template service to follow the established MVC pattern with proper tenant scoping, TypeScript typing, and security measures.

## Problem Statement

### Critical Security Issues (🔴 HIGH PRIORITY)
1. **No Tenant Scoping**: Service operates on global collection without tenant context
2. **Collection Not Defined**: `appointment_notification_templates` not in `database.ts`
3. **No Type Definitions**: Missing TypeScript interfaces and types
4. **No BaseModel Implementation**: Lacks validation and data integrity checks

### Architecture Gaps (🟡 IMPORTANT)
1. **Global Initialization**: Templates initialized globally instead of per-tenant
2. **Missing Error Handling**: No specific error classes used
3. **No CRUD API**: Missing public methods with tenant scoping
4. **No Controller/Routes**: Service not exposed via API endpoints

### Code Quality Issues (🟢 MINOR)
1. **Console.log Usage**: Should use structured logging
2. **Missing Documentation**: Incomplete JSDoc comments

## User Stories

### Story 1: Tenant-Scoped Template Management
**As a** tenant administrator  
**I want** appointment notification templates scoped to my organization  
**So that** my templates don't interfere with other tenants' templates

**Acceptance Criteria:**
- All template operations are scoped by tenantId
- Templates stored in tenant subcollections
- Default templates initialized per tenant on first access
- Tenant isolation verified in tests

### Story 2: Type-Safe Template Operations
**As a** developer  
**I want** complete TypeScript type definitions for templates  
**So that** I can catch errors at compile time and have better IDE support

**Acceptance Criteria:**
- Complete interfaces for all template types
- Enums for template types and channels
- No `any` types in the codebase
- Proper type exports for external use


### Story 3: Validated Template Models
**As a** system  
**I want** all template data validated before persistence  
**So that** data integrity is maintained and invalid data is rejected early

**Acceptance Criteria:**
- AppointmentTemplateModel extends BaseModel
- Validation for all required fields
- Validation for template content structure
- Proper error messages for validation failures

### Story 4: Complete CRUD API
**As a** frontend developer  
**I want** RESTful API endpoints for template management  
**So that** I can create, read, update, and delete templates via HTTP

**Acceptance Criteria:**
- GET /api/appointment-templates - List templates
- GET /api/appointment-templates/:id - Get single template
- POST /api/appointment-templates - Create template
- PUT /api/appointment-templates/:id - Update template
- DELETE /api/appointment-templates/:id - Delete template
- All endpoints protected with auth + tenant context

### Story 5: Proper Error Handling
**As a** developer  
**I want** specific error classes for different failure scenarios  
**So that** I can handle errors appropriately in the UI

**Acceptance Criteria:**
- ValidationError for invalid data
- NotFoundError for missing templates
- ConflictError for duplicate templates
- Structured error responses with codes

## Technical Requirements

### Phase 1: Critical Security (IMMEDIATE)

#### 1.1 Database Configuration
**File:** `backend/functions/src/config/database.ts`

```typescript
// Add to collections object
appointment_templates: db.collection("appointment_templates"),

// Add to collectionNames object
APPOINTMENT_TEMPLATES: "appointment_templates",
```

**Rationale:** Centralized collection management prevents typos and enables refactoring.


#### 1.2 Type Definitions
**File:** `backend/functions/src/types/appointment-template.types.ts`

```typescript
export enum AppointmentTemplateType {
  REMINDER_24H = 'reminder_24h',
  REMINDER_2H = 'reminder_2h',
  CONFIRMATION = 'confirmation',
  CANCELLATION = 'cancellation'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms'
}

export interface AppointmentTemplate {
  id: string;
  tenantId: string;
  type: AppointmentTemplateType;
  channel: NotificationChannel;
  language: string;
  subject?: string;
  content: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateAppointmentTemplateRequest {
  type: AppointmentTemplateType;
  channel: NotificationChannel;
  language: string;
  subject?: string;
  content: string;
  variables?: string[];
}

export interface UpdateAppointmentTemplateRequest {
  subject?: string;
  content?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface AppointmentTemplateDocument extends AppointmentTemplate {
  organizationId?: string; // Legacy field
}
```

**Rationale:** Strong typing prevents runtime errors and improves developer experience.


#### 1.3 Model Implementation
**File:** `backend/functions/src/models/appointment-template.model.ts`

```typescript
import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel, ValidationError } from "./base.model";
import { 
  AppointmentTemplate, 
  AppointmentTemplateDocument,
  AppointmentTemplateType,
  NotificationChannel,
  CreateAppointmentTemplateRequest 
} from "../types/appointment-template.types";

export class AppointmentTemplateModel extends BaseModel<AppointmentTemplateDocument> {
  constructor(data: Partial<AppointmentTemplateDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const template = this.data;

    // Required fields
    BaseModel.validateRequired(template, [
      'type', 'channel', 'language', 'content', 'tenantId', 'createdBy'
    ]);

    // Validate type enum
    BaseModel.validateEnum(template.type, AppointmentTemplateType, 'type');

    // Validate channel enum
    BaseModel.validateEnum(template.channel, NotificationChannel, 'channel');

    // Validate language code
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(template.language)) {
      throw new ValidationError('Invalid language code format', { field: 'language' });
    }

    // Validate content length
    this.validateLength(template.content, 10, 5000, 'content');

    // Email templates must have subject
    if (template.channel === NotificationChannel.EMAIL && !template.subject) {
      throw new ValidationError('Email templates require a subject', { field: 'subject' });
    }

    // Validate subject length if present
    if (template.subject) {
      this.validateLength(template.subject, 3, 200, 'subject');
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(this.filterUndefinedValues(data));
  }

  public toAPI(): Partial<AppointmentTemplateDocument> {
    return { ...this.data };
  }

  static fromFirestore(doc: DocumentSnapshot): AppointmentTemplateModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = AppointmentTemplateModel.prototype.convertDatesFromFirestore(data);

    return new AppointmentTemplateModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateAppointmentTemplateRequest & { tenantId: string; createdBy: string }
  ): AppointmentTemplateModel {
    const templateData = {
      ...request,
      variables: request.variables || [],
      isDefault: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new AppointmentTemplateModel(templateData);
  }
}
```

**Rationale:** BaseModel provides validation, audit logging, and consistent data handling.


#### 1.4 Service Refactor - Tenant Scoping
**File:** `backend/functions/src/services/appointment/appointment-template.service.ts`

**Key Changes:**
1. Replace global collection with tenant-scoped subcollections
2. Change `ensureInitialized()` to `ensureInitializedForTenant(tenantId: string)`
3. Add per-tenant initialization caching
4. Use specific error classes
5. Add structured logging with firebase-functions logger

```typescript
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { AppointmentTemplateModel } from "../../models/appointment-template.model";
import { collections } from "../../config/database";
import { 
  AppointmentTemplate,
  AppointmentTemplateType,
  NotificationChannel,
  CreateAppointmentTemplateRequest,
  UpdateAppointmentTemplateRequest 
} from "../../types/appointment-template.types";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/common/errors";
import { APPOINTMENT_EMAIL_TEMPLATES, APPOINTMENT_SMS_TEMPLATES } from "../notification/templates/appointment-templates";

export class AppointmentTemplateService {
  private readonly db = getFirestore();
  private initializedTenants = new Set<string>();

  /**
   * Ensures default templates are initialized for a specific tenant
   */
  private async ensureInitializedForTenant(tenantId: string): Promise<void> {
    if (this.initializedTenants.has(tenantId)) return;

    try {
      logger.info('Initializing default templates for tenant', { tenantId });

      const allTemplates = [...APPOINTMENT_EMAIL_TEMPLATES, ...APPOINTMENT_SMS_TEMPLATES];
      const batch = this.db.batch();
      
      for (const template of allTemplates) {
        const templateRef = this.db
          .collection('tenants')
          .doc(tenantId)
          .collection('appointment_templates')
          .doc(template.id);
        
        const templateDoc = await templateRef.get();
        
        if (!templateDoc.exists) {
          batch.set(templateRef, {
            ...template,
            tenantId,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDefault: true,
            isActive: true,
            createdBy: 'system'
          });
        }
      }
      
      await batch.commit();
      this.initializedTenants.add(tenantId);
      
      logger.info('Default templates initialized successfully', { 
        tenantId, 
        count: allTemplates.length 
      });
    } catch (error: any) {
      logger.error('Error initializing default templates', { 
        tenantId, 
        error: error.message 
      });
      // Don't block if initialization fails
    }
  }

  // CRUD methods to be added in Phase 2...
}

export const appointmentTemplateService = new AppointmentTemplateService();
```

**Rationale:** Tenant scoping is critical for multi-tenant security and data isolation.


### Phase 2: Architecture Implementation

#### 2.1 Complete Service CRUD Methods

Add the following methods to `AppointmentTemplateService`:

```typescript
/**
 * Creates a new custom template
 */
async createTemplate(
  request: CreateAppointmentTemplateRequest,
  tenantId: string,
  userId: string
): Promise<AppointmentTemplate> {
  await this.ensureInitializedForTenant(tenantId);

  try {
    // Validate uniqueness
    await this.validateTemplateUniqueness(request.type, request.channel, request.language, tenantId);

    // Create model
    const templateModel = AppointmentTemplateModel.fromCreateRequest({
      ...request,
      tenantId,
      createdBy: userId
    });

    // Validate
    await templateModel.validate();

    // Save
    const templateRef = this.db
      .collection('tenants')
      .doc(tenantId)
      .collection('appointment_templates')
      .doc();

    await templateRef.set(templateModel.toFirestore());

    logger.info('Template created', { 
      templateId: templateRef.id, 
      tenantId, 
      type: request.type 
    });

    return {
      id: templateRef.id,
      ...templateModel.toAPI()
    } as AppointmentTemplate;

  } catch (error: any) {
    if (error instanceof ValidationError) throw error;
    logger.error('Error creating template', { tenantId, error: error.message });
    throw new Error(`Failed to create template: ${error.message}`);
  }
}

/**
 * Gets a single template by ID
 */
async getTemplate(
  templateId: string,
  tenantId: string
): Promise<AppointmentTemplate | null> {
  const doc = await this.db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointment_templates')
    .doc(templateId)
    .get();

  if (!doc.exists) return null;

  const templateModel = AppointmentTemplateModel.fromFirestore(doc);
  if (!templateModel || templateModel.data.tenantId !== tenantId) {
    return null;
  }

  return templateModel.toAPI() as AppointmentTemplate;
}

/**
 * Gets all templates for a tenant
 */
async getTemplatesByTenant(
  tenantId: string,
  filters?: {
    type?: AppointmentTemplateType;
    channel?: NotificationChannel;
    language?: string;
    isActive?: boolean;
  }
): Promise<AppointmentTemplate[]> {
  await this.ensureInitializedForTenant(tenantId);

  let query = this.db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointment_templates')
    .where('tenantId', '==', tenantId);

  if (filters?.type) {
    query = query.where('type', '==', filters.type);
  }
  if (filters?.channel) {
    query = query.where('channel', '==', filters.channel);
  }
  if (filters?.language) {
    query = query.where('language', '==', filters.language);
  }
  if (filters?.isActive !== undefined) {
    query = query.where('isActive', '==', filters.isActive);
  }

  const snapshot = await query.get();

  return snapshot.docs
    .map(doc => AppointmentTemplateModel.fromFirestore(doc))
    .filter(model => model !== null)
    .map(model => model!.toAPI() as AppointmentTemplate);
}

/**
 * Updates an existing template
 */
async updateTemplate(
  templateId: string,
  updates: UpdateAppointmentTemplateRequest,
  tenantId: string
): Promise<AppointmentTemplate> {
  const existing = await this.getTemplate(templateId, tenantId);
  if (!existing) {
    throw new NotFoundError('Template not found');
  }

  // Prevent updating default templates
  if (existing.isDefault) {
    throw new ValidationError('Cannot modify default templates');
  }

  const updatedData = {
    ...existing,
    ...updates,
    updatedAt: new Date()
  };

  const templateModel = new AppointmentTemplateModel(updatedData);
  await templateModel.validate();

  await this.db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointment_templates')
    .doc(templateId)
    .update(templateModel.toFirestore());

  logger.info('Template updated', { templateId, tenantId });

  return templateModel.toAPI() as AppointmentTemplate;
}

/**
 * Deletes a template
 */
async deleteTemplate(templateId: string, tenantId: string): Promise<void> {
  const existing = await this.getTemplate(templateId, tenantId);
  if (!existing) {
    throw new NotFoundError('Template not found');
  }

  // Prevent deleting default templates
  if (existing.isDefault) {
    throw new ValidationError('Cannot delete default templates');
  }

  await this.db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointment_templates')
    .doc(templateId)
    .delete();

  logger.info('Template deleted', { templateId, tenantId });
}

/**
 * Validates template uniqueness
 */
private async validateTemplateUniqueness(
  type: AppointmentTemplateType,
  channel: NotificationChannel,
  language: string,
  tenantId: string
): Promise<void> {
  const existing = await this.db
    .collection('tenants')
    .doc(tenantId)
    .collection('appointment_templates')
    .where('type', '==', type)
    .where('channel', '==', channel)
    .where('language', '==', language)
    .where('isDefault', '==', false)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new ConflictError('A custom template with this type, channel, and language already exists');
  }
}
```

**Rationale:** Complete CRUD operations enable full template management via API.


### Phase 3: API Layer

#### 3.1 Controller Implementation
**File:** `backend/functions/src/controllers/appointment/appointment-template.controller.ts`

```typescript
import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { appointmentTemplateService } from "../../services/appointment/appointment-template.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  CreateAppointmentTemplateRequest,
  UpdateAppointmentTemplateRequest 
} from "../../types/appointment-template.types";

export class AppointmentTemplateController {

  static createTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreateAppointmentTemplateRequest = req.body;

      // Validation
      if (!createRequest.type || !createRequest.channel || !createRequest.content) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields");
      }

      logger.info('Creating appointment template', {
        userId,
        tenantId,
        type: createRequest.type,
        channel: createRequest.channel
      });

      const template = await appointmentTemplateService.createTemplate(
        createRequest,
        tenantId,
        userId
      );

      const duration = Date.now() - startTime;
      logger.info('Template created successfully', {
        templateId: template.id,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Template created successfully",
        data: template
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error('Error creating template', {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create template");
    }
  });

  static getTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const template = await appointmentTemplateService.getTemplate(templateId, tenantId);

      if (!template) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Template not found");
      }

      res.json({
        success: true,
        data: template
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting template:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get template");
    }
  });

  static getTemplates = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const filters = {
        type: req.query.type as any,
        channel: req.query.channel as any,
        language: req.query.language as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
      };

      const templates = await appointmentTemplateService.getTemplatesByTenant(tenantId, filters);

      res.json({
        success: true,
        data: templates
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting templates:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get templates");
    }
  });

  static updateTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const tenantId = req.user?.tenantId;
      const updateRequest: UpdateAppointmentTemplateRequest = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const template = await appointmentTemplateService.updateTemplate(
        templateId,
        updateRequest,
        tenantId
      );

      logger.info('Template updated', {
        templateId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Template updated successfully",
        data: template
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating template:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update template");
    }
  });

  static deleteTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      await appointmentTemplateService.deleteTemplate(templateId, tenantId);

      logger.info('Template deleted', {
        templateId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Template deleted successfully"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error deleting template:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to delete template");
    }
  });
}
```

**Rationale:** Controllers handle HTTP concerns only, delegating business logic to services.


#### 3.2 Routes Implementation
**File:** `backend/functions/src/routes/appointment/appointment-template.routes.ts`

```typescript
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantContextMiddleware } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { AppointmentTemplateController } from "../../controllers/appointment/appointment-template.controller";

const router = Router();

// Middleware chain
router.use(smartRateLimit);
router.use(authMiddleware);
router.use(tenantContextMiddleware);

// Routes
router.post("/", AppointmentTemplateController.createTemplate);
router.get("/", AppointmentTemplateController.getTemplates);
router.get("/:templateId", AppointmentTemplateController.getTemplate);
router.put("/:templateId", AppointmentTemplateController.updateTemplate);
router.delete("/:templateId", AppointmentTemplateController.deleteTemplate);

export { router as appointmentTemplateRoutes };
```

**Rationale:** Standard middleware chain ensures security and rate limiting.

#### 3.3 Route Integration
**File:** `backend/functions/src/routes/index.ts`

Add to the route setup:

```typescript
import { appointmentTemplateRoutes } from "./appointment/appointment-template.routes";

// In setupRoutes function
app.use("/api/appointment-templates", appointmentTemplateRoutes);
```

**Rationale:** Centralized route management for maintainability.

### Phase 4: Testing

#### 4.1 Unit Tests
**File:** `backend/functions/src/services/appointment/__tests__/appointment-template.service.test.ts`

```typescript
import { appointmentTemplateService } from '../appointment-template.service';
import { AppointmentTemplateType, NotificationChannel } from '../../../types/appointment-template.types';
import { ValidationError, NotFoundError, ConflictError } from '../../../utils/common/errors';

describe('AppointmentTemplateService', () => {
  const testTenantId = 'test-tenant-123';
  const testUserId = 'test-user-123';

  describe('createTemplate', () => {
    it('should create a custom template with valid data', async () => {
      const request = {
        type: AppointmentTemplateType.CONFIRMATION,
        channel: NotificationChannel.EMAIL,
        language: 'en',
        subject: 'Appointment Confirmed',
        content: 'Your appointment is confirmed for {{date}} at {{time}}',
        variables: ['date', 'time']
      };

      const template = await appointmentTemplateService.createTemplate(
        request,
        testTenantId,
        testUserId
      );

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.tenantId).toBe(testTenantId);
      expect(template.type).toBe(request.type);
      expect(template.isDefault).toBe(false);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const request = {
        type: AppointmentTemplateType.CONFIRMATION,
        channel: NotificationChannel.EMAIL,
        language: 'en',
        content: '' // Empty content
      };

      await expect(
        appointmentTemplateService.createTemplate(request as any, testTenantId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError for duplicate template', async () => {
      const request = {
        type: AppointmentTemplateType.CONFIRMATION,
        channel: NotificationChannel.EMAIL,
        language: 'en',
        subject: 'Test',
        content: 'Test content'
      };

      // Create first template
      await appointmentTemplateService.createTemplate(request, testTenantId, testUserId);

      // Attempt to create duplicate
      await expect(
        appointmentTemplateService.createTemplate(request, testTenantId, testUserId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getTemplate', () => {
    it('should return template for valid ID and tenant', async () => {
      // Create template first
      const created = await appointmentTemplateService.createTemplate(
        {
          type: AppointmentTemplateType.REMINDER_24H,
          channel: NotificationChannel.SMS,
          language: 'fr',
          content: 'Rappel: RDV demain'
        },
        testTenantId,
        testUserId
      );

      const template = await appointmentTemplateService.getTemplate(created.id, testTenantId);

      expect(template).toBeDefined();
      expect(template?.id).toBe(created.id);
    });

    it('should return null for non-existent template', async () => {
      const template = await appointmentTemplateService.getTemplate('non-existent', testTenantId);
      expect(template).toBeNull();
    });

    it('should return null for template from different tenant', async () => {
      const created = await appointmentTemplateService.createTemplate(
        {
          type: AppointmentTemplateType.CONFIRMATION,
          channel: NotificationChannel.EMAIL,
          language: 'en',
          subject: 'Test',
          content: 'Test'
        },
        testTenantId,
        testUserId
      );

      const template = await appointmentTemplateService.getTemplate(created.id, 'different-tenant');
      expect(template).toBeNull();
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const created = await appointmentTemplateService.createTemplate(
        {
          type: AppointmentTemplateType.CANCELLATION,
          channel: NotificationChannel.EMAIL,
          language: 'en',
          subject: 'Original Subject',
          content: 'Original content'
        },
        testTenantId,
        testUserId
      );

      const updated = await appointmentTemplateService.updateTemplate(
        created.id,
        { subject: 'Updated Subject' },
        testTenantId
      );

      expect(updated.subject).toBe('Updated Subject');
      expect(updated.content).toBe('Original content');
    });

    it('should throw NotFoundError for non-existent template', async () => {
      await expect(
        appointmentTemplateService.updateTemplate(
          'non-existent',
          { subject: 'Test' },
          testTenantId
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when updating default template', async () => {
      // Get a default template
      const templates = await appointmentTemplateService.getTemplatesByTenant(testTenantId);
      const defaultTemplate = templates.find(t => t.isDefault);

      if (defaultTemplate) {
        await expect(
          appointmentTemplateService.updateTemplate(
            defaultTemplate.id,
            { subject: 'Test' },
            testTenantId
          )
        ).rejects.toThrow(ValidationError);
      }
    });
  });

  describe('deleteTemplate', () => {
    it('should delete custom template successfully', async () => {
      const created = await appointmentTemplateService.createTemplate(
        {
          type: AppointmentTemplateType.REMINDER_2H,
          channel: NotificationChannel.SMS,
          language: 'en',
          content: 'Test'
        },
        testTenantId,
        testUserId
      );

      await appointmentTemplateService.deleteTemplate(created.id, testTenantId);

      const template = await appointmentTemplateService.getTemplate(created.id, testTenantId);
      expect(template).toBeNull();
    });

    it('should throw NotFoundError for non-existent template', async () => {
      await expect(
        appointmentTemplateService.deleteTemplate('non-existent', testTenantId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when deleting default template', async () => {
      const templates = await appointmentTemplateService.getTemplatesByTenant(testTenantId);
      const defaultTemplate = templates.find(t => t.isDefault);

      if (defaultTemplate) {
        await expect(
          appointmentTemplateService.deleteTemplate(defaultTemplate.id, testTenantId)
        ).rejects.toThrow(ValidationError);
      }
    });
  });

  describe('getTemplatesByTenant', () => {
    it('should return all templates for tenant', async () => {
      const templates = await appointmentTemplateService.getTemplatesByTenant(testTenantId);

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by type', async () => {
      const templates = await appointmentTemplateService.getTemplatesByTenant(testTenantId, {
        type: AppointmentTemplateType.CONFIRMATION
      });

      expect(templates.every(t => t.type === AppointmentTemplateType.CONFIRMATION)).toBe(true);
    });

    it('should filter templates by channel', async () => {
      const templates = await appointmentTemplateService.getTemplatesByTenant(testTenantId, {
        channel: NotificationChannel.EMAIL
      });

      expect(templates.every(t => t.channel === NotificationChannel.EMAIL)).toBe(true);
    });

    it('should initialize default templates on first access', async () => {
      const newTenantId = 'new-tenant-' + Date.now();
      const templates = await appointmentTemplateService.getTemplatesByTenant(newTenantId);

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.isDefault)).toBe(true);
    });
  });
});
```

**Rationale:** Comprehensive unit tests ensure service reliability and catch regressions.


#### 4.2 Integration Tests
**File:** `backend/functions/src/routes/appointment/__tests__/appointment-template.routes.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../../index';
import { AppointmentTemplateType, NotificationChannel } from '../../../types/appointment-template.types';

describe('Appointment Template API', () => {
  let authToken: string;
  let tenantId: string;
  let createdTemplateId: string;

  beforeAll(async () => {
    // Setup test tenant and get auth token
    const authResponse = await setupTestAuth();
    authToken = authResponse.token;
    tenantId = authResponse.tenantId;
  });

  describe('POST /api/appointment-templates', () => {
    it('should create a new template with valid data', async () => {
      const response = await request(app)
        .post('/api/appointment-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: AppointmentTemplateType.CONFIRMATION,
          channel: NotificationChannel.EMAIL,
          language: 'en',
          subject: 'Appointment Confirmed',
          content: 'Your appointment is confirmed for {{date}} at {{time}}',
          variables: ['date', 'time']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.tenantId).toBe(tenantId);

      createdTemplateId = response.body.data.id;
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/appointment-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: AppointmentTemplateType.CONFIRMATION,
          // Missing channel and content
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/appointment-templates')
        .send({
          type: AppointmentTemplateType.CONFIRMATION,
          channel: NotificationChannel.EMAIL,
          language: 'en',
          content: 'Test'
        })
        .expect(401);
    });
  });

  describe('GET /api/appointment-templates', () => {
    it('should return all templates for tenant', async () => {
      const response = await request(app)
        .get('/api/appointment-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter templates by type', async () => {
      const response = await request(app)
        .get('/api/appointment-templates')
        .query({ type: AppointmentTemplateType.CONFIRMATION })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((t: any) => 
        t.type === AppointmentTemplateType.CONFIRMATION
      )).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/appointment-templates')
        .expect(401);
    });
  });

  describe('GET /api/appointment-templates/:templateId', () => {
    it('should return template by ID', async () => {
      const response = await request(app)
        .get(`/api/appointment-templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdTemplateId);
    });

    it('should return 404 for non-existent template', async () => {
      await request(app)
        .get('/api/appointment-templates/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/appointment-templates/:templateId', () => {
    it('should update template successfully', async () => {
      const response = await request(app)
        .put(`/api/appointment-templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subject: 'Updated Subject',
          content: 'Updated content'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subject).toBe('Updated Subject');
    });

    it('should return 404 for non-existent template', async () => {
      await request(app)
        .put('/api/appointment-templates/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ subject: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/appointment-templates/:templateId', () => {
    it('should delete template successfully', async () => {
      const response = await request(app)
        .delete(`/api/appointment-templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      await request(app)
        .get(`/api/appointment-templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent template', async () => {
      await request(app)
        .delete('/api/appointment-templates/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not access templates from different tenant', async () => {
      // Create template for tenant A
      const responseA = await request(app)
        .post('/api/appointment-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: AppointmentTemplateType.REMINDER_24H,
          channel: NotificationChannel.SMS,
          language: 'en',
          content: 'Tenant A template'
        })
        .expect(201);

      const templateIdA = responseA.body.data.id;

      // Get auth token for tenant B
      const authResponseB = await setupTestAuth();
      const authTokenB = authResponseB.token;

      // Attempt to access tenant A's template with tenant B's token
      await request(app)
        .get(`/api/appointment-templates/${templateIdA}`)
        .set('Authorization', `Bearer ${authTokenB}`)
        .expect(404);
    });
  });
});
```

**Rationale:** Integration tests verify end-to-end functionality and tenant isolation.

## Implementation Plan

### Priority Order

1. **Phase 1 - Critical Security (Day 1)**
   - [ ] Add collection to database.ts
   - [ ] Create type definitions
   - [ ] Implement AppointmentTemplateModel
   - [ ] Refactor service for tenant scoping
   - **Blocker:** Must be completed before any production use

2. **Phase 2 - Architecture (Day 2)**
   - [ ] Add CRUD methods to service
   - [ ] Implement error handling
   - [ ] Add structured logging
   - [ ] Update existing methods to use tenant context

3. **Phase 3 - API Layer (Day 3)**
   - [ ] Create controller
   - [ ] Create routes
   - [ ] Integrate routes in index
   - [ ] Test endpoints manually

4. **Phase 4 - Testing (Day 4)**
   - [ ] Write unit tests
   - [ ] Write integration tests
   - [ ] Verify tenant isolation
   - [ ] Test error scenarios

## Success Criteria

### Security
- ✅ All operations scoped by tenantId
- ✅ Tenant isolation verified in tests
- ✅ No global collection access
- ✅ Proper authentication on all endpoints

### Code Quality
- ✅ No `any` types in codebase
- ✅ Complete TypeScript interfaces
- ✅ BaseModel validation implemented
- ✅ Specific error classes used
- ✅ Structured logging throughout

### Functionality
- ✅ CRUD operations working
- ✅ Default templates initialized per tenant
- ✅ Custom templates can be created/updated/deleted
- ✅ Default templates cannot be modified/deleted
- ✅ Template uniqueness enforced

### Testing
- ✅ Unit test coverage > 80%
- ✅ Integration tests passing
- ✅ Tenant isolation verified
- ✅ Error scenarios tested

## Migration Strategy

### Existing Data
If there are existing templates in the global collection:

1. Create migration script to move templates to tenant subcollections
2. Identify tenant ownership (via organizationId field)
3. Copy templates to appropriate tenant subcollections
4. Verify data integrity
5. Archive old global collection

### Backward Compatibility
- Keep existing `generateReminderContent`, `generateConfirmationContent`, `generateCancellationContent` methods
- Update them to use tenant-scoped `getTemplate` method
- Ensure they call `ensureInitializedForTenant` before accessing templates

## Documentation Updates

- [ ] Update API documentation with new endpoints
- [ ] Document template variable system
- [ ] Add examples for custom template creation
- [ ] Document default template structure
- [ ] Add migration guide for existing implementations

## Risks and Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:** Keep existing public methods, update internal implementation only

### Risk 2: Performance Impact
**Mitigation:** Implement per-tenant caching, use batch operations for initialization

### Risk 3: Data Migration Issues
**Mitigation:** Test migration script thoroughly, keep backup of original data

### Risk 4: Incomplete Tenant Context
**Mitigation:** Add validation to ensure tenantId is always present, fail fast if missing

## Review Checklist

Before marking this spec as complete:

- [ ] All critical security issues addressed
- [ ] Complete MVC pattern implemented
- [ ] TypeScript strict typing throughout
- [ ] BaseModel validation working
- [ ] Tenant scoping verified
- [ ] Error handling with specific classes
- [ ] Structured logging implemented
- [ ] CRUD API endpoints working
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Tenant isolation verified
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Security review completed

## Next Steps

After completing this refactor:

1. Apply same pattern to other appointment-related services
2. Review other services for similar security issues
3. Create automated checks for tenant scoping
4. Document the pattern for future features
5. Consider creating a code generator for MVC boilerplate

---

**Estimated Effort:** 4 days  
**Priority:** 🔴 CRITICAL  
**Assigned To:** Backend Team  
**Review Required:** Security Team + Tech Lead
