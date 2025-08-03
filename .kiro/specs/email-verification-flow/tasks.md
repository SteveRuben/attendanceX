# Implementation Plan - Email Verification Flow

- [x] 1. Create email verification token model and database utilities









  - Implement EmailVerificationToken interface and validation methods
  - Create database collection utilities for token storage and retrieval
  - Add database indexes for efficient token lookups and cleanup
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 2. Implement secure token generation and management





  - Create cryptographically secure token generation using crypto.randomBytes
  - Implement SHA-256 hashing for token storage
  - Add token expiration validation and cleanup utilities
  - Write token validation methods with proper security checks
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Create email verification template and notification integration




  - Design HTML and text email templates for verification emails
  - Integrate with existing notification service for email sending
  - Add template variables processing for personalized emails
  - Implement verification URL generation with proper frontend routing
  - _Requirements: 3.1, 6.1, 6.4_

- [x] 4. Extend authentication service with email verification methods










  - Add sendEmailVerification method with rate limiting
  - Implement verifyEmail method with token validation
  - Create resendEmailVerification method with duplicate prevention
  - Add canRequestVerification method for rate limit checking
  - Implement cleanupExpiredTokens method for maintenance
  - _Requirements: 3.1, 3.2, 3.3, 3.7, 5.1, 5.3, 5.4, 5.5_

- [x] 5. Modify user model to track verification status






  - Add emailVerificationSentAt, emailVerificationAttempts fields
  - Implement lastVerificationRequestAt tracking
  - Create verificationHistory array for audit trail
  - Add validation methods for verification-related fields
  - _Requirements: 1.1, 5.2, 6.5_

- [x] 6. Update registration flow to prevent auto-login






  - Modify register method to create users with PENDING status
  - Remove automatic login after successful registration
  - Add verification email sending to registration process
  - Update registration response to indicate verification required
  - Handle email sending failures gracefully with appropriate warnings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 7. Implement login flow verification checks






  - Add email verification status check in login method
  - Create appropriate error responses for unverified users
  - Provide helpful error messages with resend options
  - Maintain existing login flow for verified users
  - _Requirements: 2.1, 2.2, 2.3, 6.2_

- [x] 8. Create email verification API endpoints





  - Implement POST /auth/verify-email endpoint with token validation
  - Add POST /auth/send-email-verification endpoint for resending
  - Update existing endpoints with proper error handling
  - Add rate limiting to verification endpoints
  - _Requirements: 3.2, 3.4, 3.5, 3.6, 5.4, 5.6_

- [x] 9. Add comprehensive error handling and user messages








  - Create French error messages for all verification scenarios
  - Implement proper HTTP status codes for different error types
  - Add user-friendly success messages for verification flow
  - Create informative error responses with actionable guidance
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Implement rate limiting for verification operations






  - Add rate limiting for verification email sending (3 per hour per email)
  - Implement verification attempt limiting (10 per hour per IP)
  - Create rate limit checking utilities
  - Add proper rate limit error responses
  - _Requirements: 5.1, 5.6_

- [x] 11. Create database cleanup and maintenance utilities





  - Implement expired token cleanup job
  - Add verification metrics collection
  - Create database maintenance scripts
  - Implement monitoring for verification success rates
  - _Requirements: 4.3, 4.5_

- [x] 12. Write comprehensive unit tests for verification logic












  - Test token generation and validation security
  - Test email verification service methods
  - Test modified registration and login flows
  - Test error handling and edge cases
  - Test rate limiting functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 13. Create integration tests for complete verification flow





  - Test full registration -> verification -> login flow
  - Test token expiration and cleanup
  - Test resend verification functionality
  - Test rate limiting enforcement
  - Test email template rendering and sending
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 14. Add API endpoint tests for verification endpoints





  - Test POST /auth/register modified behavior
  - Test POST /auth/login verification checks
  - Test POST /auth/verify-email endpoint
  - Test POST /auth/send-email-verification endpoint
  - Test error responses and status codes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.2, 3.4, 3.5, 3.6, 5.4, 5.6_

- [x] 15. Update route configurations and middleware





  - Add new verification routes to auth router
  - Configure rate limiting middleware for verification endpoints
  - Update validation schemas for verification requests
  - Add proper middleware ordering for verification flow
  - _Requirements: 3.2, 3.4, 3.5, 3.6, 5.4, 5.6_

- [x] 16. Update frontend registration page and flow





  - Modify registration form to show verification message instead of auto-login
  - Update registration success UI to display "check your email" message
  - Add resend verification email functionality to registration success page
  - Update registration API integration to handle new response format
  - _Requirements: 1.3, 1.4, 6.1, 6.4_

- [ ] 17. Create email verification page and components









  - Create email verification page component for token validation
  - Implement verification success and error states
  - Add loading states during verification process
  - Create verification link handling with proper routing
  - Add redirect to login page after successful verification
  - _Requirements: 3.4, 3.5, 3.6, 6.3, 6.5_

- [ ] 18. Update login page for unverified users
  - Add error handling for EMAIL_NOT_VERIFIED error
  - Display helpful error messages with verification instructions
  - Add "resend verification email" button for unverified users
  - Update login form validation and error display
  - _Requirements: 2.2, 2.3, 6.2, 6.5_

- [ ] 19. Create verification email resend functionality
  - Implement resend verification email API integration
  - Add rate limiting feedback for resend attempts
  - Create success/error notifications for resend operations
  - Add email input validation for resend requests
  - _Requirements: 5.1, 5.4, 5.5, 5.6, 6.4_

- [ ] 20. Update authentication state management
  - Modify auth context to handle verification status
  - Update user state to include emailVerified field
  - Add verification-related actions to auth reducer
  - Update protected route guards for verification status
  - _Requirements: 2.1, 2.2, 6.2_

- [ ] 21. Add frontend validation and user feedback
  - Implement client-side validation for verification flows
  - Add loading spinners and progress indicators
  - Create toast notifications for verification actions
  - Add proper error boundaries for verification components
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 22. Create frontend tests for verification components
  - Test registration page updated behavior
  - Test email verification page functionality
  - Test login page error handling for unverified users
  - Test resend verification email functionality
  - Test authentication state management updates
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.4, 3.5, 3.6, 5.1, 5.4, 5.5, 5.6_