// dev-tools/health-checks/setup-test-email.ts

import * as nodemailer from "nodemailer";

async function setupTestEmail() {
  console.log("🧪 Configuration d'un compte email de test...");
  
  try {
    // Créer un compte de test Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    console.log("✅ Compte de test créé !");
    console.log("📧 Email:", testAccount.user);
    console.log("🔐 Mot de passe:", testAccount.pass);
    
    console.log("\n📋 Configuration à ajouter dans votre .env :");
    console.log(`SMTP_HOST=smtp.ethereal.email`);
    console.log(`SMTP_PORT=587`);
    console.log(`SMTP_SECURE=false`);
    console.log(`SMTP_USERNAME=${testAccount.user}`);
    console.log(`SMTP_PASSWORD=${testAccount.pass}`);
    console.log(`SMTP_FROM_EMAIL=${testAccount.user}`);
    
    // Tester l'envoi
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    const info = await transporter.sendMail({
      from: `"Attendance-X Test" <${testAccount.user}>`,
      to: testAccount.user,
      subject: "Test d'email de vérification",
      text: "Ceci est un test d'email de vérification pour Attendance-X",
      html: "<h1>Test réussi !</h1><p>Votre configuration SMTP fonctionne.</p>",
    });
    
    console.log("\n✅ Email de test envoyé !");
    console.log("📧 Message ID:", info.messageId);
    console.log("🔗 Voir l'email:", nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

setupTestEmail();