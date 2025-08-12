import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Configuration et initialisation de Firebase Admin
 */
export function initializeFirebase() {
  // Éviter la double initialisation
  if (getApps().length > 0) {
    return;
  }

  try {
    // Configuration selon l'environnement
    const isEmulator = process.env.APP_ENV === "development" && 
                      process.env.FIRESTORE_EMULATOR_HOST;

    if (isEmulator) {
      // Mode émulateur - utiliser les credentials par défaut
      initializeApp({
        projectId: process.env.PROJECT_ID || "attendance-x-dev",
        storageBucket: process.env.STORAGE_BUCKET,
      });
      
      console.log("🔧 Firebase initialized for emulator mode");
    } else {
      // Mode production/staging - utiliser les credentials explicites
      const privateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (process.env.CLIENT_EMAIL && privateKey) {
        // Utiliser les credentials du service account
        initializeApp({
          credential: cert({
            projectId: process.env.PROJECT_ID,
            clientEmail: process.env.CLIENT_EMAIL,
            privateKey: privateKey,
          }),
          projectId: process.env.PROJECT_ID,
          databaseURL: process.env.DATABASE_URL,
          storageBucket: process.env.STORAGE_BUCKET,
        });
        
        console.log("🔥 Firebase initialized with service account");
      } else {
        // Fallback vers les credentials par défaut
        initializeApp({
          projectId: process.env.PROJECT_ID,
          databaseURL: process.env.DATABASE_URL,
          storageBucket: process.env.STORAGE_BUCKET,
        });
        
        console.log("🔥 Firebase initialized with default credentials");
      }
    }

    // Configuration des émulateurs si nécessaire
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log(`🔧 Using Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    }
    
    if (process.env.AUTH_EMULATOR_HOST) {
      console.log(`🔧 Using Auth emulator: ${process.env.AUTH_EMULATOR_HOST}`);
    }

  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
    throw error;
  }
}

/**
 * Obtenir les services Firebase initialisés
 */
export function getFirebaseServices() {
  return {
    firestore: getFirestore(),
    storage: getStorage(),
  };
}

/**
 * Vérifier la santé de la connexion Firebase
 */
export async function checkFirebaseHealth(): Promise<{
  firestore: boolean;
  auth: boolean;
  storage: boolean;
}> {
  const health = {
    firestore: false,
    auth: false,
    storage: false,
  };

  try {
    // Test Firestore
    const db = getFirestore();
    await db.collection("_health").limit(1).get();
    health.firestore = true;
  } catch (error) {
    console.warn("Firestore health check failed:", error);
  }

  try {
    // Auth is handled by JWT - no Firebase Auth dependency
    health.auth = true;
  } catch (error) {
    console.warn("Auth health check failed:", error);
  }

  try {
    // Test Storage
    const storage = getStorage();
    storage.bucket(); // Just check if we can get the bucket reference
    health.storage = true;
  } catch (error) {
    console.warn("Storage health check failed:", error);
  }

  return health;
}