/**
 * Script pour remplacer automatiquement les utilisations de db.collection()
 * par les collections centralisées
 */

// Mappings des collections à remplacer
const COLLECTION_MAPPINGS = {
  'db.collection("users")': 'collections.users',
  'db.collection("events")': 'collections.events',
  'db.collection("attendances")': 'collections.attendances',
  'db.collection("notifications")': 'collections.notifications',
  'db.collection("reports")': 'collections.reports',
  'db.collection("rate_limits")': 'collections.rate_limits',
  'db.collection("user_invitations")': 'collections.user_invitations',
  'db.collection("user_sessions")': 'collections.user_sessions',
  'db.collection("audit_logs")': 'collections.audit_logs',
  'db.collection("user_statistics")': 'collections.user_statistics',
  'db.collection("user_preferences")': 'collections.user_preferences',
  'db.collection("user_profiles")': 'collections.user_profiles',
  'db.collection("user_integrations")': 'collections.user_integrations',
  'db.collection("user_files")': 'collections.user_files',
  'db.collection("groups")': 'collections.groups',
  'db.collection("departments")': 'collections.departments',
  'db.collection("notification_templates")': 'collections.notification_templates',
  'db.collection("scheduled_notifications")': 'collections.scheduled_notifications',
  'db.collection("notifications_archive")': 'collections.notifications_archive',
  'db.collection("emailProviders")': 'collections.emailProviders',
  'db.collection("emailTemplates")': 'collections.emailTemplates',
  'db.collection("email_logs")': 'collections.email_logs',
  'db.collection("smsProviders")': 'collections.smsProviders',
  'db.collection("smsTemplates")': 'collections.smsTemplates',
  'db.collection("smsMessages")': 'collections.smsMessages',
  'db.collection("sms_logs")': 'collections.sms_logs',
  'db.collection("push_devices")': 'collections.push_devices',
  'db.collection("pushTokens")': 'collections.pushTokens',
  'db.collection("pushMetrics")': 'collections.pushMetrics',
  'db.collection("pushTemplates")': 'collections.pushTemplates',
  'db.collection("scheduledPushNotifications")': 'collections.scheduledPushNotifications',
  'db.collection("feedbacks")': 'collections.feedbacks',
  'db.collection("invitations")': 'collections.invitations',
  'db.collection("settings")': 'collections.settings',
  'db.collection("file_metadata")': 'collections.file_metadata',
  'db.collection("ml_models")': 'collections.ml_models',
  'db.collection("ml_predictions")': 'collections.ml_predictions',
  'db.collection("analytics_events")': 'collections.analytics_events',
  'db.collection("cache_entries")': 'collections.cache_entries',
  'db.collection("performance_metrics")': 'collections.performance_metrics',
  'db.collection("error_logs")': 'collections.error_logs',
  'db.collection("access_logs")': 'collections.access_logs',
  'db.collection("background_jobs")': 'collections.background_jobs',
  'db.collection("scheduled_tasks")': 'collections.scheduled_tasks',
  
  // Alias pour compatibilité
  'db.collection("auditLogs")': 'collections.audit_logs',
};

console.log('📋 Collections mappings defined:');
Object.entries(COLLECTION_MAPPINGS).forEach(([old, newCol]) => {
  console.log(`  ${old} → ${newCol}`);
});

console.log('\n✅ Script ready. Use these mappings to update your files manually or with find/replace.');
console.log('\n💡 Don\'t forget to add this import to files that use collections:');
console.log('import { collections } from "../config/database";');