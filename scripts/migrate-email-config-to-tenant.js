/**
 * Script de migration pour configurer les providers email par tenant
 * 
 * Ce script aide à migrer les configurations email existantes vers
 * le nouveau système multi-tenant avec fallback automatique.
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
 * Migrer la configuration globale vers un tenant spécifique
 */
async function migrateGlobalConfigToTenant(tenantId, providerType = 'sendgrid') {
  try {
    console.log(`🔄 Migration de la config ${providerType} vers le tenant: ${tenantId}`);

    // 1. Récupérer la configuration globale existante
    const globalSnapshot = await db
      .collection('emailProviders')
      .where('type', '==', providerType)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (globalSnapshot.empty) {
      console.log(`❌ Aucune configuration globale ${providerType} trouvée`);
      return false;
    }

    const globalConfig = globalSnapshot.docs[0].data();
    console.log(`✅ Configuration globale ${providerType} trouvée`);

    // 2. Vérifier si le tenant existe
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      console.log(`❌ Tenant ${tenantId} non trouvé`);
      return false;
    }

    const tenantData = tenantDoc.data();
    console.log(`✅ Tenant trouvé: ${tenantData.name}`);

    // 3. Créer la configuration tenant-specific
    const tenantConfigRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .doc();

    const tenantConfig = {
      ...globalConfig,
      name: `${providerType} Config for ${tenantData.name}`,
      migratedFrom: 'global',
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await tenantConfigRef.set(tenantConfig);

    console.log(`✅ Configuration ${providerType} migrée vers le tenant ${tenantId}`);
    console.log(`   ID de la config: ${tenantConfigRef.id}`);

    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la migration pour ${tenantId}:`, error);
    return false;
  }
}

/**
 * Créer une configuration SMTP personnalisée pour un tenant
 */
async function createTenantSMTPConfig(tenantId, smtpSettings) {
  try {
    console.log(`📧 Création de la config SMTP pour le tenant: ${tenantId}`);

    // Vérifier si le tenant existe
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      console.log(`❌ Tenant ${tenantId} non trouvé`);
      return false;
    }

    const tenantData = tenantDoc.data();

    // Créer la configuration SMTP
    const smtpConfigRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .doc();

    const smtpConfig = {
      type: 'smtp',
      isActive: true,
      priority: 1,
      name: `SMTP Config for ${tenantData.name}`,
      config: {
        host: smtpSettings.host,
        port: smtpSettings.port || 587,
        secure: smtpSettings.secure || false,
        auth: {
          user: smtpSettings.user,
          pass: smtpSettings.password
        },
        fromEmail: smtpSettings.fromEmail,
        fromName: smtpSettings.fromName || tenantData.name,
        replyTo: smtpSettings.replyTo || smtpSettings.fromEmail
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await smtpConfigRef.set(smtpConfig);

    console.log(`✅ Configuration SMTP créée pour le tenant ${tenantId}`);
    console.log(`   ID de la config: ${smtpConfigRef.id}`);
    console.log(`   Host: ${smtpSettings.host}`);
    console.log(`   From: ${smtpSettings.fromEmail}`);

    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la création SMTP pour ${tenantId}:`, error);
    return false;
  }
}

/**
 * Créer une configuration SendGrid personnalisée pour un tenant
 */
async function createTenantSendGridConfig(tenantId, sendGridSettings) {
  try {
    console.log(`📧 Création de la config SendGrid pour le tenant: ${tenantId}`);

    // Vérifier si le tenant existe
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      console.log(`❌ Tenant ${tenantId} non trouvé`);
      return false;
    }

    const tenantData = tenantDoc.data();

    // Créer la configuration SendGrid
    const sendGridConfigRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .doc();

    const sendGridConfig = {
      type: 'sendgrid',
      isActive: true,
      priority: 1,
      name: `SendGrid Config for ${tenantData.name}`,
      config: {
        apiKey: sendGridSettings.apiKey,
        fromEmail: sendGridSettings.fromEmail,
        fromName: sendGridSettings.fromName || tenantData.name,
        replyTo: sendGridSettings.replyTo || sendGridSettings.fromEmail
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await sendGridConfigRef.set(sendGridConfig);

    console.log(`✅ Configuration SendGrid créée pour le tenant ${tenantId}`);
    console.log(`   ID de la config: ${sendGridConfigRef.id}`);
    console.log(`   From: ${sendGridSettings.fromEmail}`);

    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la création SendGrid pour ${tenantId}:`, error);
    return false;
  }
}

/**
 * Lister tous les tenants et leurs configurations email
 */
async function listAllTenantEmailConfigs() {
  try {
    console.log('📋 Liste de tous les tenants et leurs configurations email:\n');

    // Récupérer tous les tenants
    const tenantsSnapshot = await db.collection('tenants').get();

    if (tenantsSnapshot.empty) {
      console.log('❌ Aucun tenant trouvé');
      return;
    }

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantData = tenantDoc.data();
      console.log(`🏢 Tenant: ${tenantData.name} (${tenantDoc.id})`);

      // Récupérer les configurations email du tenant
      const configsSnapshot = await db
        .collection('tenants')
        .doc(tenantDoc.id)
        .collection('emailProviders')
        .get();

      if (configsSnapshot.empty) {
        console.log('   📧 Aucune configuration email spécifique');
        console.log('   ↳ Utilise la configuration globale par défaut');
      } else {
        configsSnapshot.docs.forEach(configDoc => {
          const configData = configDoc.data();
          console.log(`   📧 ${configData.type.toUpperCase()} (${configData.isActive ? 'actif' : 'inactif'})`);
          console.log(`      ↳ From: ${configData.config?.fromEmail || 'N/A'}`);
          console.log(`      ↳ Priorité: ${configData.priority}`);
        });
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la liste des configurations:', error);
  }
}

/**
 * Supprimer la configuration email d'un tenant (retour au global)
 */
async function removeTenantEmailConfig(tenantId, providerType) {
  try {
    console.log(`🗑️  Suppression de la config ${providerType} pour le tenant: ${tenantId}`);

    const configsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailProviders')
      .where('type', '==', providerType)
      .get();

    if (configsSnapshot.empty) {
      console.log(`❌ Aucune configuration ${providerType} trouvée pour ce tenant`);
      return false;
    }

    const batch = db.batch();
    configsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`✅ Configuration ${providerType} supprimée pour le tenant ${tenantId}`);
    console.log('   ↳ Le tenant utilisera maintenant la configuration globale');

    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression pour ${tenantId}:`, error);
    return false;
  }
}

/**
 * Exemples d'utilisation
 */
async function runExamples() {
  console.log('🚀 Exemples de migration des configurations email\n');

  // Exemple 1: Migrer la config globale vers un tenant
  console.log('=== EXEMPLE 1: Migration config globale vers tenant ===');
  // await migrateGlobalConfigToTenant('tenant-acme-corp', 'sendgrid');

  // Exemple 2: Créer une config SMTP personnalisée
  console.log('\n=== EXEMPLE 2: Création config SMTP personnalisée ===');
  /*
  await createTenantSMTPConfig('tenant-acme-corp', {
    host: 'smtp.acme-corp.com',
    port: 587,
    secure: false,
    user: 'noreply@acme-corp.com',
    password: 'smtp_password_here',
    fromEmail: 'noreply@acme-corp.com',
    fromName: 'ACME Corporation',
    replyTo: 'support@acme-corp.com'
  });
  */

  // Exemple 3: Créer une config SendGrid personnalisée
  console.log('\n=== EXEMPLE 3: Création config SendGrid personnalisée ===');
  /*
  await createTenantSendGridConfig('tenant-startup-xyz', {
    apiKey: 'SG.tenant_specific_key_here',
    fromEmail: 'hello@startup-xyz.com',
    fromName: 'Startup XYZ',
    replyTo: 'support@startup-xyz.com'
  });
  */

  // Exemple 4: Lister toutes les configurations
  console.log('\n=== EXEMPLE 4: Liste des configurations ===');
  await listAllTenantEmailConfigs();

  console.log('\n💡 Pour utiliser ces exemples:');
  console.log('1. Décommentez les lignes correspondantes');
  console.log('2. Remplacez les valeurs par vos vraies données');
  console.log('3. Exécutez le script: node scripts/migrate-email-config-to-tenant.js');
}

/**
 * Menu interactif pour la migration
 */
async function interactiveMenu() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  try {
    console.log('🔧 Assistant de migration des configurations email\n');
    console.log('Options disponibles:');
    console.log('1. Lister tous les tenants et leurs configurations');
    console.log('2. Migrer une config globale vers un tenant');
    console.log('3. Créer une config SMTP pour un tenant');
    console.log('4. Créer une config SendGrid pour un tenant');
    console.log('5. Supprimer la config d\'un tenant');
    console.log('0. Quitter\n');

    const choice = await question('Choisissez une option (0-5): ');

    switch (choice) {
      case '1':
        await listAllTenantEmailConfigs();
        break;

      case '2':
        const tenantId1 = await question('ID du tenant: ');
        const providerType1 = await question('Type de provider (sendgrid/mailgun/aws_ses): ');
        await migrateGlobalConfigToTenant(tenantId1, providerType1);
        break;

      case '3':
        const tenantId2 = await question('ID du tenant: ');
        const host = await question('Host SMTP: ');
        const user = await question('Utilisateur SMTP: ');
        const password = await question('Mot de passe SMTP: ');
        const fromEmail = await question('Email expéditeur: ');
        const fromName = await question('Nom expéditeur: ');

        await createTenantSMTPConfig(tenantId2, {
          host, user, password, fromEmail, fromName
        });
        break;

      case '4':
        const tenantId3 = await question('ID du tenant: ');
        const apiKey = await question('Clé API SendGrid: ');
        const fromEmail2 = await question('Email expéditeur: ');
        const fromName2 = await question('Nom expéditeur: ');

        await createTenantSendGridConfig(tenantId3, {
          apiKey, fromEmail: fromEmail2, fromName: fromName2
        });
        break;

      case '5':
        const tenantId4 = await question('ID du tenant: ');
        const providerType2 = await question('Type de provider à supprimer: ');
        await removeTenantEmailConfig(tenantId4, providerType2);
        break;

      case '0':
        console.log('👋 Au revoir!');
        break;

      default:
        console.log('❌ Option invalide');
    }
  } catch (error) {
    console.error('❌ Erreur dans le menu interactif:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Exporter les fonctions pour utilisation externe
module.exports = {
  migrateGlobalConfigToTenant,
  createTenantSMTPConfig,
  createTenantSendGridConfig,
  listAllTenantEmailConfigs,
  removeTenantEmailConfig,
  runExamples,
  interactiveMenu
};

// Exécuter le menu interactif si le script est appelé directement
if (require.main === module) {
  // Vérifier les arguments de ligne de commande
  const args = process.argv.slice(2);
  
  if (args.includes('--examples')) {
    runExamples();
  } else if (args.includes('--list')) {
    listAllTenantEmailConfigs().then(() => process.exit(0));
  } else {
    interactiveMenu();
  }
}