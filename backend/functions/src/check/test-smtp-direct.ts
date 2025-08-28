import * as dotenv from "dotenv";
dotenv.config();

import * as nodemailer from "nodemailer";

async function testSmtpDirect() {
  console.log("🧪 Test SMTP direct...");

  // Configuration SMTP depuis les variables d'environnement
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  console.log("📋 Configuration SMTP:", {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: smtpConfig.auth.user,
    hasPassword: !!smtpConfig.auth.pass
  });

  try {
    // Créer le transporteur
    const transporter = nodemailer.createTransport(smtpConfig);

    // Tester la connexion
    console.log("🔗 Test de connexion SMTP...");
    await transporter.verify();
    console.log("✅ Connexion SMTP réussie!");

    // Envoyer un email de test
    console.log("📧 Envoi d'email de test...");

    const mailOptions = {
      from: `Attendance-X Test <${process.env.SMTP_FROM_EMAIL}>`,
      to: process.env.SMTP_FROM_EMAIL, // Envoyer à soi-même pour tester
      subject: "Test d'email de vérification - Attendance-X",
      text: `
Bonjour,

Ceci est un test d'envoi d'email de vérification pour votre système Attendance-X.

Si vous recevez cet email, la configuration SMTP fonctionne correctement !

Détails du test:
- Date: ${new Date().toLocaleString()}
- Provider: SMTP (${process.env.SMTP_HOST})
- From: ${process.env.SMTP_FROM_EMAIL}

Cordialement,
L'équipe Attendance-X
      `,
      html: `
<h1>Test d'email de vérification</h1>
<p>Bonjour,</p>
<p>Ceci est un test d'envoi d'email de vérification pour votre système <strong>Attendance-X</strong>.</p>
<p>Si vous recevez cet email, la configuration SMTP fonctionne correctement ! ✅</p>

<h2>Détails du test:</h2>
<ul>
  <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
  <li><strong>Provider:</strong> SMTP (${process.env.SMTP_HOST})</li>
  <li><strong>From:</strong> ${process.env.SMTP_FROM_EMAIL}</li>
</ul>

<p>Cordialement,<br>L'équipe Attendance-X</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);

    console.log("✅ Email envoyé avec succès!");
    console.log("📧 Message ID:", result.messageId);
    console.log("📧 Destinataire:", mailOptions.to);

    return true;

  } catch (error) {
    console.error("❌ Erreur SMTP:", error);

    if (error instanceof Error) {
      if (error.message.includes("Invalid login")) {
        console.error("🔐 Erreur d'authentification - Vérifiez vos identifiants SMTP");
      } else if (error.message.includes("ECONNREFUSED")) {
        console.error("🌐 Erreur de connexion - Vérifiez l'host et le port SMTP");
      } else if (error.message.includes("ENOTFOUND")) {
        console.error("🌐 Host SMTP introuvable - Vérifiez l'adresse du serveur");
      }
    }

    return false;
  }
}

// Exécuter le test
testSmtpDirect()
  .then((success) => {
    if (success) {
      console.log("🎉 Test SMTP réussi ! Vérifiez votre boîte email.");
    } else {
      console.log("💥 Test SMTP échoué. Vérifiez votre configuration.");
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });