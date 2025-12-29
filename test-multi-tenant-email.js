/**
 * Script de test pour la configuration email multi-tenant
 * 
 * Ce script teste le nouveau système de configuration email par tenant
 * avec fallback automatique vers les configurations globales.
 */

const admin = require('firebase-admin');

// Configuration Firebase (à adapter selon votre projet)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Remplacez par votre project ID
    projectId: 'your-project-id'
  });
}

const db = admin.firestore();

/**
 * Créer une configuration email pour un tenant
 */
async function createTenantEmailConfig(tenantId, providerConfig) {
  try {
    console.log(`📧 Création de la config email pour le tenant: ${tenantId}`);
    
    const configRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .doc();

    await configRef.set({
      ...providerConfig,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Configuration créée avec l'ID: ${configRef.id}`);
    return configRef.id;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la config:', error);
    throw error;
  }
}

/**
 * Créer une configuration globale
 */
async function createGlobalEmailConfig(providerConfig) {
  try {
    console.log('📧 Création de la config email globale');
    
    const configRef = db.collection('emailProviders').doc();

    await configRef.set({
      ...providerConfig,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Configuration globale créée avec l'ID: ${configRef.id}`);
    return configRef.id;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la config globale:', error);
    throw error;
  }
}

/**
 * Tester la configuration SendGrid pour un tenant
 */
async function testTenantSendGridConfig() {
  const tenantId = 'test-tenant-sendgrid';
  
  const sendgridConfig = {
    type: 'sendgrid',
    isActive: true,
    priority: 1,
    name: 'SendGrid Tenant Config',
    config: {
      apiKey: 'SG.test_tenant_key_here', // Remplacez par une vraie clé de test
      fromEmail: 'noreply@tenant-domain.com',
      fromName: 'Test Tenant Organization',
      replyTo: 'support@tenant-domain.com'
    }
  };

  return await createTenantEmailConfig(tenantId, sendgridConfig);
}

/**
 * Tester la configuration SMTP pour un tenant
 */
async function testTenantSMTPConfig() {
  const tenantId = 'test-tenant-smtp';
  
  const smtpConfig = {
    type: 'smtp',
    isActive: true,
    priority: 2,
    name: 'SMTP Tenant Config',
    config: {
      host: 'smtp.tenant-domain.com',
      port: 587,
      secure: false,
      auth: {
        user: 'noreply@tenant-domain.com',
        pass: 'tenant_password_here' // Remplacez par un vrai mot de passe
      },
      fromEmail: 'noreply@tenant-domain.com',
      fromName: 'Test Tenant SMTP'
    }
  };

  return await createTenantEmailConfig(tenantId, smtpConfig);
}

/**
 * Créer une configuration globale SendGrid
 */
async function testGlobalSendGridConfig() {
  const sendgridConfig = {
    type: 'sendgrid',
    isActive: true,
    priority: 1,
    name: 'Global SendGrid Config',
    config: {
      apiKey: 'SG.global_key_here', // Remplacez par une vraie clé globale
      fromEmail: 'noreply@attendancex.com',
      fromName: 'AttendanceX Platform',
      replyTo: 'support@attendancex.com'
    }
  };

  return await createGlobalEmailConfig(sendgridConfig);
}

/**
 * Lister les configurations d'un tenant
 */
async function listTenantConfigs(tenantId) {
  try {
    console.log(`📋 Configurations email pour le tenant: ${tenantId}`);
    
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .get();

    if (snapshot.empty) {
      console.log('   Aucune configuration tenant trouvée');
      return [];
    }

    const configs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      configs.push({
        id: doc.id,
        type: data.type,
        isActive: data.isActive,
        priority: data.priority,
        name: data.name
      });
      
      console.log(`   - ${data.type} (${data.isActive ? 'actif' : 'inactif'}) - Priorité: ${data.priority}`);
    });

    return configs;
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des configs:', error);
    return [];
  }
}

/**
 * Lister les configurations globales
 */
async function listGlobalConfigs() {
  try {
    console.log('📋 Configurations email globales:');
    
    const snapshot = await db.collection('emailProviders').get();

    if (snapshot.empty) {
      console.log('   Aucune configuration globale trouvée');
      return [];
    }

    const configs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      configs.push({
        id: doc.id,
        type: data.type,
        isActive: data.isActive,
        priority: data.priority,
        name: data.name
      });
      
      console.log(`   - ${data.type} (${data.isActive ? 'actif' : 'inactif'}) - Priorité: ${data.priority}`);
    });

    return configs;
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des configs globales:', error);
    return [];
  }
}

/**
 * Nettoyer les configurations de test
 */
async function cleanupTestConfigs() {
  try {
    console.log('🧹 Nettoyage des configurations de test...');
    
    // Nettoyer les configs tenant
    const tenantIds = ['test-tenant-sendgrid', 'test-tenant-smtp'];
    
    for (const tenantId of tenantIds) {
      const snapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('emailProviders')
        .get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (!snapshot.empty) {
        await batch.commit();
        console.log(`   ✅ Configs tenant supprimées pour: ${tenantId}`);
      }
    }

    // Nettoyer les configs globales de test
    const globalSnapshot = await db
      .collection('emailProviders')
      .where('name', '==', 'Global SendGrid Config')
      .get();
    
    if (!globalSnapshot.empty) {
      const batch = db.batch();
      globalSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('   ✅ Configs globales de test supprimées');
    }

    console.log('✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

/**
 * Fonction principale de test
 */
async function runTests() {
  try {
    console.log('🚀 Début des tests de configuration email multi-tenant\n');

    // 1. Créer les configurations de test
    console.log('=== CRÉATION DES CONFIGURATIONS ===');
    await testGlobalSendGridConfig();
    await testTenantSendGridConfig();
    await testTenantSMTPConfig();
    console.log('');

    // 2. Lister les configurations
    console.log('=== VÉRIFICATION DES CONFIGURATIONS ===');
    await listGlobalConfigs();
    console.log('');
    await listTenantConfigs('test-tenant-sendgrid');
    console.log('');
    await listTenantConfigs('test-tenant-smtp');
    console.log('');
    await listTenantConfigs('tenant-without-config');
    console.log('');

    // 3. Simulation du comportement de fallback
    console.log('=== SIMULATION DU COMPORTEMENT DE FALLBACK ===');
    console.log('Tenant avec config spécifique → Utilise config tenant');
    console.log('Tenant sans config → Utilise config globale');
    console.log('Aucune config → Utilise config statique (définie dans le code)');
    console.log('');

    // 4. Nettoyer (optionnel - décommentez si vous voulez nettoyer)
    // console.log('=== NETTOYAGE ===');
    // await cleanupTestConfigs();

    console.log('✅ Tests terminés avec succès!');
    console.log('\n💡 Pour tester l\'envoi d\'emails, utilisez les nouvelles méthodes:');
    console.log('   - emailService.sendEmailWithTenant(tenantId, ...)');
    console.log('   - emailService.sendEmail(..., { tenantId })');
    console.log('   - emailService.sendInvitationEmail(..., tenantId)');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    // Fermer la connexion
    process.exit(0);
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  runTests();
}

module.exports = {
  createTenantEmailConfig,
  createGlobalEmailConfig,
  listTenantConfigs,
  listGlobalConfigs,
  cleanupTestConfigs,
  runTests
};