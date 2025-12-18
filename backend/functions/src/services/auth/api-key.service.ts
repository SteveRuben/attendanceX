import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { collections, db } from '../../config/database';

export interface ApiKey {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  key: string;
  keyHash: string; // Hash de la clé pour la vérification
  scopes: string[];
  isActive: boolean;
  lastUsed?: Timestamp;
  usageCount: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expiresInDays?: number;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  metadata?: Record<string, any>;
}

export interface UpdateApiKeyRequest {
  name?: string;
  scopes?: string[];
  isActive?: boolean;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  metadata?: Record<string, any>;
}

export interface ApiKeyUsage {
  keyId: string;
  timestamp: Timestamp;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ipAddress?: string;
}

class ApiKeyService {
  private readonly collection = collections.apiKeys;
  private readonly usageCollection = collections.apiKeyUsage;

  /**
   * Générer une nouvelle clé API
   */
  private generateApiKey(): string {
    const prefix = 'atx';
    const randomPart = randomBytes(32).toString('hex');
    return `${prefix}_${randomPart}`;
  }

  /**
   * Hasher une clé API pour le stockage sécurisé
   */
  private hashApiKey(key: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Créer une nouvelle clé API
   */
  async createApiKey(
    tenantId: string,
    userId: string,
    request: CreateApiKeyRequest
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const plainKey = this.generateApiKey();
    const keyHash = this.hashApiKey(plainKey);
    const now = Timestamp.now();

    // Calculer la date d'expiration si spécifiée
    let expiresAt: Timestamp | undefined;
    if (request.expiresInDays && request.expiresInDays > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + request.expiresInDays);
      expiresAt = Timestamp.fromDate(expirationDate);
    }

    const apiKey: Omit<ApiKey, 'id'> = {
      tenantId,
      userId,
      name: request.name,
      key: plainKey.substring(0, 8) + '...' + plainKey.substring(plainKey.length - 4), // Version masquée pour l'affichage
      keyHash,
      scopes: request.scopes || ['read'],
      isActive: true,
      usageCount: 0,
      rateLimit: {
        requestsPerMinute: request.rateLimit?.requestsPerMinute ?? 60,
        requestsPerHour: request.rateLimit?.requestsPerHour ?? 1000,
        requestsPerDay: request.rateLimit?.requestsPerDay ?? 10000
      },
      expiresAt,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      metadata: request.metadata || {}
    };

    const docRef = await this.collection.add(apiKey);
    const createdApiKey = { id: docRef.id, ...apiKey };

    return {
      apiKey: createdApiKey,
      plainKey // Retourner la clé en clair une seule fois
    };
  }

  /**
   * Lister les clés API d'un tenant
   */
  async listApiKeys(tenantId: string, userId?: string): Promise<ApiKey[]> {
    let query = this.collection.where('tenantId', '==', tenantId);
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ApiKey));
  }

  /**
   * Obtenir une clé API par ID
   */
  async getApiKey(tenantId: string, keyId: string): Promise<ApiKey | null> {
    const doc = await this.collection.doc(keyId).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as ApiKey;
    
    // Vérifier que la clé appartient au bon tenant
    if (data.tenantId !== tenantId) {
      return null;
    }

    return { id: doc.id, ...data };
  }

  /**
   * Mettre à jour une clé API
   */
  async updateApiKey(
    tenantId: string,
    keyId: string,
    request: UpdateApiKeyRequest
  ): Promise<ApiKey | null> {
    const existingKey = await this.getApiKey(tenantId, keyId);
    if (!existingKey) {
      return null;
    }

    // Construire les données de mise à jour en gérant les types optionnels
    const updateData: Partial<ApiKey> = {
      updatedAt: Timestamp.now()
    };

    // Ajouter les champs optionnels s'ils sont fournis
    if (request.name !== undefined) {
      updateData.name = request.name;
    }
    
    if (request.scopes !== undefined) {
      updateData.scopes = request.scopes;
    }
    
    if (request.isActive !== undefined) {
      updateData.isActive = request.isActive;
    }
    
    if (request.metadata !== undefined) {
      updateData.metadata = request.metadata;
    }

    // Gérer rateLimit avec fusion des valeurs existantes et nouvelles
    if (request.rateLimit !== undefined) {
      updateData.rateLimit = {
        requestsPerMinute: request.rateLimit.requestsPerMinute ?? existingKey.rateLimit?.requestsPerMinute ?? 60,
        requestsPerHour: request.rateLimit.requestsPerHour ?? existingKey.rateLimit?.requestsPerHour ?? 1000,
        requestsPerDay: request.rateLimit.requestsPerDay ?? existingKey.rateLimit?.requestsPerDay ?? 10000
      };
    }

    await this.collection.doc(keyId).update(updateData);
    
    return this.getApiKey(tenantId, keyId);
  }

  /**
   * Supprimer une clé API
   */
  async deleteApiKey(tenantId: string, keyId: string): Promise<boolean> {
    const existingKey = await this.getApiKey(tenantId, keyId);
    if (!existingKey) {
      return false;
    }

    await this.collection.doc(keyId).delete();
    
    // Supprimer aussi les données d'usage
    const usageSnapshot = await this.usageCollection
      .where('keyId', '==', keyId)
      .get();
    
    const batch = db.batch();
    usageSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return true;
  }

  /**
   * Vérifier et valider une clé API
   */
  async validateApiKey(plainKey: string): Promise<ApiKey | null> {
    const keyHash = this.hashApiKey(plainKey);
    
    const snapshot = await this.collection
      .where('keyHash', '==', keyHash)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const apiKey = { id: doc.id, ...doc.data() } as ApiKey;

    // Vérifier l'expiration
    if (apiKey.expiresAt && apiKey.expiresAt.toDate() < new Date()) {
      return null;
    }

    return apiKey;
  }

  /**
   * Enregistrer l'usage d'une clé API
   */
  async recordUsage(
    keyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const usage: Omit<ApiKeyUsage, 'id'> = {
      keyId,
      timestamp: Timestamp.now(),
      endpoint,
      method,
      statusCode,
      responseTime,
      userAgent,
      ipAddress
    };

    await this.usageCollection.add(usage);

    // Mettre à jour le compteur d'usage et la dernière utilisation
    await this.collection.doc(keyId).update({
      usageCount: FieldValue.increment(1),
      lastUsed: Timestamp.now()
    });
  }

  /**
   * Obtenir les statistiques d'usage d'une clé API
   */
  async getUsageStats(keyId: string, days: number = 30): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
    requestsByDay: Array<{ date: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await this.usageCollection
      .where('keyId', '==', keyId)
      .where('timestamp', '>=', Timestamp.fromDate(startDate))
      .get();

    const usageData = snapshot.docs.map(doc => doc.data() as ApiKeyUsage);

    const totalRequests = usageData.length;
    const successfulRequests = usageData.filter(u => u.statusCode >= 200 && u.statusCode < 400).length;
    const errorRequests = totalRequests - successfulRequests;
    const averageResponseTime = usageData.reduce((sum, u) => sum + u.responseTime, 0) / totalRequests || 0;

    // Grouper par jour
    const requestsByDay = new Map<string, number>();
    usageData.forEach(usage => {
      const date = usage.timestamp.toDate().toISOString().split('T')[0];
      requestsByDay.set(date, (requestsByDay.get(date) || 0) + 1);
    });

    // Top endpoints
    const endpointCounts = new Map<string, number>();
    usageData.forEach(usage => {
      endpointCounts.set(usage.endpoint, (endpointCounts.get(usage.endpoint) || 0) + 1);
    });

    return {
      totalRequests,
      successfulRequests,
      errorRequests,
      averageResponseTime: Math.round(averageResponseTime),
      requestsByDay: Array.from(requestsByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topEndpoints: Array.from(endpointCounts.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  /**
   * Régénérer une clé API
   */
  async regenerateApiKey(tenantId: string, keyId: string): Promise<{ apiKey: ApiKey; plainKey: string } | null> {
    const existingKey = await this.getApiKey(tenantId, keyId);
    if (!existingKey) {
      return null;
    }

    const plainKey = this.generateApiKey();
    const keyHash = this.hashApiKey(plainKey);

    const updateData: Partial<ApiKey> = {
      key: plainKey.substring(0, 8) + '...' + plainKey.substring(plainKey.length - 4),
      keyHash,
      updatedAt: Timestamp.now(),
      usageCount: 0, // Reset usage count
      lastUsed: undefined // Reset last used
    };

    await this.collection.doc(keyId).update(updateData);
    
    const updatedKey = await this.getApiKey(tenantId, keyId);
    
    return {
      apiKey: updatedKey!,
      plainKey
    };
  }
}

export const apiKeyService = new ApiKeyService();