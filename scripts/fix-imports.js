#!/usr/bin/env node

/**
 * Script pour corriger les imports cassés après le refactoring
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapping des anciens imports vers les nouveaux
const importMappings = {
  // Services - imports directs
  "from '../notification'": "from '../notification/notification.service'",
  "from '../services/notification'": "from '../services/notification/notification.service'",
  "from '../event.service'": "from '../event/legacy-event.service'",
  "from '../user.service'": "from './user.service'",
  "from '../team.service'": "from './team.service'",
  "from '../report.service'": "from './report.service'",
  "from '../ml.service'": "from './ml.service'",
  "from '../monitoring.service'": "from './monitoring.service'",
  "from '../qrcode.service'": "from './qrcode.service'",
  "from '../biometric.service'": "from './biometric.service'",
  "from '../certificate.service'": "from './certificate.service'",
  "from '../client.service'": "from './client.service'",
  "from '../employee.service'": "from '../hr/employee.service'",
  "from '../leave.service'": "from '../hr/leave.service'",
  
  // Controllers
  "from '../controllers/auth.controller'": "from '../controllers/auth/auth.controller'",
  "from '../controllers/user.controller'": "from '../controllers/user/user.controller'",
  "from '../controllers/organization.controller'": "from '../controllers/organization/organization.controller'",
  "from '../controllers/event.controller'": "from '../controllers/event/event.controller'",
  "from '../controllers/presence.controller'": "from '../controllers/attendance/presence.controller'",
  "from '../controllers/notification.controller'": "from '../controllers/notification/notification.controller'",
  "from '../controllers/integration.controller'": "from '../controllers/integration/integration.controller'",
  "from '../controllers/report.controller'": "from '../controllers/report/report.controller'",
  
  // Constructeurs vers singletons
  "new EventService()": "eventService",
  "new UserService()": "userService",
  "new NotificationService()": "notificationService",
  "new ReportService()": "reportService",
  "new TeamService()": "teamService",
  "new MLService()": "mlService"
};

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    Object.entries(importMappings).forEach(([oldPattern, newPattern]) => {
      const regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(oldPattern)) {
        content = content.replace(regex, newPattern);
        modified = true;
        console.log(`✅ Fixed import in ${filePath}: ${oldPattern} → ${newPattern}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing imports in ${filePath}:`, error.message);
    return false;
  }
}

function findAndFixImports() {
  console.log('🔧 Fixing imports after refactoring...\n');
  
  const patterns = [
    'backend/functions/src/**/*.ts',
    'backend/functions/src/**/*.js'
  ];
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { ignore: ['**/node_modules/**', '**/lib/**'] });
    
    files.forEach(file => {
      totalFiles++;
      if (fixImportsInFile(file)) {
        fixedFiles++;
      }
    });
  });
  
  console.log(`\n📊 Import fixing completed:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files modified: ${fixedFiles}`);
  
  if (fixedFiles > 0) {
    console.log('\n✅ Imports fixed successfully!');
    console.log('\n📚 Next steps:');
    console.log('1. Run TypeScript compilation: npm run build');
    console.log('2. Run tests: npm run test:backend');
    console.log('3. Check for remaining errors');
  } else {
    console.log('\n✅ No import fixes needed!');
  }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  findAndFixImports();
}

module.exports = { fixImportsInFile, importMappings };