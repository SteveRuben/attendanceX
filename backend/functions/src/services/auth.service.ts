import { FieldValue } from "firebase-admin/firestore";
import { UserModel } from "../models/user.model";
import {
  SecurityEvent,
  LoginRequest,
  LoginResponse,
  AuthSession,
  UserStatus,
  ERROR_CODES,
  VALIDATION_RULES,
  DEFAULT_RATE_LIMITS,
  CreateUserRequest,
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
const EMAIL_VERIFICATION_EXPIRES_HOURS = 24;
// const TWO_FACTOR_CODE_EXPIRES_MINUTES = 5;
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
  async healthCheck(): Promise<
    {
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

      // Test service email
      await notificationService.healthCheck();
      checks.email = true;

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
  ): Promise<LoginResponse> {
    try {
      // 1. Vérifier si l'email existe déjà
      const existingUser = await userService.getUserByEmail(registerData.email);
      if (existingUser) {
        throw new Error('Un compte avec cet email existe déjà');
      }

      const user = await userService.createUser(registerData, "system");
      if (registerData?.sendInvitation) {
        // @ts-ignore
        notificationService.sendEmailNotification(user?.invitation);
      }

      let request: LoginRequest = {
        email: registerData.email,
        password: registerData.password
      };
      // 4. Générer token de vérification
      return this.login(request, ipAddress, userAgent);

    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Inscription par email uniquement (invitation)
   *//*
 async registerByEmail(
   email: string, 
   organizationCode?: string, 
   ipAddress?: string
 ): Promise<RegisterByEmailResponse> {
   try {
     // 1. Vérifier si l'email existe
     const existingUser = await userService.getUserByEmail(email);
     if (existingUser) {
       throw new Error('Un compte avec cet email existe déjà');
     }
 
     // 2. Valider le code organisation si fourni
     if (organizationCode) {
       const isValidOrg = await this.validateOrganizationCode(organizationCode);
       if (!isValidOrg) {
         throw new Error('Code organisation invalide');
       }
     }
 
     // 3. Créer invitation
     const invitationId = generateInvitationToken();
     const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
 
     const invitation = {
       id: invitationId,
       email,
       organizationCode,
       status: 'pending',
       createdAt: new Date(),
       expiresAt,
       ipAddress
     };
 
     await this.storeInvitation(invitation);
 
     // 4. Envoyer email d'invitation
     await notificationService.sendRegistrationInvitation(email, invitationId);
 
     return {
       invitationId,
       email,
       expiresAt,
       message: 'Invitation envoyée'
     };
 
   } catch (error) {
     logger.error('Email registration error:', error);
     throw error;
   }
 }*/

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
    // - Notification aux admins
    // - Possible verrouillage temporaire
    // - Analyse de pattern suspects
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

  // backend/functions/src/services/auth.service.ts - PARTIE 2/3

  // 🔑 AUTHENTIFICATION PRINCIPALE
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
      // Authentification Firebase


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

      // Vérifications de sécurité
      await this.performSecurityChecks(user, request.password, ipAddress, userAgent);

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

      // Envoyer l'email (à implémenter avec le service de notification)
      // await this.notificationService.sendPasswordResetEmail(email, resetToken);

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
      // Log l'erreur mais retourner succès apparent
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

    // ✅ RÉCUPÉRER L'UTILISATEUR AVANT DE L'UTILISER
    const userDoc = await db.collection("users").doc(tokenData.userId).get();
    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // ✅ HASHER LE NOUVEAU MOT DE PASSE
    const newHashedPassword = await this.hashPassword(newPassword);

    // ✅ METTRE À JOUR L'UTILISATEUR
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
      const user = UserModel.fromFirestore(userDoc);
      if (!user || !user.isActive()) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Mettre à jour l'activité de la session
      await this.updateSessionActivity(decoded.sessionId);

      // Générer de nouveaux tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    // Invalider la session
    await db
      .collection("user_sessions")
      .doc(sessionId)
      .update({
        isActive: false,
        loggedOutAt: FieldValue.serverTimestamp(),
      });

    // Log de sécurité
    await this.logSecurityEvent({
      type: "logout",
      userId,
      ipAddress: "system",
      userAgent: "system",
      details: { sessionId },
      riskLevel: "low",
    });
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await this.invalidateAllUserSessions(userId);

    await this.logSecurityEvent({
      type: "logout",
      userId,
      ipAddress: "system",
      userAgent: "system",
      details: { allSessions: true },
      riskLevel: "low",
    });
  }

  private async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessionsQuery = await db
      .collection("user_sessions")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();

    if (!sessionsQuery.empty) {
      const batch = db.batch();
      sessionsQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isActive: false,
          loggedOutAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }
  }

  // 📧 VÉRIFICATION EMAIL
  async sendEmailVerification(userId: string): Promise<void> {
    const userDoc = await db.collection("users").doc(userId).get();
    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    if (user.getData().emailVerified) {
      throw new Error("Email already verified");
    }

    // Rate limiting
    const rateLimitKey = `email_verification_${userId}`;
    if (!await this.checkRateLimit(rateLimitKey, DEFAULT_RATE_LIMITS.EMAIL_VERIFICATION_PER_MINUTE, 60000)) {
      throw new Error(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    }

    // Générer le token de vérification
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(verificationToken).digest("hex");

    // Sauvegarder le token
    await db
      .collection("email_verification_tokens")
      .doc(hashedToken)
      .set({
        userId,
        token: hashedToken,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000),
        isUsed: false,
      });

    // Envoyer l'email (à implémenter avec le service de notification)
    // await this.notificationService.sendEmailVerification(user.getData().email, verificationToken);
  }

  async verifyEmail(token: string): Promise<void> {
    const hashedToken = createHash("sha256").update(token).digest("hex");

    const tokenDoc = await db
      .collection("email_verification_tokens")
      .doc(hashedToken)
      .get();

    if (!tokenDoc.exists) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    const tokenData = tokenDoc.data()!;

    if (tokenData.expiresAt < new Date() || tokenData.isUsed) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    // Marquer l'email comme vérifié
    const userDoc = await db.collection("users").doc(tokenData.userId).get();
    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    user.update({
      emailVerified: true,
      status: UserStatus.ACTIVE, // Activer le compte
    });

    await this.saveUser(user);

    // Marquer le token comme utilisé
    await db
      .collection("email_verification_tokens")
      .doc(hashedToken)
      .update({ isUsed: true });

    // Log de sécurité
    await this.logSecurityEvent({
      type: "email_verification",
      userId: tokenData.userId,
      ipAddress: "system",
      userAgent: "system",
      details: { verified: true },
      riskLevel: "low",
    });
  }

  // 🔍 VALIDATION ET AUTORISATION
  async validateSession(sessionId: string, userId: string): Promise<AuthSession> {
    const sessionDoc = await db
      .collection("user_sessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      throw new Error(ERROR_CODES.SESSION_EXPIRED);
    }

    const sessionData = sessionDoc.data() as SessionData;

    if (!sessionData.isActive || sessionData.userId !== userId) {
      throw new Error(ERROR_CODES.SESSION_EXPIRED);
    }

    // Vérifier la dernière activité (timeout de session)
    const lastActivity = sessionData.lastActivity.getTime();
    const now = Date.now();
    const sessionTimeout = DEFAULT_RATE_LIMITS.SESSION_TIMEOUT_MINUTES * 60 * 1000;

    if (now - lastActivity > sessionTimeout) {
      await db
        .collection("user_sessions")
        .doc(sessionId)
        .update({ isActive: false });

      throw new Error(ERROR_CODES.SESSION_EXPIRED);
    }

    // Récupérer l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();
    const user = UserModel.fromFirestore(userDoc);
    if (!user || !user.isActive()) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    // Mettre à jour l'activité
    await this.updateSessionActivity(sessionId);

    return {
      isAuthenticated: true,
      user: user.getData(),
      permissions: user.getData().permissions,
      sessionId,
      expiresAt: new Date(now + sessionTimeout),
    };
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userDoc = await db.collection("users").doc(userId).get();
    const user = UserModel.fromFirestore(userDoc);

    if (!user || !user.isActive()) {
      return false;
    }

    return user.canPerformAction(permission as any);
  }

  // 🗂️ GESTION DES UTILISATEURS
  async getCurrentUser(userId: string): Promise<UserModel | null> {
    const userDoc = await db.collection("users").doc(userId).get();
    return UserModel.fromFirestore(userDoc);
  }

  // 🛠️ UTILITAIRES PRIVÉS
  private async saveUser(user: UserModel): Promise<void> {
    await user.validate();
    await db
      .collection("users")
      .doc(user.id!)
      .set(user.toFirestore(), { merge: true });
  }

  // 🧹 MÉTHODES DE NETTOYAGE
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();

    // Nettoyer les tokens de réinitialisation expirés
    const expiredResetTokens = await db
      .collection("password_reset_tokens")
      .where("expiresAt", "<", now)
      .get();

    // Nettoyer les tokens de vérification expirés
    const expiredVerificationTokens = await db
      .collection("email_verification_tokens")
      .where("expiresAt", "<", now)
      .get();

    // Nettoyer les sessions inactives
    const inactiveSessions = await db
      .collection("user_sessions")
      .where("lastActivity", "<", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) // 7 jours
      .get();

    const batch = db.batch();

    expiredResetTokens.docs.forEach((doc) => batch.delete(doc.ref));
    expiredVerificationTokens.docs.forEach((doc) => batch.delete(doc.ref));
    inactiveSessions.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
  }

  // 📊 MÉTHODES D'ANALYSE
  async getSecurityMetrics(userId?: string): Promise<any> {
    const query = userId ?
      db.collection("security_events").where("userId", "==", userId) :
      db.collection("security_events");

    const events = await query
      .where("timestamp", ">", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .get();

    const eventsByType = events.docs.reduce((acc, doc) => {
      const event = doc.data() as SecurityEvent;
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsByRisk = events.docs.reduce((acc, doc) => {
      const event = doc.data() as SecurityEvent;
      acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: events.size,
      eventsByType,
      eventsByRisk,
      period: "30 days",
    };
  }

  private async getActiveSessionsCount(): Promise<number> {
    //const sessions = await this.redis.keys('session:*');
    return 10;//sessions.length;
  }

  private async getTodayLoginsCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const logins = await collections.auditLogs
      .where('action', '==', 'login')
      .where('date', '==', today)
      .get();
    return logins.size;
  }

  private async getPendingVerificationsCount(): Promise<number> {
    const pending = await collections.users
      .where('emailVerified', '==', false)
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
