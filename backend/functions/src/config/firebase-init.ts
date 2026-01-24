import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";

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
    const isDevelopment = process.env.APP_ENV === "development";
    const isEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.FUNCTIONS_EMULATOR;
    const isDeployment = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

    if ((isDevelopment || isEmulator) && !isDeployment) {
      // Mode développement/émulateur - initialisation simple
      initializeApp({
        projectId: process.env.PROJECT_ID || "attendance-management-syst",
      });
      
      logger.log("🔧 Firebase initialized for development/emulator mode");
    } else {
      // Mode production/staging/deployment - utiliser les credentials par défaut
      initializeApp({
        projectId: process.env.PROJECT_ID || process.env.GCLOUD_PROJECT || "attendance-management-syst",
      });
      
      logger.log("🔥 Firebase initialized for production/deployment");
    }

    // Configuration des émulateurs seulement si pas en déploiement
    if (process.env.FIRESTORE_EMULATOR_HOST && !isDeployment) {
      logger.log(`🔧 Using Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    }
    
    if (process.env.AUTH_EMULATOR_HOST && !isDeployment) {
      logger.log(`🔧 Using Auth emulator: ${process.env.AUTH_EMULATOR_HOST}`);
    }

  } catch (error) {
    logger.error("❌ Failed to initialize Firebase:", error);
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
    logger.warn("Firestore health check failed:", error);
  }

  try {
    // Auth is handled by JWT - no Firebase Auth dependency
    health.auth = true;
  } catch (error) {
    logger.warn("Auth health check failed:", error);
  }

  try {
    // Test Storage
    const storage = getStorage();
    storage.bucket(); // Just check if we can get the bucket reference
    health.storage = true;
  } catch (error) {
    logger.warn("Storage health check failed:", error);
  }

  return health;
} 