/**
 * Script de test pour vérifier la configuration CORS
 */

import * as dotenv from "dotenv";
import { corsOptions } from "../config";
dotenv.config();

console.log("🔍 Test de la configuration CORS");
console.log("=" .repeat(50));

// Test de la configuration dynamique

console.log("📋 Configuration CORS active:");
console.log(`- Environnement: ${process.env.APP_ENV || 'development'}`);
console.log(`- Configuration utilisée: ${process.env.APP_ENV === 'development' ? 'corsOptionsDev' : 'corsOptions'}`);

if (typeof corsOptions.origin === 'function') {
  console.log("- Type d'origine: Fonction de validation");
  
  // Test avec différentes origines
  const testOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'https://attendance-app.web.app',
    'https://malicious-site.com',
    undefined // Pas d'origine (ex: Postman)
  ];
  
  console.log("\n🧪 Tests d'origines:");
  testOrigins.forEach(origin => {
    try {
      (corsOptions.origin as Function)(origin, (error: any, allowed: boolean) => {
        const status = error ? "❌ BLOQUÉ" : allowed ? "✅ AUTORISÉ" : "❌ REFUSÉ";
        const originText = origin || "NO-ORIGIN";
        console.log(`  ${status} ${originText}`);
        if (error) {
          console.log(`    Raison: ${error.message}`);
        }
      });
    } catch (err) {
      console.log(`  ❌ ERREUR ${origin || "NO-ORIGIN"}: ${err}`);
    }
  });
} else {
  console.log(`- Origine autorisée: ${corsOptions.origin}`);
}

console.log(`\n📋 Méthodes autorisées: ${corsOptions.methods}`);
console.log(`📋 Headers autorisés: ${corsOptions.allowedHeaders}`);
console.log(`📋 Credentials: ${corsOptions.credentials}`);
console.log(`📋 Max Age: ${corsOptions.maxAge}`);

console.log("\n🌍 Variables d'environnement URL:");
console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL || 'NON DÉFINIE'}`);
console.log(`- FRONTEND_URL_PROD: ${process.env.FRONTEND_URL_PROD || 'NON DÉFINIE'}`);
console.log(`- ADDITIONAL_ORIGINS: ${process.env.ADDITIONAL_ORIGINS || 'NON DÉFINIE'}`);

console.log("\n" + "=".repeat(50));
console.log("✅ Test de configuration CORS terminé");