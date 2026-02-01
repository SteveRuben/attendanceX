# Requirements Update - Email Verification Flow
## Date: 2026-01-31

## Context

This document captures additional requirements and improvements discovered during the implementation and production deployment of the email verification flow. These requirements address bugs, edge cases, and operational concerns that emerged after the initial implementation.

## New Requirements

### Requirement 7 - Firestore Data Integrity

**User Story:** As a system administrator, I want all data saved to Firestore to be properly validated and cleaned, so that no undefined values cause runtime errors.

#### Acceptance Criteria

1. WHEN creating a notification object THEN all fields must be explicitly defined or omitted
2. WHEN a field is optional and not provided THEN it must not be set to `undefined`
3. WHEN saving data to Firestore THEN all undefined values must be recursively removed
4. IF a notification has no link THEN the `metadata.link` field must be omitted entirely
5. WHEN processing nested objects THEN undefined values at any depth must be cleaned
6. WHEN an array contains undefined values THEN those values must be filtered out
7. WHEN saving fails due to undefined values THEN a clear error message must be logged

**Priority:** HIGH (Production Bug)

**Related Issue:** Firestore error: `Cannot use "undefined" as a Firestore value (found in field "metadata.link")`

### Requirement 8 - Email Provider Failover and Configuration

**User Story:** As a system administrator, I want the email system to automatically failover to alternative providers when the primary provider fails, so that email delivery is resilient.

#### Acceptance Criteria

1. WHEN the primary email provider (SendGrid) is not configured THEN the system must automatically use SMTP
2. WHEN SendGrid API key is missing THEN no error should be thrown during initialization
3. WHEN an email send fails with one provider THEN the system must try the next provider in the fallback chain
4. WHEN all providers fail THEN a clear error message must be returned with provider details
5. WHEN SMTP is configured THEN it must be used as a reliable fallback
6. WHEN email provider configuration is checked THEN the system must validate credentials before attempting to send
7. WHEN a provider is unavailable THEN it must be temporarily disabled to avoid repeated failures

**Priority:** HIGH (Production Reliability)

**Configuration Chain:**
1. SendGrid (if `SENDGRID_API_KEY` is set)
2. Mailgun (if `MAILGUN_API_KEY` is set)
3. AWS SES (if `AWS_ACCESS_KEY_ID` is set)
4. SMTP (if `SMTP_ENABLED=true` - always available as last resort)

### Requirement 9 - Email Provider Health Monitoring

**User Story:** As a system administrator, I want to monitor the health and performance of email providers, so that I can proactively address delivery issues.

#### Acceptance Criteria

1. WHEN an email is sent THEN the provider used must be logged
2. WHEN an email send fails THEN the failure reason and provider must be logged
3. WHEN a provider consistently fails THEN an alert must be generated
4. WHEN checking system health THEN email provider status must be included
5. WHEN a provider is disabled THEN the reason and timestamp must be recorded
6. WHEN email metrics are requested THEN delivery rates per provider must be available
7. WHEN troubleshooting email issues THEN full audit trail must be accessible

**Priority:** MEDIUM (Operational Excellence)

### Requirement 10 - Development Mode Email Testing

**User Story:** As a developer, I want to test email verification flows without requiring a configured email provider, so that I can develop and test locally.

#### Acceptance Criteria

1. WHEN `NODE_ENV=development` AND no email provider is configured THEN emails must be logged to console
2. WHEN in development mode THEN verification URLs must be displayed in logs
3. WHEN testing email templates THEN rendered HTML must be saved to a local file
4. WHEN an email would be sent in development THEN a mock success response must be returned
5. WHEN switching between development and production THEN no code changes should be required
6. WHEN development mode is active THEN a clear indicator must be shown in logs
7. WHEN testing rate limits THEN they must be configurable or disabled in development

**Priority:** MEDIUM (Developer Experience)

### Requirement 11 - Email Verification Error Recovery

**User Story:** As a user whose verification email failed to send, I want clear instructions on how to recover, so that I can complete my registration.

#### Acceptance Criteria

1. WHEN registration succeeds but email fails THEN the user must be informed of both outcomes
2. WHEN email sending fails THEN the user must be given a "resend" option immediately
3. WHEN a user requests resend THEN the system must check if the previous email actually failed
4. WHEN multiple resend attempts fail THEN alternative contact methods must be suggested
5. WHEN email provider is down THEN users must be informed of the temporary issue
6. WHEN a user contacts support THEN admins must be able to manually verify emails
7. WHEN email delivery is delayed THEN users must be informed of expected wait times

**Priority:** MEDIUM (User Experience)

### Requirement 12 - Notification Service Data Validation

**User Story:** As a developer, I want all notification data to be validated before saving, so that I can catch data integrity issues early.

#### Acceptance Criteria

1. WHEN creating a notification THEN all required fields must be validated
2. WHEN optional fields are provided THEN they must be validated for correct types
3. WHEN metadata is added THEN it must be validated as a proper object
4. WHEN saving to Firestore THEN a pre-save validation hook must run
5. WHEN validation fails THEN a descriptive error must be thrown
6. WHEN data types are incorrect THEN the error must specify the expected type
7. WHEN nested objects are invalid THEN the full path to the error must be provided

**Priority:** MEDIUM (Code Quality)

## Updated Acceptance Criteria for Existing Requirements

### Requirement 1 - Modification du flux d'inscription (Updated)

**Additional Acceptance Criteria:**

6. WHEN email sending fails due to provider issues THEN the error must be logged with provider details
7. WHEN notification creation fails due to data validation THEN the registration must still succeed
8. WHEN creating notification metadata THEN undefined values must be omitted from the object

### Requirement 3 - Processus de validation d'email (Updated)

**Additional Acceptance Criteria:**

8. WHEN verification email is sent THEN the email provider used must be logged
9. WHEN email delivery fails THEN the system must attempt failover to next provider
10. WHEN all email providers fail THEN the user must be informed and given alternative options

## Implementation Notes

### Firestore Data Cleaning Utility

```typescript
/**
 * Recursively removes undefined fields from an object
 * Firestore does not accept undefined values
 */
private removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => this.removeUndefinedFields(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = this.removeUndefinedFields(obj[key]);
      }
    }
    return cleaned;
  }

  return obj;
}
```

### Email Provider Configuration Check

```typescript
/**
 * Check which email providers are configured and available
 */
async function checkEmailProviderConfiguration(): Promise<{
  primary: string;
  fallbacks: string[];
  smtp: boolean;
}> {
  const config = {
    primary: process.env.DEFAULT_EMAIL_PROVIDER || 'smtp',
    fallbacks: [],
    smtp: process.env.SMTP_ENABLED === 'true'
  };

  // Check SendGrid
  if (process.env.SENDGRID_API_KEY) {
    config.fallbacks.push('sendgrid');
  }

  // Check Mailgun
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    config.fallbacks.push('mailgun');
  }

  // Check AWS SES
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.fallbacks.push('aws_ses');
  }

  // SMTP is always available if configured
  if (config.smtp) {
    config.fallbacks.push('smtp');
  }

  return config;
}
```

### Development Mode Email Logging

```typescript
/**
 * Log email details in development mode instead of sending
 */
async function sendEmailVerificationDev(data: EmailVerificationData): Promise<void> {
  if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY) {
    logger.info('📧 [DEV MODE] Email verification would be sent:', {
      to: data.email,
      subject: 'Verify your email - AttendanceX',
      verificationUrl: generateVerificationUrl(data.token),
      userId: data.userId,
      expiresIn: '24 hours'
    });
    
    // Save HTML template to file for visual inspection
    const htmlContent = renderEmailTemplate(data);
    fs.writeFileSync(
      `./dev-emails/verification-${data.userId}-${Date.now()}.html`,
      htmlContent
    );
    
    return;
  }
  
  // Normal production flow
  await sendEmailVerificationProd(data);
}
```

## Testing Requirements

### New Test Cases

#### Test Suite: Firestore Data Integrity

```typescript
describe('Firestore Data Integrity', () => {
  it('should omit undefined fields when creating notification');
  it('should recursively clean nested objects');
  it('should filter undefined values from arrays');
  it('should handle null values correctly');
  it('should preserve explicitly set false/0/empty string values');
  it('should throw error if required field is undefined');
});
```

#### Test Suite: Email Provider Failover

```typescript
describe('Email Provider Failover', () => {
  it('should use SMTP when SendGrid is not configured');
  it('should try next provider when primary fails');
  it('should log provider used for each email');
  it('should return error when all providers fail');
  it('should not throw error during initialization if providers missing');
  it('should validate provider configuration before sending');
});
```

#### Test Suite: Development Mode

```typescript
describe('Development Mode Email Testing', () => {
  it('should log email details to console in dev mode');
  it('should save HTML templates to file in dev mode');
  it('should return mock success in dev mode');
  it('should use real providers in production mode');
  it('should display verification URLs in dev logs');
});
```

## Monitoring and Metrics

### New Metrics to Track

1. **Email Provider Usage**
   - Count of emails sent per provider
   - Success rate per provider
   - Average delivery time per provider
   - Failover frequency

2. **Data Validation Errors**
   - Count of undefined value errors caught
   - Types of validation errors
   - Fields most commonly causing errors

3. **Development Mode Usage**
   - Number of dev mode email logs
   - Template rendering errors in dev mode

## Documentation Updates Required

1. **Environment Variables Documentation**
   - Document SMTP configuration as fallback
   - Explain email provider priority chain
   - Add development mode configuration examples

2. **Troubleshooting Guide**
   - Add section on email delivery failures
   - Document how to check email provider status
   - Explain Firestore undefined value errors

3. **Developer Guide**
   - Add section on local email testing
   - Document development mode email logging
   - Explain how to test email templates locally

## Migration and Deployment Notes

### Pre-Deployment Checklist

- [ ] Verify SMTP configuration is present in `.env`
- [ ] Test email sending with SMTP provider
- [ ] Verify Firestore data cleaning is applied to all notification creation
- [ ] Test registration flow with email provider failover
- [ ] Verify development mode email logging works
- [ ] Update monitoring dashboards with new metrics
- [ ] Document email provider configuration for operations team

### Post-Deployment Verification

- [ ] Monitor email delivery success rates
- [ ] Check for Firestore undefined value errors in logs
- [ ] Verify SMTP failover is working
- [ ] Test registration flow end-to-end
- [ ] Verify email verification emails are being delivered
- [ ] Check email provider usage metrics

## Related Documents

- `BACKEND_NOTIFICATION_EMAIL_FIXES.md` - Detailed fix documentation
- `.kiro/specs/email-verification-flow/requirements.md` - Original requirements
- `.kiro/specs/email-verification-flow/design.md` - System design
- `backend/functions/.env` - Environment configuration

## Revision History

- **2026-01-31**: Initial update document created
  - Added Requirement 7: Firestore Data Integrity
  - Added Requirement 8: Email Provider Failover
  - Added Requirement 9: Email Provider Health Monitoring
  - Added Requirement 10: Development Mode Email Testing
  - Added Requirement 11: Email Verification Error Recovery
  - Added Requirement 12: Notification Service Data Validation
  - Updated existing requirements with additional acceptance criteria
