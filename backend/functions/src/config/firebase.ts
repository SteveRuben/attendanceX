import { getApps, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import { logger } from "firebase-functions";

// Instances exportées
let firebaseApp: App;
let firestoreInstance: Firestore;
let storageInstance: Storage;

/**
 * Configuration et initialisation de Firebase Admin
 */
export function initializeFirebase() {
  // Éviter la double initialisation
  if (getApps().length > 0) {
    logger.info("Firebase already initialized, skipping...");
    firebaseApp = getApps()[0];
    firestoreInstance = getFirestore(firebaseApp);
    storageInstance = getStorage(firebaseApp);
    return;
  }

  try {
    // Configuration selon l'environnement
    const isDevelopment = process.env.APP_ENV === "development";
    const isProduction = process.env.APP_ENV === "production";
    const isEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.FUNCTIONS_EMULATOR;
    const isDeployment = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const projectId = process.env.PROJECT_ID || process.env.GCLOUD_PROJECT || "attendance-management-syst";

    if ((isDevelopment || isEmulator) && !isDeployment) {
      // Mode développement/émulateur - initialisation simple
      firebaseApp = initializeApp({
        projectId,
      });
      
      logger.log("� Firebase initialized for development/emulator mode", { projectId });
    } else {
      // Mode production/staging/deployment - utiliser les credentials par défaut
      firebaseApp = initializeApp({
        projectId,
        // Les credentials sont automatiquement fournis par Cloud Run/Cloud Functions
      });
      
      logger.log("🔥 Firebase initialized for production/deployment", { 
        projectId,
        environment: process.env.APP_ENV 
      });
    }

    // Initialiser Firestore avec l'app et le database ID
    firestoreInstance = getFirestore(firebaseApp, 'attendance-x');
    
    // ✅ Configuration Firestore optimisée pour production
    if (isProduction) {
      try {
        firestoreInstance.settings({
          ignoreUndefinedProperties: true,
          timestampsInSnapshots: true,
          preferRest: true, // 🚨 FIX: Utiliser REST au lieu de gRPC pour éviter "Protocol error"
          ssl: true,
          maxIdleChannels: 10, // Connection pooling
        });
        logger.info("✅ Firestore settings configured for production with REST", {
          preferRest: true,
          reason: 'Avoid gRPC Protocol errors in Cloud Functions'
        });
      } catch (settingsError) {
        // Les settings peuvent déjà être appliqués
        logger.warn("Firestore settings already applied or failed:", settingsError);
      }
    }

    // Initialiser Storage avec l'app
    storageInstance = getStorage(firebaseApp);

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
 * Obtenir l'instance Firebase App
 */
export function getFirebaseApp(): App {
  if (!firebaseApp) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return firebaseApp;
}

/**
 * Obtenir l'instance Firestore configurée
 */
export function getConfiguredFirestore(): Firestore {
  if (!firestoreInstance) {
    throw new Error("Firestore not initialized. Call initializeFirebase() first.");
  }
  return firestoreInstance;
}

/**
 * Obtenir l'instance Storage configurée
 */
export function getConfiguredStorage(): Storage {
  if (!storageInstance) {
    throw new Error("Storage not initialized. Call initializeFirebase() first.");
  }
  return storageInstance;
}

/**
 * Obtenir les services Firebase initialisés
 */
export function getFirebaseServices() {
  return {
    app: getFirebaseApp(),
    firestore: getConfiguredFirestore(),
    storage: getConfiguredStorage(),
  };
}

/**
 * Vérifier la santé de la connexion Firebase
 */
export async function checkFirebaseHealth(): Promise<{
  firestore: boolean;
  auth: boolean;
  storage: boolean;
  error?: string;
}> {
  const health = {
    firestore: false,
    auth: false,
    storage: false,
    error: undefined as string | undefined,
  };

  try {
    // ✅ Test Firestore avec timeout de 5 secondes
    const db = getConfiguredFirestore();
    const testRef = db.collection("_health").doc("test");
    
    // Créer une promesse de timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Firestore connection timeout (5s)")), 5000)
    );
    
    // Tester l'écriture avec timeout
    await Promise.race([
      testRef.set({ 
        timestamp: new Date(), 
        test: true,
        environment: process.env.APP_ENV || 'unknown'
      }),
      timeoutPromise
    ]);
    
    health.firestore = true;
    logger.info("✅ Firestore health check passed");
  } catch (error: any) {
    health.error = error.message || String(error);
    logger.error("❌ Firestore health check failed:", {
      error: error.message,
      code: error.code,
      details: error.details
    });
  }

  try {
    // Auth is handled by JWT - no Firebase Auth dependency
    health.auth = true;
  } catch (error) {
    logger.warn("Auth health check failed:", error);
  }

  try {
    // Test Storage
    const storage = getConfiguredStorage();
    storage.bucket(); // Just check if we can get the bucket reference
    health.storage = true;
  } catch (error) {
    logger.warn("Storage health check failed:", error);
  }

  return health;
} 