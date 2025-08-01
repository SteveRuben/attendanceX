import {Router} from "express";
import {AuthController} from "../controllers/auth.controller";
import {authenticate} from "../middleware/auth";
import {validateBody} from "../middleware/validation";
import {rateLimit, rateLimitConfigs} from "../middleware/rateLimit";
import {z} from "zod";
import {
  changePasswordSchema,
  confirmPasswordResetSchema,
  loginSchema,
  passwordResetSchema,
  registerSchema,
  twoFactorSchema,
} from "@attendance-x/shared";

const router = Router();

// 🔐 Routes publiques avec rate limiting renforcé
router.post("/login",
  rateLimit(rateLimitConfigs.auth),
  validateBody(loginSchema),
  AuthController.login
);

router.post("/register",
  rateLimit(rateLimitConfigs.register),
  validateBody(registerSchema),
  AuthController.register
);

router.post("/refresh-token",
  rateLimit(rateLimitConfigs.refreshToken),
  validateBody(z.object({
    refreshToken: z.string().min(1, "Token de rafraîchissement requis"),
  })),
  AuthController.refreshToken
);

router.post("/forgot-password",
  rateLimit(rateLimitConfigs.forgotPassword),
  validateBody(passwordResetSchema),
  AuthController.forgotPassword
);

router.post("/reset-password",
  rateLimit(rateLimitConfigs.resetPassword),
  validateBody(confirmPasswordResetSchema),
  AuthController.resetPassword
);

router.post("/verify-email",
  rateLimit(rateLimitConfigs.emailVerification),
  validateBody(z.object({
    token: z.string().min(1, "Token de vérification requis"),
  })),
  AuthController.verifyEmail
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

// 📧 Email verification
router.post("/send-email-verification",
  rateLimit(rateLimitConfigs.sendEmailVerification),
  AuthController.sendEmailVerification
);

// 📊 Session & Security
router.get("/session", AuthController.getSession);
router.get("/security-metrics", AuthController.getSecurityMetrics);

export {router as authRoutes};
