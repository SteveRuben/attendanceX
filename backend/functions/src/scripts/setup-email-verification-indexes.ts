import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";

// Initialiser Firebase Admin si ce n'est pas déjà fait
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Script pour créer les index nécessaires pour la collection email_verification_tokens
 * 
 * Ces index optimisent les requêtes suivantes :
 * 1. Recherche par hashedToken (unique lookup)
 * 2. Recherche des tokens actifs par userId
 * 3. Nettoyage des tokens expirés
 * 4. Rate limiting par userId et période
 */
async function setupEmailVerificationIndexes() {
  console.log("🔧 Configuration des index pour email_verification_tokens...");

  try {
    // Note: Les index Firestore doivent être créés via la console Firebase ou le CLI
    // Ce script documente les index nécessaires et peut être utilisé pour les tests

    const indexesNeeded = [
      {
        collection: "email_verification_tokens",
        fields: [
          { field: "hashedToken", order: "ASCENDING" }
        ],
        description: "Index pour la recherche rapide par token hash (unique lookup)"
      },
      {
        collection: "email_verification_tokens",
        fields: [
          { field: "userId", order: "ASCENDING" },
          { field: "isUsed", order: "ASCENDING" },
          { field: "expiresAt", order: "ASCENDING" }
        ],
        description: "Index composite pour récupérer les tokens actifs d'un utilisateur"
      },
      {
        collection: "email_verification_tokens",
        fields: [
          { field: "expiresAt", order: "ASCENDING" }
        ],
        description: "Index pour le nettoyage des tokens expirés"
      },
      {
        collection: "email_verification_tokens",
        fields: [
          { field: "userId", order: "ASCENDING" },
          { field: "createdAt", order: "DESCENDING" }
        ],
        description: "Index pour récupérer l'historique des tokens d'un utilisateur"
      },
      {
        collection: "email_verification_tokens",
        fields: [
          { field: "userId", order: "ASCENDING" },
          { field: "createdAt", order: "ASCENDING" }
        ],
        description: "Index pour le rate limiting (compter les tokens récents)"
      },
      {
        collection: "email_verification_tokens",
        fields: [
          { field: "isUsed", order: "ASCENDING" },
          { field: "usedAt", order: "ASCENDING" }
        ],
        description: "Index pour le nettoyage des tokens utilisés anciens"
      }
    ];

    console.log("\n📋 Index nécessaires pour email_verification_tokens :");
    console.log("=" .repeat(60));

    indexesNeeded.forEach((index, i) => {
      console.log(`\n${i + 1}. ${index.description}`);
      console.log(`   Collection: ${index.collection}`);
      console.log(`   Champs: ${index.fields.map(f => `${f.field} (${f.order})`).join(", ")}`);
    });

    console.log("\n🔧 Commandes Firebase CLI pour créer les index :");
    console.log("=" .repeat(60));

    // Générer les commandes Firebase CLI
    indexesNeeded.forEach((index, i) => {
      const fieldsStr = index.fields.map(f => `${f.field}:${f.order.toLowerCase()}`).join(",");
      console.log(`\n# ${index.description}`);
      console.log(`firebase firestore:indexes:create --collection-group=${index.collection} --field-config=${fieldsStr}`);
    });

    console.log("\n📝 Fichier firestore.indexes.json suggéré :");
    console.log("=" .repeat(60));

    const firestoreIndexes = {
      indexes: indexesNeeded.map(index => ({
        collectionGroup: index.collection,
        queryScope: "COLLECTION",
        fields: index.fields.map(f => ({
          fieldPath: f.field,
          order: f.order
        }))
      }))
    };

    console.log(JSON.stringify(firestoreIndexes, null, 2));

    // Tester la connectivité à la base de données
    console.log("\n🧪 Test de connectivité à la base de données...");
    const testDoc = await db.collection("email_verification_tokens").limit(1).get();
    console.log(`✅ Connexion réussie. Collection existe: ${!testDoc.empty}`);

    console.log("\n✅ Configuration des index terminée !");
    console.log("\n💡 Pour appliquer les index :");
    console.log("1. Copiez le contenu JSON ci-dessus dans firestore.indexes.json");
    console.log("2. Exécutez: firebase deploy --only firestore:indexes");
    console.log("3. Ou créez les index manuellement via la console Firebase");

  } catch (error) {
    console.error("❌ Erreur lors de la configuration des index :", error);
    throw error;
  }
}

// Fonction utilitaire pour vérifier les performances des requêtes
export async function testEmailVerificationQueries() {
  console.log("\n🧪 Test des performances des requêtes...");

  const testUserId = "test-user-id";
  const testHashedToken = "test-hashed-token";

  try {
    // Test 1: Recherche par hashedToken
    console.log("1. Test recherche par hashedToken...");
    const start1 = Date.now();
    const tokenQuery = await db.collection("email_verification_tokens")
      .where("hashedToken", "==", testHashedToken)
      .limit(1)
      .get();
    console.log(`   ⏱️  Temps: ${Date.now() - start1}ms, Résultats: ${tokenQuery.size}`);

    // Test 2: Recherche des tokens actifs par userId
    console.log("2. Test tokens actifs par userId...");
    const start2 = Date.now();
    const activeTokensQuery = await db.collection("email_verification_tokens")
      .where("userId", "==", testUserId)
      .where("isUsed", "==", false)
      .where("expiresAt", ">", new Date())
      .get();
    console.log(`   ⏱️  Temps: ${Date.now() - start2}ms, Résultats: ${activeTokensQuery.size}`);

    // Test 3: Nettoyage des tokens expirés
    console.log("3. Test nettoyage tokens expirés...");
    const start3 = Date.now();
    const expiredQuery = await db.collection("email_verification_tokens")
      .where("expiresAt", "<=", new Date())
      .get();
    console.log(`   ⏱️  Temps: ${Date.now() - start3}ms, Résultats: ${expiredQuery.size}`);

    // Test 4: Rate limiting
    console.log("4. Test rate limiting...");
    const start4 = Date.now();
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const rateLimitQuery = await db.collection("email_verification_tokens")
      .where("userId", "==", testUserId)
      .where("createdAt", ">=", oneHourAgo)
      .get();
    console.log(`   ⏱️  Temps: ${Date.now() - start4}ms, Résultats: ${rateLimitQuery.size}`);

    console.log("✅ Tests de performance terminés !");

  } catch (error) {
    console.error("❌ Erreur lors des tests de performance :", error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  setupEmailVerificationIndexes()
    .then(() => testEmailVerificationQueries())
    .then(() => {
      console.log("\n🎉 Script terminé avec succès !");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Erreur fatale :", error);
      process.exit(1);
    });
}

export { setupEmailVerificationIndexes };