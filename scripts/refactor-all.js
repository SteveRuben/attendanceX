#!/usr/bin/env node

/**
 * Script principal de refactoring complet
 * Exécute le refactoring des controllers, routes et services
 */

const { execSync } = require('child_process');
const path = require('path');

function executeScript(scriptPath, description) {
  console.log(`\n🚀 ${description}...`);
  console.log('='.repeat(70));
  
  try {
    execSync(`node ${scriptPath}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`\n✅ ${description} completed successfully!\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} failed:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 ATTENDANCE MANAGEMENT SYSTEM - COMPLETE REFACTORING');
  console.log('='.repeat(80));
  console.log('Refactoring controllers, routes, and services by functional domains');
  console.log('='.repeat(80));
  
  const scripts = [
    {
      path: 'scripts/refactor-controllers.js',
      description: 'Controllers & Routes Refactoring'
    },
    {
      path: 'scripts/refactor-services.js', 
      description: 'Services Refactoring'
    }
  ];
  
  let successCount = 0;
  
  for (const script of scripts) {
    if (executeScript(script.path, script.description)) {
      successCount++;
    } else {
      console.error(`\n💥 Stopping refactoring due to failure in: ${script.description}`);
      process.exit(1);
    }
  }
  
  // Résumé final
  console.log('🎊 COMPLETE REFACTORING SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ ${successCount}/${scripts.length} refactoring scripts completed successfully`);
  console.log('✅ Controllers organized by functional domains');
  console.log('✅ Routes organized by functional domains');
  console.log('✅ Services organized by functional domains');
  console.log('✅ Index files created and updated');
  console.log('✅ Swagger collection v2 created');
  console.log('✅ Postman collection v2 created');
  console.log('✅ API documentation updated');
  console.log('='.repeat(80));
  
  console.log('\n🏗️ NEW ARCHITECTURE OVERVIEW:');
  console.log('📁 backend/functions/src/');
  console.log('├── controllers/');
  console.log('│   ├── 🔐 auth/           # Authentication & Security');
  console.log('│   ├── 👥 user/           # User Management');
  console.log('│   ├── 🏢 organization/   # Organization Management');
  console.log('│   ├── 📅 event/          # Event Management');
  console.log('│   ├── 📋 appointment/    # Appointment Management');
  console.log('│   ├── ✅ attendance/     # Attendance & Presence');
  console.log('│   ├── 🔔 notification/   # Notifications & Communications');
  console.log('│   ├── 🔗 integration/    # Integrations');
  console.log('│   ├── 📊 report/         # Reports & Analytics');
  console.log('│   ├── 🎨 branding/       # Branding & Customization');
  console.log('│   ├── 💰 billing/        # Billing & Subscriptions');
  console.log('│   └── 🛠️ system/        # System & Admin');
  console.log('├── routes/');
  console.log('│   └── [same structure as controllers]');
  console.log('└── services/');
  console.log('    ├── 🔐 auth/           # Authentication Services');
  console.log('    ├── 👥 user/           # User Services');
  console.log('    ├── 🏢 organization/   # Organization Services');
  console.log('    ├── 🏢 tenant/         # Tenant Services');
  console.log('    ├── 📅 event/          # Event Services');
  console.log('    ├── 📋 appointment/    # Appointment Services');
  console.log('    ├── ✅ attendance/     # Attendance Services');
  console.log('    ├── ✅ presence/       # Presence Services');
  console.log('    ├── 🔔 notification/   # Notification Services');
  console.log('    ├── 🔔 campaigns/      # Campaign Services');
  console.log('    ├── 🔗 integrations/   # Integration Services');
  console.log('    ├── 📊 analytics/      # Analytics Services');
  console.log('    ├── 🎨 branding/       # Branding Services');
  console.log('    ├── 🎨 customization/  # Customization Services');
  console.log('    ├── 💰 billing/        # Billing Services');
  console.log('    ├── 💰 subscription/   # Subscription Services');
  console.log('    ├── 🛠️ system/        # System Services');
  console.log('    ├── 🛠️ onboarding/    # Onboarding Services');
  console.log('    ├── 🛠️ domain/        # Domain Services');
  console.log('    ├── 🏭 hr/            # HR Services');
  console.log('    ├── 🌐 external/       # External Services');
  console.log('    ├── 🔧 utility/        # Utility Services');
  console.log('    └── 🔧 base/           # Base Services');
  
  console.log('\n📚 FINAL STEPS:');
  console.log('1. Update import statements in all files');
  console.log('2. Run linting: npm run lint');
  console.log('3. Run tests: npm run test:backend');
  console.log('4. Test API endpoints: npm run dev:backend');
  console.log('5. Verify Swagger UI: http://localhost:5001/api/docs');
  console.log('6. Import Postman collection v2 for testing');
  
  console.log('\n🎉 REFACTORING COMPLETED SUCCESSFULLY! 🎉');
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  main();
}

module.exports = { executeScript };