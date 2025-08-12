import {
  IntegrationProvider,
  OAuthTokens,
  ProviderConfig,
  ConnectIntegrationRequest,
  ConnectIntegrationResponse,
  CompleteOAuthRequest,
  IntegrationError,
  IntegrationErrorCode
} from '../../../../shared/src/types/integration.types';
import { logger } from 'firebase-functions';
import { randomBytes, createHash } from 'crypto';
import axios from 'axios';

export class OAuthService {
  private static instance: OAuthService;
  private providerConfigs: Map<IntegrationProvider, ProviderConfig> = new Map();

  public static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  constructor() {
    this.initializeProviderConfigs();
  }

  /**
   * Initialiser les configurations des providers
   */
  private initializeProviderConfigs(): void {
    // Configuration Google
    this.providerConfigs.set(IntegrationProvider.GOOGLE, {
      provider: IntegrationProvider.GOOGLE,
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      enabled: true
    });

    // Configuration Microsoft
    this.providerConfigs.set(IntegrationProvider.MICROSOFT, {
      provider: IntegrationProvider.MICROSOFT,
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || '',
      scopes: [
        'https://graph.microsoft.com/calendars.readwrite',
        'https://graph.microsoft.com/contacts.read',
        'https://graph.microsoft.com/user.read',
        'https://graph.microsoft.com/presence.read'
      ],
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      revokeUrl: 'https://graph.microsoft.com/v1.0/me/revokeSignInSessions',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      enabled: true
    });
  }

  /**
   * Initier le flux OAuth pour un provider
   */
  async initiateOAuth(request: ConnectIntegrationRequest): Promise<ConnectIntegrationResponse> {
    try {
      const config = this.providerConfigs.get(request.provider);
      if (!config || !config.enabled) {
        throw this.createOAuthError(
          IntegrationErrorCode.OAUTH_ERROR,
          `Provider ${request.provider} not supported or disabled`
        );
      }

      const state = this.generateState();
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);

      const scopes = request.scopes.length > 0 ? request.scopes : config.scopes;
      const redirectUri = request.redirectUri || config.redirectUri;

      const authParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        state: state,
        access_type: 'offline', // Pour obtenir un refresh token
        prompt: 'consent' // Forcer l'affichage du consentement
      });

      // Ajouter PKCE pour la sécurité
      if (request.provider === IntegrationProvider.GOOGLE) {
        authParams.append('code_challenge', codeChallenge);
        authParams.append('code_challenge_method', 'S256');
      }

      const authUrl = `${config.authUrl}?${authParams.toString()}`;

      // Stocker temporairement le code verifier et l'état
      await this.storeOAuthState(state, {
        provider: request.provider,
        codeVerifier,
        redirectUri,
        scopes
      });

      logger.info('OAuth flow initiated', {
        provider: request.provider,
        state,
        scopes
      });

      return {
        authUrl,
        state,
        codeVerifier
      };

    } catch (error) {
      logger.error('Error initiating OAuth', { error, provider: request.provider });
      throw error;
    }
  }

  /**
   * Compléter le flux OAuth avec le code d'autorisation
   */
  async completeOAuth(request: CompleteOAuthRequest): Promise<OAuthTokens> {
    try {
      const config = this.providerConfigs.get(request.provider);
      if (!config) {
        throw this.createOAuthError(
          IntegrationErrorCode.OAUTH_ERROR,
          `Provider ${request.provider} not supported`
        );
      }

      // Récupérer les données stockées temporairement
      const stateData = await this.getOAuthState(request.state);
      if (!stateData) {
        throw this.createOAuthError(
          IntegrationErrorCode.OAUTH_ERROR,
          'Invalid or expired OAuth state'
        );
      }

      const tokenParams: Record<string, string> = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: request.code,
        grant_type: 'authorization_code',
        redirect_uri: stateData.redirectUri
      };

      // Ajouter PKCE si nécessaire
      if (request.codeVerifier) {
        tokenParams.code_verifier = request.codeVerifier;
      }

      const response = await axios.post(config.tokenUrl, tokenParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const tokenData = response.data;

      if (!tokenData.access_token) {
        throw this.createOAuthError(
          IntegrationErrorCode.OAUTH_ERROR,
          'No access token received from provider'
        );
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const tokens: OAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt,
        scope: tokenData.scope || stateData.scopes.join(' '),
        idToken: tokenData.id_token
      };

      // Nettoyer l'état temporaire
      await this.cleanupOAuthState(request.state);

      logger.info('OAuth flow completed successfully', {
        provider: request.provider,
        scope: tokens.scope
      });

      return tokens;

    } catch (error) {
      logger.error('Error completing OAuth', { error, provider: request.provider });

      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw this.createOAuthError(
          IntegrationErrorCode.OAUTH_ERROR,
          errorData?.error_description || errorData?.error || 'OAuth token exchange failed'
        );
      }

      throw error;
    }
  }

  /**
   * Rafraîchir un token d'accès
   */
  async refreshToken(provider: IntegrationProvider, refreshToken: string): Promise<OAuthTokens> {
    try {
      const config = this.providerConfigs.get(provider);
      if (!config) {
        throw this.createOAuthError(
          IntegrationErrorCode.OAUTH_ERROR,
          `Provider ${provider} not supported`
        );
      }

      const tokenParams = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      };

      const response = await axios.post(config.tokenUrl, tokenParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      });

      const tokenData = response.data;

      if (!tokenData.access_token) {
        throw this.createOAuthError(
          IntegrationErrorCode.TOKEN_EXPIRED,
          'Failed to refresh access token'
        );
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      const tokens: OAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Certains providers ne renvoient pas un nouveau refresh token
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt,
        scope: tokenData.scope,
        idToken: tokenData.id_token
      };

      logger.info('Token refreshed successfully', { provider });

      return tokens;

    } catch (error) {
      logger.error('Error refreshing token', { error, provider });

      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw this.createOAuthError(
          IntegrationErrorCode.TOKEN_EXPIRED,
          errorData?.error_description || errorData?.error || 'Token refresh failed'
        );
      }

      throw error;
    }
  }

  /**
   * Révoquer un token d'accès
   */
  async revokeToken(provider: IntegrationProvider, token: string): Promise<void> {
    try {
      const config = this.providerConfigs.get(provider);
      if (!config || !config.revokeUrl) {
        logger.warn('Token revocation not supported for provider', { provider });
        return;
      }

      await axios.post(config.revokeUrl, { token }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      logger.info('Token revoked successfully', { provider });

    } catch (error) {
      logger.error('Error revoking token', { error, provider });
      // Ne pas faire échouer si la révocation échoue
    }
  }

  /**
   * Obtenir les informations utilisateur depuis le provider
   */
  async getUserInfo(provider: IntegrationProvider, accessToken: string): Promise<any> {
    try {
      const config = this.providerConfigs.get(provider);
      if (!config || !config.userInfoUrl) {
        throw this.createOAuthError(
          IntegrationErrorCode.OAUTH_ERROR,
          `User info not available for provider ${provider}`
        );
      }

      const response = await axios.get(config.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      return response.data;

    } catch (error) {
      logger.error('Error getting user info', { error, provider });
      throw this.createOAuthError(
        IntegrationErrorCode.OAUTH_ERROR,
        'Failed to get user information from provider'
      );
    }
  }

  /**
   * Générer un état aléatoire pour OAuth
   */
  private generateState(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Générer un code verifier pour PKCE
   */
  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Générer un code challenge pour PKCE
   */
  private generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Stocker temporairement l'état OAuth
   */
  private async storeOAuthState(state: string, data: any): Promise<void> {
    // Stocker dans Redis ou une base de données temporaire
    // Pour l'instant, on utilise Firestore avec TTL
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await require('../config').collections.oauth_states.doc(state).set({
      ...data,
      expiresAt
    });
  }

  /**
   * Récupérer l'état OAuth stocké
   */
  private async getOAuthState(state: string): Promise<any> {
    const doc = await require('../config').collections.oauth_states.doc(state).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();

    // Vérifier l'expiration
    if (data.expiresAt.toDate() < new Date()) {
      await this.cleanupOAuthState(state);
      return null;
    }

    return data;
  }

  /**
   * Nettoyer l'état OAuth temporaire
   */
  private async cleanupOAuthState(state: string): Promise<void> {
    await require('../config').collections.oauth_states.doc(state).delete();
  }

  /**
   * Créer une erreur OAuth standardisée
   */
  private createOAuthError(code: IntegrationErrorCode, message: string): IntegrationError {
    return {
      code,
      message,
      retryable: false
    };
  }

  /**
   * Obtenir la configuration d'un provider
   */
  getProviderConfig(provider: IntegrationProvider): ProviderConfig | undefined {
    return this.providerConfigs.get(provider);
  }

  /**
   * Vérifier si un provider est supporté et activé
   */
  isProviderEnabled(provider: IntegrationProvider): boolean {
    const config = this.providerConfigs.get(provider);
    return config?.enabled || false;
  }
}

export const oauthService = OAuthService.getInstance();