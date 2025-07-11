import {Request, Response} from "express";
import {authService} from "../services/auth.service";
import {asyncHandler} from "../middleware/errorHandler";
import {AuthenticatedRequest} from "../middleware/auth";
import { CreateUserRequest } from "@attendance-x/shared";

/**
 * Contrôleur d'authentification
 */
export class AuthController {

  /**
 * Inscription classique complète
 */
static register = asyncHandler(async (req: Request, res: Response) => {
  const { 
      email,
      displayName,
      firstName,
      lastName,
      phoneNumber,
      role,
      sendInvitation,
      password
  } = req.body;
  
  const ipAddress = req.ip;
  const userAgent = req.get("User-Agent") || "";

  const registerRequest = {
      email,
      displayName,
      firstName,
      lastName,
      phoneNumber,
      role,
      sendInvitation,
      password
  } as CreateUserRequest;
  // @ts-ignore
  const result = await authService.register(registerRequest, ipAddress, userAgent);

  res.status(201).json({
    success: true,
    message: "Inscription réussie. Email de vérification envoyé.",
    data: result,
  });
});

/**
 * Inscription simple par email uniquement
 *//*
static registerByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, organizationCode } = req.body;
  const ipAddress = req.ip;

  const result = await authService.registerByEmail(email, organizationCode, ipAddress);

  res.status(201).json({
    success: true,
    message: "Invitation envoyée. Consultez votre email pour finaliser l'inscription.",
    data: {
      email,
      invitationId: result.invitationId,
      expiresAt: result.expiresAt
    }
  });
});*/

  /**
   * Connexion utilisateur
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const {email, password, rememberMe, deviceInfo, twoFactorCode} = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get("User-Agent") || "";

    const loginRequest = {
      email,
      password,
      rememberMe,
      deviceInfo,
      twoFactorCode,
    };
    // @ts-ignore
    const result = await authService.login(loginRequest, ipAddress, userAgent);

    res.json({
      success: true,
      message: "Connexion réussie",
      data: result,
    });
  });

  /**
   * Déconnexion utilisateur
   */
  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {sessionId} = req.body;
    const userId = req.user.uid;

    await authService.logout(sessionId || req.user.sessionId, userId);

    res.json({
      success: true,
      message: "Déconnexion réussie",
    });
  });

  /**
   * Déconnexion de toutes les sessions
   */
  static logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    await authService.logoutAllSessions(userId);

    res.json({
      success: true,
      message: "Toutes les sessions ont été fermées",
    });
  });

  /**
   * Rafraîchir le token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const {refreshToken} = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: "Token rafraîchi",
      data: tokens,
    });
  });

  /**
   * Mot de passe oublié
   */
  static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const {email} = req.body;
    const ipAddress = req.ip;
    // @ts-ignore
    await authService.forgotPassword(email, ipAddress);

    res.json({
      success: true,
      message: "Si l'email existe, un lien de réinitialisation a été envoyé",
    });
  });

  /**
   * Réinitialiser le mot de passe
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const {token, newPassword} = req.body;
    const ipAddress = req.ip;
    // @ts-ignore
    await authService.resetPassword(token, newPassword, ipAddress);

    res.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès",
    });
  });

  /**
   * Changer le mot de passe
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {currentPassword, newPassword} = req.body;
    const userId = req.user.uid;

    await authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  });

  /**
   * Configurer l'authentification à deux facteurs
   */
  static setup2FA = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    const result = await authService.setup2FA(userId);

    res.json({
      success: true,
      message: "Configuration 2FA initiée",
      data: result,
    });
  });

  /**
   * Vérifier et activer la 2FA
   */
  static verify2FA = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {code} = req.body;
    const userId = req.user.uid;

    await authService.verify2FASetup(userId, code);

    res.json({
      success: true,
      message: "Authentification à deux facteurs activée",
    });
  });

  /**
   * Désactiver la 2FA
   */
  static disable2FA = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {password} = req.body;
    const userId = req.user.uid;

    await authService.disable2FA(userId, password);

    res.json({
      success: true,
      message: "Authentification à deux facteurs désactivée",
    });
  });

  /**
   * Envoyer la vérification d'email
   */
  static sendEmailVerification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    await authService.sendEmailVerification(userId);

    return res.json({
      success: true,
      message: "Email de vérification envoyé",
    });
  });

  /**
   * Vérifier l'email
   */
  static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const {token} = req.body;

    await authService.verifyEmail(token);

    return res.json({
      success: true,
      message: "Email vérifié avec succès",
    });
  });

  /**
   * Obtenir les informations de session
   */
  static getSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const sessionId = req.user.sessionId;

    if (!sessionId) {
      return res.json({
        success: true,
        data: {
          isAuthenticated: true,
          user: req.user,
          session: null,
        },
      });
    }

    const session = await authService.validateSession(sessionId, userId);

    return res.json({
      success: true,
      data: session,
    });
  });

  /**
   * Obtenir les métriques de sécurité
   */
  static getSecurityMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    const metrics = await authService.getSecurityMetrics(userId);

    return res.json({
      success: true,
      data: metrics,
    });
  });
}
