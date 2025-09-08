# Implementation Plan - Backend Refactoring

## Phase 1: Documentation Migration and Organization

- [x] 1. Create documentation structure


  - Create the new `docs/` directory structure with all subdirectories
  - Set up `docs/README.md` as the main documentation index
  - Create placeholder files for each documentation section
  - _Requirements: 1.1, 2.1, 2.2_


- [x] 2. Migrate existing markdown files to docs structure

  - Move all markdown files from `backend/functions/src/middleware/README.md` to `docs/backend/`
  - Move all markdown files from `backend/functions/src/scripts/MIGRATION_README.md` to `docs/backend/maintenance/`
  - Move test documentation from `tests/backend/` to `docs/testing/`
  - _Requirements: 1.1, 1.2, 1.3_


- [x] 3. Update all references to moved documentation files

  - Search and update all import statements referencing moved markdown files
  - Update all relative links in markdown files to point to new locations
  - Update any package.json scripts that reference documentation paths
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Generate comprehensive documentation index


  - Create `docs/README.md` with links to all major documentation sections
  - Add navigation structure and table of contents
  - Include quick start guides and common workflows
  - _Requirements: 2.4_

## Phase 2: Code Organization and Service Restructuring

- [x] 5. Create new service directory structure



  - Create `src/services/auth/`, `src/services/presence/`, `src/services/organization/` directories
  - Create `src/services/campaigns/`, `src/services/integrations/`, `src/services/notifications/` directories
  - Set up index files for each service domain
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 6. Move authentication services to auth domain




  - Move `auth.service.ts`, `auth-organization.service.ts` to `src/services/auth/`
  - Move `token.service.ts`, `session-tracking.service.ts` to `src/services/auth/`
  - Update all import statements referencing moved auth services
  - _Requirements: 6.3_

- [x] 7. Move presence services to presence domain



  - Move all presence-related services to `src/services/presence/`
  - Include `presence.service.ts`, `presence-validation.service.ts`, `presence-security.service.ts`
  - Include `presence-report.service.ts`, `presence-maintenance.service.ts`, `presence-audit.service.ts`
  - Update all import statements referencing moved presence services
  - _Requirements: 6.1_

- [x] 8. Move organization services to organization domain







  - Move `organization.service.ts`, `organization-configuration.service.ts` to `src/services/organization/`
  - Move `organization-monitoring.service.ts`, `organization-presence-settings.service.ts` to `src/services/organization/`
  - Move `organization-suspension.service.ts`, `organization-rate-limit.service.ts` to `src/services/organization/`
  - Update all import statements referencing moved organization services
  - _Requirements: 6.2_

- [x] 9. Move campaign services to campaigns domain




  - Move all email campaign services to `src/services/campaigns/`
  - Include `email-campaign.service.ts`, `campaign-delivery.service.ts`, `campaign-analytics.service.ts`
  - Include `campaign-queue.service.ts`, `campaign-recipient.service.ts`, `campaign-template.service.ts`
  - Update all import statements referencing moved campaign services
  - _Requirements: 6.4_

- [x] 10. Move integration services to integrations domain


  - Move `integration.service.ts`, `oauth.service.ts`, `sync.service.ts` to `src/services/integrations/`
  - Move `integration-analytics.service.ts`, `integration-security.service.ts` to `src/services/integrations/`
  - Update all import statements referencing moved integration services
  - _Requirements: 6.5_

## Phase 3: Utilities and Development Tools Organization

- [x] 11. Reorganize shared utilities by domain






  - Create `src/shared/utils/auth/`, `src/shared/utils/validation/`, `src/shared/utils/formatting/` directories
  - Move authentication utilities to `src/shared/utils/auth/`
  - Move validation utilities to `src/shared/utils/validation/`
  - Move formatting utilities to `src/shared/utils/formatting/`
  - _Requirements: 5.1_

- [x] 12. Move development tools to appropriate location


  - Create `src/dev-tools/` directory structure
  - Move all files from `src/check/` to `src/dev-tools/health-checks/`
  - Move debugging utilities to `src/dev-tools/debugging/`
  - Update any scripts or references to moved development tools
  - _Requirements: 7.1, 7.2, 7.3_


- [x] 13. Organize maintenance scripts by category




  - Create subdirectories in `src/scripts/`: `migrations/`, `setup/`, `maintenance/`
  - Move migration scripts to `src/scripts/migrations/`
  - Move setup scripts to `src/scripts/setup/`
  - Move maintenance scripts to `src/scripts/maintenance/`
  - _Requirements: 5.2_

## Phase 4: Cloud Functions Consolidation

- [x] 14. Create consolidated maintenance function


  - Create `src/functions/maintenance.function.ts` that consolidates all maintenance functions
  - Implement parameter-based routing for daily, weekly, monthly maintenance
  - Consolidate `dailyPresenceMaintenance`, `weeklyPresenceMaintenance`, `cleanupSecurityDataScheduled`
  - Update scheduling configuration to use single function with parameters
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 15. Create consolidated metrics function



  - Create `src/functions/metrics.function.ts` that consolidates all metrics collection
  - Consolidate `collectMetrics`, `collectIntegrationMetrics`, `collectEmailVerificationMetrics`
  - Implement parameter-based routing for different metric types
  - Update scheduling configuration to use single function with parameters
  - _Requirements: 8.1, 8.4_

## Phase 5: Fix Import Paths and Type Issues

- [x] 16. Fix import paths for moved services

  - Update all import statements in service files to use correct relative paths
  - Fix imports from `../shared` to `../../shared` for services in subdirectories
  - Fix imports from `../config` to `../../config` for services in subdirectories
  - Fix imports from `../models` to `../../models` for services in subdirectories
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 17. Fix service export/import mismatches

  - Update service index files to export both class and instance consistently
  - Fix export statements in presence services (PresenceService vs presenceService)
  - Fix export statements in organization services
  - Update import statements in consuming files to match exports
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 18. Fix type definitions and missing collections

  - Add missing database collections to config files
  - Fix type definitions for working hours and appointment settings
  - Add proper type annotations for unknown types
  - Fix nodemailer method calls (createTransporter vs createTransport)
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 19. Fix remaining compilation errors

  - Resolve ValidationError export conflicts in shared index
  - Fix script import paths in controllers and routes
  - Add missing model imports and fix model references
  - Verify all TypeScript compilation passes without errors
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_