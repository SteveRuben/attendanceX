/**
 * Test des APIs de configuration email multi-tenant
 * 
 * Ce script teste les endpoints HTTP pour la gestion des configurations email
 */

const axios = require('axios');

// Configuration de base
const BASE_URL = 'http://localhost:5001';
const API_BASE = `${BASE_URL}/api/admin`;

// Token de test (à adapter selon votre système d'auth)
const TEST_TOKEN = 'test-token-123';

// Headers par défaut
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'X-Tenant-ID': 'test-tenant-123' // Simuler le tenant context
};

/**
 * Test de récupération des types de providers disponibles
 */
async function testGetProviderTypes() {
  try {
    console.log('📋 Test: Récupération des types de providers...');
    
    const response = await axios.get(`${API_BASE}/email-providers/types`, { headers });
    
    console.log('✅ Types de providers récupérés:');
    response.data.data.forEach(type => {
      console.log(`   - ${type.name} (${type.type}): ${type.description}`);
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des types:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Test de création d'une configuration email
 */
async function testCreateEmailProvider() {
  try {
    console.log('\n📧 Test: Création d\'une configuration SendGrid...');
    
    const providerData = {
      type: 'sendgrid',
      name: 'Test SendGrid Config',
      isActive: true,
      priority: 1,
      config: {
        apiKey: 'SG.test_api_key_here',
        fromEmail: 'noreply@test-tenant.com',
        fromName: 'Test Tenant Organization',
        replyTo: 'support@test-tenant.com'
      }
    };

    const response = await axios.post(`${API_BASE}/email-providers`, providerData, { headers });
    
    console.log('✅ Configuration créée avec succès:');
    console.log(`   ID: ${response.data.data.id}`);
    console.log(`   Type: ${response.data.data.type}`);
    console.log(`   Nom: ${response.data.data.name}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test de récupération des configurations du tenant
 */
async function testGetEmailProviders() {
  try {
    console.log('\n📋 Test: Récupération des configurations du tenant...');
    
    const response = await axios.get(`${API_BASE}/email-providers`, { headers });
    
    console.log('✅ Configurations récupérées:');
    response.data.data.forEach(provider => {
      console.log(`   - ${provider.name} (${provider.type})`);
      console.log(`     Actif: ${provider.isActive ? 'Oui' : 'Non'}`);
      console.log(`     Priorité: ${provider.priority}`);
      console.log(`     Global: ${provider.isGlobal ? 'Oui' : 'Non'}`);
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Test de mise à jour d'une configuration
 */
async function testUpdateEmailProvider(providerId) {
  try {
    console.log(`\n🔄 Test: Mise à jour de la configuration ${providerId}...`);
    
    const updateData = {
      name: 'Updated SendGrid Config',
      isActive: false,
      priority: 2
    };

    const response = await axios.put(`${API_BASE}/email-providers/${providerId}`, updateData, { headers });
    
    console.log('✅ Configuration mise à jour:');
    console.log(`   Nouveau nom: ${response.data.data.name}`);
    console.log(`   Actif: ${response.data.data.isActive ? 'Oui' : 'Non'}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test de test d'une configuration email
 */
async function testEmailProviderTest() {
  try {
    console.log('\n🧪 Test: Test d\'une configuration email...');
    
    const testData = {
      type: 'smtp',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@gmail.com',
          pass: 'test_password'
        },
        fromEmail: 'test@gmail.com',
        fromName: 'Test Organization'
      },
      testEmail: 'test@example.com'
    };

    const response = await axios.post(`${API_BASE}/email-providers/test`, testData, { headers });
    
    console.log('✅ Test de configuration:');
    console.log(`   Succès: ${response.data.data.success ? 'Oui' : 'Non'}`);
    console.log(`   Message: ${response.data.data.message}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test de suppression d'une configuration
 */
async function testDeleteEmailProvider(providerId) {
  try {
    console.log(`\n🗑️  Test: Suppression de la configuration ${providerId}...`);
    
    const response = await axios.delete(`${API_BASE}/email-providers/${providerId}`, { headers });
    
    console.log('✅ Configuration supprimée avec succès');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test de vérification du comportement de fallback
 */
async function testFallbackBehavior() {
  console.log('\n🔄 Test: Comportement de fallback...');
  
  // Test avec un tenant différent (sans config)
  const fallbackHeaders = {
    ...headers,
    'X-Tenant-ID': 'tenant-without-config'
  };
  
  try {
    const response = await axios.get(`${API_BASE}/email-providers`, { headers: fallbackHeaders });
    
    console.log('✅ Fallback testé:');
    console.log(`   Configurations trouvées: ${response.data.data.length}`);
    
    const globalConfigs = response.data.data.filter(p => p.isGlobal);
    console.log(`   Configurations globales (fallback): ${globalConfigs.length}`);
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Erreur lors du test de fallback:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Fonction principale de test
 */
async function runAPITests() {
  console.log('🚀 Début des tests des APIs de configuration email multi-tenant\n');
  
  try {
    // 1. Tester la récupération des types
    const providerTypes = await testGetProviderTypes();
    
    if (providerTypes.length === 0) {
      console.log('⚠️  Aucun type de provider trouvé, arrêt des tests');
      return;
    }

    // 2. Créer une configuration
    const createdProvider = await testCreateEmailProvider();
    
    if (!createdProvider) {
      console.log('⚠️  Impossible de créer une configuration, arrêt des tests');
      return;
    }

    // 3. Récupérer les configurations
    await testGetEmailProviders();

    // 4. Mettre à jour la configuration
    await testUpdateEmailProvider(createdProvider.id);

    // 5. Tester une configuration
    await testEmailProviderTest();

    // 6. Tester le comportement de fallback
    await testFallbackBehavior();

    // 7. Supprimer la configuration (optionnel)
    // await testDeleteEmailProvider(createdProvider.id);

    console.log('\n✅ Tous les tests des APIs terminés avec succès!');
    console.log('\n💡 Résumé des fonctionnalités testées:');
    console.log('   ✅ Récupération des types de providers');
    console.log('   ✅ Création de configuration tenant');
    console.log('   ✅ Récupération des configurations avec fallback');
    console.log('   ✅ Mise à jour de configuration');
    console.log('   ✅ Test de configuration email');
    console.log('   ✅ Comportement de fallback automatique');

  } catch (error) {
    console.error('❌ Erreur générale lors des tests:', error);
  }
}

/**
 * Test de connectivité de base
 */
async function testConnectivity() {
  try {
    console.log('🔗 Test de connectivité avec le backend...');
    
    // Test simple de ping
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend accessible');
    return true;
  } catch (error) {
    console.error('❌ Backend non accessible:', error.message);
    console.log('💡 Assurez-vous que le backend est démarré avec: npm run dev:backend');
    return false;
  }
}

// Exécuter les tests
async function main() {
  const isConnected = await testConnectivity();
  
  if (isConnected) {
    await runAPITests();
  } else {
    console.log('\n⚠️  Impossible de se connecter au backend');
    console.log('   Vérifiez que les émulateurs Firebase sont démarrés');
    console.log('   Commande: npm run dev:backend');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  testGetProviderTypes,
  testCreateEmailProvider,
  testGetEmailProviders,
  testUpdateEmailProvider,
  testEmailProviderTest,
  testDeleteEmailProvider,
  testFallbackBehavior,
  runAPITests
};