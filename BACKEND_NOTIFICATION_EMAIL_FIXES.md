# Backend Notification and Email Verification Fixes

## Date: 2026-01-31

## Issues Identified

### 1. Firestore Undefined Value Error
**Error**: `Cannot use "undefined" as a Firestore value (found in field "metadata.link")`

**Location**: `backend/functions/src/services/notification/notification.service.ts` (line ~506)

**Root Cause**: 
- The `createNotification()` method was creating a notification object with `metadata.link` set to `undefined` when no link was provided
- Firestore does not accept `undefined` values and throws an error

**Fix Applied**:
```typescript
// BEFORE (❌ Incorrect)
metadata: {
  sentBy: request.sentBy || "system",
  link: request.link,  // ❌ Can be undefined
  channelStatus: {},
  channelMetadata: {},
}

// AFTER (✅ Correct)
const metadata: any = {
  sentBy: request.sentBy || "system",
  channelStatus: {},
  channelMetadata: {},
};

// Only add link if it's defined
if (request.link) {
  metadata.link = request.link;
}
```

Additionally, added a `removeUndefinedFields()` helper method to recursively clean all undefined values before saving to Firestore:

```typescript
private removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => this.removeUndefinedFields(item));
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

### 2. Email Verification Failure
**Error**: `5 NOT_FOUND` when sending verification email

**Location**: `backend/functions/src/services/auth/auth.service.ts` (line ~1252)

**Root Cause**:
The email verification is failing because:
1. No email provider is properly configured in Firestore
2. The SendGrid API key might be missing or invalid
3. The email provider factory is looking for configuration in this order:
   - Tenant-specific configuration (Firestore: `tenants/{tenantId}/emailProviders`)
   - Global configuration (Firestore: `emailProviders` collection)
   - Static configuration (from `email-provider.ts` config file)

**Current Configuration Status**:
```typescript
// From backend/functions/src/config/email-provider.ts
export const sendgridConfig: EmailProviderConfig = {
  id: "sendgrid-primary",
  name: "SendGrid",
  type: EmailProviderType.SENDGRID,
  isActive: process.env.SENDGRID_ENABLED !== "false",  // ✅ Active by default
  priority: 1,
  config: {
    apiKey: process.env.SENDGRID_API_KEY || "",  // ⚠️ Might be empty
    fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@attendancex.com",
    fromName: process.env.SENDGRID_FROM_NAME || "AttendanceX",
    replyTo: process.env.SENDGRID_REPLY_TO || "support@attendancex.com",
  },
  // ... other config
}
```

## Solutions

### Solution 1: Firestore Undefined Value Error ✅ FIXED
**Status**: ✅ **COMPLETED**

The fix has been applied to `notification.service.ts`:
- Modified `createNotification()` to only add `link` to metadata if it's defined
- Added `removeUndefinedFields()` helper method
- Modified `saveNotification()` to clean the notification object before saving

**Testing**:
```bash
# Test registration flow
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Solution 2: Email Verification Configuration ⚠️ REQUIRES ACTION

**Option A: Configure SendGrid (Recommended)**

1. **Get SendGrid API Key**:
   - Go to https://app.sendgrid.com/
   - Navigate to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the API key

2. **Set Environment Variables**:
   ```bash
   # In backend/functions/.env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@attendancex.com
   SENDGRID_FROM_NAME=AttendanceX
   SENDGRID_REPLY_TO=support@attendancex.com
   SENDGRID_ENABLED=true
   DEFAULT_EMAIL_PROVIDER=sendgrid
   ```

3. **Verify Domain** (for production):
   - In SendGrid, go to Settings → Sender Authentication
   - Verify your domain (attendancex.com)
   - Add DNS records as instructed

**Option B: Use Alternative Email Provider**

If SendGrid is not available, configure another provider:

```bash
# Mailgun
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.attendancex.com
MAILGUN_ENABLED=true
DEFAULT_EMAIL_PROVIDER=mailgun

# OR AWS SES
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxx
AWS_SES_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxx
AWS_SES_ENABLED=true
DEFAULT_EMAIL_PROVIDER=ses
```

**Option C: Development Mode - Console Logging**

For development/testing without email provider:

```typescript
// Temporary workaround in email-verification.service.ts
async sendEmailVerification(data: EmailVerificationData): Promise<{
  success: boolean;
  notificationId?: string;
  error?: string;
}> {
  // Development mode - log to console instead of sending
  if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY) {
    logger.info('📧 [DEV MODE] Email verification would be sent:', {
      to: data.email,
      verificationUrl: this.generateVerificationUrl(data.token),
      userId: data.userId
    });
    
    return {
      success: true,
      notificationId: 'dev-mode-' + Date.now()
    };
  }
  
  // Normal flow...
}
```

## Testing Checklist

### Test 1: Registration with Email Verification
```bash
# 1. Register new user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "New",
    "lastName": "User"
  }'

# Expected Response:
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "email": "newuser@example.com",
    "userId": "xxx",
    "verificationSent": true,
    "expiresIn": "24 hours",
    "canResend": false
  }
}
```

### Test 2: Check Firestore for Notification
```bash
# Check that notification was saved without errors
# In Firebase Console → Firestore → notifications collection
# Verify that metadata.link is either present or absent (not undefined)
```

### Test 3: Email Provider Configuration
```bash
# Test email provider connection
curl -X GET http://localhost:5001/api/admin/email-providers/test \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: List of providers with connection status
```

## Files Modified

1. ✅ `backend/functions/src/services/notification/notification.service.ts`
   - Modified `createNotification()` method
   - Added `removeUndefinedFields()` helper method
   - Modified `saveNotification()` method

## Files Requiring Configuration

1. ⚠️ `backend/functions/.env`
   - Add SendGrid API key or alternative email provider credentials

## Next Steps

1. ✅ **Firestore Fix**: Already applied and ready to test
2. ⚠️ **Email Configuration**: Choose one of the options above:
   - **Option A**: Configure SendGrid (recommended for production)
   - **Option B**: Configure alternative provider (Mailgun, AWS SES)
   - **Option C**: Use development mode with console logging (testing only)

3. **Test Registration Flow**:
   ```bash
   cd backend/functions
   npm run serve  # Start emulators
   
   # In another terminal
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!@#",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

4. **Monitor Logs**:
   ```bash
   # Watch for errors in Firebase emulator logs
   # Should see:
   # ✅ "Registration successful with verification email sent"
   # OR
   # ⚠️ "Registration successful but email verification failed"
   ```

## Additional Notes

### Email Provider Priority
The system tries providers in this order:
1. Tenant-specific configuration (if tenantId provided)
2. Global Firestore configuration
3. Static configuration from `email-provider.ts`

### Rate Limiting
Email verification has rate limiting:
- 3 emails per hour per email address
- Prevents abuse and spam

### Security
- Verification tokens expire after 24 hours
- Tokens are hashed before storage
- One-time use tokens (invalidated after verification)

## Support

If issues persist:
1. Check Firebase emulator logs for detailed error messages
2. Verify environment variables are loaded correctly
3. Test email provider connection separately
4. Check Firestore rules allow writing to `notifications` collection

## References

- SendGrid Documentation: https://docs.sendgrid.com/
- Mailgun Documentation: https://documentation.mailgun.com/
- AWS SES Documentation: https://docs.aws.amazon.com/ses/
- Firebase Functions Environment Variables: https://firebase.google.com/docs/functions/config-env
