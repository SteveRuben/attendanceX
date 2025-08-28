/**
 * Script pour standardiser les noms de collections
 * Unifie "attendances" vers "attendance" partout
 */

import { initializeApp } from 'firebase-admin/app';
import { db } from '../config';

// Initialiser Firebase Admin
if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID environment variable is required');
}

initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID
});



interface CollectionMigration {
  oldName: string;
  newName: string;
  description: string;
}

const COLLECTION_MIGRATIONS: CollectionMigration[] = [
  {
    oldName: 'attendances',
    newName: 'attendance',
    description: 'Standardisation vers le singulier pour cohérence API'
  }
];

/**
 * Migrer une collection vers un nouveau nom
 */
async function migrateCollection(migration: CollectionMigration): Promise<void> {
  console.log(`🔄 Migration: ${migration.oldName} → ${migration.newName}`);
  console.log(`📝 Description: ${migration.description}`);

  const oldCollection = db.collection(migration.oldName);
  const newCollection = db.collection(migration.newName);

  // Vérifier si la nouvelle collection existe déjà
  const newCollectionSnapshot = await newCollection.limit(1).get();
  if (!newCollectionSnapshot.empty) {
    console.log(`⚠️  La collection ${migration.newName} existe déjà. Migration ignorée.`);
    return;
  }

  // Récupérer tous les documents de l'ancienne collection
  const snapshot = await oldCollection.get();
  
  if (snapshot.empty) {
    console.log(`📭 Collection ${migration.oldName} est vide. Rien à migrer.`);
    return;
  }

  console.log(`📊 ${snapshot.size} documents à migrer...`);

  // Migrer par batch de 500 (limite Firestore)
  const batchSize = 500;
  let migratedCount = 0;

  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = db.batch();
    const batchDocs = snapshot.docs.slice(i, i + batchSize);

    for (const doc of batchDocs) {
      const newDocRef = newCollection.doc(doc.id);
      batch.set(newDocRef, doc.data());
    }

    await batch.commit();
    migratedCount += batchDocs.length;
    
    console.log(`✅ Migré ${migratedCount}/${snapshot.size} documents`);
  }

  console.log(`🎉 Migration terminée: ${migratedCount} documents migrés`);
  
  // Note: Ne pas supprimer l'ancienne collection automatiquement pour sécurité
  console.log(`⚠️  L'ancienne collection ${migration.oldName} n'a pas été supprimée.`);
  console.log(`   Supprimez-la manuellement après vérification: db.collection("${migration.oldName}").delete()`);
}

/**
 * Mettre à jour les références dans le code
 */
function generateCodeUpdates(): void {
  console.log('\n📝 Mises à jour de code nécessaires:');
  console.log('=====================================');
  
  const codeUpdates = [
    {
      file: 'config/database.ts',
      change: 'attendances: db.collection("attendance")'
    },
    {
      file: 'services/*.ts',
      change: 'Remplacer .collection("attendances") par collections.attendance'
    },
    {
      file: 'triggers/*.ts', 
      change: 'Remplacer .collection("attendances") par collections.attendance'
    }
  ];

  codeUpdates.forEach(update => {
    console.log(`📁 ${update.file}:`);
    console.log(`   ${update.change}`);
  });

  console.log('\n🔧 Commandes de remplacement automatique:');
  console.log('find backend -name "*.ts" -exec sed -i \'s/\\.collection("attendances")/collections.attendance/g\' {} +');
  console.log('find backend -name "*.ts" -exec sed -i \'s/db\\.collection("attendances")/collections.attendance/g\' {} +');
}

/**
 * Vérifier l'état des collections
 */
async function checkCollectionStatus(): Promise<void> {
  console.log('\n📊 État actuel des collections:');
  console.log('================================');

  for (const migration of COLLECTION_MIGRATIONS) {
    const oldSnapshot = await db.collection(migration.oldName).limit(1).get();
    const newSnapshot = await db.collection(migration.newName).limit(1).get();

    console.log(`📁 ${migration.oldName}:`);
    console.log(`   Existe: ${!oldSnapshot.empty ? '✅' : '❌'}`);
    console.log(`📁 ${migration.newName}:`);
    console.log(`   Existe: ${!newSnapshot.empty ? '✅' : '❌'}`);
    console.log('');
  }
}

/**
 * Script principal
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Standardisation des collections Firestore');
    console.log('===========================================\n');

    // Vérifier l'état actuel
    await checkCollectionStatus();

    // Demander confirmation
    const args = process.argv.slice(2);
    if (!args.includes('--confirm')) {
      console.log('⚠️  Pour exécuter la migration, ajoutez --confirm');
      console.log('   Exemple: npm run standardize-collections -- --confirm');
      generateCodeUpdates();
      return;
    }

    // Exécuter les migrations
    for (const migration of COLLECTION_MIGRATIONS) {
      await migrateCollection(migration);
      console.log('');
    }

    // Afficher les mises à jour de code nécessaires
    generateCodeUpdates();

    console.log('\n✅ Standardisation terminée!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la standardisation:', error);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

export { migrateCollection, checkCollectionStatus };