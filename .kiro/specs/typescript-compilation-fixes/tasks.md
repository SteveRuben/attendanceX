# Implementation Plan

## Phase 1: Create Missing Error Classes and Core Types

- [x] 1. Create ValidationError class and other missing error types




  - Create ValidationError class that extends Error with proper constructor signature
  - Add ValidationError to common types exports
  - Update auth-organization.controller.ts to import and use ValidationError correctly
  - Ensure error classes follow consistent patterns
  - _Requirements: 1.1, 1.2, 1.3, 1.4_



- [ ] 2. Import missing enums from attendance types




  - Add AttendanceStatus and AttendanceMethod imports to attendance routes
  - Update all files using these enums to import from ../common/types
  - Verify enum values match usage in route validation schemas
  - _Requirements: 3.1, 3.2, 3.3, 3.4_


## Phase 2: Fix Express.js Type Compatibility

- [x] 3. Fix Express Request type extensions


  - Update types/express.d.ts to include get, protocol, originalUrl properties on Request
  - Add tenantContext and domainContext properties to Request interface
  - Ensure Request type includes all properties used in middleware
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Fix Express middleware type compatibility




  - Update authenticate middleware to be compatible with Express Router.use()
  - Fix requirePermission middleware to match RequestHandler type signature
  - Ensure all middleware functions have compatible parameter types
  - Update router method calls to use proper middleware types
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

## Phase 3: Fix Router and Route Handler Types


- [x] 5. Fix router middleware usage patterns


  - Update all router.use() calls to use compatible middleware types
  - Fix router.get/post/put/delete handlers to match RequestHandler signature
  - Ensure middleware chaining uses compatible types
  - Update asyncHandler usage to be compatible with Express types
  - _Requirements: 7.1, 7.2, 7.3, 7.4_


- [x] 6. Fix route parameter and response types


  - Update route handlers to use proper Request and Response types
  - Fix parameter destructuring to match expected types
  - Ensure response methods are compatible with Express Response type
  - Update error handling to use compatible response methods
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

## Phase 4: Fix Service Method Signatures






- [x] 7. Fix SetupWizardService missing methods




  - Add generateDemoData method to SetupWizardService class
  - Update method signature to match usage in setup-wizard.routes.ts


  - Ensure method parameters match the expected types
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Fix tenant controller unused variables


  - Remove or use industry, size, and ipAddress variables in tenant.controller.ts
  - Mark intentionally unused variables with underscore prefix
  - Clean up variable declarations that are not needed
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Phase 5: Fix Missing Module Imports

- [ ] 9. Fix missing shared module import

  - Update users.routes.ts to import from correct path instead of '../../shared'
  - Verify the shared module exists or update import to use ../common/types
  - Fix any other incorrect import paths
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 10. Fix Buffer.from() usage in email providers

  - Update MailgunProvider.ts to use correct Buffer.from() overload
  - Fix attachment.content type handling for base64 encoding
  - Ensure proper type checking for string vs Buffer parameters
  - _Requirements: 8.4_

## Phase 6: Clean Up Unused Variables and Imports

- [ ] 11. Remove unused EmailAttachment import

  - Remove unused EmailAttachment import from BaseEmailProvider.ts
  - Clean up any other unused imports in email provider files
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 12. Fix EmailVerificationCleanupUtils import

  - Fix missing EmailVerificationCleanupUtils export in ../common/types
  - Update email-verification-maintenance.ts to use correct import
  - _Requirements: 8.1, 8.2, 8.3_

## Phase 7: Final Compilation Validation

- [ ] 13. Comprehensive compilation testing

  - Run TypeScript compiler to verify all 234 errors are resolved
  - Test that all middleware functions work with Express routing
  - Validate that all enum imports are working correctly
  - Ensure all service method calls match their implementations
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

- [ ] 14. Integration testing and validation

  - Test that authentication middleware works with updated types
  - Verify that route handlers function correctly with fixed types
  - Ensure that error handling works with new ValidationError class
  - Validate that all imports resolve correctly
  - _Requirements: 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2_