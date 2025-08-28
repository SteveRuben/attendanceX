import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";

// Initialiser Firebase Admin SDK
if (!admin.apps?.length) {
  try {
    admin.initializeApp({
      // Si aucune variable d'environnement n'est fournie, Firebase utilise
      // automatiquement les credentials du service account
      // ou les emulateurs en mode développement
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.STORAGE_BUCKET,
    });

    logger.info("Firebase Admin SDK initialisé avec succès");
  } catch (error) {
    console.error(
      "Erreur lors de l'initialisation de Firebase Admin SDK:", error);
    throw error;
  }
}

// Exports des services Firebase avec configurationexport const db = getFirestore();
export const storage = getStorage();

/* export const auth = getAuth(); */
export default admin;
