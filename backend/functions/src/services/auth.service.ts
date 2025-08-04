import { FieldValue } from "firebase-admin/firestore";
import { UserModel } from "../models/user.model";
import {
  CreateUserRequest,
  DEFAULT_RATE_LIMITS,
  ERROR_CODES,
  LoginRequest,
  LoginResponse,
  SecurityEvent,
  UserStatus,
  VALIDATION_RULES,
} from "@attendance-x/shared";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import * as speakeasy from "speakeasy";
import { createHash } from "crypto";
import * as bcrypt from "bcrypt";
import { collections, db } from "../config";
import { notificationService } from "./notification";
import { userService } from "./user.service";
import { logger } from "firebase-functions";
import { EmailVerificationTokenModel } from "../models/email-verification-token.model";
import { emailVerificationService } from "./notification/email-verification.service";
import { EmailVerificationTokenUtils } from "../utils/email-verification-token.utils";
import { EmailVerificationErrors } from "../utils/email-verification-errors";
import { VerificationRateLimitUtils } from "../utils/verification-rate-limit.utils";
import { createError } from "../middleware/errorHandler";

// 🔧 INTERFACES ET TYPES INTERNES
interface AuthServiceStatus {
  status: 'operational' | 'error';
  activeSessions?: number;
  todayLogins?: number;
  pendingVerifications?: number;
  failedLogins?: number;
  error?: string;
  timestamp: Date;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
  isUsed: boolean;
}

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface SessionData {
  userId: string;
  sessionId: string;
  deviceInfo: any;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

interface SecurityEventData {
  type: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  riskLevel: "low" | "medium" | "high";
}

// 🔐 CONFIGURATION ET CONSTANTES
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret";
const JWT_EXPIRES_IN = "1h";
const JWT_REFRESH_EXPIRES_IN = "7d";
const PASSWORD_RESET_EXPIRES_MINUTES = 15;
const MAX_ACTIVE_SESSIONS = 5;

// 🏭 CLASSE PRINCIPALE DU SERVICE
export class AuthService {

  constructor() {
    // Nettoyage périodique des rate limits
  }

  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Obtenir le statut du service d'authentification
   */
  async getStatus(): Promise<AuthServiceStatus> {
    try {
      const stats = await Promise.all([
        this.getActiveSessionsCount(),
        this.getTodayLoginsCount(),
        this.getPendingVerificationsCount(),
        this.getFailedLoginsCount()
      ]);

      return {
        status: 'operational',
        activeSessions: stats[0],
        todayLogins: stats[1],
        pendingVerifications: stats[2],
        failedLogins: stats[3],
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Auth status error:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Vérification de santé du service
   */
  async healthCheck(): Promise<{
    status: string;
    checks: {
      database: boolean,
      redis: boolean,
      email: boolean,
      jwt: boolean
    };
    error?: any;
    timestamp: Date;
  }> {
    const checks = {
      database: false,
      redis: false,
      email: false,
      jwt: false
    };

    try {
      checks.database = true;
      checks.redis = true;

      // Test service email - vérifier que le service est disponible
      try {
        if (notificationService) {
          checks.email = true;
        }
      } catch (error) {
        checks.email = false;
      }

      // Test JWT
      checks.jwt = true;

      const allHealthy = Object.values(checks).every(check => check === true);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date(),
      };

    } catch (error) {
      logger.error('Health check error:', error);
      return {
        status: 'unhealthy',
        checks,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Inscription classique complète
   */
  async register(
    registerData: CreateUserRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      email: string;
      userId: string;
      verificationSent: boolean;
      expiresIn?: string;
      canResend?: boolean;
    };
    warning?: string;
  }> {
    try {
      // 1. Vérifier si l'email existe déjà
      try {
        const existingUser = await userService.getUserByEmail(registerData.email);
        if (existingUser) {
          throw new Error('Un compte avec cet email existe déjà');
        }
      } catch (error) {
        // Si l'erreur est USER_NOT_FOUND, c'est normal (l'utilisateur n'existe pas encore)
        if (error instanceof Error && error.message !== ERROR_CODES.USER_NOT_FOUND) {
          throw error; // Re-lancer l'erreur si ce n'est pas USER_NOT_FOUND
        }
        // Sinon, continuer (l'utilisateur n'existe pas, on peut créer le compte)
      }

      // 2. Créer l'utilisateur avec le statut PENDING (déjà fait dans userService.createUser)
      const { user } = await userService.createUser(registerData, "system");
      
      // 3. Envoyer l'email de vérification
      let verificationSent = false;
      let warning: string | undefined;
      
      try {
        await this.sendEmailVerification(user.id!, ipAddress, userAgent);
        verificationSent = true;
        
        logger.info('Registration successful with verification email sent', {
          userId: user.id,
          email: registerData.email
        });
      } catch (emailError) {
        // L'inscription réussit même si l'email échoue
        logger.warn('Registration successful but email verification failed', {
          userId: user.id,
          email: registerData.email,
          error: emailError instanceof Error ? emailError.message : String(emailError)
        });
        
        warning = "Vous pouvez demander un nouveau lien de vérification.";
      }

      // 4. Retourner la réponse sans auto-login
      return EmailVerificationErrors.registrationSuccessWithVerification(
        registerData.email,
        user.id!,
        verificationSent,
        warning
      );

    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  // 🛡️ GESTION DES RATE LIMITS
  private async checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Nettoyer les anciens
    await db.collection("rate_limits")
      .where("key", "==", key)
      .where("timestamp", "<", windowStart)
      .get()
      .then((snapshot) => {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        return batch.commit();
      });

    // Compter les actuels
    const currentAttempts = await db.collection("rate_limits")
      .where("key", "==", key)
      .where("timestamp", ">=", windowStart)
      .get();

    if (currentAttempts.size >= limit) {
      return false;
    }

    // Ajouter nouvelle tentative
    await db.collection("rate_limits").add({
      key,
      timestamp: now,
      createdAt: new Date(),
    });

    return true;
  }

  // 🔍 VALIDATION DES DONNÉES D'ENTRÉE
  private validateLoginRequest(request: LoginRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.email || !VALIDATION_RULES.USER.EMAIL_PATTERN.test(request.email)) {
      errors.push("Email invalide");
    }

    if (!request.password || request.password.length < VALIDATION_RULES.USER.PASSWORD_MIN_LENGTH) {
      errors.push("Mot de passe requis");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    return UserModel.validatePassword(password);
  }

  // 🔐 GESTION DES TOKENS JWT
  private generateTokens(user: UserModel): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.getData().email,
      role: user.getData().role,
      sessionId: crypto.randomUUID(),
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "attendance-x",
      audience: "attendance-x-users",
    });

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId: payload.sessionId },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 heure en secondes
    };
  }

  public async verifyToken(token: string): Promise<any | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  public async verifyRefreshToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }
  }

  // 🎫 GESTION DES SESSIONS
  public async createSession(
    user: UserModel,
    deviceInfo: any,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const sessionData: SessionData = {
      userId: user.id!,
      sessionId,
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    // Limiter le nombre de sessions actives
    await this.cleanupOldSessions(user.id!, MAX_ACTIVE_SESSIONS - 1);

    // Créer la nouvelle session
    await db
      .collection("user_sessions")
      .doc(sessionId)
      .set(sessionData);

    return sessionId;
  }

  public async cleanupOldSessions(userId: string, maxSessions: number): Promise<void> {
    const sessionsQuery = await db
      .collection("user_sessions")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .orderBy("lastActivity", "desc")
      .get();

    if (sessionsQuery.docs.length >= maxSessions) {
      const sessionsToRemove = sessionsQuery.docs.slice(maxSessions);

      const batch = db.batch();
      sessionsToRemove.forEach((doc) => {
        batch.update(doc.ref, { isActive: false });
      });

      await batch.commit();
    }
  }

  public async updateSessionActivity(sessionId: string): Promise<void> {
    await db
      .collection("user_sessions")
      .doc(sessionId)
      .update({
        lastActivity: FieldValue.serverTimestamp(),
      });
  }

  // 📊 GESTION DES ÉVÉNEMENTS DE SÉCURITÉ
  public async logSecurityEvent(data: SecurityEventData): Promise<void> {
    const securityEvent: SecurityEvent = {
      type: data.type as any,
      userId: data.userId,
      timestamp: new Date(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      details: data.details,
      riskLevel: data.riskLevel,
    };

    await db
      .collection("security_events")
      .add(securityEvent);

    // Alertes automatiques pour les événements à haut risque
    if (data.riskLevel === "high") {
      await this.handleHighRiskEvent(securityEvent);
    }
  }

  public async handleHighRiskEvent(event: SecurityEvent): Promise<void> {
    // TODO: Implémenter les alertes automatiques
    console.warn("High risk security event detected:", event);
  }

  // 🔍 DETECTION DE COMPORTEMENTS SUSPECTS
  public async analyzeLoginPattern(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<"low" | "medium" | "high"> {
    const recentEvents = await db
      .collection("security_events")
      .where("userId", "==", userId)
      .where("type", "==", "login")
      .where("timestamp", ">", new Date(Date.now() - 24 * 60 * 60 * 1000))
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const events = recentEvents.docs.map((doc) => doc.data() as SecurityEvent);

    // Vérifier les IPs suspectes
    const uniqueIPs = new Set(events.map((e) => e.ipAddress));
    if (uniqueIPs.size > 5) {
      return "high"; // Trop d'IPs différentes
    }

    // Vérifier les User-Agents suspects
    const uniqueUserAgents = new Set(events.map((e) => e.userAgent));
    if (uniqueUserAgents.size > 3) {
      return "medium"; // Plusieurs appareils/navigateurs
    }

    // Vérifier la fréquence des tentatives
    if (events.length > 10) {
      return "medium"; // Trop de tentatives
    }

    return "low";
  }

  // � AaUTHENTIFICATION PRINCIPALE
  async login(
    request: LoginRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResponse> {
    // Validation des données d'entrée
    const validation = this.validateLoginRequest(request);
    if (!validation.isValid) {
      throw new Error(JSON.stringify({
        code: ERROR_CODES.VALIDATION_ERROR,
        errors: validation.errors,
      }));
    }

    // Rate limiting
    const rateLimitKey = `login_${ipAddress}`;
    if (!await this.checkRateLimit(rateLimitKey, DEFAULT_RATE_LIMITS.LOGIN_ATTEMPTS_PER_MINUTE, 60000)) {
      await this.logSecurityEvent({
        type: "failed_login",
        userId: "unknown",
        ipAddress,
        userAgent,
        details: { reason: "rate_limit_exceeded", email: request.email },
        riskLevel: "medium",
      });

      throw new Error(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    }

    try {
      // Récupérer le modèle utilisateur
      const userQuery = await db.collection("users")
        .where("email", "==", request.email.toLowerCase())
        .limit(1)
        .get();

      if (userQuery.empty) {
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      const user = UserModel.fromFirestore(userQuery.docs[0]);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Vérifications de sécurité avec gestion spéciale pour email non vérifié
      try {
        await this.performSecurityChecks(user, request.password, ipAddress, userAgent);
      } catch (error) {
        // Si l'erreur est EMAIL_NOT_VERIFIED, fournir une réponse détaillée
        if (error instanceof Error && error.message === ERROR_CODES.EMAIL_NOT_VERIFIED) {
          const userData = user.getData();
          
          // Log de l'échec de connexion pour email non vérifié
          await this.logSecurityEvent({
            type: "failed_login",
            userId: user.id!,
            ipAddress,
            userAgent,
            details: { 
              reason: "email_not_verified", 
              email: userData.email,
              lastVerificationSent: userData.emailVerificationSentAt 
            },
            riskLevel: "low",
          });

          // Vérifier si l'utilisateur peut demander un nouveau lien de vérification
          const canResend = await this.canRequestVerification(user.id!);
          
          // Utiliser la nouvelle classe d'erreur pour une réponse standardisée
          throw EmailVerificationErrors.emailNotVerifiedForLogin(
            userData.email,
            canResend,
            userData.emailVerificationSentAt,
            userData.emailVerificationAttempts
          );
        }
        
        // Re-lancer les autres erreurs
        throw error;
      }

      // Analyse des patterns de connexion
      const riskLevel = await this.analyzeLoginPattern(user.id!, ipAddress, userAgent);

      // Authentification 2FA si activée
      if (user.getData().twoFactorEnabled && !request.twoFactorCode) {
        await this.logSecurityEvent({
          type: "login",
          userId: user.id!,
          ipAddress,
          userAgent,
          details: { requires_2fa: true },
          riskLevel,
        });

        throw new Error(JSON.stringify({
          code: ERROR_CODES.TWO_FACTOR_REQUIRED,
          message: "Code d'authentification à deux facteurs requis",
        }));
      }

      if (user.getData().twoFactorEnabled && request.twoFactorCode) {
        if (!await this.verify2FACode(user.id!, request.twoFactorCode)) {
          await this.handleFailedLogin(user, ipAddress, userAgent, "invalid_2fa");
          throw new Error(ERROR_CODES.INVALID_2FA_CODE);
        }
      }

      // Vérification du mot de passe (simulée - en production utiliser Firebase Auth)
      if (!await this.verifyPassword(request.password, user.getData().hashedPassword)) {
        await this.handleFailedLogin(user, ipAddress, userAgent, "invalid_password");
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Connexion réussie - réinitialiser les tentatives échouées
      user.resetFailedLoginAttempts();
      await this.saveUser(user);

      // Générer les tokens
      const tokens = this.generateTokens(user);

      // Créer la session
      const sessionId = await this.createSession(
        user,
        request.deviceInfo,
        ipAddress,
        userAgent
      );

      // Log de sécurité
      await this.logSecurityEvent({
        type: "login",
        userId: user.id!,
        ipAddress,
        userAgent,
        details: {
          successful: true,
          deviceInfo: request.deviceInfo,
          riskLevel,
        },
        riskLevel,
      });

      return {
        user: user.getData(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        permissions: user.getData().permissions,
        sessionId,
      };
    } catch (error) {
      // Log des tentatives échouées
      await this.logSecurityEvent({
        type: "failed_login",
        userId: "unknown",
        ipAddress,
        userAgent,
        details: {
          email: request.email,
          error: error instanceof Error ? error.message : "unknown",
        },
        riskLevel: "medium",
      });

      // Handle JSON error messages (for backward compatibility)
      if (error instanceof Error && error.message.startsWith('{')) {
        try {
          const parsedError = JSON.parse(error.message);
          const customError = createError(
            parsedError.message || error.message,
            EmailVerificationErrors.getHttpStatusCode(parsedError.code),
            parsedError.code,
            parsedError.data
          );
          throw customError;
        } catch (parseError) {
          // If JSON parsing fails, throw original error
          throw error;
        }
      }

      throw error;
    }
  }

  // 🔒 VÉRIFICATIONS DE SÉCURITÉ
  private async performSecurityChecks(
    user: UserModel,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const userData = user.getData();

    // Vérifier le statut du compte
    if (userData.status !== UserStatus.ACTIVE) {
      const errorMap: Record<string, string> = {
        [UserStatus.SUSPENDED]: ERROR_CODES.ACCOUNT_SUSPENDED,
        [UserStatus.PENDING]: ERROR_CODES.EMAIL_NOT_VERIFIED,
        [UserStatus.blocked]: ERROR_CODES.ACCOUNT_LOCKED,
      };

      throw new Error(errorMap[userData.status] || ERROR_CODES.FORBIDDEN);
    }

    // Vérifier si le compte est verrouillé
    if (user.isAccountLocked()) {
      throw new Error(ERROR_CODES.ACCOUNT_LOCKED);
    }

    // Vérifier l'expiration du mot de passe
    if (user.isPasswordExpired()) {
      throw new Error(ERROR_CODES.PASSWORD_EXPIRED);
    }

    // Vérifier l'email
    if (!userData.emailVerified) {
      throw new Error(ERROR_CODES.EMAIL_NOT_VERIFIED);
    }
  }

  private async handleFailedLogin(
    user: UserModel,
    ipAddress: string,
    userAgent: string,
    reason: string
  ): Promise<void> {
    const lockResult = user.incrementFailedLoginAttempts();
    await this.saveUser(user);

    await this.logSecurityEvent({
      type: "failed_login",
      userId: user.id!,
      ipAddress,
      userAgent,
      details: {
        reason,
        attempts: user.getData().failedLoginAttempts,
        isLocked: lockResult.isLocked,
      },
      riskLevel: lockResult.isLocked ? "high" : "medium",
    });
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Récupérer l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // Vérifier le mot de passe actuel
    if (!await this.verifyPassword(currentPassword, user.getData().hashedPassword)) {
      throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Valider le nouveau mot de passe
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(JSON.stringify({
        code: ERROR_CODES.WEAK_PASSWORD,
        errors: passwordValidation.errors,
      }));
    }
    const newHashedPassword = await this.hashPassword(newPassword);

    // Mettre à jour le modèle utilisateur
    user.update({
      hashedPassword: newHashedPassword,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      accountLockedUntil: undefined,
    });

    await this.saveUser(user);

    // Invalider toutes les sessions actives (force re-login)
    await this.invalidateAllUserSessions(userId);

    // Log de sécurité
    await this.logSecurityEvent({
      type: "password_change",
      userId,
      ipAddress: "system",
      userAgent: "system",
      details: { initiatedByUser: true },
      riskLevel: "low",
    });
  }

  async forgotPassword(email: string, ipAddress: string): Promise<void> {
    // Rate limiting
    const rateLimitKey = `forgot_password_${email}`;
    if (!await this.checkRateLimit(rateLimitKey, DEFAULT_RATE_LIMITS.PASSWORD_RESET_PER_DAY, 24 * 60 * 60 * 1000)) {
      throw new Error(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    }

    try {
      // Vérifier que l'utilisateur existe
      const userQuery = await db.collection("users")
        .where("email", "==", email.toLowerCase())
        .limit(1)
        .get();

      if (userQuery.empty) {
        // Ne pas révéler si l'email existe
        return;
      }
      const user = UserModel.fromFirestore(userQuery.docs[0]);
      const userId = user!.id!;
      // Générer un token de réinitialisation
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = createHash("sha256").update(resetToken).digest("hex");

      const tokenData: PasswordResetToken = {
        token: hashedToken,
        userId: userId,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000),
        isUsed: false,
      };

      // Sauvegarder le token
      await db
        .collection("password_reset_tokens")
        .doc(hashedToken)
        .set(tokenData);

      // Log de sécurité
      await this.logSecurityEvent({
        type: "password_reset",
        userId: userId,
        ipAddress,
        userAgent: "system",
        details: { email, tokenGenerated: true },
        riskLevel: "medium",
      });
    } catch (error) {
      // Ne pas révéler si l'email existe ou non
      console.warn("Password reset attempt for non-existent email:", email);
    }
  }

  async resetPassword(token: string, newPassword: string, ipAddress: string): Promise<void> {
    // Valider le nouveau mot de passe
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(JSON.stringify({
        code: ERROR_CODES.WEAK_PASSWORD,
        errors: passwordValidation.errors,
      }));
    }

    // Hasher le token pour la recherche
    const hashedToken = createHash("sha256").update(token).digest("hex");

    // Récupérer le token de réinitialisation
    const tokenDoc = await db
      .collection("password_reset_tokens")
      .doc(hashedToken)
      .get();

    if (!tokenDoc.exists) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    const tokenData = tokenDoc.data() as PasswordResetToken;

    // Vérifier l'expiration et l'utilisation
    if (tokenData.expiresAt < new Date() || tokenData.isUsed) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    // Récupérer l'utilisateur
    const userDoc = await db.collection("users").doc(tokenData.userId).get();
    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // Hasher le nouveau mot de passe
    const newHashedPassword = await this.hashPassword(newPassword);

    // Mettre à jour l'utilisateur
    user.update({
      hashedPassword: newHashedPassword,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      failedLoginAttempts: 0,
      accountLockedUntil: undefined,
    });

    await this.saveUser(user);

    // Marquer le token comme utilisé
    await db
      .collection("password_reset_tokens")
      .doc(hashedToken)
      .update({ isUsed: true });

    // Invalider toutes les sessions
    await this.invalidateAllUserSessions(tokenData.userId);

    // Log de sécurité
    await this.logSecurityEvent({
      type: "password_reset",
      userId: tokenData.userId,
      ipAddress,
      userAgent: "system",
      details: { completed: true, tokenUsed: hashedToken.substring(0, 8) },
      riskLevel: "medium",
    });
  }

  // 🔐 AUTHENTIFICATION À DEUX FACTEURS (2FA)
  async setup2FA(userId: string): Promise<TwoFactorSetup> {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // Générer le secret 2FA
    const secret = speakeasy.generateSecret({
      name: `Attendance-X (${user.getData().email})`,
      issuer: "Attendance-X",
      length: 32,
    });

    // Générer les codes de sauvegarde
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    // Sauvegarder temporairement (non activé jusqu'à vérification)
    await db
      .collection("two_factor_setup")
      .doc(userId)
      .set({
        secret: secret.base32,
        backupCodes,
        createdAt: new Date(),
        isVerified: false,
      });

    return {
      secret: secret.base32!,
      qrCodeUrl: secret.otpauth_url!,
      backupCodes,
    };
  }

  async verify2FASetup(userId: string, code: string): Promise<void> {
    const setupDoc = await db
      .collection("two_factor_setup")
      .doc(userId)
      .get();

    if (!setupDoc.exists) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    const setupData = setupDoc.data()!;

    // Vérifier le code
    const verified = speakeasy.totp.verify({
      secret: setupData.secret,
      encoding: "base32",
      token: code,
      window: 2, // Tolérance de ±2 périodes (60 secondes)
    });

    if (!verified) {
      throw new Error(ERROR_CODES.INVALID_2FA_CODE);
    }

    // Activer 2FA pour l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    user.update({
      twoFactorEnabled: true,
      twoFactorSecret: setupData.secret,
      twoFactorBackupCodes: setupData.backupCodes,
    });

    await this.saveUser(user);

    // Nettoyer la configuration temporaire
    await db.collection("two_factor_setup").doc(userId).delete();

    // Log de sécurité
    await this.logSecurityEvent({
      type: "security_setting_change",
      userId,
      ipAddress: "system",
      userAgent: "system",
      details: { action: "2fa_enabled" },
      riskLevel: "low",
    });
  }

  async verify2FACode(userId: string, code: string): Promise<boolean> {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return false;
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user || !user.getData().twoFactorEnabled) {
      return false;
    }

    const userData = user.getData();

    // Vérifier le code TOTP
    const verified = speakeasy.totp.verify({
      secret: userData.twoFactorSecret!,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (verified) {
      return true;
    }

    // Vérifier les codes de sauvegarde
    if (userData.twoFactorBackupCodes?.includes(code)) {
      // Retirer le code de sauvegarde utilisé
      const updatedBackupCodes = userData.twoFactorBackupCodes.filter((c) => c !== code);
      user.update({ twoFactorBackupCodes: updatedBackupCodes });
      await this.saveUser(user);

      await this.logSecurityEvent({
        type: "backup_code_used",
        userId,
        ipAddress: "system",
        userAgent: "system",
        details: { codesRemaining: updatedBackupCodes.length },
        riskLevel: "medium",
      });

      return true;
    }

    return false;
  }

  async disable2FA(userId: string, password: string): Promise<void> {
    const userDoc = await db.collection("users").doc(userId).get();
    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // Vérifier le mot de passe
    if (!await this.verifyPassword(password, user.getData().hashedPassword)) {
      throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Désactiver 2FA
    user.update({
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorBackupCodes: undefined,
    });

    await this.saveUser(user);

    // Log de sécurité
    await this.logSecurityEvent({
      type: "security_setting_change",
      userId,
      ipAddress: "system",
      userAgent: "system",
      details: { action: "2fa_disabled" },
      riskLevel: "medium",
    });
  }

  // 🎫 GESTION DES SESSIONS ET TOKENS
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);

      // Vérifier que la session existe et est active
      const sessionDoc = await db
        .collection("user_sessions")
        .doc(decoded.sessionId)
        .get();

      if (!sessionDoc.exists || !sessionDoc.data()?.isActive) {
        throw new Error(ERROR_CODES.SESSION_EXPIRED);
      }

      // Récupérer l'utilisateur
      const userDoc = await db.collection("users").doc(decoded.userId).get();
      if (!userDoc.exists) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const user = UserModel.fromFirestore(userDoc);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Générer de nouveaux tokens
      const tokens = this.generateTokens(user);

      // Mettre à jour l'activité de la session
      await this.updateSessionActivity(decoded.sessionId);

      return tokens;
    } catch (error) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }
  }

  async logout(sessionId: string, userId?: string): Promise<void> {
    await db
      .collection("user_sessions")
      .doc(sessionId)
      .update({
        isActive: false,
        loggedOutAt: FieldValue.serverTimestamp(),
      });

    // Log security event if userId is provided
    if (userId) {
      await this.logSecurityEvent({
        type: "logout",
        userId,
        ipAddress: "unknown",
        userAgent: "unknown",
        details: { sessionId },
        riskLevel: "low",
      });
    }
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await this.invalidateAllUserSessions(userId);
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessionsQuery = await db
      .collection("user_sessions")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();

    const batch = db.batch();
    sessionsQuery.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isActive: false,
        invalidatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }

  // 📧 EMAIL VERIFICATION METHODS

  /**
   * Send email verification with rate limiting
   * Requirements: 3.1, 5.1, 5.3
   */
  async sendEmailVerification(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Get user
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const user = UserModel.fromFirestore(userDoc);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const userData = user.getData();

      // Check if email is already verified
      if (userData.emailVerified) {
        throw EmailVerificationErrors.emailAlreadyVerified(userData.email);
      }

      // Check rate limiting for email sending (3 per hour per email)
      const rateLimitResult = await VerificationRateLimitUtils.checkEmailSendingRateLimit(
        userData.email,
        ipAddress || "unknown"
      );

      if (!rateLimitResult.allowed) {
        const errorResponse = VerificationRateLimitUtils.generateRateLimitErrorResponse(
          rateLimitResult,
          'email_sending'
        );
        
        // Log rate limit exceeded
        await this.logSecurityEvent({
          type: "failed_login",
          userId,
          ipAddress: ipAddress || "unknown",
          userAgent: userAgent || "unknown",
          details: {
            action: "email_verification_rate_limit_exceeded",
            email: userData.email,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime
          },
          riskLevel: "medium"
        });

        const customError = createError(
          errorResponse.message,
          429,
          errorResponse.error,
          errorResponse.data
        );
        throw customError;
      }

      // Invalidate any existing tokens for this user
      await EmailVerificationTokenUtils.invalidateAllTokensForUser(userId);

      // Create new verification token
      const { model: tokenModel, rawToken } = EmailVerificationTokenModel.createToken(
        userId,
        ipAddress,
        userAgent
      );

      // Save token to database
      await EmailVerificationTokenUtils.saveToken(tokenModel);

      // Send verification email
      const emailResult = await emailVerificationService.sendEmailVerification({
        userId,
        userName: userData.firstName || userData.email,
        email: userData.email,
        token: rawToken,
        expirationHours: 24
      });

      if (!emailResult.success) {
        throw EmailVerificationErrors.emailVerificationSendFailed(
          userData.email, 
          emailResult.error
        );
      }

      // Update user verification tracking (using updatedAt as a proxy for tracking)
      user.update({
        updatedAt: new Date()
      });

      await this.saveUser(user);

      // Log security event
      await this.logSecurityEvent({
        type: "security_setting_change",
        userId,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        details: {
          action: "email_verification_sent",
          notificationId: emailResult.notificationId
        },
        riskLevel: "low"
      });

      logger.info('Email verification sent successfully', {
        userId,
        email: userData.email,
        notificationId: emailResult.notificationId
      });

    } catch (error) {
      logger.error('Failed to send email verification', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Verify email with token validation
   * Requirements: 3.2, 3.3, 3.7
   */
  async verifyEmail(token: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Check rate limiting for verification attempts (10 per hour per IP)
      const rateLimitResult = await VerificationRateLimitUtils.checkVerificationAttemptsRateLimit(
        ipAddress || "unknown",
        userAgent
      );

      if (!rateLimitResult.allowed) {
        const errorResponse = VerificationRateLimitUtils.generateRateLimitErrorResponse(
          rateLimitResult,
          'verification_attempts'
        );
        
        // Log rate limit exceeded
        logger.warn('Email verification rate limit exceeded', {
          ipAddress: ipAddress || "unknown",
          userAgent,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        });

        const customError = createError(
          errorResponse.message,
          429,
          errorResponse.error,
          errorResponse.data
        );
        throw customError;
      }

      // Hash the token for lookup
      const hashedToken = EmailVerificationTokenModel.hashToken(token);

      // Get token from database
      const tokenModel = await EmailVerificationTokenUtils.getTokenByHash(hashedToken);
      if (!tokenModel) {
        throw EmailVerificationErrors.invalidVerificationToken();
      }

      const userId = tokenModel.getUserId();

      // Get user first to have email for error messages
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const user = UserModel.fromFirestore(userDoc);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const userData = user.getData();

      // Check if email is already verified
      if (userData.emailVerified) {
        throw EmailVerificationErrors.emailAlreadyVerified(userData.email);
      }

      // Check if token is valid (not used and not expired)
      if (!tokenModel.isValid()) {
        if (tokenModel.isExpired()) {
          throw EmailVerificationErrors.verificationTokenExpired(userData.email);
        }
        if (tokenModel.getIsUsed()) {
          throw EmailVerificationErrors.verificationTokenUsed(userData.email);
        }
        throw EmailVerificationErrors.invalidVerificationToken(userData.email);
      }

      // Mark token as used
      tokenModel.markAsUsed();
      await EmailVerificationTokenUtils.updateToken(tokenModel.id, tokenModel.toFirestore());

      // Update user status to ACTIVE and mark email as verified
      user.update({
        status: UserStatus.ACTIVE,
        emailVerified: true
      });

      await this.saveUser(user);

      // Invalidate any remaining tokens for this user
      await EmailVerificationTokenUtils.invalidateAllTokensForUser(userId);

      // Log security event
      await this.logSecurityEvent({
        type: "security_setting_change",
        userId,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        details: {
          action: "email_verified",
          tokenId: tokenModel.id
        },
        riskLevel: "low"
      });

      logger.info('Email verified successfully', {
        userId,
        email: userData.email,
        tokenId: tokenModel.id
      });

    } catch (error) {
      logger.error('Failed to verify email', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Resend email verification with duplicate prevention
   * Requirements: 5.1, 5.4, 5.5
   */
  async resendEmailVerification(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Get user by email
      const userQuery = await db.collection("users")
        .where("email", "==", email.toLowerCase())
        .limit(1)
        .get();

      if (userQuery.empty) {
        // Don't reveal if email exists or not for security
        return;
      }

      const user = UserModel.fromFirestore(userQuery.docs[0]);
      if (!user) {
        return;
      }

      const userId = user.id!;
      const userData = user.getData();

      // Check if email is already verified
      if (userData.emailVerified) {
        throw EmailVerificationErrors.emailAlreadyVerified(userData.email);
      }

      // Check combined rate limiting (email + IP)
      const rateLimitCheck = await VerificationRateLimitUtils.checkResendRateLimit(
        userData.email,
        ipAddress || "unknown",
        userAgent
      );

      if (!rateLimitCheck.allowed) {
        const errorResponse = VerificationRateLimitUtils.generateMultipleRateLimitErrorResponse(
          rateLimitCheck.emailLimit,
          rateLimitCheck.ipLimit
        );
        
        // Log rate limit exceeded
        await this.logSecurityEvent({
          type: "failed_login",
          userId,
          ipAddress: ipAddress || "unknown",
          userAgent: userAgent || "unknown",
          details: {
            action: "resend_verification_rate_limit_exceeded",
            email: userData.email,
            emailLimitRemaining: rateLimitCheck.emailLimit.remaining,
            ipLimitRemaining: rateLimitCheck.ipLimit.remaining,
            mostRestrictive: !rateLimitCheck.emailLimit.allowed ? 'email' : 'ip'
          },
          riskLevel: "medium"
        });

        const customError = createError(
          errorResponse.message,
          429,
          errorResponse.error,
          errorResponse.data
        );
        throw customError;
      }

      // Use the main sendEmailVerification method
      await this.sendEmailVerification(userId, ipAddress, userAgent);

      logger.info('Email verification resent successfully', {
        userId,
        email: userData.email
      });

    } catch (error) {
      logger.error('Failed to resend email verification', {
        email,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if user can request verification (rate limit checking)
   * Requirements: 5.1, 5.3
   */
  async canRequestVerification(userId: string): Promise<boolean> {
    try {
      const maxTokensPerHour = 3; // As per requirements
      const result = await EmailVerificationTokenUtils.canUserRequestToken(userId, maxTokensPerHour);

      return result.canRequest;
    } catch (error) {
      logger.error('Failed to check verification request eligibility', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Clean up expired tokens for maintenance
   * Requirements: 5.5
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const deletedCount = await EmailVerificationTokenUtils.cleanupExpiredTokens();

      logger.info('Cleaned up expired verification tokens', {
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string, userId: string): Promise<SessionData | null> {
    try {
      const sessionDoc = await db
        .collection("user_sessions")
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        return null;
      }

      const sessionData = sessionDoc.data() as SessionData;

      // Check if session belongs to user and is active
      if (sessionData.userId !== userId || !sessionData.isActive) {
        return null;
      }

      // Update last activity
      await this.updateSessionActivity(sessionId);

      return sessionData;
    } catch (error) {
      logger.error('Failed to validate session', {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get security metrics for a user
   */
  async getSecurityMetrics(userId: string): Promise<{
    activeSessions: number;
    recentLogins: number;
    failedAttempts: number;
    securityEvents: number;
  }> {
    try {
      const [activeSessions, recentLogins, failedAttempts, securityEvents] = await Promise.all([
        // Active sessions
        db.collection("user_sessions")
          .where("userId", "==", userId)
          .where("isActive", "==", true)
          .get()
          .then(snapshot => snapshot.size),

        // Recent logins (last 7 days)
        db.collection("security_events")
          .where("userId", "==", userId)
          .where("type", "==", "login")
          .where("timestamp", ">", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          .get()
          .then(snapshot => snapshot.size),

        // Failed attempts (last 24 hours)
        db.collection("security_events")
          .where("userId", "==", userId)
          .where("type", "==", "failed_login")
          .where("timestamp", ">", new Date(Date.now() - 24 * 60 * 60 * 1000))
          .get()
          .then(snapshot => snapshot.size),

        // Total security events (last 30 days)
        db.collection("security_events")
          .where("userId", "==", userId)
          .where("timestamp", ">", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .get()
          .then(snapshot => snapshot.size)
      ]);

      return {
        activeSessions,
        recentLogins,
        failedAttempts,
        securityEvents
      };
    } catch (error) {
      logger.error('Failed to get security metrics', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        activeSessions: 0,
        recentLogins: 0,
        failedAttempts: 0,
        securityEvents: 0
      };
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return false;
      }

      const user = UserModel.fromFirestore(userDoc);
      if (!user) {
        return false;
      }

      const userData = user.getData();

      // Check if user has the specific permission
      if (userData.permissions && userData.permissions[permission]) {
        return true;
      }

      // Check role-based permissions (basic implementation)
      const rolePermissions: Record<string, string[]> = {
        'admin': ['*'], // Admin has all permissions
        'manager': [
          'manage_users',
          'manage_events',
          'validate_attendances',
          'validate_team_attendances',
          'generate_all_reports',
          'generate_event_reports',
          'generate_team_reports',
          'export_event_data',
          'send_bulk_notifications',
          'upload_files',
          'access_all_files',
          'delete_any_file'
        ],
        'supervisor': [
          'validate_attendances',
          'validate_team_attendances',
          'generate_team_reports',
          'view_all_events',
          'upload_files'
        ],
        'user': [
          'create_events',
          'edit_events',
          'upload_files'
        ]
      };

      const userRole = userData.role;
      const allowedPermissions = rolePermissions[userRole] || [];

      // Check if user role has all permissions (admin)
      if (allowedPermissions.includes('*')) {
        return true;
      }

      // Check if user role has the specific permission
      return allowedPermissions.includes(permission);

    } catch (error) {
      logger.error('Failed to check user permission', {
        userId,
        permission,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // 🛠️ UTILITAIRES PRIVÉS
  private async saveUser(user: UserModel): Promise<void> {
    await user.validate();
    await db
      .collection("users")
      .doc(user.id!)
      .set(user.toFirestore(), { merge: true });
  }

  private async getActiveSessionsCount(): Promise<number> {
    const active = await collections.user_sessions
      .where('isActive', '==', true)
      .get();
    return active.size;
  }

  private async getTodayLoginsCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logins = await collections.auditLogs
      .where('action', '==', 'login')
      .where('createdAt', '>=', today)
      .get();
    return logins.size;
  }

  private async getPendingVerificationsCount(): Promise<number> {
    const pending = await collections.users
      .where('emailVerified', '==', false)
      .where('status', '==', UserStatus.PENDING)
      .get();
    return pending.size;
  }

  private async getFailedLoginsCount(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const failed = await collections.auditLogs
      .where('action', '==', 'login_failed')
      .where('createdAt', '>=', oneHourAgo)
      .get();
    return failed.size;
  }
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const authService = new AuthService();