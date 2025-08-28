/**
 * Script pour corriger toutes les références aux collections attendance
 */

import * as fs from 'fs';
import * as path from 'path';

const BACKEND_DIR = path.join(__dirname, '..');

interface FileReplacement {
  file: string;
  replacements: Array<{
    search: string | RegExp;
    replace: string;
  }>;
}

const FILE_REPLACEMENTS: FileReplacement[] = [
  {
    file: 'triggers/trigger.utils.ts',
    replacements: [
      {
        search: /db\.collection\("attendances"\)/g,
        replace: 'collections.attendance'
      }
    ]
  },
  {
    file: 'triggers/user.triggers.ts',
    replacements: [
      {
        search: /collections\.attendances/g,
        replace: 'collections.attendance'
      }
    ]
  },
  {
    file: 'services/event.service.ts',
    replacements: [
      {
        search: /\.collection\("attendances"\)/g,
        replace: '.collection("attendance")'
      }
    ]
  },
  {
    file: 'monitoring/metrics.ts',
    replacements: [
      {
        search: /db\.collection\("attendances"\)/g,
        replace: 'collections.attendance'
      }
    ]
  }
];

/**
 * Appliquer les remplacements dans un fichier
 */
function applyReplacements(filePath: string, replacements: FileReplacement['replacements']): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const replacement of replacements) {
      const originalContent = content;
      content = content.replace(replacement.search, replacement.replace);
      
      if (content !== originalContent) {
        modified = true;
        console.log(`✅ Remplacement appliqué dans ${filePath}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error);
    return false;
  }
}

/**
 * Ajouter l'import des collections si nécessaire
 */
function ensureCollectionsImport(filePath: string): void {
  try {
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si l'import existe déjà
    if (content.includes('import { collections }')) {
      return;
    }

    // Vérifier si le fichier utilise collections.attendance
    if (!content.includes('collections.attendance')) {
      return;
    }

    // Trouver où ajouter l'import
    const importRegex = /import.*from.*["']\.\.\/.*["'];?\n/g;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const importToAdd = 'import { collections } from "../config/database";\n';
      
      content = content.replace(lastImport, lastImport + importToAdd);
      fs.writeFileSync(filePath, content, 'utf8');
      
      console.log(`✅ Import ajouté dans ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de l'ajout d'import dans ${filePath}:`, error);
  }
}

/**
 * Script principal
 */
function main(): void {
  console.log('🔧 Correction des références aux collections attendance');
  console.log('====================================================\n');

  let totalModified = 0;

  for (const fileReplacement of FILE_REPLACEMENTS) {
    const filePath = path.join(BACKEND_DIR, fileReplacement.file);
    
    console.log(`📁 Traitement: ${fileReplacement.file}`);
    
    // Ajouter l'import si nécessaire
    ensureCollectionsImport(filePath);
    
    // Appliquer les remplacements
    const modified = applyReplacements(filePath, fileReplacement.replacements);
    
    if (modified) {
      totalModified++;
    }
    
    console.log('');
  }

  console.log(`✅ Correction terminée: ${totalModified} fichiers modifiés`);
  
  // Vérifications supplémentaires
  console.log('\n🔍 Vérifications recommandées:');
  console.log('1. Vérifier que tous les imports sont corrects');
  console.log('2. Exécuter les tests pour s\'assurer que tout fonctionne');
  console.log('3. Migrer les données Firestore avec le script standardize-collections.ts');
}

// Exécuter le script
if (require.main === module) {
  main();
}

export { applyReplacements, ensureCollectionsImport };