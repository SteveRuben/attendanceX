// backend/functions/src/services/biometric.service.ts - Service de validation biométrique

import { getFirestore } from "firebase-admin/firestore";
import { ERROR_CODES } from "@attendance-x/shared";
import * as crypto from "crypto";

export interface BiometricTemplate {
  id: string;
  userId: string;
  type: 'fingerprint' | 'face' | 'voice' | 'iris';
  template: string; // Template chiffré
  quality: number; // 0-100
  enrollmentDate: Date;
  lastUsed?: Date;
  isActive: boolean;
  deviceInfo?: {
    type: string;
    model?: string;
    os?: string;
  };
}

export interface BiometricValidationRequest {
  userId: string;
  type: 'fingerprint' | 'face' | 'voice' | 'iris';
  biometricData: string; // Données biométriques à valider
  deviceInfo?: any;
  location?: { latitude: number; longitude: number };
}

export interface BiometricValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  matchedTemplateId?: string;
  reason?: string;
  processingTime: number; // en millisecondes
}

export interface BiometricEnrollmentRequest {
  userId: string;
  type: 'fingerprint' | 'face' | 'voice' | 'iris';
  biometricData: string;
  deviceInfo?: any;
}

export class BiometricService {
  private readonly db = getFirestore();
  private readonly encryptionKey = process.env.BIOMETRIC_ENCRYPTION_KEY || 'default-key';
  private readonly minConfidenceThreshold = 85; // Seuil minimum de confiance

  /**
   * Enregistrer un template biométrique
   */
  async enrollBiometric(request: BiometricEnrollmentRequest): Promise<BiometricTemplate> {
    try {
      // Vérifier si l'utilisateur a déjà un template de ce type
      const existingTemplate = await this.getUserBiometricTemplate(request.userId, request.type);
      if (existingTemplate) {
        throw new Error('Biometric template already exists for this user and type');
      }

      // Traiter et valider les données biométriques
      const processedData = await this.processBiometricData(request.biometricData, request.type);
      
      // Chiffrer le template
      const encryptedTemplate = this.encryptTemplate(processedData.template);
      
      // Créer le template
      const template: BiometricTemplate = {
        id: crypto.randomUUID(),
        userId: request.userId,
        type: request.type,
        template: encryptedTemplate,
        quality: processedData.quality,
        enrollmentDate: new Date(),
        isActive: true,
        deviceInfo: request.deviceInfo
      };

      // Sauvegarder en base
      await this.db.collection('biometric_templates').doc(template.id).set(template);

      // Log de l'audit
      await this.logBiometricAction('enrollment', template.id, request.userId, {
        type: request.type,
        quality: processedData.quality
      });

      return template;
    } catch (error) {
      console.error('Error enrolling biometric:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Valider des données biométriques
   */
  async validateBiometric(request: BiometricValidationRequest): Promise<BiometricValidationResult> {
    const startTime = Date.now();
    
    try {
      // Récupérer les templates de l'utilisateur pour ce type
      const templates = await this.getUserBiometricTemplates(request.userId, request.type);
      
      if (templates.length === 0) {
        return {
          isValid: false,
          confidence: 0,
          reason: 'No biometric templates found for user',
          processingTime: Date.now() - startTime
        };
      }

      // Traiter les données biométriques reçues
      const processedData = await this.processBiometricData(request.biometricData, request.type);
      
      let bestMatch: { template: BiometricTemplate; confidence: number } | null = null;

      // Comparer avec chaque template
      for (const template of templates) {
        if (!template.isActive) {continue;}

        const decryptedTemplate = this.decryptTemplate(template.template);
        const confidence = await this.compareBiometricData(processedData.template, decryptedTemplate, request.type);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { template, confidence };
        }
      }

      const isValid = bestMatch !== null && bestMatch.confidence >= this.minConfidenceThreshold;
      
      if (isValid && bestMatch) {
        // Mettre à jour la dernière utilisation
        await this.updateTemplateLastUsed(bestMatch.template.id);
        
        // Log de l'audit
        await this.logBiometricAction('validation_success', bestMatch.template.id, request.userId, {
          confidence: bestMatch.confidence,
          type: request.type
        });
      } else {
        // Log de l'échec
        await this.logBiometricAction('validation_failed', null, request.userId, {
          confidence: bestMatch?.confidence || 0,
          type: request.type,
          reason: 'Confidence below threshold'
        });
      }

      return {
        isValid,
        confidence: bestMatch?.confidence || 0,
        ...(isValid && bestMatch?.template.id && { matchedTemplateId: bestMatch.template.id }),
        ...(!isValid && { reason: 'Biometric validation failed' }),
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error validating biometric:', error);
      return {
        isValid: false,
        confidence: 0,
        reason: 'Internal server error during validation',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Supprimer un template biométrique
   */
  async deleteBiometricTemplate(templateId: string, userId: string): Promise<void> {
    try {
      const template = await this.getBiometricTemplate(templateId);
      
      if (!template || template.userId !== userId) {
        throw new Error('Template not found or access denied');
      }

      await this.db.collection('biometric_templates').doc(templateId).delete();
      
      // Log de l'audit
      await this.logBiometricAction('deletion', templateId, userId, {
        type: template.type
      });
    } catch (error) {
      console.error('Error deleting biometric template:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les templates biométriques d'un utilisateur
   */
  async getUserBiometricTemplates(userId: string, type?: string): Promise<BiometricTemplate[]> {
    try {
      let query = this.db
        .collection('biometric_templates')
        .where('userId', '==', userId)
        .where('isActive', '==', true);

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as BiometricTemplate);
    } catch (error) {
      console.error('Error getting user biometric templates:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Vérifier si un utilisateur a des templates biométriques
   */
  async hasBiometricTemplates(userId: string): Promise<boolean> {
    try {
      const templates = await this.getUserBiometricTemplates(userId);
      return templates.length > 0;
    } catch (error) {
      console.error('Error checking biometric templates:', error);
      return false;
    }
  }

  // Méthodes privées

  private async processBiometricData(data: string, type: string): Promise<{ template: string; quality: number }> {
    // Simulation du traitement biométrique
    // Dans un vrai projet, utiliser une librairie spécialisée
    
    switch (type) {
      case 'fingerprint':
        return this.processFingerprintData(data);
      case 'face':
        return this.processFaceData(data);
      case 'voice':
        return this.processVoiceData(data);
      case 'iris':
        return this.processIrisData(data);
      default:
        throw new Error('Unsupported biometric type');
    }
  }

  private async processFingerprintData(data: string): Promise<{ template: string; quality: number }> {
    // Simulation - dans la réalité, utiliser une librairie comme SourceAFIS
    const quality = Math.floor(Math.random() * 30) + 70; // 70-100
    const template = crypto.createHash('sha256').update(data).digest('hex');
    
    return { template, quality };
  }

  private async processFaceData(data: string): Promise<{ template: string; quality: number }> {
    // Simulation - dans la réalité, utiliser une librairie comme face-api.js
    const quality = Math.floor(Math.random() * 25) + 75; // 75-100
    const template = crypto.createHash('sha256').update(data + 'face').digest('hex');
    
    return { template, quality };
  }

  private async processVoiceData(data: string): Promise<{ template: string; quality: number }> {
    // Simulation - dans la réalité, utiliser une librairie de reconnaissance vocale
    const quality = Math.floor(Math.random() * 20) + 80; // 80-100
    const template = crypto.createHash('sha256').update(data + 'voice').digest('hex');
    
    return { template, quality };
  }

  private async processIrisData(data: string): Promise<{ template: string; quality: number }> {
    // Simulation - dans la réalité, utiliser une librairie spécialisée
    const quality = Math.floor(Math.random() * 15) + 85; // 85-100
    const template = crypto.createHash('sha256').update(data + 'iris').digest('hex');
    
    return { template, quality };
  }

  private async compareBiometricData(template1: string, template2: string, type: string): Promise<number> {
    // Simulation de comparaison biométrique
    // Dans la réalité, utiliser des algorithmes spécialisés
    
    if (template1 === template2) {
      return 100; // Match parfait
    }
    
    // Simuler une comparaison avec un score de confiance
    const similarity = this.calculateSimilarity(template1, template2);
    
    // Ajuster selon le type biométrique
    const typeMultiplier = {
      fingerprint: 1.0,
      face: 0.9,
      voice: 0.8,
      iris: 1.1
    };
    
    return Math.min(100, similarity * (typeMultiplier[type as keyof typeof typeMultiplier] || 1.0));
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Algorithme simple de similarité - à remplacer par un vrai algorithme
    let matches = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }
    
    return (matches / minLength) * 100;
  }

  private encryptTemplate(template: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(template, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptTemplate(encryptedTemplate: string): string {
    const parts = encryptedTemplate.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async getUserBiometricTemplate(userId: string, type: string): Promise<BiometricTemplate | null> {
    const templates = await this.getUserBiometricTemplates(userId, type);
    return templates.length > 0 ? templates[0] : null;
  }

  private async getBiometricTemplate(templateId: string): Promise<BiometricTemplate | null> {
    try {
      const doc = await this.db.collection('biometric_templates').doc(templateId).get();
      return doc.exists ? doc.data() as BiometricTemplate : null;
    } catch (error) {
      console.error('Error getting biometric template:', error);
      return null;
    }
  }

  private async updateTemplateLastUsed(templateId: string): Promise<void> {
    await this.db.collection('biometric_templates').doc(templateId).update({
      lastUsed: new Date()
    });
  }

  private async logBiometricAction(
    action: string,
    templateId: string | null,
    userId: string,
    details: any
  ): Promise<void> {
    await this.db.collection('biometric_audit_logs').add({
      action,
      templateId,
      userId,
      details,
      timestamp: new Date(),
      ipAddress: null, // À remplir depuis le contexte de la requête
      userAgent: null  // À remplir depuis le contexte de la requête
    });
  }
}

export const biometricService = new BiometricService();