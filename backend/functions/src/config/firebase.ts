import * as admin from "firebase-admin";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import { logger } from "firebase-functions";

// Initialiser Firebase Admin SDK
if (!admin.apps || !admin.apps.length) {
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

// Exports des services Firebase avec configuration
export const db = getFirestore();
export const storage = getStorage();

// Configuration Firestore après export pour s'assurer qu'elle s'applique à l'instance exportée
try {
  db.settings({
    timestampsInSnapshots: true,
  });
} catch (error) {
  // Ignorer l'erreur si les settings ont déjà été appliqués
  console.warn("Firestore settings already applied:", error);
}
/* export const auth = getAuth(); */
export default admin;
