/**
 * Script de test pour vérifier le chargement des variables d'environnement
 */

import * as dotenv from "dotenv";
dotenv.config();

console.log("🔍 Test des variables d'environnement Firebase Functions");
console.log("=" .repeat(60));

// Variables critiques
const criticalVars = [
  'PROJECT_ID',
  'APP_ENV',
  'JWT_SECRET',
  'FRONTEND_URL'
];

// Variables optionnelles
const optionalVars = [
  'CLIENT_EMAIL',
  'PRIVATE_KEY',
  'DATABASE_URL',
  'STORAGE_BUCKET',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID'
];

console.log("📋 Variables critiques:");
criticalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? "✅" : "❌";
  const displayValue = value ? 
    (varName.includes('SECRET') || varName.includes('KEY') ? 
      `${value.substring(0, 8)}...` : value) : 
    "NON DÉFINIE";
  
  console.log(`${status} ${varName}: ${displayValue}`);
});

console.log("\n📋 Variables optionnelles:");
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? "✅" : "⚠️";
  const displayValue = value ? 
    (varName.includes('SECRET') || varName.includes('KEY') ? 
      `${value.substring(0, 8)}...` : 
      (value.length > 50 ? `${value.substring(0, 47)}...` : value)) : 
    "NON DÉFINIE";
  
  console.log(`${status} ${varName}: ${displayValue}`);
});

console.log("\n🔧 Configuration détectée:");
console.log(`- Environnement: ${process.env.APP_ENV || 'development'}`);
console.log(`- Projet ID: ${process.env.PROJECT_ID || 'NON DÉFINI'}`);
console.log(`- Frontend URL: ${process.env.FRONTEND_URL || 'NON DÉFINIE'}`);
console.log(`- Émulateur Firestore: ${process.env.FIRESTORE_EMULATOR_HOST || 'NON CONFIGURÉ'}`);
console.log(`- Émulateur Auth: ${process.env.AUTH_EMULATOR_HOST || 'NON CONFIGURÉ'}`);

// Vérification des mots-clés interdits
console.log("\n🚫 Vérification des mots-clés interdits:");
const forbiddenPrefixes = ['FIREBASE_', 'GCLOUD_', 'GOOGLE_', 'X_GOOGLE_'];
const allEnvVars = Object.keys(process.env);

let hasForbiddenVars = false;
forbiddenPrefixes.forEach(prefix => {
  const forbidden = allEnvVars.filter(key => key.startsWith(prefix));
  if (forbidden.length > 0) {
    console.log(`❌ Variables interdites trouvées avec le préfixe ${prefix}:`, forbidden);
    hasForbiddenVars = true;
  }
});

if (!hasForbiddenVars) {
  console.log("✅ Aucune variable interdite détectée");
}

console.log("\n" + "=".repeat(60));
console.log(hasForbiddenVars ? 
  "❌ Configuration NOK - Variables interdites détectées" : 
  "✅ Configuration OK - Prêt pour Firebase Functions");