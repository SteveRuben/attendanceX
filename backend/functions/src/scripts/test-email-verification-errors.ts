// backend/functions/src/scripts/test-email-verification-errors.ts
import { EmailVerificationErrors } from "../utils/email-verification-errors";
import { EmailVerificationValidation } from "../utils/email-verification-validation";
import { ERROR_CODES } from "@attendance-x/shared";

/**
 * Simple test script to validate email verification error handling
 */
function testEmailVerificationErrors() {
  console.log("🧪 Testing Email Verification Error Handling...\n");

  // Test 1: Email Already Verified Error
  console.log("1. Testing emailAlreadyVerified error:");
  try {
    const error = EmailVerificationErrors.emailAlreadyVerified("test@example.com");
    console.log("✅ Status Code:", error.statusCode);
    console.log("✅ Error Code:", error.code);
    console.log("✅ Message:", error.message);
    console.log("✅ Details:", JSON.stringify(error.details, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 2: Token Expired Error
  console.log("2. Testing verificationTokenExpired error:");
  try {
    const error = EmailVerificationErrors.verificationTokenExpired("test@example.com");
    console.log("✅ Status Code:", error.statusCode);
    console.log("✅ Error Code:", error.code);
    console.log("✅ Message:", error.message);
    console.log("✅ Details:", JSON.stringify(error.details, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 3: Rate Limit Exceeded Error
  console.log("3. Testing verificationRateLimitExceeded error:");
  try {
    const nextAllowedTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    const error = EmailVerificationErrors.verificationRateLimitExceeded("test@example.com", nextAllowedTime);
    console.log("✅ Status Code:", error.statusCode);
    console.log("✅ Error Code:", error.code);
    console.log("✅ Message:", error.message);
    console.log("✅ Details:", JSON.stringify(error.details, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 4: Email Not Verified for Login (with resend allowed)
  console.log("4. Testing emailNotVerifiedForLogin error (resend allowed):");
  try {
    const error = EmailVerificationErrors.emailNotVerifiedForLogin(
      "test@example.com", 
      true, 
      new Date(), 
      2
    );
    console.log("✅ Status Code:", error.statusCode);
    console.log("✅ Error Code:", error.code);
    console.log("✅ Message:", error.message);
    console.log("✅ Details:", JSON.stringify(error.details, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 5: Email Not Verified for Login (resend not allowed)
  console.log("5. Testing emailNotVerifiedForLogin error (resend not allowed):");
  try {
    const error = EmailVerificationErrors.emailNotVerifiedForLogin(
      "test@example.com", 
      false, 
      undefined, 
      5
    );
    console.log("✅ Status Code:", error.statusCode);
    console.log("✅ Error Code:", error.code);
    console.log("✅ Message:", error.message);
    console.log("✅ Details:", JSON.stringify(error.details, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 6: Success Response - Registration
  console.log("6. Testing registrationSuccessWithVerification response:");
  try {
    const response = EmailVerificationErrors.registrationSuccessWithVerification("test@example.com", true);
    console.log("✅ Success:", response.success);
    console.log("✅ Message:", response.message);
    console.log("✅ Data:", JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 7: Success Response - Email Verification
  console.log("7. Testing emailVerificationSuccess response:");
  try {
    const response = EmailVerificationErrors.emailVerificationSuccess("test@example.com");
    console.log("✅ Success:", response.success);
    console.log("✅ Message:", response.message);
    console.log("✅ Data:", JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 8: Success Response - Verification Email Sent
  console.log("8. Testing verificationEmailSentSuccess response:");
  try {
    const response = EmailVerificationErrors.verificationEmailSentSuccess("test@example.com", true);
    console.log("✅ Success:", response.success);
    console.log("✅ Message:", response.message);
    console.log("✅ Data:", JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 9: Validation - Valid Email
  console.log("9. Testing email validation (valid):");
  try {
    const validation = EmailVerificationValidation.validateEmail("test@example.com");
    console.log("✅ Is Valid:", validation.isValid);
    console.log("✅ Error:", validation.error || "None");
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 10: Validation - Invalid Email
  console.log("10. Testing email validation (invalid):");
  try {
    const validation = EmailVerificationValidation.validateEmail("invalid-email");
    console.log("✅ Is Valid:", validation.isValid);
    if (validation.error) {
      console.log("✅ Error Code:", validation.error.code);
      console.log("✅ Error Message:", validation.error.message);
      console.log("✅ Error Details:", JSON.stringify(validation.error.details, null, 2));
    }
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 11: Validation - Valid Token
  console.log("11. Testing token validation (valid):");
  try {
    const validToken = "a".repeat(64); // 64 character hex string
    const validation = EmailVerificationValidation.validateToken(validToken);
    console.log("✅ Is Valid:", validation.isValid);
    console.log("✅ Error:", validation.error || "None");
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 12: Validation - Invalid Token
  console.log("12. Testing token validation (invalid):");
  try {
    const validation = EmailVerificationValidation.validateToken("invalid-token");
    console.log("✅ Is Valid:", validation.isValid);
    if (validation.error) {
      console.log("✅ Error Code:", validation.error.code);
      console.log("✅ Error Message:", validation.error.message);
      console.log("✅ Error Details:", JSON.stringify(validation.error.details, null, 2));
    }
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 13: HTTP Status Codes
  console.log("13. Testing HTTP status codes:");
  try {
    console.log("✅ EMAIL_ALREADY_VERIFIED:", EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_ALREADY_VERIFIED));
    console.log("✅ EMAIL_NOT_VERIFIED:", EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_NOT_VERIFIED));
    console.log("✅ VERIFICATION_RATE_LIMIT_EXCEEDED:", EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.VERIFICATION_RATE_LIMIT_EXCEEDED));
    console.log("✅ EMAIL_VERIFICATION_SEND_FAILED:", EmailVerificationErrors.getHttpStatusCode(ERROR_CODES.EMAIL_VERIFICATION_SEND_FAILED));
  } catch (e) {
    console.log("❌ Error:", e);
  }
  console.log();

  // Test 14: Actionable Error Messages
  console.log("14. Testing actionable error messages:");
  try {
    console.log("✅ EMAIL_NOT_VERIFIED (can resend):", 
      EmailVerificationErrors.getActionableErrorMessage(ERROR_CODES.EMAIL_NOT_VERIFIED, { canResend: true }));
    console.log("✅ EMAIL_NOT_VERIFIED (cannot resend):", 
      EmailVerificationErrors.getActionableErrorMessage(ERROR_CODES.EMAIL_NOT_VERIFIED, { canResend: false }));
    console.log("✅ VERIFICATION_TOKEN_EXPIRED:", 
      EmailVerificationErrors.getActionableErrorMessage(ERROR_CODES.VERIFICATION_TOKEN_EXPIRED));
    console.log("✅ VERIFICATION_TOKEN_USED:", 
      EmailVerificationErrors.getActionableErrorMessage(ERROR_CODES.VERIFICATION_TOKEN_USED));
  } catch (e) {
    console.log("❌ Error:", e);
  }

  console.log("\n🎉 Email Verification Error Handling Tests Completed!");
}

// Run the tests
testEmailVerificationErrors();