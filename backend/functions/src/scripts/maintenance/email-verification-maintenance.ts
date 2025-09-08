#!/usr/bin/env node

/**
 * Script de maintenance pour les tokens de vérification d'email
 * 
 * Usage:
 * npm run script:email-verification-maintenance [command] [options]
 * 
 * Commands:
 * - cleanup: Nettoie les tokens expirés et utilisés
 * - metrics: Collecte et affiche les métriques
 * - stats: Affiche les statistiques de vérification
 * - report: Génère un rapport détaillé
 */


import { collections } from "../../config/database";
import { EmailVerificationCleanupUtils } from "../../shared";

interface MaintenanceOptions {
  command: string;
  dryRun?: boolean;
  days?: number;
  verbose?: boolean;
}

class EmailVerificationMaintenance {
  
  static async main() {
    const args = process.argv.slice(2);
    const options = this.parseArguments(args);

    console.log(`🔧 Email Verification Maintenance Tool`);
    console.log(`Command: ${options.command}`);
    console.log(`Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
    console.log(`Verbose: ${options.verbose ? 'Yes' : 'No'}`);
    console.log('---');

    try {
      switch (options.command) {
        case 'cleanup':
          await this.runCleanup(options);
          break;
        case 'metrics':
          await this.collectMetrics(options);
          break;
        case 'stats':
          await this.showStats(options);
          break;
        case 'report':
          await this.generateReport(options);
          break;
        case 'help':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ Maintenance operation failed:', error);
      process.exit(1);
    }
  }

  private static parseArguments(args: string[]): MaintenanceOptions {
    const options: MaintenanceOptions = {
      command: args[0] || 'help',
      dryRun: args.includes('--dry-run'),
      verbose: args.includes('--verbose'),
    };

    const daysIndex = args.indexOf('--days');
    if (daysIndex !== -1 && args[daysIndex + 1]) {
      options.days = parseInt(args[daysIndex + 1], 10);
    }

    return options;
  }

  private static async runCleanup(options: MaintenanceOptions) {
    console.log('🧹 Starting email verification cleanup...');

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual cleanup will be performed');
      
      // Simuler le nettoyage en comptant les éléments à nettoyer
      const now = new Date();
      
      // Compter les tokens expirés
      const expiredQuery = await collections.email_verification_tokens
        .where("expiresAt", "<=", now)
        .get();
      
      // Compter les tokens utilisés anciens
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (options.days || 30));
      
      const usedQuery = await collections.email_verification_tokens
        .where("isUsed", "==", true)
        .where("usedAt", "<=", cutoffDate)
        .get();

      console.log(`📊 Cleanup Preview:`);
      console.log(`  - Expired tokens to clean: ${expiredQuery.size}`);
      console.log(`  - Used tokens older than ${options.days || 30} days: ${usedQuery.size}`);
      console.log(`  - Total tokens that would be cleaned: ${expiredQuery.size + usedQuery.size}`);
      
    } else {
      const result = await EmailVerificationCleanupUtils.performFullCleanup({
        cleanExpired: true,
        cleanUsedOlderThanDays: options.days || 30,
        cleanOrphaned: true
      });

      console.log('✅ Cleanup completed successfully');
      console.log(`📊 Cleanup Results:`);
      console.log(`  - Expired tokens cleaned: ${result.expiredTokens}`);
      console.log(`  - Used tokens cleaned: ${result.usedTokens}`);
      console.log(`  - Orphaned tokens cleaned: ${result.orphanedTokens}`);
      console.log(`  - Total cleaned: ${result.totalCleaned}`);
      
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors encountered: ${result.errors.length}`);
        if (options.verbose) {
          result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
        }
      }
    }
  }

  private static async collectMetrics(options: MaintenanceOptions) {
    console.log('📊 Collecting email verification metrics...');

    const metrics = await EmailVerificationCleanupUtils.collectVerificationMetrics();

    console.log('✅ Metrics collected successfully');
    console.log(`📈 Current Metrics (Last 24h):`);
    console.log(`  - Total tokens generated: ${metrics.totalTokensGenerated}`);
    console.log(`  - Tokens used successfully: ${metrics.tokensUsedSuccessfully}`);
    console.log(`  - Tokens expired: ${metrics.tokensExpired}`);
    console.log(`  - Tokens still active: ${metrics.tokensStillActive}`);
    console.log(`  - Success rate: ${metrics.successRate}%`);
    console.log(`  - Average time to verification: ${metrics.averageTimeToVerification} minutes`);
    
    console.log(`👥 User Statistics:`);
    console.log(`  - Total users with tokens: ${metrics.userVerificationStats.totalUsersWithTokens}`);
    console.log(`  - Users verified: ${metrics.userVerificationStats.usersVerified}`);
    console.log(`  - Users with expired tokens: ${metrics.userVerificationStats.usersWithExpiredTokens}`);
    console.log(`  - Users with active tokens: ${metrics.userVerificationStats.usersWithActiveTokens}`);

    if (metrics.topFailureReasons.length > 0) {
      console.log(`🚫 Top Failure Reasons:`);
      metrics.topFailureReasons.forEach((reason, index) => {
        console.log(`  ${index + 1}. ${reason.reason}: ${reason.count}`);
      });
    }
  }

  private static async showStats(options: MaintenanceOptions) {
    console.log('📈 Generating email verification statistics...');

    const days = options.days || 7;
    const stats = await EmailVerificationCleanupUtils.calculateVerificationSuccessRate(days);

    console.log(`📊 Verification Statistics (Last ${days} days):`);
    console.log(`  - Period: ${stats.periodStart.toLocaleDateString()} to ${stats.periodEnd.toLocaleDateString()}`);
    console.log(`  - Total tokens generated: ${stats.totalTokensGenerated}`);
    console.log(`  - Successful verifications: ${stats.successfulVerifications}`);
    console.log(`  - Success rate: ${stats.successRate}%`);
    console.log(`  - Average time to verification: ${stats.averageTimeToVerification} minutes`);

    // Obtenir des statistiques supplémentaires
    const allTokensQuery = await collections.email_verification_tokens.get();
    const totalTokensEver = allTokensQuery.size;

    const activeTokensQuery = await collections.email_verification_tokens
      .where("isUsed", "==", false)
      .where("expiresAt", ">", new Date())
      .get();
    const currentActiveTokens = activeTokensQuery.size;

    console.log(`🔢 Overall Statistics:`);
    console.log(`  - Total tokens ever created: ${totalTokensEver}`);
    console.log(`  - Currently active tokens: ${currentActiveTokens}`);

    // Analyser les tendances si on a assez de données
    if (days >= 7) {
      const weeklyMetrics = await EmailVerificationCleanupUtils.getVerificationMetrics({
        startDate: stats.periodStart,
        endDate: stats.periodEnd,
        limit: 100
      });

      if (weeklyMetrics.length > 1) {
        const firstMetric = weeklyMetrics[weeklyMetrics.length - 1];
        const lastMetric = weeklyMetrics[0];
        
        const successRateTrend = lastMetric.successRate - firstMetric.successRate;
        const timeTrend = lastMetric.averageTimeToVerification - firstMetric.averageTimeToVerification;

        console.log(`📈 Trends:`);
        console.log(`  - Success rate trend: ${successRateTrend > 0 ? '+' : ''}${successRateTrend.toFixed(2)}%`);
        console.log(`  - Time to verification trend: ${timeTrend > 0 ? '+' : ''}${timeTrend.toFixed(2)} minutes`);
      }
    }
  }

  private static async generateReport(options: MaintenanceOptions) {
    console.log('📋 Generating comprehensive email verification report...');

    const days = options.days || 30;
    
    // Collecter toutes les données nécessaires
    const [stats, metrics, recentMetrics] = await Promise.all([
      EmailVerificationCleanupUtils.calculateVerificationSuccessRate(days),
      EmailVerificationCleanupUtils.collectVerificationMetrics(),
      EmailVerificationCleanupUtils.getVerificationMetrics({
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 100
      })
    ]);

    // Générer le rapport
    console.log(`\n📋 EMAIL VERIFICATION COMPREHENSIVE REPORT`);
    console.log(`Generated: ${new Date().toLocaleString()}`);
    console.log(`Period: Last ${days} days`);
    console.log(`=`.repeat(60));

    console.log(`\n📊 SUMMARY STATISTICS`);
    console.log(`Total tokens generated: ${stats.totalTokensGenerated}`);
    console.log(`Successful verifications: ${stats.successfulVerifications}`);
    console.log(`Success rate: ${stats.successRate}%`);
    console.log(`Average time to verification: ${stats.averageTimeToVerification} minutes`);

    console.log(`\n📈 CURRENT STATUS (Last 24h)`);
    console.log(`Active tokens: ${metrics.tokensStillActive}`);
    console.log(`Expired tokens: ${metrics.tokensExpired}`);
    console.log(`Recent success rate: ${metrics.successRate}%`);

    console.log(`\n👥 USER ENGAGEMENT`);
    console.log(`Users with verification tokens: ${metrics.userVerificationStats.totalUsersWithTokens}`);
    console.log(`Users successfully verified: ${metrics.userVerificationStats.usersVerified}`);
    console.log(`Users with active tokens: ${metrics.userVerificationStats.usersWithActiveTokens}`);
    console.log(`Users with expired tokens: ${metrics.userVerificationStats.usersWithExpiredTokens}`);

    if (recentMetrics.length > 0) {
      const avgSuccessRate = recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length;
      const avgTimeToVerification = recentMetrics.reduce((sum, m) => sum + m.averageTimeToVerification, 0) / recentMetrics.length;
      
      console.log(`\n📊 PERIOD AVERAGES`);
      console.log(`Average success rate over period: ${avgSuccessRate.toFixed(2)}%`);
      console.log(`Average time to verification over period: ${avgTimeToVerification.toFixed(2)} minutes`);
      console.log(`Data points collected: ${recentMetrics.length}`);
    }

    // Recommandations
    console.log(`\n💡 RECOMMENDATIONS`);
    if (stats.successRate < 70) {
      console.log(`⚠️  Low success rate (${stats.successRate}%) - Consider investigating email delivery issues`);
    }
    if (stats.averageTimeToVerification > 60) {
      console.log(`⚠️  High verification time (${stats.averageTimeToVerification} min) - Users may need better guidance`);
    }
    if (metrics.tokensStillActive > metrics.tokensUsedSuccessfully * 2) {
      console.log(`⚠️  Many active tokens - Consider shortening expiration time or improving UX`);
    }
    if (stats.successRate >= 80 && stats.averageTimeToVerification <= 30) {
      console.log(`✅ Excellent verification performance - Current system is working well`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Report completed successfully`);
  }

  private static showHelp() {
    console.log(`
📖 Email Verification Maintenance Tool Help

USAGE:
  npm run script:email-verification-maintenance [command] [options]

COMMANDS:
  cleanup    Clean up expired and old verification tokens
  metrics    Collect and display current metrics
  stats      Show verification statistics for a period
  report     Generate a comprehensive report
  help       Show this help message

OPTIONS:
  --dry-run       Preview cleanup without making changes
  --days N        Specify number of days for stats/cleanup (default: 7 for stats, 30 for cleanup)
  --verbose       Show detailed output including errors

EXAMPLES:
  # Preview cleanup without making changes
  npm run script:email-verification-maintenance cleanup --dry-run

  # Clean up tokens older than 14 days
  npm run script:email-verification-maintenance cleanup --days 14

  # Show statistics for the last 30 days
  npm run script:email-verification-maintenance stats --days 30

  # Generate a comprehensive report
  npm run script:email-verification-maintenance report --verbose

  # Collect current metrics
  npm run script:email-verification-maintenance metrics
    `);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  EmailVerificationMaintenance.main().catch(console.error);
}

export { EmailVerificationMaintenance };