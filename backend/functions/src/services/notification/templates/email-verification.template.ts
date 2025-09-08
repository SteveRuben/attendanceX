// backend/functions/src/services/notification/templates/email-verification.template.ts

import { EmailTemplate, EmailTemplateCategory, NotificationType } from "../../../shared";

/**
 * Template de vérification d'email
 * Variables disponibles:
 * - {userName} - Nom de l'utilisateur
 * - {verificationUrl} - URL de vérification
 * - {expirationTime} - Temps d'expiration (ex: "24 heures")
 * - {supportEmail} - Email de support
 * - {appName} - Nom de l'application
 */
export const EMAIL_VERIFICATION_TEMPLATE: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
    name: "Vérification d'email",
    description: "Template pour l'envoi d'emails de vérification lors de l'inscription",
    category: EmailTemplateCategory.AUTHENTICATION,

    // Contenu du template
    subject: "Vérifiez votre adresse email - {appName}",

    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification d'email</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
        }
        .verification-button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .verification-button:hover {
            background-color: #1d4ed8;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .alternative-link {
            background-color: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
            font-size: 14px;
        }
        .alternative-link code {
            background-color: #e5e7eb;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            word-break: break-all;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
        }
        .expiration {
            color: #dc2626;
            font-weight: bold;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .verification-button {
                display: block;
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{appName}</div>
            <h1 class="title">Vérifiez votre adresse email</h1>
        </div>
        
        <div class="content">
            <p>Bonjour <strong>{userName}</strong>,</p>
            
            <p>Merci de vous être inscrit sur {appName} ! Pour finaliser votre inscription et sécuriser votre compte, nous devons vérifier votre adresse email.</p>
            
            <p>Cliquez sur le bouton ci-dessous pour vérifier votre email :</p>
        </div>
        
        <div class="button-container">
            <a href="{verificationUrl}" class="verification-button">
                ✓ Vérifier mon email
            </a>
        </div>
        
        <div class="alternative-link">
            <p><strong>Le bouton ne fonctionne pas ?</strong></p>
            <p>Copiez et collez ce lien dans votre navigateur :</p>
            <code>{verificationUrl}</code>
        </div>
        
        <div class="warning">
            <p><strong>⚠️ Important :</strong></p>
            <ul>
                <li>Ce lien expire dans <span class="expiration">{expirationTime}</span></li>
                <li>Vous ne pourrez pas vous connecter tant que votre email n'est pas vérifié</li>
                <li>Si vous n'avez pas créé de compte, ignorez cet email</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>Si vous avez des questions, contactez notre support : <a href="mailto:{supportEmail}">{supportEmail}</a></p>
            <p>&copy; 2024 {appName}. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>`,

    textContent: `
Vérifiez votre adresse email - {appName}

Bonjour {userName},

Merci de vous être inscrit sur {appName} ! Pour finaliser votre inscription et sécuriser votre compte, nous devons vérifier votre adresse email.

Cliquez sur le lien ci-dessous pour vérifier votre email :
{verificationUrl}

IMPORTANT :
- Ce lien expire dans {expirationTime}
- Vous ne pourrez pas vous connecter tant que votre email n'est pas vérifié
- Si vous n'avez pas créé de compte, ignorez cet email

Si le lien ne fonctionne pas, copiez et collez l'URL complète dans votre navigateur.

Besoin d'aide ? Contactez notre support : {supportEmail}

---
Cet email a été envoyé automatiquement, merci de ne pas y répondre.
© 2024 {appName}. Tous droits réservés.
`,

    // Variables dynamiques utilisées dans le template
    variables: [
        'userName',
        'verificationUrl',
        'expirationTime',
        'supportEmail',
        'appName'
    ],

    // Métadonnées
    language: 'fr',
    isActive: true,
    isDefault: true,

    // Paramètres
    settings: {
        trackOpens: true,
        trackClicks: true,
        unsubscribeLink: false, // Pas de désabonnement pour les emails de vérification
        customCss: '' // CSS personnalisé vide par défaut
    },

    // Audit (sera complété lors de la création)
    createdBy: 'system',
    version: 1,
    tags: ['authentication', 'verification', 'security', 'onboarding'],

    // Statistiques d'utilisation
    usage: {
        timesUsed: 0,
    }
};

/**
 * Template de notification pour le service de notification
 * Compatible avec le système de templates existant
 */
export const EMAIL_VERIFICATION_NOTIFICATION_TEMPLATE = {
    id: 'email_verification',
    type: NotificationType.EMAIL_VERIFICATION,
    title: 'Vérifiez votre adresse email - {appName}',
    content: EMAIL_VERIFICATION_TEMPLATE.textContent || '',
    channels: ['EMAIL'],
    priority: 'HIGH' as const,
    variables: EMAIL_VERIFICATION_TEMPLATE.variables
};