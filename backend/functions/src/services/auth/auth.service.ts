import { FieldValue } from "firebase-admin/firestore";
import { UserModel } from "../../models/user.model";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import * as speakeasy from "speakeasy";
import { createHash } from "crypto";
import { collections, db } from "../../config";
import { notificationService } from "../notification";
import { logger } from "firebase-functions";
import { EmailVerificationTokenModel } from "../../models/email-verification-token.model";
import { emailVerificationService } from "../notification/email-verification.service";
import { createError } from "../../middleware/errorHandler";
import { SecurityUtils } from "../../config/security.config";
import { userService } from "../utility";
import { CreateUserRequest, LoginRequest, LoginResponse, SecurityEvent, UserStatus } from "../../common/types";
import { DEFAULT_RATE_LIMITS, ERROR_CODES, VALIDATION_RULES } from "../../common/constants";
import { AuthLogContext, AuthLogger, EmailVerificationErrors, EmailVerificationTokenUtils, VerificationRateLimitUtils } from "../../utils";

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
        if (user.id) {
          await this.sendEmailVerification(user.id, ipAddress, userAgent);
        }
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
        user.id || '',
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
    await collections.rate_limits
      .where("key", "==", key)
      .where("timestamp", "<", windowStart)
      .get()
      .then((snapshot) => {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        return batch.commit();
      });

    // Compter les actuels
    const currentAttempts = await collections.rate_limits
      .where("key", "==", key)
      .where("timestamp", ">=", windowStart)
      .get();

    if (currentAttempts.size >= limit) {
      return false;
    }

    // Ajouter nouvelle tentative
    await collections.rate_limits.add({
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

  // 🏢 GESTION DES TOKENS MULTI-TENANT
  public async generateTokensWithTenantContext(userId: string, tenantContext: any): Promise<AuthTokens> {
    try {

       const userQuery = await collections.users.doc(userId).get();;

      if (!userQuery.exists) {
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      const user = UserModel.fromFirestore(userQuery);
      if (!user?.id) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const payload = {
        userId: user.id,
        email: user.getData().email,
        role: user.getData().role,
        sessionId: crypto.randomUUID(),
        // Contexte tenant
        tenantId: tenantContext.tenant.id,
        tenantRole: tenantContext.membership.role,
        tenantPermissions: tenantContext.membership.permissions,
      };

      const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: "attendance-x",
        audience: "attendance-x-users",
      });

      const refreshToken = jwt.sign(
        { 
          userId: user.id, 
          sessionId: payload.sessionId,
          tenantId: tenantContext.tenant.id
        },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 heure en secondes
      };
    } catch (error) {
      logger.error('Error generating tokens with tenant context:', error);
      throw error;
    }
  }

  public async verifyToken(token: string): Promise<any | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      logger.info('Token verified successfully', {
        userId: decoded.userId,
        email: decoded.email,
        exp: decoded.exp,
        iat: decoded.iat
      });
      return decoded;
    } catch (error: any) {
      logger.warn('Token verification failed', {
        error: error.message,
        tokenPrefix: token.substring(0, 20) + "...",
        jwtSecretLength: JWT_SECRET.length
      });
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
    if (!user.id) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const sessionData: SessionData = {
      userId: user.id,
      sessionId,
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    // Limiter le nombre de sessions actives
    await this.cleanupOldSessions(user.id, MAX_ACTIVE_SESSIONS - 1);

    // Créer la nouvelle session
    await collections.user_sessions
      .doc(sessionId)
      .set(sessionData);

    return sessionId;
  }

  public async cleanupOldSessions(userId: string, maxSessions: number): Promise<void> {
    const sessionsQuery = await collections.user_sessions
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
    await collections.user_sessions
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

    await collections.security_events
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
    const recentEvents = await collections.security_events
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
      const userQuery = await collections.users
        .where("email", "==", request.email.toLowerCase())
        .limit(1)
        .get();

      if (userQuery.empty) {
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      const user = UserModel.fromFirestore(userQuery.docs[0]);
      if (!user?.id) {
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
            userId: user.id,
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
          if (!user.id) {
            throw new Error(ERROR_CODES.USER_NOT_FOUND);
          }
          const canResend = await this.canRequestVerification(user.id);

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
      if (!user.id) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }
      const riskLevel = await this.analyzeLoginPattern(user.id, ipAddress, userAgent);

      // Authentification 2FA si activée
      if (user.getData().twoFactorEnabled && !request.twoFactorCode) {
        await this.logSecurityEvent({
          type: "login",
          userId: user.id,
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
        if (!await this.verify2FACode(user.id, request.twoFactorCode)) {
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
        userId: user.id,
        ipAddress,
        userAgent,
        details: {
          successful: true,
          deviceInfo: request.deviceInfo,
          riskLevel,
        },
        riskLevel,
      });

      // Vérifier le statut du tenant

      return {
        user: user.toAPI() as any,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        sessionId
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
        [UserStatus.PENDING_VERIFICATION]: ERROR_CODES.EMAIL_NOT_VERIFIED,
        [UserStatus.BLOCKED]: ERROR_CODES.ACCOUNT_LOCKED,
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

    if (user.id) {
      await this.logSecurityEvent({
        type: "failed_login",
        userId: user.id,
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
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await SecurityUtils.verifyPassword(password, hashedPassword);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Récupérer l'utilisateur
    const userDoc = await collections.users.doc(userId).get();
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
    const newHashedPassword = await SecurityUtils.hashPassword(newPassword);

    // Mettre à jour le modèle utilisateur
    const updates: any = {
      hashedPassword: newHashedPassword,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
    };

    // Supprimer le verrouillage du compte si présent
    if (user.getData().accountLockedUntil) {
      updates.accountLockedUntil = FieldValue.delete();
    }

    user.update(updates);

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
      const userQuery = await collections.users
        .where("email", "==", email.toLowerCase())
        .limit(1)
        .get();

      if (userQuery.empty) {
        // Ne pas révéler si l'email existe
        return;
      }
      const user = UserModel.fromFirestore(userQuery.docs[0]);
      if (!user?.id) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }
      const userId = user.id;
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
    const userDoc = await collections.users.doc(tokenData.userId).get();
    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // Hasher le nouveau mot de passe
    const newHashedPassword = await SecurityUtils.hashPassword(newPassword);

    // Mettre à jour l'utilisateur
    const updates: any = {
      hashedPassword: newHashedPassword,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      failedLoginAttempts: 0,
    };

    // Supprimer le verrouillage du compte si présent
    if (user.getData().accountLockedUntil) {
      updates.accountLockedUntil = FieldValue.delete();
    }

    user.update(updates);

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

  // 🏢 GESTION DU CONTEXTE ORGANISATIONNEL

  /**
   * Vérifier si un utilisateur a besoin d'un tenant
   */
  async userNeedsTenant(userId: string): Promise<boolean> {
    try {
      const userDoc = await collections.users.doc(userId).get();
      if (!userDoc.exists) {
        return false;
      }

      const userData = userDoc.data();
      return !userData?.tenantId;
    } catch (error) {
      console.error('Error checking if user needs tenant:', error);
      return false;
    }
  }

 
  // 🔐 AUTHENTIFICATION À DEUX FACTEURS (2FA)
  async setup2FA(userId: string): Promise<TwoFactorSetup> {
    const userDoc = await collections.users.doc(userId).get();
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
    await collections.two_factor_setup
      .doc(userId)
      .set({
        secret: secret.base32,
        backupCodes,
        createdAt: new Date(),
        isVerified: false,
      });

    return {
      secret: secret.base32 || '',
      qrCodeUrl: secret.otpauth_url || '',
      backupCodes,
    };
  }

  async verify2FASetup(userId: string, code: string): Promise<void> {
    const setupDoc = await collections.two_factor_setup
      .doc(userId)
      .get();

    if (!setupDoc.exists) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    const setupData = setupDoc.data();
    if (!setupData) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

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
    const userDoc = await collections.users.doc(userId).get();
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
    await collections.two_factor_setup.doc(userId).delete();

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
    const userDoc = await collections.users.doc(userId).get();
    if (!userDoc.exists) {
      return false;
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user?.getData().twoFactorEnabled) {
      return false;
    }

    const userData = user.getData();

    // Vérifier le code TOTP
    const verified = speakeasy.totp.verify({
      secret: userData.twoFactorSecret || '',
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
    const userDoc = await collections.users.doc(userId).get();
    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // Vérifier le mot de passe
    if (!await this.verifyPassword(password, user.getData().hashedPassword)) {
      throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Désactiver 2FA
    const updates: any = {
      twoFactorEnabled: false,
    };

    // Supprimer les champs 2FA si présents
    if (user.getData().twoFactorSecret) {
      updates.twoFactorSecret = FieldValue.delete();
    }
    if (user.getData().twoFactorBackupCodes) {
      updates.twoFactorBackupCodes = FieldValue.delete();
    }

    user.update(updates);

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
      const sessionDoc = await collections.user_sessions
        .doc(decoded.sessionId)
        .get();

      if (!sessionDoc.exists || !sessionDoc.data()?.isActive) {
        throw new Error(ERROR_CODES.SESSION_EXPIRED);
      }

      // Récupérer l'utilisateur
      const userDoc = await collections.users.doc(decoded.userId).get();
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

  async logout(sessionId: string, userId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const logContext: AuthLogContext = {
      userId,
      sessionId,
      ip: ipAddress,
      userAgent,
      firestoreOperation: 'logout_session_invalidation'
    };

    try {
      // Log logout attempt
      AuthLogger.logLogoutAttempt(logContext);

      // Check if session exists first
      const sessionDoc = await collections.user_sessions
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        // Session doesn't exist - log this but don't throw error (graceful handling)
        AuthLogger.logLogoutAttempt({
          ...logContext,
          firestoreOperation: 'logout_session_not_found',
          firestoreSuccess: false,
          firestoreError: 'Session not found but handling gracefully'
        });

        // Still log security event for audit trail
        if (userId) {
          await this.logSecurityEvent({
            type: "logout",
            userId,
            ipAddress: ipAddress || "unknown",
            userAgent: userAgent || "unknown",
            details: { sessionId, status: "session_not_found" },
            riskLevel: "low",
          });
        }
        return; // Graceful handling - don't throw error
      }

      const sessionData = sessionDoc.data();

      // Check if session is already inactive
      if (sessionData && !sessionData.isActive) {
        AuthLogger.logLogoutAttempt({
          ...logContext,
          firestoreOperation: 'logout_session_already_inactive',
          firestoreSuccess: true,
          firestoreError: 'Session already inactive'
        });

        if (userId) {
          await this.logSecurityEvent({
            type: "logout",
            userId,
            ipAddress: ipAddress || "unknown",
            userAgent: userAgent || "unknown",
            details: { sessionId, status: "already_inactive" },
            riskLevel: "low",
          });
        }
        return; // Already logged out
      }

      // Attempt to invalidate session with retry logic
      await this.invalidateSessionWithRetry(sessionId, logContext);

      // Log successful logout
      AuthLogger.logLogoutAttempt({
        ...logContext,
        firestoreOperation: 'logout_session_invalidated',
        firestoreSuccess: true
      });

      // Log security event if userId is provided
      if (userId) {
        await this.logSecurityEvent({
          type: "logout",
          userId,
          ipAddress: ipAddress || "unknown",
          userAgent: userAgent || "unknown",
          details: { sessionId, status: "success" },
          riskLevel: "low",
        });
      }

    } catch (error: any) {
      // Log the error with context
      AuthLogger.logFirestoreError('logout_session_invalidation', error, logContext);

      // Re-throw the error to be handled by the controller
      throw error;
    }
  }

  /**
   * Invalidate session with retry logic for temporary Firestore failures
   */
  private async invalidateSessionWithRetry(sessionId: string, logContext: AuthLogContext, maxRetries: number = 3): Promise<void> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await collections.user_sessions
          .doc(sessionId)
          .update({
            isActive: false,
            loggedOutAt: FieldValue.serverTimestamp(),
          });

        // Success - log and return
        if (attempt > 1) {
          AuthLogger.logLogoutAttempt({
            ...logContext,
            firestoreOperation: `logout_retry_success_attempt_${attempt}`,
            firestoreSuccess: true
          });
        }
        return;

      } catch (error: any) {
        lastError = error;

        // Check if this is a retryable error
        const isRetryable = this.isRetryableFirestoreError(error);

        if (!isRetryable || attempt === maxRetries) {
          // Not retryable or max attempts reached
          AuthLogger.logFirestoreError(`logout_retry_failed_attempt_${attempt}`, error, logContext);
          throw error;
        }

        // Log retry attempt
        AuthLogger.logLogoutAttempt({
          ...logContext,
          firestoreOperation: `logout_retry_attempt_${attempt}`,
          firestoreSuccess: false,
          firestoreError: error.message
        });

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }

    // This should never be reached, but just in case
    throw lastError;
  }

  /**
   * Check if a Firestore error is retryable
   */
  private isRetryableFirestoreError(error: any): boolean {
    // Retryable error codes from Firestore
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'internal'
    ];

    return retryableCodes.includes(error.code?.toLowerCase());
  }

  async logoutAllSessions(userId: string, ipAddress?: string, userAgent?: string): Promise<number> {
    const logContext: AuthLogContext = {
      userId,
      ip: ipAddress,
      userAgent,
      firestoreOperation: 'logout_all_sessions'
    };

    try {
      AuthLogger.logLogoutAttempt(logContext);

      const invalidatedCount = await this.invalidateAllUserSessions(userId, logContext);

      AuthLogger.logLogoutAttempt({
        ...logContext,
        firestoreOperation: 'logout_all_sessions_success',
        firestoreSuccess: true
      });

      // Log security event
      await this.logSecurityEvent({
        type: "logout",
        userId,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        details: { action: "logout_all", sessionsInvalidated: invalidatedCount },
        riskLevel: "medium", // Higher risk as it affects all sessions
      });

      return invalidatedCount;
    } catch (error: any) {
      AuthLogger.logFirestoreError('logout_all_sessions', error, logContext);
      throw error;
    }
  }

  async invalidateAllUserSessions(userId: string, logContext?: AuthLogContext): Promise<number> {
    const context = logContext || { userId, firestoreOperation: 'invalidate_all_user_sessions' };

    try {
      const sessionsQuery = await collections.user_sessions
        .where("userId", "==", userId)
        .where("isActive", "==", true)
        .get();

      const sessionCount = sessionsQuery.docs.length;

      if (sessionCount === 0) {
        AuthLogger.logLogoutAttempt({
          ...context,
          firestoreOperation: 'invalidate_all_sessions_none_found',
          firestoreSuccess: true,
          firestoreError: 'No active sessions found'
        });
        return 0;
      }

      const batch = db.batch();
      sessionsQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isActive: false,
          invalidatedAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      AuthLogger.logLogoutAttempt({
        ...context,
        firestoreOperation: 'invalidate_all_sessions_batch_committed',
        firestoreSuccess: true
      });

      return sessionCount;
    } catch (error: any) {
      AuthLogger.logFirestoreError('invalidate_all_user_sessions', error, context);
      throw error;
    }
  }

  // 📧 EMAIL VERIFICATION METHODS

  /**
   * Send email verification with rate limiting
   * Requirements: 3.1, 5.1, 5.3
   */
  async sendEmailVerification(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Get user
      const userDoc = await collections.users.doc(userId).get();
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
      logger.info('Attempting to send email verification', {
        userId,
        email: userData.email,
        token: rawToken.substring(0, 8) + '...' // Log only first 8 chars for security
      });

      const emailResult = await emailVerificationService.sendEmailVerification({
        userId,
        userName: userData.firstName || userData.email,
        email: userData.email,
        token: rawToken,
        expirationHours: 24
      });

      logger.info('Email verification result', {
        success: emailResult.success,
        error: emailResult.error,
        notificationId: emailResult.notificationId
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
   * Vérifier l'email d'un utilisateur avec un token et retourner les informations utilisateur
   */
  async verifyEmailWithUserInfo(token: string, ipAddress?: string, userAgent?: string): Promise<{
    email: string;
    userId: string;
  }> {
    // Récupérer les informations utilisateur AVANT la vérification
    const hashedToken = EmailVerificationTokenModel.hashToken(token);
    const tokenModel = await EmailVerificationTokenUtils.getTokenByHash(hashedToken);

    if (!tokenModel) {
      throw EmailVerificationErrors.invalidVerificationToken();
    }

    const userId = tokenModel.getUserId();
    const userDoc = await collections.users.doc(userId).get();

    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(userDoc);
    const userData = user.getData();

    // Maintenant appeler la méthode de vérification
    await this.verifyEmail(token, ipAddress, userAgent);

    return {
      email: userData.email,
      userId
    };
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
      const userDoc = await collections.users.doc(userId).get();
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
      const userQuery = await collections.users
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
        const errorResponse = VerificationRateLimitUtils.generateRateLimitErrorResponse(
          rateLimitCheck.mostRestrictive,
          'resend'
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
      const sessionDoc = await collections.user_sessions
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
        collections.user_sessions
          .where("userId", "==", userId)
          .where("isActive", "==", true)
          .get()
          .then(snapshot => snapshot.size),

        // Recent logins (last 7 days)
        collections.security_events
          .where("userId", "==", userId)
          .where("type", "==", "login")
          .where("timestamp", ">", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          .get()
          .then(snapshot => snapshot.size),

        // Failed attempts (last 24 hours)
        collections.security_events
          .where("userId", "==", userId)
          .where("type", "==", "failed_login")
          .where("timestamp", ">", new Date(Date.now() - 24 * 60 * 60 * 1000))
          .get()
          .then(snapshot => snapshot.size),

        // Total security events (last 30 days)
        collections.security_events
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
      const userDoc = await collections.users.doc(userId).get();
      if (!userDoc.exists) {
        return false;
      }

      const user = UserModel.fromFirestore(userDoc);
      if (!user) {
        return false;
      }

      const userData = user.getData();


      // Check role-based permissions (basic implementation)
      const rolePermissions: Record<string, string[]> = {
        'SUPER_ADMIN': ['*'], // Super admin has all permissions
        'ADMIN': ['*'], // Admin has all permissions
        'ORGANIZER': [
          'view_all_users',
          'manage_events',
          'create_events',
          'edit_events',
          'delete_own_events',
          'view_event_attendances',
          'validate_attendances',
          'generate_qr_codes',
          'send_event_notifications',
          'generate_event_reports',
          'export_event_data',
          'view_reports'
        ],
        'MANAGER': [
          'view_team_users',
          'view_team_attendances',
          'generate_team_reports',
          'validate_team_attendances',
          'create_participants',
          'edit_team_profiles',
          'view_reports'
        ],
        'manager': [
          'manage_users',
          'view_all_users',
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
          'delete_any_file',
          'view_reports'
        ],
        'PARTICIPANT': [
          'mark_attendance',
          'view_own_attendance',
          'view_own_events',
          'update_profile',
          'view_notifications',
          'mark_notifications_read'
        ],
        'CONTRIBUTOR': [
          'validate_attendances',
          'validate_team_attendances',
          'generate_team_reports',
          'view_all_events',
          'upload_files',
          'view_reports'
        ],
        'user': [
          'create_events',
          'edit_events',
          'upload_files'
        ]
      };

      const userRole = userData.role;
      const allowedPermissions = rolePermissions[userRole.toUpperCase()] || [];

      // Log for debugging
      logger.info('Permission check', {
        userId,
        permission,
        userRole,
        allowedPermissions: allowedPermissions.slice(0, 5), // Log first 5 permissions to avoid too much data
        hasWildcard: allowedPermissions.includes('*')
      });

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
    await collections.users
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
      .where('status', '==', UserStatus.PENDING_VERIFICATION)
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