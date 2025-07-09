import {Router} from "express";
import {AuthController} from "../controllers/auth.controller";
import {authenticate, requirePermission} from "../middleware/auth";
import {validate, validateBody} from "../middleware/validation";
import {rateLimit} from "../middleware/rateLimit";
import {z} from "zod";
import {
  loginSchema,
  registerSchema,
  passwordResetSchema,
  confirmPasswordResetSchema,
  changePasswordSchema,
  twoFactorSchema,
} from "@attendance-x/shared";

const router = Router();

// 🔐 Routes publiques avec rate limiting renforcé
router.post("/login",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true,
  }),
  validateBody(loginSchema),
  AuthController.login
);

router.post("/register",
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: 3,
  }),
  validateBody(registerSchema),
  AuthController.register
);

router.post("/refresh-token",
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),
  validateBody(z.object({
    refreshToken: z.string().min(1, "Token de rafraîchissement requis"),
  })),
  AuthController.refreshToken
);

router.post("/forgot-password",
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    maxRequests: 3,
  }),
  validateBody(passwordResetSchema),
  AuthController.forgotPassword
);

router.post("/reset-password",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
  }),
  validateBody(confirmPasswordResetSchema),
  AuthController.resetPassword
);

router.post("/verify-email",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  }),
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
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3,
  }),
  AuthController.sendEmailVerification
);

// 📊 Session & Security
router.get("/session", AuthController.getSession);
router.get("/security-metrics", AuthController.getSecurityMetrics);

export {router as authRoutes};
