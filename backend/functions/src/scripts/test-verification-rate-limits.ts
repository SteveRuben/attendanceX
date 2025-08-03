// backend/functions/src/scripts/test-verification-rate-limits.ts

import { VerificationRateLimitUtils } from '../utils/verification-rate-limit.utils';

/**
 * Script de test pour vérifier le fonctionnement des limitations de taux
 * pour les opérations de vérification d'email
 */
async function testVerificationRateLimits() {
  console.log('🧪 Testing Verification Rate Limits...\n');

  const testEmail = 'test@example.com';
  const testIpAddress = '192.168.1.100';
  const testUserAgent = 'Test-Agent/1.0';

  try {
    // Test 1: Email sending rate limit
    console.log('📧 Test 1: Email Sending Rate Limit');
    console.log('Testing email sending rate limit (3 per hour per email)...');
    
    for (let i = 1; i <= 5; i++) {
      const result = await VerificationRateLimitUtils.checkEmailSendingRateLimit(
        testEmail,
        testIpAddress
      );
      
      console.log(`Attempt ${i}: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'} - Remaining: ${result.remaining}`);
      
      if (!result.allowed) {
        const errorResponse = VerificationRateLimitUtils.generateRateLimitErrorResponse(
          result,
          'email_sending'
        );
        console.log(`Error message: ${errorResponse.message}`);
        console.log(`Retry after: ${errorResponse.retryAfter} seconds`);
        break;
      }
    }

    console.log('\n');

    // Test 2: Verification attempts rate limit
    console.log('🔍 Test 2: Verification Attempts Rate Limit');
    console.log('Testing verification attempts rate limit (10 per hour per IP)...');
    
    for (let i = 1; i <= 12; i++) {
      const result = await VerificationRateLimitUtils.checkVerificationAttemptsRateLimit(
        testIpAddress,
        testUserAgent
      );
      
      console.log(`Attempt ${i}: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'} - Remaining: ${result.remaining}`);
      
      if (!result.allowed) {
        const errorResponse = VerificationRateLimitUtils.generateRateLimitErrorResponse(
          result,
          'verification_attempts'
        );
        console.log(`Error message: ${errorResponse.message}`);
        console.log(`Retry after: ${errorResponse.retryAfter} seconds`);
        break;
      }
    }

    console.log('\n');

    // Test 3: Combined resend rate limit
    console.log('🔄 Test 3: Combined Resend Rate Limit');
    console.log('Testing combined rate limit for resend operations...');
    
    const resendResult = await VerificationRateLimitUtils.checkResendRateLimit(
      'another-test@example.com',
      '192.168.1.101',
      testUserAgent
    );

    console.log(`Resend allowed: ${resendResult.allowed ? '✅ YES' : '❌ NO'}`);
    console.log(`Email limit - Allowed: ${resendResult.emailLimit.allowed}, Remaining: ${resendResult.emailLimit.remaining}`);
    console.log(`IP limit - Allowed: ${resendResult.ipLimit.allowed}, Remaining: ${resendResult.ipLimit.remaining}`);

    if (!resendResult.allowed) {
      const errorResponse = VerificationRateLimitUtils.generateMultipleRateLimitErrorResponse(
        resendResult.emailLimit,
        resendResult.ipLimit
      );
      console.log(`Error message: ${errorResponse.message}`);
      console.log(`Most restrictive: ${errorResponse.data.mostRestrictive}`);
    }

    console.log('\n');

    // Test 4: Rate limit stats
    console.log('📊 Test 4: Rate Limit Statistics');
    console.log('Getting rate limit statistics...');
    
    const emailKey = `send_email_verification_${testEmail}_${process.env.APP_ENV || 'development'}`;
    const stats = await VerificationRateLimitUtils.getRateLimitStats(emailKey);
    
    console.log(`Current count: ${stats.currentCount}`);
    console.log(`Window start: ${stats.windowStart.toISOString()}`);
    console.log(`Window end: ${stats.windowEnd.toISOString()}`);
    console.log(`Oldest request: ${stats.oldestRequest?.toISOString() || 'N/A'}`);
    console.log(`Newest request: ${stats.newestRequest?.toISOString() || 'N/A'}`);

    console.log('\n');

    // Test 5: Cleanup old entries
    console.log('🧹 Test 5: Cleanup Old Entries');
    console.log('Testing cleanup of old rate limit entries...');
    
    const cleanedCount = await VerificationRateLimitUtils.cleanupAllOldEntries(0.001); // Clean entries older than ~3.6 seconds
    console.log(`Cleaned up ${cleanedCount} old entries`);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test des réponses d'erreur
 */
function testErrorResponses() {
  console.log('🚨 Testing Error Response Generation...\n');

  // Test error response for email sending
  const emailRateLimit = {
    allowed: false,
    remaining: 0,
    resetTime: new Date(Date.now() + 3600000), // 1 hour from now
    retryAfter: 3600
  };

  const emailError = VerificationRateLimitUtils.generateRateLimitErrorResponse(
    emailRateLimit,
    'email_sending'
  );

  console.log('📧 Email Sending Error Response:');
  console.log(JSON.stringify(emailError, null, 2));

  // Test error response for verification attempts
  const verificationRateLimit = {
    allowed: false,
    remaining: 0,
    resetTime: new Date(Date.now() + 1800000), // 30 minutes from now
    retryAfter: 1800
  };

  const verificationError = VerificationRateLimitUtils.generateRateLimitErrorResponse(
    verificationRateLimit,
    'verification_attempts'
  );

  console.log('\n🔍 Verification Attempts Error Response:');
  console.log(JSON.stringify(verificationError, null, 2));

  // Test multiple rate limit error response
  const emailLimit = {
    allowed: false,
    remaining: 0,
    resetTime: new Date(Date.now() + 3600000),
    retryAfter: 3600
  };

  const ipLimit = {
    allowed: true,
    remaining: 5,
    resetTime: new Date(Date.now() + 3600000)
  };

  const multipleError = VerificationRateLimitUtils.generateMultipleRateLimitErrorResponse(
    emailLimit,
    ipLimit
  );

  console.log('\n🔄 Multiple Rate Limit Error Response:');
  console.log(JSON.stringify(multipleError, null, 2));

  console.log('\n✅ Error response tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  console.log('🚀 Starting Verification Rate Limit Tests...\n');
  
  // Set development environment for testing
  process.env.APP_ENV = 'development';
  
  Promise.resolve()
    .then(() => testErrorResponses())
    .then(() => console.log('\n' + '='.repeat(50) + '\n'))
    .then(() => testVerificationRateLimits())
    .then(() => {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

export { testVerificationRateLimits, testErrorResponses };