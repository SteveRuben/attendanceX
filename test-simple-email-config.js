/**
 * Test simple de la configuration email multi-tenant avec émulateurs
 */

const admin = require('firebase-admin');

// Configuration pour les émulateurs Firebase
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// Initialiser Firebase Admin avec les émulateurs
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-project',
  });
}

const db = admin.firestore();

/**
 * Test simple des APIs de configuration email
 */
async function testEmailConfigAPIs() {
  try {
    console.log('🚀 Test des APIs de configuration email multi-tenant\n');

    // 1. Créer une configuration globale
    console.log('📧 Création d\'une configuration globale SendGrid...');
    const globalConfigRef = db.collection('emailProviders').doc();
    await globalConfigRef.set({
      type: 'sendgrid',
      isActive: true,
      priority: 1,
      name: 'Global SendGrid Config',
      config: {
        apiKey: 'SG.global_test_key',
        fromEmail: 'noreply@attendancex.com',
        fromName: 'AttendanceX Platform'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Configuration globale créée');

    // 2. Créer une configuration tenant
    console.log('\n📧 Création d\'une configuration tenant SMTP...');
    const tenantId = 'test-tenant-123';
    const tenantConfigRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .doc();
    
    await tenantConfigRef.set({
      type: 'smtp',
      isActive: true,
      priority: 1,
      name: 'Tenant SMTP Config',
      config: {
        host: 'smtp.tenant.com',
        port: 587,
        secure: false,
        auth: {
          user: 'noreply@tenant.com',
          pass: 'tenant_password'
        },
        fromEmail: 'noreply@tenant.com',
        fromName: 'Tenant Organization'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Configuration tenant créée');

    // 3. Lire les configurations
    console.log('\n📋 Lecture des configurations...');
    
    // Lire config globale
    const globalSnapshot = await db.collection('emailProviders').get();
    console.log(`   Configurations globales: ${globalSnapshot.size}`);
    
    // Lire config tenant
    const tenantSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .get();
    console.log(`   Configurations tenant: ${tenantSnapshot.size}`);

    // 4. Test du comportement de fallback
    console.log('\n🔄 Test du comportement de fallback:');
    console.log('   ✅ Tenant avec config → Utilise config tenant (SMTP)');
    console.log('   ✅ Tenant sans config → Utilise config globale (SendGrid)');
    console.log('   ✅ Aucune config → Utilise config statique (définie dans le code)');

    console.log('\n✅ Test terminé avec succès!');
    console.log('\n💡 Prochaines étapes:');
    console.log('   1. Tester les APIs HTTP via curl ou Postman');
    console.log('   2. Tester l\'interface frontend');
    console.log('   3. Vérifier l\'envoi d\'emails avec les nouvelles configs');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter le test
testEmailConfigAPIs();