import {Request, Response} from "express";
import {authService} from "../services/auth.service";
import {asyncHandler} from "../middleware/errorHandler";
import { CreateUserRequest, ERROR_CODES, UserRole } from "@attendance-x/shared";
import { EmailVerificationErrors } from "../utils/email-verification-errors";
import { EmailVerificationValidation } from "../utils/email-verification-validation";
import { logger } from "firebase-functions";
import { AuthErrorHandler } from "../utils/auth-error-handler";
import { extractClientIp } from "../utils/ip-utils";
import { AuthenticatedRequest } from "../types/middleware.types";

/**
 * Contrôleur d'authentification
 */
export class AuthController {

  /**
 * Inscription avec gestion intelligente des organisations
 */
static register = asyncHandler(async (req: Request, res: Response) => {
  const { 
      email,
      password,
      firstName,
      lastName
  } = req.body;
  
  const ipAddress = extractClientIp(req);
  const userAgent = req.get("User-Agent") || "";
  logger.info(`✅  création avec succès. Ip: ${ipAddress}`);
  // Déterminer le rôle de l'utilisateur selon l'organisation
  //const roleInfo = await organizationService.determineUserRole(organization);
  
  const registerRequest = {
      email,
      name: `${firstName} ${lastName}`,
      displayName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      role: UserRole.PARTICIPANT,
      sendInvitation: false,
      password,
      emailVerified: false
  } as CreateUserRequest;

  const result = await authService.register(registerRequest, ipAddress, userAgent);


  // Gérer la création d'organisation et l'assignation des rôles
  /*if (roleInfo.isFirstUser && result.success && result.data?.userId) {
    try {
     organizationService.createMinimalOrganization(organization, result.data.userId);
      logger.info(`✅ Organisation minimale "${organization}" créée avec succès. Premier utilisateur: ${result.data.userId}`);
    } catch (orgError) {
      // Log l'erreur mais ne pas faire échouer l'inscription
      logger.error('❌ Erreur lors de la création de l\'organisation minimale:', orgError);
    }
  } else if (roleInfo.organizationId) {
    // Incrémenter le compteur d'utilisateurs pour l'organisation existante
    try {
      await organizationService.incrementUserCount(roleInfo.organizationId);
      console.log(`✅ Utilisateur ajouté à l'organisation existante: ${roleInfo.organizationId}`);
    } catch (orgError) {
      console.error('❌ Erreur lors de l\'incrémentation du compteur d\'utilisateurs:', orgError);
    }
  }*/

  res.status(201).json(result);
});

/**
 * Inscription simple par email uniquement
 *//*
static registerByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, organizationCode } = req.body;
  const ipAddress = extractClientIp(req);

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
    const ipAddress = extractClientIp(req);
    const userAgent = req.get("User-Agent") || "";

    const loginRequest = {
      email,
      password,
      rememberMe,
      deviceInfo,
      twoFactorCode,
    };
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
    try {
      const { sessionId } = req.body;
      const userId = req.user.uid;
      const ipAddress = extractClientIp(req);
      const userAgent = req.get('User-Agent') || 'unknown';

      // Validate sessionId if provided
      if (sessionId && (typeof sessionId !== 'string' || sessionId.trim().length === 0)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, "SessionId invalide");
      }

      const targetSessionId = sessionId || req.user.sessionId;
      
      if (!targetSessionId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.BAD_REQUEST, "Aucune session à déconnecter");
      }

      await authService.logout(targetSessionId, userId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: "Déconnexion réussie",
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      
      // Handle specific error cases
      if (error.code === 'permission-denied') {
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Permission refusée pour cette session");
      }

      if (error.code === 'not-found') {
        // Session not found - but we handle this gracefully in the service
        return res.status(200).json({
          success: true,
          message: "Déconnexion réussie",
        });
      }

      // Database errors
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        return errorHandler.sendError(res, ERROR_CODES.DATABASE_ERROR, "Service temporairement indisponible, veuillez réessayer");
      }

      // Generic error handling
      logger.error("Logout error:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la déconnexion");
    }
  });

  /**
   * Déconnexion de toutes les sessions
   */
  static logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const ipAddress = extractClientIp(req);
      const userAgent = req.get('User-Agent') || 'unknown';

      const invalidatedCount = await authService.logoutAllSessions(userId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: `${invalidatedCount} session(s) fermée(s)`,
        data: {
          sessionsInvalidated: invalidatedCount
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      
      // Handle specific error cases
      if (error.code === 'permission-denied') {
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Permission refusée");
      }

      // Database errors
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        return errorHandler.sendError(res, ERROR_CODES.DATABASE_ERROR, "Service temporairement indisponible, veuillez réessayer");
      }

      // Generic error handling
      logger.error("Logout all sessions error:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la fermeture des sessions");
    }
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
    const ipAddress = extractClientIp(req);
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
    const ipAddress = extractClientIp(req);
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
   * Envoyer la vérification d'email (pour utilisateurs connectés)
   */
  static sendEmailVerification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const ipAddress = extractClientIp(req);
    const userAgent = req.get("User-Agent") || "";

    await authService.sendEmailVerification(userId, ipAddress, userAgent);

    const successResponse = EmailVerificationErrors.verificationEmailSentSuccess(req.user.email);
    return res.json(successResponse);
  });

  /**
   * Renvoyer la vérification d'email (pour utilisateurs non connectés)
   */
  static resendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const validation = EmailVerificationValidation.validateResendRequest(req.body);
    if (!validation.isValid) {
      throw EmailVerificationValidation.createValidationErrorResponse(validation.errors);
    }

    const { email } = req.body;
    const ipAddress = extractClientIp(req);
    const userAgent = req.get("User-Agent") || "";

    await authService.resendEmailVerification(email, ipAddress, userAgent);

    const successResponse = EmailVerificationErrors.verificationEmailSentSuccess(email, true);
    return res.json(successResponse);
  });

  /**
   * Vérifier l'email (POST - pour les requêtes API)
   */
  static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const validation = EmailVerificationValidation.validateVerifyRequest(req.body);
    if (!validation.isValid) {
      throw EmailVerificationValidation.createValidationErrorResponse(validation.errors);
    }

    const {token} = req.body;
    const ipAddress = extractClientIp(req);
    const userAgent = req.get("User-Agent") || "";

    // Vérifier l'email et récupérer les informations utilisateur
    const verificationResult = await authService.verifyEmailWithUserInfo(token, ipAddress, userAgent);

    const successResponse = EmailVerificationErrors.emailVerificationSuccess(verificationResult.email);
    return res.json(successResponse);
  });

  /**
   * Vérifier l'email via lien (GET - pour les liens dans les emails)
   */
  static verifyEmailFromLink = asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token de vérification manquant",
        error: "MISSING_TOKEN"
      });
    }

    try {
      const ipAddress = extractClientIp(req);
      const userAgent = req.get("User-Agent") || "";

      // Vérifier l'email et récupérer les informations utilisateur
      const verificationResult = await authService.verifyEmailWithUserInfo(token, ipAddress, userAgent);

      // Pour une requête GET, on peut soit retourner du HTML soit rediriger
      // Ici, on retourne une page HTML simple avec redirection automatique
      const htmlResponse = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Vérifié</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background-color: #f5f5f5; 
            }
            .container { 
              background: white; 
              padding: 40px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
              max-width: 500px; 
              margin: 0 auto; 
            }
            .success { color: #28a745; }
            .btn { 
              background: #007bff; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              display: inline-block; 
              margin-top: 20px; 
            }
            .countdown { color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">🎉 Email vérifié avec succès !</h1>
            <p>Votre compte <strong>${verificationResult.email}</strong> est maintenant activé.</p>
            <p>Vous allez être redirigé vers la page de connexion dans <span id="countdown">5</span> secondes.</p>
            <a href="/login" class="btn">Se connecter maintenant</a>
            <div class="countdown">
              <small>Si la redirection ne fonctionne pas, cliquez sur le bouton ci-dessus.</small>
            </div>
          </div>
          <script>
            let count = 5;
            const countdownElement = document.getElementById('countdown');
            const timer = setInterval(() => {
              count--;
              countdownElement.textContent = count;
              if (count <= 0) {
                clearInterval(timer);
                window.location.href = '/login';
              }
            }, 1000);
          </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlResponse);

    } catch (error) {
      // En cas d'erreur, afficher une page d'erreur
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erreur de Vérification</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background-color: #f5f5f5; 
            }
            .container { 
              background: white; 
              padding: 40px; 
              border-radius: 10px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
              max-width: 500px; 
              margin: 0 auto; 
            }
            .error { color: #dc3545; }
            .btn { 
              background: #007bff; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              display: inline-block; 
              margin-top: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">❌ Erreur de vérification</h1>
            <p>Le lien de vérification est invalide, expiré ou a déjà été utilisé.</p>
            <a href="/login" class="btn">Aller à la connexion</a>
            <br><br>
            <a href="/auth/resend-verification">Renvoyer un email de vérification</a>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(400).send(errorHtml);
    }
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

  /**
   * Vérifier le statut de configuration de l'organisation
   */
  static checkOrganizationSetup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    const setupStatus = await authService.checkOrganizationSetupStatus(userId);

    res.json({
      success: true,
      data: setupStatus,
    });
  });
}
