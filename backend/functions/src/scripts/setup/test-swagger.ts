#!/usr/bin/env ts-node

/**
 * Script pour tester la configuration Swagger
 * Vérifie que la documentation est bien générée et accessible
 */

import express from 'express';
import { swaggerSpec } from '../../config/swagger';
import { serveSwaggerDocs, setupSwaggerDocs, serveSwaggerJson } from '../../middleware/swagger';

// Interface pour typer la spécification Swagger
interface SwaggerSpec {
    info?: {
        version?: string;
        title?: string;
        description?: string;
    };
    paths?: Record<string, any>;
    components?: {
        schemas?: Record<string, any>;
    };
}

const app = express();
const PORT = 3001;

// Configuration Swagger
app.use('/docs', serveSwaggerDocs, setupSwaggerDocs);
app.use('/swagger.json', serveSwaggerJson);

// Route de test
app.get('/', (req, res) => {
    res.json({
        message: 'Serveur de test Swagger',
        endpoints: {
            docs: '/docs',
            spec: '/swagger.json'
        }
    });
});

async function testSwagger() {
    console.log('🧪 Test de la configuration Swagger...\n');

    // Test 1: Vérifier que la spec est valide
    console.log('1️⃣ Validation de la spécification...');
    try {
        const spec = swaggerSpec as SwaggerSpec;

        if (!spec.info) {
            throw new Error('Informations de l\'API manquantes');
        }
        if (!spec.paths) {
            throw new Error('Aucun endpoint documenté');
        }
        console.log('   ✅ Spécification valide');
        console.log(`   📋 Version: ${spec.info.version || 'N/A'}`);
        console.log(`   📋 Endpoints: ${Object.keys(spec.paths).length}`);
        console.log(`   📋 Schémas: ${Object.keys(spec.components?.schemas || {}).length}`);
    } catch (error) {
        console.log('   ❌ Erreur de validation:', (error as Error).message);
        return false;
    }

    // Test 2: Démarrer le serveur de test
    console.log('\n2️⃣ Démarrage du serveur de test...');
    const server = app.listen(PORT, () => {
        console.log(`   ✅ Serveur démarré sur http://localhost:${PORT}`);
        console.log(`   📖 Documentation: http://localhost:${PORT}/docs`);
        console.log(`   📄 Spécification: http://localhost:${PORT}/swagger.json`);
    });

    // Test 3: Vérifier l'accessibilité
    console.log('\n3️⃣ Test d\'accessibilité...');
    try {
        const fetch = (await import('node-fetch')).default;

        // Test de la spécification JSON
        const specResponse = await fetch(`http://localhost:${PORT}/swagger.json`);
        if (specResponse.ok) {
            console.log('   ✅ Spécification JSON accessible');
        } else {
            console.log('   ❌ Spécification JSON inaccessible');
        }

        // Test de la page de documentation
        const docsResponse = await fetch(`http://localhost:${PORT}/docs`);
        if (docsResponse.ok) {
            console.log('   ✅ Documentation Swagger UI accessible');
        } else {
            console.log('   ❌ Documentation Swagger UI inaccessible');
        }

    } catch (error) {
        console.log('   ⚠️  Impossible de tester l\'accessibilité:', (error as Error).message);
        console.log('   💡 Installez node-fetch: npm install node-fetch @types/node-fetch');
    }

    console.log('\n🎉 Test terminé !');
    console.log('\n📝 Instructions:');
    console.log('   • Ouvrez http://localhost:3001/docs dans votre navigateur');
    console.log('   • Testez les endpoints directement dans l\'interface');
    console.log('   • Appuyez sur Ctrl+C pour arrêter le serveur');

    // Garder le serveur ouvert
    process.on('SIGINT', () => {
        console.log('\n👋 Arrêt du serveur de test...');
        server.close(() => {
            console.log('✅ Serveur arrêté');
            process.exit(0);
        });
    });

    return true;
}

// Exécuter le test si appelé directement
if (require.main === module) {
    testSwagger().catch(console.error);
}

export { testSwagger };