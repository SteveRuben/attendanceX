import { collections } from '../../config/database';
import { EmailProviderFactory } from '../external/email-providers/EmailProviderFactory';
import { EmailProviderType } from '../../common/types';
import { ValidationError, NotFoundError } from '../../utils/common/errors';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface TenantEmailProvider {
  id: string;
  type: EmailProviderType;
  name: string;
  isActive: boolean;
  priority: number;
  config: any;
  createdAt: Date;
  updatedAt: Date;
  isGlobal?: boolean; // Indique si c'est une config globale (fallback)
}

export interface CreateEmailProviderRequest {
  type: EmailProviderType;
  name: string;
  isActive: boolean;
  priority: number;
  config: any;
}

export interface UpdateEmailProviderRequest {
  name?: string;
  isActive?: boolean;
  priority?: number;
  config?: any;
}

export interface TestEmailProviderResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface ProviderTypeInfo {
  type: EmailProviderType;
  name: string;
  description: string;
  configSchema: any;
}

export class EmailConfigService {

  /**
   * Récupérer tous les providers email d'un tenant (avec fallback global)
   */
  async getTenantEmailProviders(tenantId: string): Promise<TenantEmailProvider[]> {
    try {
      const providers: TenantEmailProvider[] = [];

      // 1. Récupérer les providers tenant-specific
      const tenantSnapshot = await collections.tenants
        .doc(tenantId)
        .collection('emailProviders')
        .orderBy('priority', 'asc')
        .get();

      const tenantProviders = tenantSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isGlobal: false
      })) as TenantEmailProvider[];

      providers.push(...tenantProviders);

      // 2. Récupérer les providers globaux pour les types non configurés
      const tenantTypes = new Set(tenantProviders.map(p => p.type));
      
      const globalSnapshot = await collections.emailProviders
        .where('isActive', '==', true)
        .orderBy('priority', 'asc')
        .get();

      const globalProviders = globalSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          isGlobal: true
        }))
        .filter(provider => !tenantTypes.has((provider as any).type as EmailProviderType)) as TenantEmailProvider[];

      providers.push(...globalProviders);

      // 3. Trier par priorité
      providers.sort((a, b) => a.priority - b.priority);

      logger.info('Retrieved email providers for tenant', { 
        tenantId, 
        tenantProviders: tenantProviders.length,
        globalProviders: globalProviders.length,
        total: providers.length
      });

      return providers;
    } catch (error) {
      logger.error('Error getting tenant email providers', { error, tenantId });
      throw error;
    }
  }

  /**
   * Créer une configuration email pour un tenant
   */
  async createTenantEmailProvider(
    tenantId: string, 
    providerData: CreateEmailProviderRequest
  ): Promise<TenantEmailProvider> {
    try {
      // Valider les données
      this.validateProviderData(providerData);

      // Vérifier qu'il n'y a pas déjà une config pour ce type
      const existingSnapshot = await collections.tenants
        .doc(tenantId)
        .collection('emailProviders')
        .where('type', '==', providerData.type)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        throw new ValidationError(`Une configuration ${providerData.type} existe déjà pour ce tenant`);
      }

      // Créer la configuration
      const configRef = collections.tenants
        .doc(tenantId)
        .collection('emailProviders')
        .doc();

      const configData = {
        ...providerData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await configRef.set(configData);

      // Invalider le cache
      EmailProviderFactory.reloadTenantProviders(tenantId);

      logger.info('Created email provider for tenant', { 
        tenantId, 
        providerId: configRef.id,
        type: providerData.type
      });

      return {
        id: configRef.id,
        ...providerData,
        createdAt: new Date(),
        updatedAt: new Date(),
        isGlobal: false
      };
    } catch (error) {
      logger.error('Error creating tenant email provider', { error, tenantId });
      throw error;
    }
  }

  /**
   * Mettre à jour une configuration email
   */
  async updateTenantEmailProvider(
    tenantId: string,
    providerId: string,
    updateData: UpdateEmailProviderRequest
  ): Promise<TenantEmailProvider> {
    try {
      const configRef = collections.tenants
        .doc(tenantId)
        .collection('emailProviders')
        .doc(providerId);

      const configDoc = await configRef.get();
      if (!configDoc.exists) {
        throw new NotFoundError('Configuration email non trouvée');
      }

      const currentData = configDoc.data() as TenantEmailProvider;

      // Valider les nouvelles données si le type change
      if (updateData.config) {
        this.validateProviderConfig(currentData.type, updateData.config);
      }

      const updatedData = {
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await configRef.update(updatedData);

      // Invalider le cache
      EmailProviderFactory.reloadTenantProviders(tenantId);

      logger.info('Updated email provider for tenant', { 
        tenantId, 
        providerId,
        type: currentData.type
      });

      return {
        ...currentData,
        ...updateData,
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error updating tenant email provider', { error, tenantId, providerId });
      throw error;
    }
  }

  /**
   * Supprimer une configuration email (retour au global)
   */
  async deleteTenantEmailProvider(tenantId: string, providerId: string): Promise<void> {
    try {
      const configRef = collections.tenants
        .doc(tenantId)
        .collection('emailProviders')
        .doc(providerId);

      const configDoc = await configRef.get();
      if (!configDoc.exists) {
        throw new NotFoundError('Configuration email non trouvée');
      }

      await configRef.delete();

      // Invalider le cache
      EmailProviderFactory.reloadTenantProviders(tenantId);

      logger.info('Deleted email provider for tenant', { tenantId, providerId });
    } catch (error) {
      logger.error('Error deleting tenant email provider', { error, tenantId, providerId });
      throw error;
    }
  }

  /**
   * Tester une configuration email
   */
  async testEmailProvider(
    tenantId: string,
    type: EmailProviderType,
    config: any,
    testEmail: string
  ): Promise<TestEmailProviderResult> {
    try {
      logger.info('Testing email provider', { tenantId, type, testEmail });

      // Utiliser la méthode publique pour créer le provider
      const tempProvider = await EmailProviderFactory.getProviderForTenant(type, null);

      // Tester la connexion
      const connectionTest = await tempProvider.testConnection();
      
      if (!connectionTest) {
        return {
          success: false,
          message: 'Échec du test de connexion'
        };
      }

      // Envoyer un email de test
      try {
        await tempProvider.sendEmail(
          testEmail,
          'Test de Configuration Email - AttendanceX',
          {
            html: `
              <h2>Test de Configuration Email</h2>
              <p>Ce message confirme que votre configuration email fonctionne correctement.</p>
              <p><strong>Tenant:</strong> ${tenantId}</p>
              <p><strong>Provider:</strong> ${type}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            `,
            text: `Test de Configuration Email - AttendanceX\n\nCe message confirme que votre configuration email fonctionne correctement.\n\nTenant: ${tenantId}\nProvider: ${type}\nDate: ${new Date().toLocaleString()}`
          },
          {
            to: testEmail,
            subject: 'Test de Configuration Email - AttendanceX',
            metadata: {
              userId: '',
              trackingId: `test-${Date.now()}`,
              priority: 1,
              timestamp: new Date()
            }
          }
        );

        return {
          success: true,
          message: 'Email de test envoyé avec succès'
        };
      } catch (emailError) {
        return {
          success: false,
          message: 'Erreur lors de l\'envoi de l\'email de test',
          details: emailError instanceof Error ? emailError.message : 'Erreur inconnue'
        };
      }
    } catch (error) {
      logger.error('Error testing email provider', { error, tenantId, type });
      return {
        success: false,
        message: 'Erreur lors du test de configuration',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupérer les types de providers disponibles avec leurs schémas
   */
  async getAvailableProviderTypes(): Promise<ProviderTypeInfo[]> {
    return [
      {
        type: EmailProviderType.SENDGRID,
        name: 'SendGrid',
        description: 'Service d\'email transactionnel de SendGrid',
        configSchema: {
          apiKey: { type: 'string', required: true, label: 'Clé API SendGrid' },
          fromEmail: { type: 'email', required: true, label: 'Email expéditeur' },
          fromName: { type: 'string', required: false, label: 'Nom expéditeur' },
          replyTo: { type: 'email', required: false, label: 'Email de réponse' }
        }
      },
      {
        type: EmailProviderType.MAILGUN,
        name: 'Mailgun',
        description: 'Service d\'email transactionnel de Mailgun',
        configSchema: {
          apiKey: { type: 'string', required: true, label: 'Clé API Mailgun' },
          domain: { type: 'string', required: true, label: 'Domaine Mailgun' },
          fromEmail: { type: 'email', required: true, label: 'Email expéditeur' },
          fromName: { type: 'string', required: false, label: 'Nom expéditeur' }
        }
      },
      {
        type: EmailProviderType.AWS_SES,
        name: 'AWS SES',
        description: 'Amazon Simple Email Service',
        configSchema: {
          accessKeyId: { type: 'string', required: true, label: 'Access Key ID' },
          secretAccessKey: { type: 'password', required: true, label: 'Secret Access Key' },
          region: { type: 'string', required: true, label: 'Région AWS' },
          fromEmail: { type: 'email', required: true, label: 'Email expéditeur' },
          fromName: { type: 'string', required: false, label: 'Nom expéditeur' }
        }
      },
      {
        type: EmailProviderType.SMTP,
        name: 'SMTP',
        description: 'Serveur SMTP personnalisé',
        configSchema: {
          host: { type: 'string', required: true, label: 'Serveur SMTP' },
          port: { type: 'number', required: true, label: 'Port', default: 587 },
          secure: { type: 'boolean', required: false, label: 'Connexion sécurisée (SSL)', default: false },
          auth: {
            type: 'object',
            required: true,
            label: 'Authentification',
            properties: {
              user: { type: 'string', required: true, label: 'Nom d\'utilisateur' },
              pass: { type: 'password', required: true, label: 'Mot de passe' }
            }
          },
          fromEmail: { type: 'email', required: true, label: 'Email expéditeur' },
          fromName: { type: 'string', required: false, label: 'Nom expéditeur' }
        }
      }
    ];
  }

  /**
   * Valider les données d'un provider
   */
  private validateProviderData(providerData: CreateEmailProviderRequest): void {
    if (!providerData.type) {
      throw new ValidationError('Le type de provider est requis');
    }

    if (!providerData.name?.trim()) {
      throw new ValidationError('Le nom du provider est requis');
    }

    if (typeof providerData.isActive !== 'boolean') {
      throw new ValidationError('Le statut actif doit être un booléen');
    }

    if (!Number.isInteger(providerData.priority) || providerData.priority < 1) {
      throw new ValidationError('La priorité doit être un entier positif');
    }

    if (!providerData.config) {
      throw new ValidationError('La configuration est requise');
    }

    this.validateProviderConfig(providerData.type, providerData.config);
  }

  /**
   * Valider la configuration spécifique d'un provider
   */
  private validateProviderConfig(type: EmailProviderType, config: any): void {
    switch (type) {
      case EmailProviderType.SENDGRID:
        if (!config.apiKey) throw new ValidationError('Clé API SendGrid requise');
        if (!config.fromEmail) throw new ValidationError('Email expéditeur requis');
        break;

      case EmailProviderType.MAILGUN:
        if (!config.apiKey) throw new ValidationError('Clé API Mailgun requise');
        if (!config.domain) throw new ValidationError('Domaine Mailgun requis');
        if (!config.fromEmail) throw new ValidationError('Email expéditeur requis');
        break;

      case EmailProviderType.AWS_SES:
        if (!config.accessKeyId) throw new ValidationError('Access Key ID requis');
        if (!config.secretAccessKey) throw new ValidationError('Secret Access Key requis');
        if (!config.region) throw new ValidationError('Région AWS requise');
        if (!config.fromEmail) throw new ValidationError('Email expéditeur requis');
        break;

      case EmailProviderType.SMTP:
        if (!config.host) throw new ValidationError('Serveur SMTP requis');
        if (!config.port) throw new ValidationError('Port SMTP requis');
        if (!config.auth?.user) throw new ValidationError('Nom d\'utilisateur SMTP requis');
        if (!config.auth?.pass) throw new ValidationError('Mot de passe SMTP requis');
        if (!config.fromEmail) throw new ValidationError('Email expéditeur requis');
        break;

      default:
        throw new ValidationError(`Type de provider non supporté: ${type}`);
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (config.fromEmail && !emailRegex.test(config.fromEmail)) {
      throw new ValidationError('Format d\'email expéditeur invalide');
    }

    if (config.replyTo && !emailRegex.test(config.replyTo)) {
      throw new ValidationError('Format d\'email de réponse invalide');
    }
  }
}

// Instance singleton
export const emailConfigService = new EmailConfigService();
export default emailConfigService;