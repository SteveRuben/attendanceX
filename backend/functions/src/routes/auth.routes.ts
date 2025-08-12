import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { rateLimit, rateLimitConfigs } from "../middleware/rateLimit";
import { z } from "zod";
import {
  changePasswordSchema,
  confirmPasswordResetSchema,
  loginSchema,
  passwordResetSchema,
  registerSchema,
  sendEmailVerificationSchema,
  twoFactorSchema,
  verifyEmailSchema,
} from "@attendance-x/shared";

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Connexion utilisateur avec JWT
 *     description: |
 *       Authentifie un utilisateur et retourne des tokens JWT.
 *       
 *       **Fonctionnalités:**
 *       - Authentification par email/mot de passe
 *       - Support 2FA (si activé)
 *       - Génération de tokens JWT (access + refresh)
 *       - Rate limiting (5 tentatives/15min)
 *       - Détection d'activité suspecte
 *       
 *       **Sécurité:**
 *       - Hachage sécurisé des mots de passe (bcrypt)
 *       - Protection contre les attaques par force brute
 *       - Limitation des sessions concurrentes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             basic:
 *               summary: Connexion basique
 *               value:
 *                 email: "user@example.com"
 *                 password: "SecurePass123!"
 *                 rememberMe: false
 *             with2FA:
 *               summary: Connexion avec 2FA
 *               value:
 *                 email: "user@example.com"
 *                 password: "SecurePass123!"
 *                 twoFactorCode: "123456"
 *                 rememberMe: true
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               success: true
 *               accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: "user123"
 *                 email: "user@example.com"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 role: "user"
 *               expiresIn: 86400
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_CREDENTIALS"
 *                 message: "Email ou mot de passe incorrect"
 *       423:
 *         description: Compte verrouillé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "ACCOUNT_LOCKED"
 *                 message: "Compte temporairement verrouillé suite à trop de tentatives"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *     security: []
 */
router.post("/login",
  rateLimit(rateLimitConfigs.auth),
  validateBody(loginSchema),
  AuthController.login
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Inscription d'un nouvel utilisateur
 *     description: |
 *       Crée un nouveau compte utilisateur avec vérification email.
 *       
 *       **Fonctionnalités:**
 *       - Création de compte avec validation
 *       - Hachage sécurisé du mot de passe
 *       - Envoi d'email de vérification
 *       - Attribution automatique du rôle
 *       - Génération de tokens JWT
 *       
 *       **Validation:**
 *       - Email unique dans l'organisation
 *       - Mot de passe fort requis (8+ chars, maj, min, chiffre, spécial)
 *       - Noms minimum 2 caractères
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: "newuser@example.com"
 *             password: "SecurePass123!"
 *             firstName: "Jane"
 *             lastName: "Smith"
 *             organizationName: "Mon Entreprise"
 *     responses:
 *       201:
 *         description: Inscription réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Compte créé avec succès. Vérifiez votre email."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   description: "Token JWT d'accès"
 *                 refreshToken:
 *                   type: string
 *                   description: "Token de rafraîchissement"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "EMAIL_ALREADY_EXISTS"
 *                 message: "Cette adresse email est déjà utilisée"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *     security: []
 */
router.post("/register",
  rateLimit(rateLimitConfigs.register),
  validateBody(registerSchema),
  AuthController.register
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Rafraîchissement du token JWT
 *     description: |
 *       Génère un nouveau token d'accès à partir du refresh token.
 *       
 *       **Sécurité:**
 *       - Rotation automatique du refresh token
 *       - Détection de réutilisation de token
 *       - Révocation en cascade si compromission détectée
 *       - Validation de la famille de tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Token de rafraîchissement valide
 *             required: [refreshToken]
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                   description: "Nouveau token d'accès"
 *                 refreshToken:
 *                   type: string
 *                   description: "Nouveau refresh token (rotation)"
 *                 expiresIn:
 *                   type: number
 *                   description: "Durée de validité en secondes"
 *                   example: 86400
 *       401:
 *         description: Refresh token invalide ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_REFRESH_TOKEN"
 *                 message: "Token de rafraîchissement invalide ou expiré"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *     security: []
 */
router.post("/refresh-token",
  rateLimit(rateLimitConfigs.refreshToken),
  validateBody(z.object({
    refreshToken: z.string().min(1, "Token de rafraîchissement requis"),
  })),
  AuthController.refreshToken
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Demande de réinitialisation de mot de passe
 *     description: |
 *       Envoie un email avec un lien de réinitialisation de mot de passe.
 *       
 *       **Sécurité:**
 *       - Token JWT temporaire (30 minutes)
 *       - Rate limiting (2 demandes/heure)
 *       - Email sécurisé avec lien unique
 *       - Pas de révélation d'existence du compte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Adresse email du compte
 *             required: [email]
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Email envoyé (même si compte inexistant)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Si ce compte existe, un email de réinitialisation a été envoyé"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *     security: []
 */
router.post("/forgot-password",
  rateLimit(rateLimitConfigs.forgotPassword),
  validateBody(passwordResetSchema),
  AuthController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Réinitialisation du mot de passe
 *     description: |
 *       Réinitialise le mot de passe avec un token de réinitialisation valide.
 *       
 *       **Sécurité:**
 *       - Validation du token JWT de réinitialisation
 *       - Nouveau mot de passe fort requis
 *       - Révocation de toutes les sessions existantes
 *       - Historique des mots de passe (évite réutilisation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de réinitialisation reçu par email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]'
 *                 description: Nouveau mot de passe fort
 *             required: [token, newPassword]
 *           example:
 *             token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             newPassword: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mot de passe réinitialisé avec succès"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Token de réinitialisation invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_RESET_TOKEN"
 *                 message: "Token de réinitialisation invalide ou expiré"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *     security: []
 */
router.post("/reset-password",
  rateLimit(rateLimitConfigs.resetPassword),
  validateBody(confirmPasswordResetSchema),
  AuthController.resetPassword
);

router.post("/verify-email",
  rateLimit(rateLimitConfigs.emailVerification),
  validateBody(verifyEmailSchema),
  AuthController.verifyEmail
);

router.post("/send-email-verification",
  rateLimit(rateLimitConfigs.sendEmailVerification),
  validateBody(sendEmailVerificationSchema),
  AuthController.resendEmailVerification
);

// 🔒 Routes protégées
router.use(authenticate);

router.post("/logout", AuthController.logout);
router.post("/logout-all", AuthController.logoutAll);

router.post("/change-password",
  validateBody(changePasswordSchema),
  AuthController.changePassword
);

// 🔐 2FA Routes
router.post("/setup-2fa", AuthController.setup2FA);
router.post("/verify-2fa",
  validateBody(twoFactorSchema),
  AuthController.verify2FA
);
router.post("/disable-2fa",
  validateBody(z.object({
    password: z.string().min(1, "Mot de passe requis pour désactiver 2FA"),
  })),
  AuthController.disable2FA
);



// 📊 Session & Security
router.get("/session", AuthController.getSession);
router.get("/security-metrics", AuthController.getSecurityMetrics);

export { router as authRoutes };
