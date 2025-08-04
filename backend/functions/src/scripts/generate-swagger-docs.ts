#!/usr/bin/env ts-node

/**
 * Script pour générer la documentation Swagger/OpenAPI
 * 
 * Usage:
 * npm run docs:generate
 * ou
 * npx ts-node src/scripts/generate-swagger-docs.ts
 */

import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../config/swagger';

interface SwaggerSpec {
    info?: {
      version?: string;
      description?: string;
    };
    servers?: Array<{
      url: string;
      description: string;
    }>;
    tags?: Array<{
      name: string;
      description: string;
    }>;
    paths?: Record<string, any>;
    components?: {
      schemas?: Record<string, any>;
    };
  }

const OUTPUT_DIR = path.join(__dirname, '../../docs');
const SWAGGER_JSON_PATH = path.join(OUTPUT_DIR, 'swagger.json');
const SWAGGER_YAML_PATH = path.join(OUTPUT_DIR, 'swagger.yaml');

// Fonction pour convertir JSON en YAML (simple)
function jsonToYaml(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      yaml += `${spaces}${key}: null\n`;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      yaml += jsonToYaml(value, indent + 1);
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach((item) => {
        if (typeof item === 'object') {
          yaml += `${spaces}  -\n`;
          yaml += jsonToYaml(item, indent + 2);
        } else {
          yaml += `${spaces}  - ${item}\n`;
        }
      });
    } else if (typeof value === 'string') {
      // Échapper les chaînes qui contiennent des caractères spéciaux
      const needsQuotes = /[:\[\]{}|>]/.test(value) || value.includes('\n');
      yaml += `${spaces}${key}: ${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}\n`;
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }

  return yaml;
}

async function generateDocs() {
  try {
    console.log('🚀 Génération de la documentation Swagger...');
    const spec = swaggerSpec as SwaggerSpec;

    // Créer le dossier de sortie s'il n'existe pas
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`📁 Dossier créé: ${OUTPUT_DIR}`);
    }

    // Générer le fichier JSON
    const jsonContent = JSON.stringify(swaggerSpec, null, 2);
    fs.writeFileSync(SWAGGER_JSON_PATH, jsonContent, 'utf8');
    console.log(`✅ Fichier JSON généré: ${SWAGGER_JSON_PATH}`);

    // Générer le fichier YAML
    const yamlContent = `# Documentation API Attendance Management System
# Générée automatiquement le ${new Date().toISOString()}
# Ne pas modifier manuellement

${jsonToYaml(swaggerSpec)}`;
    
    fs.writeFileSync(SWAGGER_YAML_PATH, yamlContent, 'utf8');
    console.log(`✅ Fichier YAML généré: ${SWAGGER_YAML_PATH}`);

    // Générer un fichier README pour la documentation
    const readmeContent = `# Documentation API - Attendance Management System

## 📚 Documentation générée automatiquement

Cette documentation a été générée le ${new Date().toLocaleString('fr-FR')}.

## 🔗 Liens utiles

- **Documentation interactive**: [/docs](/docs) (Swagger UI)
- **Spécification JSON**: [swagger.json](./swagger.json)
- **Spécification YAML**: [swagger.yaml](./swagger.yaml)

## 📋 Informations sur l'API

- **Version**: ${spec?.info?.version || 'N/A'}
- **Description**: ${spec?.info?.description?.split('\n')[0] || 'N/A'}
- **Serveurs**:
${spec?.servers?.map(server => `  - ${server.description}: ${server.url}`).join('\n') || '  - Aucun serveur configuré'}

## 🏷️ Tags disponibles

${spec?.tags?.map(tag => `- **${tag.name}**: ${tag.description}`).join('\n') || 'Aucun tag défini'}

## 🔐 Authentification

Cette API utilise l'authentification JWT (JSON Web Tokens).

### Comment s'authentifier:

1. **Obtenir un token**: Utilisez l'endpoint \`POST /auth/login\`
2. **Utiliser le token**: Incluez le token dans l'header de vos requêtes:
   \`\`\`
   Authorization: Bearer <votre-token-jwt>
   \`\`\`

### Durée de vie des tokens:

- **Access Token**: 24 heures
- **Refresh Token**: 7 jours

## 📊 Codes de réponse

| Code | Description |
|------|-------------|
| 200  | Succès |
| 201  | Créé avec succès |
| 400  | Données invalides |
| 401  | Non authentifié |
| 403  | Permissions insuffisantes |
| 404  | Ressource non trouvée |
| 409  | Conflit (ex: email déjà utilisé) |
| 429  | Rate limiting dépassé |
| 500  | Erreur serveur |

## 🛠️ Développement

### Régénérer la documentation:

\`\`\`bash
npm run docs:generate
\`\`\`

### Servir la documentation localement:

\`\`\`bash
npm run dev
# Puis aller sur http://localhost:5001/docs
\`\`\`

## 📞 Support

- **Email**: support@attendance-x.com
- **Documentation**: https://attendance-x.com/docs
- **GitHub**: https://github.com/SteveRuben/attendanceX

---

*Documentation générée automatiquement par le script generate-swagger-docs.ts*
`;

    const readmePath = path.join(OUTPUT_DIR, 'README.md');
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    console.log(`✅ README généré: ${readmePath}`);

    // Statistiques
    const endpoints = Object.keys(spec.paths || {}).length;
    const schemas = Object.keys(spec.components?.schemas || {}).length;
    const tags = (spec.tags || []).length;

    console.log('\n📊 Statistiques de la documentation:');
    console.log(`   • Endpoints documentés: ${endpoints}`);
    console.log(`   • Schémas définis: ${schemas}`);
    console.log(`   • Tags: ${tags}`);
    console.log(`   • Version API: ${spec.info?.version || 'N/A'}`);

    console.log('\n🎉 Documentation générée avec succès!');
    console.log('\n🔗 Pour voir la documentation:');
    console.log('   • Démarrez le serveur: npm run dev');
    console.log('   • Ouvrez: http://localhost:5001/docs');

  } catch (error) {
    console.error('❌ Erreur lors de la génération de la documentation:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  generateDocs();
}

export { generateDocs };