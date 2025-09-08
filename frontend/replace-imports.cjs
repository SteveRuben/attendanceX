const fs = require('fs');
const path = require('path');

// Fonction pour calculer le chemin relatif vers le dossier shared
function getRelativeSharedPath(filePath, srcDir) {
  const relativePath = path.relative(path.dirname(filePath), srcDir);
  const sharedPath = path.join(relativePath, 'shared').replace(/\\/g, '/');
  return sharedPath.startsWith('.') ? sharedPath : './' + sharedPath;
}

// Fonction pour remplacer les importations dans un fichier
function replaceImportsInFile(filePath, srcDir) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const sharedPath = getRelativeSharedPath(filePath, srcDir);

    // Remplacer les importations de @attendance-x/shared
    const importRegex = /import\s*{([^}]+)}\s*from\s*['"]@attendance-x\/shared['"];?/g;
    const importMatches = content.match(importRegex);

    if (importMatches) {
      for (const match of importMatches) {
        const newImport = match.replace('@attendance-x/shared', sharedPath);
        content = content.replace(match, newImport);
        modified = true;
      }
    }

    // Remplacer les importations avec export *
    const exportAllRegex = /export\s*\*\s*from\s*['"]@attendance-x\/shared['"];?/g;
    if (exportAllRegex.test(content)) {
      content = content.replace(exportAllRegex, `export * from '${sharedPath}';`);
      modified = true;
    }

    // Remplacer les importations par défaut
    const defaultImportRegex = /import\s+\w+\s+from\s*['"]@attendance-x\/shared['"];?/g;
    if (defaultImportRegex.test(content)) {
      content = content.replace(defaultImportRegex, (match) => {
        return match.replace('@attendance-x/shared', sharedPath);
      });
      modified = true;
    }

    // Remplacer les importations avec type
    const typeImportRegex = /import\s+type\s*{([^}]+)}\s*from\s*['"]@attendance-x\/shared['"];?/g;
    const typeImportMatches = content.match(typeImportRegex);

    if (typeImportMatches) {
      for (const match of typeImportMatches) {
        const newImport = match.replace('@attendance-x/shared', sharedPath);
        content = content.replace(match, newImport);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Mis à jour: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
  }
  return false;
}

// Fonction pour parcourir récursivement les dossiers
function processDirectory(dirPath, srcDir) {
  const items = fs.readdirSync(dirPath);
  let totalUpdated = 0;

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Ignorer node_modules, dist, build et shared
      if (item !== 'node_modules' && item !== 'dist' && item !== 'build' && item !== 'shared') {
        totalUpdated += processDirectory(fullPath, srcDir);
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
      if (replaceImportsInFile(fullPath, srcDir)) {
        totalUpdated++;
      }
    }
  }

  return totalUpdated;
}

// Démarrer le processus
console.log('🔄 Remplacement des importations @attendance-x/shared dans le frontend...');
const srcPath = path.join(__dirname, 'src');
const totalUpdated = processDirectory(srcPath, srcPath);
console.log(`\n✨ Terminé! ${totalUpdated} fichiers mis à jour.`);