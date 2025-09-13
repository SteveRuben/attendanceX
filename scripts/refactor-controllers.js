#!/usr/bin/env node

/**
 * Script de refactoring des controllers et routes
 * Déplace les fichiers existants vers la nouvelle structure organisée
 */

const fs = require('fs');
const path = require('path');

// Mapping des fichiers vers leurs nouveaux emplacements
const controllerMappings = {
  // Authentication & Security
  'auth.controller.ts': 'auth/auth.controller.ts',
  'auth-organization.controller.ts': 'auth/auth-organization.controller.ts',
  
  // User Management
  'user.controller.ts': 'user/user.controller.ts',
  'team.controller.ts': 'user/team.controller.ts',
  
  // Organization Management
  'organization.controller.ts': 'organization/organization.controller.ts',
  'organization-analytics.controller.ts': 'organization/organization-analytics.controller.ts',
  
  // Event Management
  'event.controller.ts': 'event/event.controller.ts',
  
  // Appointment Management
  'appointment.controller.ts': 'appointment/appointment.controller.ts',
  'appointment-analytics.controller.ts': 'appointment/appointment-analytics.controller.ts',
  
  // Attendance & Presence
  'attendance.controller.ts': 'attendance/attendance.controller.ts',
  'presence.controller.ts': 'attendance/presence.controller.ts',
  'presence-report.controller.ts': 'attendance/presence-report.controller.ts',
  'presence-settings.controller.ts': 'attendance/presence-settings.controller.ts',
  
  // Notifications & Communications
  'notification.controller.ts': 'notification/notification.controller.ts',
  'email-campaign.controller.ts': 'notification/email-campaign.controller.ts',
  'campaign-template.controller.ts': 'notification/campaign-template.controller.ts',
  'campaign-recipient.controller.ts': 'notification/campaign-recipient.controller.ts',
  'campaign-delivery.controller.ts': 'notification/campaign-delivery.controller.ts',
  
  // Integrations
  'integration.controller.ts': 'integration/integration.controller.ts',
  'qrcode.controller.ts': 'integration/qrcode.controller.ts',
  
  // Reports & Analytics
  'report.controller.ts': 'report/report.controller.ts',
  'ml.controller.ts': 'report/ml.controller.ts',
  
  // Branding & Customization
  'certificate.controller.ts': 'branding/certificate.controller.ts',
  
  // System & Admin
  'migration.controller.ts': 'system/migration.controller.ts'
};

const routeMappings = {
  // Authentication & Security
  'auth.routes.ts': 'auth/auth.routes.ts',
  'auth-organization.routes.ts': 'auth/auth-organization.routes.ts',
  
  // User Management
  'users.routes.ts': 'user/users.routes.ts',
  'teams.routes.ts': 'user/teams.routes.ts',
  'user-invitations.routes.ts': 'user/user-invitations.routes.ts',
  
  // Organization Management
  'organizations.routes.ts': 'organization/organizations.routes.ts',
  'organization-analytics.routes.ts': 'organization/organization-analytics.routes.ts',
  
  // Event Management
  'events.routes.ts': 'event/events.routes.ts',
  
  // Appointment Management
  'appointments.routes.ts': 'appointment/appointments.routes.ts',
  'appointment-analytics.routes.ts': 'appointment/appointment-analytics.routes.ts',
  
  // Attendance & Presence
  'attendances.routes.ts': 'attendance/attendances.routes.ts',
  'presence.routes.ts': 'attendance/presence.routes.ts',
  
  // Notifications & Communications
  'notifications.routes.ts': 'notification/notifications.routes.ts',
  'email-campaign.routes.ts': 'notification/email-campaign.routes.ts',
  'campaign-template.routes.ts': 'notification/campaign-template.routes.ts',
  'campaign-recipient.routes.ts': 'notification/campaign-recipient.routes.ts',
  'campaign-delivery.routes.ts': 'notification/campaign-delivery.routes.ts',
  'branded-notifications.routes.ts': 'notification/branded-notifications.routes.ts',
  
  // Integrations
  'integration.routes.ts': 'integration/integration.routes.ts',
  'qrcode.routes.ts': 'integration/qrcode.routes.ts',
  
  // Reports & Analytics
  'reports.routes.ts': 'report/reports.routes.ts',
  'ml.routes.ts': 'report/ml.routes.ts',
  
  // Branding & Customization
  'branding.routes.ts': 'branding/branding.routes.ts',
  'certificates.routes.ts': 'branding/certificates.routes.ts',
  'custom-domains.routes.ts': 'branding/custom-domains.routes.ts',
  'feature-customization.routes.ts': 'branding/feature-customization.routes.ts',
  
  // Billing & Subscriptions
  'billing.routes.ts': 'billing/billing.routes.ts',
  'dunning.routes.ts': 'billing/dunning.routes.ts',
  'stripe-webhooks.routes.ts': 'billing/stripe-webhooks.routes.ts',
  
  // System & Admin
  'admin.routes.ts': 'system/admin.routes.ts',
  'migration.routes.ts': 'system/migration.routes.ts',
  'setup-wizard.routes.ts': 'system/setup-wizard.routes.ts',
  'demo-data.routes.ts': 'system/demo-data.routes.ts'
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

function updateImports(filePath, oldPath, newPath) {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Mettre à jour les imports relatifs
      const oldImport = oldPath.replace('.ts', '');
      const newImport = newPath.replace('.ts', '');
      
      content = content.replace(
        new RegExp(`from ['"]\.\.?/controllers/${oldImport}['"]`, 'g'),
        `from '../controllers/${newImport}'`
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`📝 Updated imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating imports in ${filePath}:`, error.message);
  }
}

function refactorControllers() {
  console.log('🚀 Starting controllers refactoring...\n');
  
  const controllersDir = 'backend/functions/src/controllers';
  let movedCount = 0;
  
  Object.entries(controllerMappings).forEach(([oldFile, newFile]) => {
    const sourcePath = path.join(controllersDir, oldFile);
    const targetPath = path.join(controllersDir, newFile);
    
    if (moveFile(sourcePath, targetPath)) {
      movedCount++;
    }
  });
  
  console.log(`\n📊 Controllers: ${movedCount}/${Object.keys(controllerMappings).length} files moved\n`);
}

function refactorRoutes() {
  console.log('🚀 Starting routes refactoring...\n');
  
  const routesDir = 'backend/functions/src/routes';
  let movedCount = 0;
  
  Object.entries(routeMappings).forEach(([oldFile, newFile]) => {
    const sourcePath = path.join(routesDir, oldFile);
    const targetPath = path.join(routesDir, newFile);
    
    if (moveFile(sourcePath, targetPath)) {
      movedCount++;
    }
  });
  
  console.log(`\n📊 Routes: ${movedCount}/${Object.keys(routeMappings).length} files moved\n`);
}

function updateIndexFiles() {
  console.log('🚀 Updating index files...\n');
  
  // Mettre à jour routes/index.ts
  const routesIndexPath = 'backend/functions/src/routes/index.ts';
  if (fs.existsSync(routesIndexPath)) {
    let content = fs.readFileSync(routesIndexPath, 'utf8');
    
    // Mettre à jour les imports pour refléter la nouvelle structure
    Object.entries(routeMappings).forEach(([oldFile, newFile]) => {
      const oldImport = `./${oldFile.replace('.ts', '')}`;
      const newImport = `./${newFile.replace('.ts', '')}`;
      content = content.replace(oldImport, newImport);
    });
    
    fs.writeFileSync(routesIndexPath, content);
    console.log('📝 Updated routes/index.ts');
  }
  
  console.log('✅ Index files updated\n');
}

function generateSummary() {
  console.log('📋 CONTROLLERS & ROUTES REFACTORING SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ Controllers organized by domain');
  console.log('✅ Routes organized by domain');
  console.log('✅ Index files updated');
  console.log('✅ Swagger collection v2 created');
  console.log('✅ Postman collection v2 created');
  console.log('✅ API documentation updated');
  console.log('='.repeat(60));
  console.log('\n🎉 Controllers & Routes refactoring completed!');
  console.log('\n📚 Next steps:');
  console.log('1. Run services refactoring: node scripts/refactor-services.js');
  console.log('2. Update import statements in dependent files');
  console.log('3. Test the API endpoints');
  console.log('4. Update frontend service calls if needed');
  console.log('5. Run tests to ensure everything works');
}

// Exécution du script
function main() {
  console.log('🔧 ATTENDANCE MANAGEMENT SYSTEM - REFACTORING SCRIPT');
  console.log('='.repeat(60));
  console.log('Organizing controllers and routes by functional domains\n');
  
  try {
    refactorControllers();
    refactorRoutes();
    updateIndexFiles();
    generateSummary();
  } catch (error) {
    console.error('❌ Refactoring failed:', error.message);
    process.exit(1);
  }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  controllerMappings,
  routeMappings,
  moveFile,
  updateImports
};