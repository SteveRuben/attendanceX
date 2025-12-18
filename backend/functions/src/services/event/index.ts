/**
 * Event Services Index
 */

// Legacy Event Service (v1.0)
export {
 /*  EventListOptions as LegacyEventListOptions,
  EventListResponse as LegacyEventListResponse,
  CreateEventRequest as LegacyCreateEventRequest,
  UpdateEventRequest as LegacyUpdateEventRequest,
  EventStats as LegacyEventStats,
  EventConflict as LegacyEventConflict, */
  eventService as legacyEventService
} from './legacy-event.service';

// Tenant Event Service (v2.0) - Recommended
export {
  CreateEventRequest,
  UpdateEventRequest,
  EventListOptions,
  EventListResponse,
  TenantEventService,
  tenantEventService
} from './tenant-event.service';