// dev-tools/health-checks/email-verification-demo.ts

import { EmailVerificationService } from '../../services/notification/email-verification.service';
import { EmailVerificationUtils } from '../../shared/utils/auth/email-verification.utils';

/**
 * Démonstration du service de vérification d'email
 * Ce script montre comment utiliser le service et les utilitaires
 */
async function demonstrateEmailVerification() {
  console.log('🚀 Démonstration du service de vérification d\'email\n');

  // 1. Initialisation du service
  console.log('1. Initialisation du service...');
  const emailVerificationService = new EmailVerificationService();
  console.log('✅ Service initialisé\n');

  // 2. Génération d'URL de vérification
  console.log('2. Génération d\'URL de vérification...');
  const testToken = 'a'.repeat(64); // Token de test de 64 caractères
  
  const defaultUrl = emailVerificationService.generateVerificationUrl(testToken);
  console.log(`URL par défaut: ${defaultUrl}`);
  
  const customUrl = emailVerificationService.generateVerificationUrl(testToken, {
    baseUrl: 'https://custom.example.com',
    routePath: '/custom-verify'
  });
  console.log(`URL personnalisée: ${customUrl}\n`);

  // 3. Validation des utilitaires
  console.log('3. Test des utilitaires...');
  
  // Test de validation d'URL
  const validUrl = 'https://example.com';
  const invalidUrl = 'not-a-url';
  console.log(`URL valide (${validUrl}): ${EmailVerificationUtils.validateBaseUrl(validUrl)}`);
  console.log(`URL invalide (${invalidUrl}): ${EmailVerificationUtils.validateBaseUrl(invalidUrl)}`);
  
  // Test de normalisation
  const normalizedUrl = EmailVerificationUtils.normalizeBaseUrl('example.com/');
  console.log(`URL normalisée: ${normalizedUrl}`);
  
  // Test de formatage du temps d'expiration
  console.log(`Expiration 1h: ${EmailVerificationUtils.formatExpirationTime(1)}`);
  console.log(`Expiration 24h: ${EmailVerificationUtils.formatExpirationTime(24)}`);
  console.log(`Expiration 25h: ${EmailVerificationUtils.formatExpirationTime(25)}\n`);

  // 4. Validation des variables de template
  console.log('4. Validation des variables de template...');
  const validVariables = {
    userName: 'Jean Dupont',
    verificationUrl: 'https://example.com/verify?token=abc123',
    expirationTime: '24 heures',
    supportEmail: 'support@example.com',
    appName: 'Mon App'
  };
  
  const validationResult = EmailVerificationUtils.validateTemplateVariables(validVariables);
  console.log(`Variables valides: ${validationResult.isValid}`);
  console.log(`Variables manquantes: ${validationResult.missingVariables.join(', ') || 'Aucune'}`);
  console.log(`Variables invalides: ${validationResult.invalidVariables.join(', ') || 'Aucune'}\n`);

  // 5. Configuration système
  console.log('5. Configuration système...');
  const config = EmailVerificationUtils.generateConfigSummary();
  console.log('Configuration actuelle:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  // 6. Simulation d'envoi d'email (sans vraiment envoyer)
  console.log('6. Simulation d\'envoi d\'email...');
  const mockEmailData = {
    userId: 'user-123',
    userName: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    token: testToken,
    expirationHours: 24
  };

  console.log('Données d\'email de vérification:');
  console.log(`  Utilisateur: ${mockEmailData.userName} (${mockEmailData.email})`);
  console.log(`  Token: ${mockEmailData.token.substring(0, 8)}...`);
  console.log(`  Expiration: ${mockEmailData.expirationHours} heures`);
  
  const verificationUrl = emailVerificationService.generateVerificationUrl(mockEmailData.token);
  console.log(`  URL générée: ${verificationUrl}\n`);

  console.log('✅ Démonstration terminée avec succès!');
  console.log('\n📋 Résumé des fonctionnalités démontrées:');
  console.log('  - Initialisation du service de vérification d\'email');
  console.log('  - Génération d\'URLs de vérification');
  console.log('  - Validation et normalisation d\'URLs');
  console.log('  - Formatage des temps d\'expiration');
  console.log('  - Validation des variables de template');
  console.log('  - Configuration système');
  console.log('  - Préparation des données d\'email');
}

// Exécution de la démonstration si le script est appelé directement
if (require.main === module) {
  demonstrateEmailVerification().catch(console.error);
}

export { demonstrateEmailVerification };