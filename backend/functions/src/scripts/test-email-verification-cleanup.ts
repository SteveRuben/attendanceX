#!/usr/bin/env node

/**
 * Script de test pour les utilitaires de nettoyage de vérification d'email
 */

import { EmailVerificationCleanupUtils } from "../utils/email-verification-cleanup.utils";

import { EmailVerificationTokenModel } from "../models/email-verification-token.model";

async function testCleanupUtils() {
  console.log('🧪 Testing Email Verification Cleanup Utils...\n');

  try {
    // Test 1: Collect metrics
    console.log('📊 Test 1: Collecting verification metrics...');
    try {
      const metrics = await EmailVerificationCleanupUtils.collectVerificationMetrics();
      console.log('✅ Metrics collected successfully');
      console.log(`   - Total tokens generated: ${metrics.totalTokensGenerated}`);
      console.log(`   - Success rate: ${metrics.successRate}%`);
      console.log(`   - Average time to verification: ${metrics.averageTimeToVerification} minutes`);
    } catch (error) {
      console.log('❌ Metrics collection failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n---\n');

    // Test 2: Calculate success rate
    console.log('📈 Test 2: Calculating verification success rate...');
    try {
      const stats = await EmailVerificationCleanupUtils.calculateVerificationSuccessRate(7);
      console.log('✅ Success rate calculated successfully');
      console.log(`   - Period: ${stats.periodStart.toLocaleDateString()} to ${stats.periodEnd.toLocaleDateString()}`);
      console.log(`   - Total tokens: ${stats.totalTokensGenerated}`);
      console.log(`   - Successful verifications: ${stats.successfulVerifications}`);
      console.log(`   - Success rate: ${stats.successRate}%`);
    } catch (error) {
      console.log('❌ Success rate calculation failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n---\n');

    // Test 3: Get verification metrics
    console.log('📋 Test 3: Getting historical verification metrics...');
    try {
      const historicalMetrics = await EmailVerificationCleanupUtils.getVerificationMetrics({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 10
      });
      console.log('✅ Historical metrics retrieved successfully');
      console.log(`   - Number of data points: ${historicalMetrics.length}`);
      if (historicalMetrics.length > 0) {
        const latest = historicalMetrics[0];
        console.log(`   - Latest success rate: ${latest.successRate}%`);
        console.log(`   - Latest avg time: ${latest.averageTimeToVerification} minutes`);
      }
    } catch (error) {
      console.log('❌ Historical metrics retrieval failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n---\n');

    // Test 4: Dry run cleanup
    console.log('🧹 Test 4: Performing dry run cleanup...');
    try {
      // This would be a dry run if we had that functionality
      console.log('ℹ️  Dry run cleanup not implemented in utils, but cleanup functions are available');
      console.log('   - Use EmailVerificationCleanupUtils.performFullCleanup() for actual cleanup');
      console.log('   - Use EmailVerificationTokenUtils.cleanupExpiredTokens() for expired tokens');
      console.log('   - Use EmailVerificationTokenUtils.cleanupUsedTokens() for old used tokens');
    } catch (error) {
      console.log('❌ Cleanup test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n---\n');

    // Test 5: Token model validation
    console.log('🔍 Test 5: Testing token model creation...');
    try {
      const { model, rawToken } = EmailVerificationTokenModel.createToken('test-user-id', '127.0.0.1', 'test-agent');
      console.log('✅ Token model created successfully');
      console.log(`   - Token ID: ${model.id || 'Not set (will be set on save)'}`);
      console.log(`   - User ID: ${model.getUserId()}`);
      console.log(`   - Raw token length: ${rawToken.length} characters`);
      console.log(`   - Hashed token length: ${model.getHashedToken().length} characters`);
      console.log(`   - Expires at: ${model.getExpiresAt().toLocaleString()}`);
      console.log(`   - Is valid: ${model.isValid()}`);
      console.log(`   - Is expired: ${model.isExpired()}`);
    } catch (error) {
      console.log('❌ Token model creation failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  testCleanupUtils().catch(console.error);
}

export { testCleanupUtils };