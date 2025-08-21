import * as dotenv from "dotenv";
dotenv.config();

import { initializeFirebase } from "../config/firebase-init";
initializeFirebase();

import { emailVerificationService } from "../services/notification/email-verification.service";
import { validateEmailConfiguration } from "../config/email-provider";

async function testEmailConfiguration() {
    console.log("🧪 Test de la configuration email...");

    // 1. Vérifier la configuration
    const validation = validateEmailConfiguration();
    console.log("📋 Validation de la configuration:", validation);

    if (!validation.isValid) {
        console.error("❌ Configuration email invalide:", validation.errors);
        return;
    }

    // 2. Tester l'envoi d'un email de vérification
    try {
        console.log("📧 Test d'envoi d'email de vérification...");

        const testData = {
            userId: "test-user-id",
            userName: "Test User",
            email: "steveruben2015@hotmail.com", // Remplacez par votre email pour tester
            token: "test-token-123456",
            expirationHours: 24
        };

        const result = await emailVerificationService.sendEmailVerification(testData);

        console.log("📧 Résultat de l'envoi:", result);

        if (result.success) {
            console.log("✅ Email envoyé avec succès!");
            console.log("📧 ID de notification:", result.notificationId);
        } else {
            console.error("❌ Échec de l'envoi d'email:", result.error);
        }

    } catch (error) {
        console.error("❌ Erreur lors du test d'email:", error);
    }
}

// Exécuter le test
testEmailConfiguration()
    .then(() => {
        console.log("🏁 Test terminé");
        process.exit(0);
    })
    .catch((error) => {
        console.error("💥 Erreur fatale:", error);
        process.exit(1);
    });