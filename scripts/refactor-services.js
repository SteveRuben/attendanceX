#!/usr/bin/env node

/**
 * Script de refactoring des services
 * Déplace les services isolés vers la nouvelle structure organisée par domaines
 */

const fs = require('fs');
const path = require('path');

// Mapping des services isolés vers leurs nouveaux emplacements
const serviceMappings = {
  // HR & Employee Services
  'employee.service.ts': 'hr/employee.service.ts',
  'leave.service.ts': 'hr/leave.service.ts',
  
  // Utility Services
  'biometric.service.ts': 'utility/biometric.service.ts',
  'booking.service.ts': 'utility/booking.service.ts',
  'certificate.service.ts': 'utility/certificate.service.ts',
  'client.service.ts': 'utility/client.service.ts',
  'location-tracking.service.ts': 'utility/location-tracking.service.ts',
  'ml.service.ts': 'utility/ml.service.ts',
  'monitoring.service.ts': 'utility/monitoring.service.ts',
  'nfc-badge.service.ts': 'utility/nfc-badge.service.ts',
  'permission.service.ts': 'utility/permission.service.ts',
  'presence-compliance.service.ts': 'utility/presence-compliance.service.ts',
  'qrcode.service.ts': 'utility/qrcode.service.ts',
  'realtime-attendance.service.ts': 'utility/realtime-attendance.service.ts',
  'report.service.ts': 'utility/report.service.ts',
  'team.service.ts': 'utility/team.service.ts',
  'time-tracking.service.ts': 'utility/time-tracking.service.ts',
  'user.service.ts': 'utility/user.service.ts',
  'work-schedule.service.ts': 'utility/work-schedule.service.ts',
  
  // Event Service (déjà dans event/ mais service isolé à déplacer)
  'event.service.ts': 'event/legacy-event.service.ts'
};

// Services qui devraient rester dans leurs dossiers actuels (vérification)
const existingServiceStructure = {
  'auth/': [
    'auth.service.ts',
    'jwt.service.ts',
    'password.service.ts',
    'session.service.ts',
    'two-factor.service.ts'
  ],
  'user/': [
    'user.service.ts',
    'user-profile.service.ts',
    'user-invitation.service.ts',
    'tenant-user.service.ts'
  ],
  'organization/': [
    'organization.service.ts',
    'organization-settings.service.ts'
  ],
  'tenant/': [
    'tenant.service.ts',
    'tenant-membership.service.ts'
  ],
  'event/': [
    'event.service.ts',
    'tenant-event.service.ts'
  ],
  'appointment/': [
    'appointment.service.ts',
    'appointment-analytics.service.ts'
  ],
  'attendance/': [
    'attendance.service.ts',
    'attendance-analytics.service.ts'
  ],
  'presence/': [
    'presence.service.ts',
    'presence-audit.service.ts',
    'presence-report.service.ts'
  ],
  'notification/': [
    'notification.service.ts',
    'email.service.ts',
    'sms.service.ts',
    'push.service.ts',
    'branded-notification.service.ts'
  ],
  'campaigns/': [
    'email-campaign.service.ts',
    'campaign-template.service.ts'
  ],
  'integrations/': [
    'integration.service.ts',
    'oauth.service.ts',
    'sync.service.ts'
  ],
  'analytics/': [
    'analytics.service.ts',
    'ml-analytics.service.ts'
  ],
  'branding/': [
    'branding.service.ts',
    'theme.service.ts'
  ],
  'customization/': [
    'feature-customization.service.ts'
  ],
  'billing/': [
    'billing.service.ts',
    'stripe-payment.service.ts'
  ],
  'subscription/': [
    'subscription.service.ts',
    'subscription-lifecycle.service.ts'
  ],
  'system/': [
    'system.service.ts',
    'migration.service.ts'
  ],
  'onboarding/': [
    'tenant-registration.service.ts',
    'setup-wizard.service.ts',
    'demo-data-generator.service.ts'
  ],
  'domain/': [
    'custom-domain.service.ts'
  ],
  'base/': [
    'base.service.ts',
    'tenant-aware.service.ts'
  ]
};

function moveFile(sourcePath, targetPath) {
  try {
    if (fs.existsSync(sourcePath)) {
      // Créer le répertoire cible s'il n'existe pas
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Déplacer le fichier
      fs.renameSync(sourcePath, targetPath);
      console.log(`✅ Moved: ${sourcePath} → ${targetPath}`);
      return true;
    } else {
      console.log(`⚠️  File not found: ${sourcePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error moving ${sourcePath}:`, error.message);
    return false;
  }
}

function checkExistingStructure() {
  console.log('🔍 Checking existing service structure...\n');
  
  const servicesDir = 'backend/functions/src/services';
  let totalFound = 0;
  let totalExpected = 0;
  
  Object.entries(existingServiceStructure).forEach(([folder, files]) => {
    const folderPath = path.join(servicesDir, folder);
    console.log(`📁 ${folder}`);
    
    files.forEach(file => {
      totalExpected++;
      const filePath = path.join(folderPath, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
        totalFound++;
      } else {
        console.log(`  ❌ ${file} (missing)`);
      }
    });
    console.log('');
  });
  
  console.log(`📊 Existing structure: ${totalFound}/${totalExpected} files found\n`);
  return { totalFound, totalExpected };
}

function refactorServices() {
  console.log('🚀 Starting services refactoring...\n');
  
  const servicesDir = 'backend/functions/src/services';
  let movedCount = 0;
  
  Object.entries(serviceMappings).forEach(([oldFile, newFile]) => {
    const sourcePath = path.join(servicesDir, oldFile);
    const targetPath = path.join(servicesDir, newFile);
    
    if (moveFile(sourcePath, targetPath)) {
      movedCount++;
    }
  });
  
  console.log(`\n📊 Services: ${movedCount}/${Object.keys(serviceMappings).length} files moved\n`);
  return movedCount;
}

function createServiceIndexFiles() {
  console.log('🚀 Creating service index files...\n');
  
  const servicesDir = 'backend/functions/src/services';
  
  // Index pour HR services
  const hrIndexContent = `/**
 * HR Services Index
 */

export { employeeService } from './employee.service';
export { leaveService } from './leave.service';
`;
  
  fs.writeFileSync(path.join(servicesDir, 'hr/index.ts'), hrIndexContent);
  console.log('📝 Created hr/index.ts');
  
  // Index pour Utility services
  const utilityIndexContent = `/**
 * Utility Services Index
 */

export { biometricService } from './biometric.service';
export { bookingService } from './booking.service';
export { certificateService } from './certificate.service';
export { clientService } from './client.service';
export { locationTrackingService } from './location-tracking.service';
export { mlService } from './ml.service';
export { monitoringService } from './monitoring.service';
export { nfcBadgeService } from './nfc-badge.service';
export { permissionService } from './permission.service';
export { presenceComplianceService } from './presence-compliance.service';
export { qrcodeService } from './qrcode.service';
export { realtimeAttendanceService } from './realtime-attendance.service';
export { reportService } from './report.service';
export { teamService } from './team.service';
export { timeTrackingService } from './time-tracking.service';
export { userService } from './user.service';
export { workScheduleService } from './work-schedule.service';
`;
  
  fs.writeFileSync(path.join(servicesDir, 'utility/index.ts'), utilityIndexContent);
  console.log('📝 Created utility/index.ts');
  
  // Index pour External services (vide pour l'instant)
  const externalIndexContent = `/**
 * External Services Index
 */

// TODO: Add external API services here
// export { externalApiService } from './external-api.service';
`;
  
  fs.writeFileSync(path.join(servicesDir, 'external/index.ts'), externalIndexContent);
  console.log('📝 Created external/index.ts');
  
  console.log('✅ Service index files created\n');
}

function updateMainServiceIndex() {
  console.log('🚀 Updating main service index...\n');
  
  const servicesDir = 'backend/functions/src/services';
  const indexPath = path.join(servicesDir, 'index.ts');
  
  const updatedIndexContent = `/**
 * Services Index - Export centralisé de tous les services
 * Organisé par domaines fonctionnels
 */

// 🔐 Authentication & Security Services
export * from './auth';

// 👥 User Management Services
export * from './user';

// 🏢 Organization & Tenant Services
export * from './organization';
export * from './tenant';

// 📅 Event Management Services
export * from './event';

// 📋 Appointment Services
export * from './appointment';

// ✅ Attendance & Presence Services
export * from './attendance';
export * from './presence';

// 🔔 Notification & Communication Services
export * from './notification';
export * from './campaigns';

// 🔗 Integration Services
export * from './integrations';

// 📊 Analytics & Reporting Services
export * from './analytics';

// 🎨 Branding & Customization Services
export * from './branding';
export * from './customization';

// 💰 Billing & Subscription Services
export * from './billing';
export * from './subscription';

// 🛠️ System & Infrastructure Services
export * from './system';
export * from './onboarding';
export * from './domain';

// 🏭 HR & Employee Services
export * from './hr';

// 🌐 External & Third-party Services
export * from './external';

// 🔧 Utility & Base Services
export * from './base';
export * from './utility';
`;
  
  fs.writeFileSync(indexPath, updatedIndexContent);
  console.log('📝 Updated main services/index.ts');
  console.log('✅ Main service index updated\n');
}

function generateServicesSummary(existingStats, movedCount) {
  console.log('📋 SERVICES REFACTORING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Existing services organized: ${existingStats.totalFound}/${existingStats.totalExpected}`);
  console.log(`✅ Isolated services moved: ${movedCount}/${Object.keys(serviceMappings).length}`);
  console.log('✅ Service index files created');
  console.log('✅ Main service index updated');
  console.log('✅ Services organized by domain');
  console.log('='.repeat(60));
  console.log('\n🎉 Services refactoring completed successfully!');
  console.log('\n📚 New service structure:');
  console.log('├── 🔐 auth/           # Authentication & Security');
  console.log('├── 👥 user/           # User Management');
  console.log('├── 🏢 organization/   # Organization Management');
  console.log('├── 🏢 tenant/         # Tenant Management');
  console.log('├── 📅 event/          # Event Management');
  console.log('├── 📋 appointment/    # Appointment Management');
  console.log('├── ✅ attendance/     # Attendance Management');
  console.log('├── ✅ presence/       # Presence Management');
  console.log('├── 🔔 notification/   # Notifications');
  console.log('├── 🔔 campaigns/      # Email Campaigns');
  console.log('├── 🔗 integrations/   # Third-party Integrations');
  console.log('├── 📊 analytics/      # Analytics & ML');
  console.log('├── 🎨 branding/       # Branding & Themes');
  console.log('├── 🎨 customization/  # Feature Customization');
  console.log('├── 💰 billing/        # Billing & Payments');
  console.log('├── 💰 subscription/   # Subscription Management');
  console.log('├── 🛠️ system/        # System Administration');
  console.log('├── 🛠️ onboarding/    # Onboarding & Setup');
  console.log('├── 🛠️ domain/        # Custom Domains');
  console.log('├── 🏭 hr/            # HR & Employee Management');
  console.log('├── 🌐 external/       # External API Services');
  console.log('├── 🔧 utility/        # Utility Services');
  console.log('└── 🔧 base/           # Base & Common Services');
  console.log('\n📚 Next steps:');
  console.log('1. Update import statements in controllers and routes');
  console.log('2. Test service imports and exports');
  console.log('3. Run linting to check for any issues');
  console.log('4. Update documentation if needed');
}

// Exécution du script
function main() {
  console.log('🔧 ATTENDANCE MANAGEMENT SYSTEM - SERVICES REFACTORING');
  console.log('='.repeat(70));
  console.log('Organizing services by functional domains\n');
  
  try {
    const existingStats = checkExistingStructure();
    const movedCount = refactorServices();
    createServiceIndexFiles();
    updateMainServiceIndex();
    generateServicesSummary(existingStats, movedCount);
  } catch (error) {
    console.error('❌ Services refactoring failed:', error.message);
    process.exit(1);
  }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  serviceMappings,
  existingServiceStructure,
  moveFile
};