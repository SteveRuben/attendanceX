# Email Verification Rate Limiting Implementation

## Overview

This document describes the implementation of rate limiting for email verification operations as specified in task 10 of the email verification flow specification.

## Rate Limiting Rules

### 1. Email Sending Rate Limit
- **Limit**: 3 emails per hour per email address
- **Key**: `send_email_verification_{email}_{environment}`
- **Applies to**: 
  - `sendEmailVerification()` method
  - `resendEmailVerification()` method (email component)

### 2. Verification Attempts Rate Limit
- **Limit**: 10 attempts per hour per IP address
- **Key**: `email_verification_attempts_{ip}_{environment}`
- **Applies to**:
  - `verifyEmail()` method
  - `resendEmailVerification()` method (IP component)

### 3. Combined Rate Limiting
For resend operations, both email and IP limits are checked:
- Must pass both email sending limit AND verification attempts limit
- Error response indicates which limit was exceeded

## Implementation Details

### Core Utility Class
`VerificationRateLimitUtils` provides specialized rate limiting for verification operations:

```typescript
// Check email sending rate limit
const result = await VerificationRateLimitUtils.checkEmailSendingRateLimit(
  email, 
  ipAddress
);

// Check verification attempts rate limit  
const result = await VerificationRateLimitUtils.checkVerificationAttemptsRateLimit(
  ipAddress, 
  userAgent
);

// Check combined limits for resend
const result = await VerificationRateLimitUtils.checkResendRateLimit(
  email, 
  ipAddress, 
  userAgent
);
```

### Database Storage
Rate limit data is stored in the `rate_limits` collection:

```typescript
{
  key: string;           // Unique identifier for the rate limit
  timestamp: Date;       // When the request was made
  createdAt: Date;       // Document creation time
  metadata: {            // Additional context
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    operation: string;
  }
}
```

### Environment-Specific Limits

#### Development Environment
- Email sending: 20 per hour per email
- Verification attempts: 50 per hour per IP

#### Production Environment  
- Email sending: 3 per hour per email
- Verification attempts: 10 per hour per IP

## Error Responses

### Single Rate Limit Exceeded
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Trop de demandes d'envoi de vérification d'email. Limite: 3 par heure par email.",
  "retryAfter": 3600,
  "data": {
    "remaining": 0,
    "resetTime": "2024-01-01T13:00:00.000Z",
    "operation": "email_sending"
  }
}
```

### Multiple Rate Limits Exceeded
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED", 
  "message": "Trop de demandes d'envoi pour cette adresse email. Limite: 3 par heure.",
  "retryAfter": 3600,
  "data": {
    "emailLimit": {
      "remaining": 0,
      "resetTime": "2024-01-01T13:00:00.000Z"
    },
    "ipLimit": {
      "remaining": 5,
      "resetTime": "2024-01-01T13:00:00.000Z"
    },
    "mostRestrictive": "email"
  }
}
```

## Integration Points

### Auth Service Methods
Rate limiting is integrated into:

1. **`sendEmailVerification()`**
   - Checks email sending rate limit
   - Logs security events for exceeded limits
   - Throws custom error with 429 status code

2. **`verifyEmail()`**
   - Checks verification attempts rate limit
   - Applied before token validation
   - Prevents brute force attacks

3. **`resendEmailVerification()`**
   - Checks both email and IP rate limits
   - Uses combined rate limiting logic
   - Provides detailed error responses

### Route Configuration
Updated route configurations in `auth.routes.ts`:

```typescript
// Uses new emailVerificationAttempts config
router.post("/verify-email",
  rateLimit(rateLimitConfigs.emailVerificationAttempts),
  validateBody(verifyEmailSchema),
  AuthController.verifyEmail
);

// Uses existing sendEmailVerification config  
router.post("/send-email-verification",
  rateLimit(rateLimitConfigs.sendEmailVerification),
  validateBody(sendEmailVerificationSchema),
  AuthController.resendEmailVerification
);
```

## Security Features

### Fail-Open Design
- If database errors occur during rate limit checks, requests are allowed
- Prevents service disruption due to database issues
- Errors are logged for monitoring

### Cleanup and Maintenance
- Automatic cleanup of old rate limit entries
- `cleanupAllOldEntries()` method for periodic maintenance
- Configurable retention period (default: 24 hours)

### Logging and Monitoring
- Detailed logging of rate limit checks and violations
- Security event logging for exceeded limits
- Metrics collection for monitoring rate limit effectiveness

## Testing

### Unit Tests
Comprehensive test suite in `verification-rate-limit.test.ts`:
- Tests all rate limiting scenarios
- Mocks Firebase dependencies
- Covers error handling and edge cases

### Integration Testing
Test script `test-verification-rate-limits.ts`:
- Tests actual rate limiting behavior
- Validates error response generation
- Demonstrates cleanup functionality

## Usage Examples

### Basic Rate Limit Check
```typescript
const result = await VerificationRateLimitUtils.checkEmailSendingRateLimit(
  'user@example.com',
  '192.168.1.1'
);

if (!result.allowed) {
  const error = VerificationRateLimitUtils.generateRateLimitErrorResponse(
    result,
    'email_sending'
  );
  throw createError(error.message, 429, error.error, error.data);
}
```

### Combined Rate Limit Check
```typescript
const rateLimitCheck = await VerificationRateLimitUtils.checkResendRateLimit(
  email,
  ipAddress,
  userAgent
);

if (!rateLimitCheck.allowed) {
  const error = VerificationRateLimitUtils.generateMultipleRateLimitErrorResponse(
    rateLimitCheck.emailLimit,
    rateLimitCheck.ipLimit
  );
  throw createError(error.message, 429, error.error, error.data);
}
```

## Configuration

### Environment Variables
- `APP_ENV`: Determines rate limit thresholds (development/production)

### Rate Limit Windows
- All rate limits use 1-hour sliding windows
- Window boundaries are calculated dynamically
- Old entries are automatically cleaned up

## Monitoring and Metrics

### Available Statistics
```typescript
const stats = await VerificationRateLimitUtils.getRateLimitStats(key);
// Returns: currentCount, windowStart, windowEnd, oldestRequest, newestRequest
```

### Security Event Logging
Rate limit violations are logged as security events:
- Event type: "failed_login" 
- Risk level: "medium"
- Includes rate limit details and user context

## Future Enhancements

### Potential Improvements
1. **Redis Integration**: For better performance and distributed rate limiting
2. **Dynamic Rate Limits**: Adjust limits based on user behavior patterns
3. **Whitelist Support**: Allow certain IPs/emails to bypass rate limits
4. **Rate Limit Headers**: Add standard rate limit headers to responses
5. **Metrics Dashboard**: Real-time monitoring of rate limit effectiveness

### Scalability Considerations
- Current implementation uses Firestore for storage
- Consider Redis for high-traffic scenarios
- Batch cleanup operations for better performance
- Implement rate limit sharding for very high volumes