# Implementation Plan - Email System Enhancements

## Phase 1: SendGrid Integration

- [ ] 1.1 Create SendGrid email provider
  - Implement SendGridProvider class with send() method
  - Add configuration validation and health check
  - Implement tracking settings (open, click tracking)
  - Add custom args for notification and user IDs
  - Handle SendGrid-specific errors and rate limits
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

- [ ] 1.2 Update email provider factory
  - Add SendGrid to provider priority chain
  - Implement automatic failover logic
  - Add provider configuration validation
  - Update provider selection based on environment
  - _Requirements: 1.2, 1.7_

- [ ] 1.3 Add SendGrid configuration to environment
  - Add SENDGRID_API_KEY to .env
  - Add SENDGRID_FROM_EMAIL and SENDGRID_FROM_NAME
  - Add SENDGRID_WEBHOOK_VERIFY_KEY
  - Update DEFAULT_EMAIL_PROVIDER to sendgrid
  - Document configuration in README
  - _Requirements: 1.1, 1.7_

- [ ] 1.4 Implement SendGrid domain verification guide
  - Create documentation for SPF/DKIM setup
  - Add verification status check endpoint
  - Create troubleshooting guide for domain issues
  - _Requirements: 1.6_

## Phase 2: Development Mode Email Logging

- [ ] 2.1 Create development email logger
  - Implement DevelopmentEmailLogger class
  - Add console logging with formatted output
  - Implement HTML file generation with dev template
  - Add verification URL extraction and display
  - Create dev-emails output directory management
  - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [ ] 2.2 Create production email logger
  - Implement ProductionEmailLogger class
  - Add Firestore logging for production emails
  - Implement log retention and cleanup
  - _Requirements: 2.1_

- [ ] 2.3 Create email logger factory
  - Implement EmailLoggerFactory with environment detection
  - Add automatic logger selection based on NODE_ENV
  - Ensure no code changes needed when switching environments
  - _Requirements: 2.4, 2.5_

- [ ] 2.4 Integrate email logging into notification service
  - Add email logger calls in sendNotification()
  - Log all email attempts with metadata
  - Add development mode indicator in logs
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 2.5 Add development mode configuration
  - Add DEV_EMAIL_OUTPUT_DIR environment variable
  - Add development mode detection logic
  - Create .gitignore entry for dev-emails directory
  - _Requirements: 2.2, 2.4_

## Phase 3: Email Provider Monitoring

- [ ] 3.1 Create email monitoring service
  - Implement EmailMonitoringService class
  - Add getMetrics() method with date range filtering
  - Implement getProviderStatus() for health checks
  - Add getFailedEmails() with pagination
  - Implement logEmailSent() for tracking
  - Add updateEmailStatus() for webhook updates
  - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [ ] 3.2 Create email metrics collector
  - Implement EmailMetricsCollector class
  - Add calculateMetrics() for aggregation
  - Implement provider-specific metrics calculation
  - Add delivery rate, open rate, click rate calculations
  - _Requirements: 3.1, 3.5_

- [ ] 3.3 Create provider health checker
  - Implement ProviderHealthChecker class
  - Add health score calculation based on recent logs
  - Implement failure rate tracking
  - Add alert generation for unhealthy providers
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 3.4 Create email_logs Firestore collection
  - Define email_logs schema with all required fields
  - Create Firestore indexes for common queries
  - Add data retention policy (90 days)
  - Implement cleanup job for old logs
  - _Requirements: 3.1, 3.6_

- [ ] 3.5 Integrate monitoring into notification service
  - Add logEmailSent() calls after email attempts
  - Track provider used, status, and response time
  - Log failures with detailed error information
  - _Requirements: 3.1, 3.2_

## Phase 4: SendGrid Webhooks

- [ ] 4.1 Create SendGrid webhook service
  - Implement SendGridWebhookService class
  - Add processWebhook() for batch event processing
  - Implement validateSignature() for security
  - Add processEvent() for individual event handling
  - Handle delivered, bounce, open, click events
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 4.2 Create webhook controller
  - Implement sendgrid-webhook.controller.ts
  - Add signature validation middleware
  - Implement batch event processing
  - Add error handling and retry logic
  - Ensure response within 3 seconds
  - _Requirements: 6.1, 6.6, 6.7_

- [ ] 4.3 Create webhook routes
  - Add POST /webhooks/sendgrid endpoint
  - Configure rate limiting for webhook endpoint
  - Add CORS configuration for SendGrid IPs
  - Implement request logging
  - _Requirements: 6.1, 6.7_

- [ ] 4.4 Configure SendGrid webhook in dashboard
  - Set webhook URL in SendGrid dashboard
  - Enable event types (delivered, bounce, open, click)
  - Configure webhook signature verification
  - Test webhook delivery
  - _Requirements: 6.1_

- [ ] 4.5 Update notification status from webhooks
  - Implement status updates in email_logs collection
  - Update notification status in notifications collection
  - Add timestamp tracking for each event type
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

## Phase 5: Admin Monitoring API

- [ ] 5.1 Create email monitoring controller
  - Implement email-monitoring.controller.ts
  - Add getEmailStats() endpoint handler
  - Add getProviderStatus() endpoint handler
  - Add sendTestEmail() endpoint handler
  - Add getEmailLogs() endpoint handler
  - Add getFailedEmails() endpoint handler
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.2 Create monitoring routes
  - Add GET /api/admin/email/stats route
  - Add GET /api/admin/email/providers route
  - Add POST /api/admin/email/test route
  - Add GET /api/admin/email/logs route
  - Add GET /api/admin/email/failures route
  - Apply admin authentication middleware
  - Apply rate limiting
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 5.3 Add date range filtering
  - Implement date range query parameters
  - Add validation for date ranges
  - Add default date range (last 7 days)
  - _Requirements: 5.7_

- [ ] 5.4 Add pagination to logs endpoints
  - Implement pagination for email logs
  - Add pagination for failed emails
  - Return pagination metadata
  - _Requirements: 5.4, 5.5_

- [ ] 5.5 Add admin authorization checks
  - Verify user has admin or owner role
  - Add tenant-scoped filtering for non-owners
  - Implement permission checks
  - _Requirements: 5.6_

## Phase 6: Frontend Email Status UI

- [ ] 6.1 Create email status hook
  - Implement useEmailStatus hook
  - Add status polling logic (every 5 seconds)
  - Add checkStatus() method
  - Handle loading and error states
  - _Requirements: 7.1, 7.5_

- [ ] 6.2 Create EmailStatusIndicator component
  - Implement status display with icons
  - Add sending, sent, delivered, failed states
  - Implement color-coded alerts
  - Add real-time status updates
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

- [ ] 6.3 Create ResendEmailButton component
  - Implement resend button with loading state
  - Add countdown timer for rate limiting
  - Handle resend API call
  - Show success/error toast notifications
  - _Requirements: 4.2, 4.3, 4.4, 4.6_

- [ ] 6.4 Create EmailTroubleshooting component
  - Add troubleshooting tips display
  - Show tips when email is sent but not received
  - Add contact support option
  - _Requirements: 4.5, 7.7_

- [ ] 6.5 Update registration success page
  - Add EmailStatusIndicator component
  - Add ResendEmailButton component
  - Add EmailTroubleshooting component
  - Update success message
  - _Requirements: 4.1, 4.2, 7.1_

- [ ] 6.6 Create email monitoring service (frontend)
  - Implement emailMonitoringService.ts
  - Add getEmailStatus() method
  - Add resendVerificationEmail() method
  - Handle API errors
  - _Requirements: 7.5_

- [ ] 6.7 Add toast notifications
  - Implement success toast for resend
  - Implement error toast for failures
  - Add rate limit warning toast
  - _Requirements: 4.4, 4.5_

## Phase 7: Email Template Management (Optional)

- [ ] 7.1 Create email template model
  - Define EmailTemplate interface
  - Add template validation
  - Implement version history tracking
  - _Requirements: 8.1, 8.6_

- [ ] 7.2 Create template management service
  - Implement getTemplates() method
  - Add updateTemplate() with validation
  - Implement testTemplate() for sending test emails
  - Add revertTemplate() for version rollback
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_

- [ ] 7.3 Create template management API
  - Add GET /api/admin/email/templates route
  - Add PUT /api/admin/email/templates/:id route
  - Add POST /api/admin/email/templates/:id/test route
  - Add POST /api/admin/email/templates/:id/revert route
  - _Requirements: 8.1, 8.2, 8.4, 8.7_

- [ ] 7.4 Create template editor UI (optional)
  - Implement template list view
  - Add template editor with preview
  - Implement variable documentation
  - Add test email functionality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 8: Testing

- [ ] 8.1 Write unit tests for SendGrid provider
  - Test send() method with valid configuration
  - Test error handling for invalid API key
  - Test rate limit handling
  - Test configuration validation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

- [ ] 8.2 Write unit tests for email loggers
  - Test DevelopmentEmailLogger file generation
  - Test console logging format
  - Test ProductionEmailLogger Firestore logging
  - Test EmailLoggerFactory environment detection
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 8.3 Write unit tests for monitoring service
  - Test getMetrics() calculation
  - Test getProviderStatus() health checks
  - Test getFailedEmails() pagination
  - Test logEmailSent() and updateEmailStatus()
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

- [ ] 8.4 Write unit tests for webhook service
  - Test signature validation
  - Test event processing for all event types
  - Test batch processing
  - Test error handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 8.5 Write integration tests for email flow
  - Test complete registration -> email -> verification flow
  - Test SendGrid failover to SMTP
  - Test webhook status updates
  - Test development mode logging
  - _Requirements: 1.2, 2.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8.6 Write API tests for monitoring endpoints
  - Test GET /api/admin/email/stats
  - Test GET /api/admin/email/providers
  - Test POST /api/admin/email/test
  - Test authentication and authorization
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [ ] 8.7 Write frontend component tests
  - Test EmailStatusIndicator rendering
  - Test ResendEmailButton functionality
  - Test useEmailStatus hook
  - Test toast notifications
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 4.2, 4.3, 4.4_

- [ ] 8.8 Perform load testing
  - Test 10,000 emails per hour throughput
  - Test webhook processing under load
  - Test monitoring API performance
  - Verify no memory leaks
  - _Requirements: Performance requirements_

## Phase 9: Documentation

- [ ] 9.1 Create SendGrid setup guide
  - Document API key creation
  - Document domain verification steps
  - Document webhook configuration
  - Add troubleshooting section
  - _Requirements: 1.1, 1.6, 6.1_

- [ ] 9.2 Create development mode guide
  - Document how to enable development mode
  - Explain email logging and file generation
  - Add examples of dev mode output
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 9.3 Create monitoring guide
  - Document monitoring API endpoints
  - Explain metrics and health scores
  - Add dashboard usage instructions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3_

- [ ] 9.4 Update environment variables documentation
  - Document all new environment variables
  - Add configuration examples
  - Explain provider priority chain
  - _Requirements: 1.1, 2.5_

- [ ] 9.5 Create troubleshooting guide
  - Document common email delivery issues
  - Add webhook debugging steps
  - Explain how to check provider health
  - _Requirements: 1.7, 3.2, 3.3, 6.1_

## Phase 10: Deployment

- [ ] 10.1 Deploy backend changes
  - Deploy SendGrid provider and monitoring service
  - Deploy webhook handler
  - Deploy admin monitoring API
  - Update environment variables in production
  - _Requirements: All backend requirements_

- [ ] 10.2 Configure SendGrid in production
  - Add API key to production environment
  - Verify domain in SendGrid
  - Configure webhooks
  - Test email sending
  - _Requirements: 1.1, 1.6, 6.1_

- [ ] 10.3 Deploy frontend changes
  - Deploy email status components
  - Deploy updated registration page
  - Test end-to-end flow
  - _Requirements: 4.1, 4.2, 7.1, 7.2, 7.3_

- [ ] 10.4 Create Firestore indexes
  - Deploy email_logs indexes
  - Verify index creation
  - Test query performance
  - _Requirements: 3.4_

- [ ] 10.5 Set up monitoring and alerts
  - Configure delivery rate alerts
  - Configure provider health alerts
  - Configure webhook processing alerts
  - Test alert delivery
  - _Requirements: 3.4_

- [ ] 10.6 Verify production deployment
  - Test email sending via SendGrid
  - Verify webhook delivery
  - Check monitoring metrics
  - Test failover to SMTP
  - _Requirements: All requirements_

## Notes

- All tasks should be implemented following the MVC pattern
- Use existing error handling patterns from the codebase
- Follow TypeScript strict typing guidelines
- Implement proper logging for all operations
- Add JSDoc comments for public methods
- Ensure all endpoints have rate limiting
- Test both development and production modes
- Verify tenant context is maintained throughout
