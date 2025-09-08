import { 
  EncryptedTokens, 
  IntegrationError, 
  IntegrationErrorCode,
  IntegrationProvider,
  OAuthTokens
} from  '../../shared';
import { collections } from '../../config';
import { logger } from 'firebase-functions';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class TokenService {
  private static instance: TokenService;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly TAG_LENGTH = 16;

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Stocker les tokens OAuth de manière sécurisée
   */
  async storeTokens(
    integrationId: string,
    userId: string,
    provider: IntegrationProvider,
    tokens: OAuthTokens
  ): Promise<void> {
    try {
      // Générer une clé de chiffrement spécifique à l'utilisateur
      const encryptionKey = await this.generateUserEncryptionKey(userId);
      const keyId = await this.storeEncryptionKey(userId, encryptionKey);

      // Chiffrer les tokens
      const encryptedTokens: EncryptedTokens = {
        encryptedAccessToken: await this.encrypt(tokens.accessToken, encryptionKey),
        encryptedRefreshToken: await this.encrypt(tokens.refreshToken, encryptionKey),
        encryptedIdToken: tokens.idToken ? await this.encrypt(tokens.idToken, encryptionKey) : undefined,
        tokenType: tokens.tokenType,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        keyId
      };

      // Stocker les tokens chiffrés
      await collections.oauth_tokens.doc(integrationId).set({
        integrationId,
        userId,
        provider,
        ...encryptedTokens,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info('Tokens stored securely', {
        integrationId,
        userId,
        provider,
        expiresAt: tokens.expiresAt
      });

    } catch (error) {
      logger.error('Error storing tokens', { error, integrationId, userId, provider });
      throw this.createTokenError(
        IntegrationErrorCode.OAUTH_ERROR,
        'Failed to store OAuth tokens securely'
      );
    }
  }

  /**
   * Récupérer et déchiffrer les tokens OAuth
   */
  async getTokens(integrationId: string): Promise<OAuthTokens | null> {
    try {
      const doc = await collections.oauth_tokens.doc(integrationId).get();
      
      if (!doc.exists) {
        return null;
      }

      const encryptedData = doc.data() as EncryptedTokens & {
        integrationId: string;
        userId: string;
        provider: IntegrationProvider;
      };

      // Récupérer la clé de déchiffrement
      const encryptionKey = await this.getEncryptionKey(encryptedData.userId, encryptedData.keyId);
      if (!encryptionKey) {
        throw this.createTokenError(
          IntegrationErrorCode.OAUTH_ERROR,
          'Encryption key not found'
        );
      }

      // Déchiffrer les tokens
      const tokens: OAuthTokens = {
        accessToken: await this.decrypt(encryptedData.encryptedAccessToken, encryptionKey),
        refreshToken: await this.decrypt(encryptedData.encryptedRefreshToken, encryptionKey),
        idToken: encryptedData.encryptedIdToken 
          ? await this.decrypt(encryptedData.encryptedIdToken, encryptionKey) 
          : undefined,
        tokenType: encryptedData.tokenType,
        expiresAt: encryptedData.expiresAt,
        scope: encryptedData.scope
      };

      return tokens;

    } catch (error) {
      logger.error('Error getting tokens', { error, integrationId });
      throw this.createTokenError(
        IntegrationErrorCode.OAUTH_ERROR,
        'Failed to retrieve OAuth tokens'
      );
    }
  }

  /**
   * Mettre à jour les tokens OAuth
   */
  async updateTokens(integrationId: string, tokens: OAuthTokens): Promise<void> {
    try {
      // Récupérer les données existantes pour obtenir userId et keyId
      const doc = await collections.oauth_tokens.doc(integrationId).get();
      if (!doc.exists) {
        throw this.createTokenError(
          IntegrationErrorCode.OAUTH_ERROR,
          'Token record not found'
        );
      }

      const existingData = doc.data();
      const userId = existingData.userId;
      const keyId = existingData.keyId;

      // Récupérer la clé de chiffrement
      const encryptionKey = await this.getEncryptionKey(userId, keyId);
      if (!encryptionKey) {
        throw this.createTokenError(
          IntegrationErrorCode.OAUTH_ERROR,
          'Encryption key not found'
        );
      }

      // Chiffrer les nouveaux tokens
      const updates: any = {
        encryptedAccessToken: await this.encrypt(tokens.accessToken, encryptionKey),
        tokenType: tokens.tokenType,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        updatedAt: new Date()
      };

      // Mettre à jour le refresh token s'il est fourni
      if (tokens.refreshToken) {
        updates.encryptedRefreshToken = await this.encrypt(tokens.refreshToken, encryptionKey);
      }

      // Mettre à jour l'ID token s'il est fourni
      if (tokens.idToken) {
        updates.encryptedIdToken = await this.encrypt(tokens.idToken, encryptionKey);
      }

      await collections.oauth_tokens.doc(integrationId).update(updates);

      logger.info('Tokens updated successfully', {
        integrationId,
        expiresAt: tokens.expiresAt
      });

    } catch (error) {
      logger.error('Error updating tokens', { error, integrationId });
      throw this.createTokenError(
        IntegrationErrorCode.OAUTH_ERROR,
        'Failed to update OAuth tokens'
      );
    }
  }

  /**
   * Supprimer les tokens OAuth
   */
  async deleteTokens(integrationId: string): Promise<void> {
    try {
      await collections.oauth_tokens.doc(integrationId).delete();
      
      logger.info('Tokens deleted successfully', { integrationId });

    } catch (error) {
      logger.error('Error deleting tokens', { error, integrationId });
      throw this.createTokenError(
        IntegrationErrorCode.OAUTH_ERROR,
        'Failed to delete OAuth tokens'
      );
    }
  }

  /**
   * Vérifier si les tokens ont expiré
   */
  async areTokensExpired(integrationId: string): Promise<boolean> {
    try {
      const tokens = await this.getTokens(integrationId);
      if (!tokens) {
        return true;
      }

      // Considérer comme expiré si moins de 5 minutes restantes
      const bufferTime = 5 * 60 * 1000; // 5 minutes en millisecondes
      return tokens.expiresAt.getTime() - Date.now() < bufferTime;

    } catch (error) {
      logger.error('Error checking token expiration', { error, integrationId });
      return true; // Considérer comme expiré en cas d'erreur
    }
  }

  /**
   * Obtenir tous les tokens qui expirent bientôt
   */
  async getExpiringTokens(bufferMinutes: number = 30): Promise<string[]> {
    try {
      const bufferTime = new Date(Date.now() + bufferMinutes * 60 * 1000);
      
      const query = await collections.oauth_tokens
        .where('expiresAt', '<=', bufferTime)
        .get();

      return query.docs.map(doc => doc.id);

    } catch (error) {
      logger.error('Error getting expiring tokens', { error });
      return [];
    }
  }

  /**
   * Générer une clé de chiffrement spécifique à l'utilisateur
   */
  private async generateUserEncryptionKey(userId: string): Promise<Buffer> {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'default-master-key';
    const salt = Buffer.from(userId, 'utf8');
    
    return await scryptAsync(masterKey, salt, this.KEY_LENGTH) as Buffer;
  }

  /**
   * Stocker la clé de chiffrement
   */
  private async storeEncryptionKey(userId: string, key: Buffer): Promise<string> {
    const keyId = randomBytes(16).toString('hex');
    
    // En production, stocker dans un service de gestion de clés sécurisé
    // Pour l'instant, on utilise une approche simplifiée
    await collections.encryption_keys.doc(keyId).set({
      userId,
      keyHash: key.toString('base64'),
      createdAt: new Date()
    });

    return keyId;
  }

  /**
   * Récupérer la clé de chiffrement
   */
  private async getEncryptionKey(userId: string, keyId: string): Promise<Buffer | null> {
    try {
      const doc = await collections.encryption_keys.doc(keyId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (data.userId !== userId) {
        return null; // Sécurité : vérifier que la clé appartient à l'utilisateur
      }

      return Buffer.from(data.keyHash, 'base64');

    } catch (error) {
      logger.error('Error getting encryption key', { error, userId, keyId });
      return null;
    }
  }

  /**
   * Chiffrer une chaîne de caractères
   */
  private async encrypt(text: string, key: Buffer): Promise<string> {
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combiner IV, tag et données chiffrées
    const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
    return combined.toString('base64');
  }

  /**
   * Déchiffrer une chaîne de caractères
   */
  private async decrypt(encryptedData: string, key: Buffer): Promise<string> {
    const combined = Buffer.from(encryptedData, 'base64');
    
    const iv = combined.subarray(0, this.IV_LENGTH);
    const tag = combined.subarray(this.IV_LENGTH, this.IV_LENGTH + this.TAG_LENGTH);
    const encrypted = combined.subarray(this.IV_LENGTH + this.TAG_LENGTH);
    
    const decipher = createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Créer une erreur de token standardisée
   */
  private createTokenError(code: IntegrationErrorCode, message: string): IntegrationError {
    return {
      code,
      message,
      retryable: false
    };
  }
}

export const tokenService = TokenService.getInstance();