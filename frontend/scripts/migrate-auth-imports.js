#!/usr/bin/env node

/**
 * Script de migration pour remplacer les imports d'authentification
 * Remplace progressivement useAuth par useUnifiedAuth
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const FRONTEND_SRC = path.join(__dirname, '../src');

// Patterns de remplacement
const replacements = [
  {
    from: /import\s*{\s*useAuth\s*}\s*from\s*['"]@\/hooks\/use-auth['"];?/g,
    to: "import { useAuth } from '../hooks/useUnifiedAuth';"
  },
  {
    from: /import\s*{\s*useAuth,\s*usePermissions\s*}\s*from\s*['"]@\/hooks\/use-auth['"];?/g,
    to: "import { useAuth, usePermissions } from '../hooks/useUnifiedAuth';"
  },
  {
    from: /import\s*{\s*usePermissions\s*}\s*from\s*['"]@\/hooks\/use-auth['"];?/g,
    to: "import { usePermissions } from '../hooks/useUnifiedAuth';"
  },
  {
    from: /import\s*{\s*useApiToken\s*}\s*from\s*['"]@\/hooks\/use-auth['"];?/g,
    to: "import { useApiToken } from '../hooks/useUnifiedAuth';"
  },
  {
    from: /import\s*{\s*useAuth\s*}\s*from\s*['"]@\/hooks\/useAuth['"];?/g,
    to: "import { useAuth } from '../hooks/useUnifiedAuth';"
  }
];

/**
 * Migrer un fichier
 */
function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Appliquer les remplacements
    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });

    // Sauvegarder si modifié
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Migré: ${path.relative(FRONTEND_SRC, filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erreur lors de la migration de ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Migrer tous les fichiers
 */
function migrateAllFiles() {
  console.log('🚀 Début de la migration des imports d\'authentification...\n');

  // Trouver tous les fichiers TypeScript/React
  const patterns = [
    `${FRONTEND_SRC}/**/*.ts`,
    `${FRONTEND_SRC}/**/*.tsx`,
    `!${FRONTEND_SRC}/**/*.d.ts`,
    `!${FRONTEND_SRC}/**/node_modules/**`,
    `!${FRONTEND_SRC}/**/dist/**`,
    `!${FRONTEND_SRC}/**/build/**`
  ];

  const files = glob.sync(`{${patterns.join(',')}}`, { 
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts']
  });

  let migratedCount = 0;
  let totalFiles = files.length;

  console.log(`📁 ${totalFiles} fichiers trouvés\n`);

  // Migrer chaque fichier
  files.forEach(file => {
    if (migrateFile(file)) {
      migratedCount++;
    }
  });

  console.log(`\n🎉 Migration terminée:`);
  console.log(`   - ${migratedCount} fichiers migrés`);
  console.log(`   - ${totalFiles - migratedCount} fichiers inchangés`);
  console.log(`   - ${totalFiles} fichiers traités au total`);

  if (migratedCount > 0) {
    console.log('\n⚠️  N\'oubliez pas de:');
    console.log('   1. Tester les composants migrés');
    console.log('   2. Vérifier que les permissions fonctionnent');
    console.log('   3. Valider l\'authentification multi-tenant');
  }
}

/**
 * Créer un rapport de migration
 */
function generateMigrationReport() {
  console.log('\n📊 Génération du rapport de migration...');

  const patterns = [
    `${FRONTEND_SRC}/**/*.ts`,
    `${FRONTEND_SRC}/**/*.tsx`
  ];

  const files = glob.sync(`{${patterns.join(',')}}`, { 
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts']
  });

  const report = {
    oldImports: [],
    newImports: [],
    mixed: []
  };

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(FRONTEND_SRC, file);

      const hasOldImports = /from\s*['"]@\/hooks\/use-auth['"]/.test(content) || 
                           /from\s*['"]@\/hooks\/useAuth['"]/.test(content);
      const hasNewImports = /from\s*['"]@\/hooks\/useUnifiedAuth['"]/.test(content);

      if (hasOldImports && hasNewImports) {
        report.mixed.push(relativePath);
      } else if (hasOldImports) {
        report.oldImports.push(relativePath);
      } else if (hasNewImports) {
        report.newImports.push(relativePath);
      }
    } catch (error) {
      console.error(`Erreur lors de l'analyse de ${file}:`, error.message);
    }
  });

  console.log('\n📈 Rapport de migration:');
  console.log(`   - Anciens imports: ${report.oldImports.length} fichiers`);
  console.log(`   - Nouveaux imports: ${report.newImports.length} fichiers`);
  console.log(`   - Imports mixtes: ${report.mixed.length} fichiers`);

  if (report.mixed.length > 0) {
    console.log('\n⚠️  Fichiers avec imports mixtes (à vérifier):');
    report.mixed.forEach(file => console.log(`   - ${file}`));
  }

  if (report.oldImports.length > 0) {
    console.log('\n📋 Fichiers avec anciens imports (à migrer):');
    report.oldImports.slice(0, 10).forEach(file => console.log(`   - ${file}`));
    if (report.oldImports.length > 10) {
      console.log(`   ... et ${report.oldImports.length - 10} autres`);
    }
  }

  return report;
}

// Exécution du script
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'migrate':
      migrateAllFiles();
      break;
    case 'report':
      generateMigrationReport();
      break;
    case 'all':
      generateMigrationReport();
      migrateAllFiles();
      generateMigrationReport();
      break;
    default:
      console.log('Usage: node migrate-auth-imports.js [migrate|report|all]');
      console.log('');
      console.log('Commands:');
      console.log('  migrate  - Migrer tous les imports d\'authentification');
      console.log('  report   - Générer un rapport de l\'état de migration');
      console.log('  all      - Rapport + Migration + Rapport final');
      process.exit(1);
  }
}

module.exports = {
  migrateFile,
  migrateAllFiles,
  generateMigrationReport
};