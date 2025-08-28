# Implementation Plan

## Phase 1: Foundation Types and Shared Interfaces

- [x] 1. Fix shared type definitions and enum inconsistencies



  - Update shared package User interface to include role, status, permissions, organizationId properties
  - Fix InvitationStatus enum usage (EXPIRED vs OrganizationInvitationStatus)
  - Standardize UserRole, OrganizationRole, and NotificationType enums
  - Ensure all enums are properly exported from shared package
  - _Requirements: 1.1, 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Fix BaseModel generic type usage


  - Update BaseModel class to require generic type parameter
  - Fix OrganizationModel, UserOrganizationModel, and OrganizationInvitationModel to extend BaseModel<T>
  - Implement generateId method in BaseModel or make it abstract
  - _Requirements: 3.1, 3.3_

- [x] 3. Fix Event interface missing properties

  - Add organizationId, capacity, participants, organizationLogo, organizationName properties to Event interface
  - Update Event interface in shared package to match backend usage
  - _Requirements: 2.2_

## Phase 2: Authentication and User Context Types

- [x] 4. Fix AuthenticatedRequest and user context types



  - Update AuthenticatedRequest interface to include organizationId in user object
  - Fix LoginResponse interface to match expected User type structure
  - Ensure User interface includes all accessed properties (email, name, profile, preferences)
  - _Requirements: 2.1, 7.1, 7.2, 7.3_

- [x] 5. Fix UserModel and authentication service types


  - Update UserModel to implement proper User interface with all required properties
  - Fix auth-organization.service.ts to handle proper User type in responses
  - Add missing properties to UserModel or create proper type mappings
  - _Requirements: 2.1, 7.2, 7.3_

## Phase 3: Service Layer Method Signatures




- [x] 6. Fix CertificateService missing methods

  - Add updateCertificateTemplate method or rename customizeCertificateTemplate appropriately
  - Add deleteCertificateTemplate method to CertificateService
  - Add getCertificateStats method to CertificateService
  - _Requirements: 6.1, 6.2_

- [x] 7. Fix OrganizationService missing methods


  - Add deleteOrganization method to OrganizationService
  - Add getOrganizationStats method to OrganizationService
  - _Requirements: 6.1, 6.2_

- [x] 8. Fix ValidationError constructor usage

  - Update ValidationError calls to match expected constructor signature (single parameter)
  - Fix ValidationError usage in organization-invitation.model.ts, organization.model.ts, user-organization.model.ts
  - _Requirements: 6.2_

## Phase 4: Request/Response Interface Alignment

- [x] 9. Fix CreateUserRequest and UpdateUserRequest interfaces

  - Add missing properties: role, password, sendInvitation to CreateUserRequest
  - Add email property to UpdateUserRequest
  - Remove organizationId from UpdateUserRequest or make it optional
  - _Requirements: 2.3, 6.2_

- [x] 10. Fix organization settings and branding types

  - Update OrganizationSettings to make timezone and other properties optional or provide defaults
  - Update OrganizationBranding to make primaryColor and other properties optional
  - Fix type assignments in organization.model.ts
  - _Requirements: 2.3, 8.2_

## Phase 5: Firestore and Database Integration


- [x] 11. Fix Firestore FieldValue usage

  - Replace this.db.FieldValue with proper FieldValue import from firebase-admin
  - Fix FieldValue.increment usage in nfc-badge.service.ts and qrcode.service.ts
  - _Requirements: 3.2_

- [x] 12. Fix Firestore document update types


  - Fix compliance violations and performance alerts update calls to match Firestore types
  - Ensure update objects match expected Firestore document structure
  - _Requirements: 3.2_

## Phase 6: Crypto and External Dependencies

- [x] 13. Fix deprecated crypto methods


  - Replace crypto.createCipher with crypto.createCipheriv in biometric.service.ts
  - Replace crypto.createDecipher with crypto.createDecipheriv
  - Update encryption/decryption logic to use proper IV handling
  - _Requirements: 6.2_

- [x] 14. Fix missing external dependencies

  - Add pdfkit type definitions or install @types/pdfkit
  - Fix qrcode.service import in attendance.service.ts
  - _Requirements: 6.2_

## Phase 7: Notification and Alert Types

- [x] 15. Fix NotificationType and NotificationPriority enums

  - Update shared package to include 'attendance_alert' in NotificationType
  - Add 'medium' and 'high' to NotificationPriority enum
  - Fix notification service usage in attendance-alerts.service.ts
  - _Requirements: 5.3_

- [x] 16. Fix SendNotificationRequest interface

  - Ensure SendNotificationRequest includes all required properties
  - Update notification service calls to match interface
  - _Requirements: 2.3_

## Phase 8: Code Cleanup and Optimization

- [x] 17. Remove unused imports and variables


  - Clean up unused imports in all affected files (Request, ERROR_CODES, UserStatus, etc.)
  - Remove unused variables and destructured elements
  - Mark intentionally unused parameters with underscore prefix
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 18. Fix missing return statements


  - Add proper return statements to controller methods that require them
  - Fix async handler methods in certificate.controller.ts and organization.controller.ts
  - _Requirements: 6.3_

## Phase 9: Type Guards and Runtime Safety

- [x] 19. Add type guards for runtime type checking

  - Implement type guards for User with organizationId
  - Add runtime validation for enum values
  - Create utility functions for safe type casting
  - _Requirements: 8.1, 8.3_

- [x] 20. Final compilation validation and testing


  - Run TypeScript compiler to verify all errors are resolved
  - Create type safety tests for critical interfaces
  - Validate that all service methods match their interfaces
  - Ensure backward compatibility is maintained
  - _Requirements: 8.1, 8.2, 8.3, 8.4_