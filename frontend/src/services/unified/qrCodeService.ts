/**
 * Service unifié pour la gestion des QR codes
 * Centralise toute la logique QR code
 */

import { BaseService } from '../core/baseService';
import { apiService, type ApiResponse } from '../apiService';

export interface QRCodeData {
  id: string;
  eventId: string;
  qrCodeData: string;
  qrCodeUrl?: string;
  generatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  validationRules?: {
    timeWindow?: { start: Date; end: Date };
    locationRadius?: { 
      center: { latitude: number; longitude: number }; 
      radius: number; 
    };
    maxScansPerUser?: number;
    allowedMethods?: string[];
  };
  metadata?: Record<string, any>;
}

export interface QRCodeGenerationOptions {
  expiresAt?: Date;
  maxUsage?: number;
  timeWindow?: { start: Date; end: Date };
  locationRadius?: { 
    center: { latitude: number; longitude: number }; 
    radius: number; 
  };
  maxScansPerUser?: number;
  customData?: Record<string, any>;
}

export interface QRCodeValidationResult {
  isValid: boolean;
  eventId?: string;
  eventTitle?: string;
  reason?: string;
  canCheckIn?: boolean;
  restrictions?: string[];
  metadata?: Record<string, any>;
}

export interface QRCodeStats {
  qrCodeId: string;
  eventId: string;
  totalScans: number;
  uniqueUsers: number;
  successfulCheckIns: number;
  failedAttempts: number;
  scansByHour: Array<{ hour: number; count: number }>;
  scansByMethod: Record<string, number>;
  isActive: boolean;
  expiresAt?: Date;
  generatedAt: Date;
  lastScanAt?: Date;
  topScanners: Array<{
    userId: string;
    userName: string;
    scanCount: number;
    lastScanAt: Date;
  }>;
}

export interface CheckInResult {
  success: boolean;
  attendanceId?: string;
  message: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface QRCodeScanEvent {
  id: string;
  qrCodeId: string;
  eventId: string;
  userId?: string;
  scanTime: Date;
  location?: { latitude: number; longitude: number };
  deviceInfo?: {
    type: 'web' | 'mobile' | 'tablet';
    userAgent?: string;
    platform?: string;
  };
  result: 'success' | 'failed' | 'duplicate' | 'expired' | 'invalid';
  reason?: string;
  checkInSuccessful?: boolean;
}

class UnifiedQRCodeService extends BaseService {
  protected basePath = '/api/qr-codes';

  // ==================== GÉNÉRATION ET GESTION ====================

  /**
   * Générer un QR code pour un événement
   */
  async generateEventQRCode(
    eventId: string, 
    options: QRCodeGenerationOptions = {}
  ): Promise<ApiResponse<QRCodeData>> {
    try {
      const payload = {
        ...options,
        expiresAt: options.expiresAt?.toISOString(),
        timeWindow: options.timeWindow ? {
          start: options.timeWindow.start.toISOString(),
          end: options.timeWindow.end.toISOString()
        } : undefined
      };

      return await apiService.post<QRCodeData>(`${this.basePath}/events/${eventId}/generate`, payload);
    } catch (error) {
      return this.handleError(error, 'generateEventQRCode');
    }
  }

  /**
   * Obtenir le QR code d'un événement
   */
  async getEventQRCode(eventId: string): Promise<ApiResponse<QRCodeData | null>> {
    try {
      return await apiService.get<QRCodeData | null>(`${this.basePath}/events/${eventId}`);
    } catch (error) {
      return this.handleError(error, 'getEventQRCode');
    }
  }

  /**
   * Régénérer un QR code
   */
  async regenerateQRCode(
    eventId: string, 
    options?: Partial<QRCodeGenerationOptions>
  ): Promise<ApiResponse<QRCodeData>> {
    try {
      const payload = options ? {
        ...options,
        expiresAt: options.expiresAt?.toISOString(),
        timeWindow: options.timeWindow ? {
          start: options.timeWindow.start.toISOString(),
          end: options.timeWindow.end.toISOString()
        } : undefined
      } : {};

      return await apiService.post<QRCodeData>(`${this.basePath}/events/${eventId}/regenerate`, payload);
    } catch (error) {
      return this.handleError(error, 'regenerateQRCode');
    }
  }

  /**
   * Désactiver un QR code
   */
  async deactivateQRCode(eventId: string): Promise<ApiResponse<void>> {
    try {
      return await apiService.patch(`${this.basePath}/events/${eventId}/deactivate`);
    } catch (error) {
      return this.handleError(error, 'deactivateQRCode');
    }
  }

  /**
   * Réactiver un QR code
   */
  async reactivateQRCode(eventId: string): Promise<ApiResponse<QRCodeData>> {
    try {
      return await apiService.patch<QRCodeData>(`${this.basePath}/events/${eventId}/reactivate`);
    } catch (error) {
      return this.handleError(error, 'reactivateQRCode');
    }
  }

  /**
   * Mettre à jour les règles de validation d'un QR code
   */
  async updateValidationRules(
    eventId: string,
    rules: Partial<QRCodeGenerationOptions>
  ): Promise<ApiResponse<QRCodeData>> {
    try {
      const payload = {
        ...rules,
        expiresAt: rules.expiresAt?.toISOString(),
        timeWindow: rules.timeWindow ? {
          start: rules.timeWindow.start.toISOString(),
          end: rules.timeWindow.end.toISOString()
        } : undefined
      };

      return await apiService.patch<QRCodeData>(`${this.basePath}/events/${eventId}/rules`, payload);
    } catch (error) {
      return this.handleError(error, 'updateValidationRules');
    }
  }

  // ==================== VALIDATION ET CHECK-IN ====================

  /**
   * Valider un QR code scanné
   */
  async validateQRCode(
    qrCodeData: string, 
    context?: {
      location?: { latitude: number; longitude: number };
      deviceInfo?: {
        type: 'web' | 'mobile' | 'tablet';
        userAgent?: string;
        platform?: string;
      };
    }
  ): Promise<ApiResponse<QRCodeValidationResult>> {
    try {
      return await apiService.post<QRCodeValidationResult>(`${this.basePath}/validate`, {
        qrCodeData,
        ...context
      });
    } catch (error) {
      return this.handleError(error, 'validateQRCode');
    }
  }

  /**
   * Traiter un scan de QR code et effectuer le check-in
   */
  async processQRCodeCheckIn(
    qrCodeData: string,
    context?: {
      location?: { latitude: number; longitude: number };
      deviceInfo?: {
        type: 'web' | 'mobile' | 'tablet';
        userAgent?: string;
        platform?: string;
      };
      notes?: string;
    }
  ): Promise<ApiResponse<CheckInResult>> {
    try {
      return await apiService.post<CheckInResult>(`${this.basePath}/check-in`, {
        qrCodeData,
        ...context
      });
    } catch (error) {
      return this.handleError(error, 'processQRCodeCheckIn');
    }
  }

  /**
   * Vérifier si un utilisateur peut scanner un QR code
   */
  async canScanQRCode(
    eventId: string,
    userId?: string
  ): Promise<ApiResponse<{
    canScan: boolean;
    reason?: string;
    restrictions?: string[];
    remainingScans?: number;
  }>> {
    try {
      const params = userId ? { userId } : {};
      return await apiService.get(`${this.basePath}/events/${eventId}/can-scan`, { params });
    } catch (error) {
      return this.handleError(error, 'canScanQRCode');
    }
  }

  // ==================== STATISTIQUES ET HISTORIQUE ====================

  /**
   * Obtenir les statistiques d'un QR code
   */
  async getQRCodeStats(eventId: string): Promise<ApiResponse<QRCodeStats>> {
    try {
      return await apiService.get<QRCodeStats>(`${this.basePath}/events/${eventId}/stats`);
    } catch (error) {
      return this.handleError(error, 'getQRCodeStats');
    }
  }

  /**
   * Obtenir l'historique des scans
   */
  async getScanHistory(
    eventId: string,
    filters?: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      result?: 'success' | 'failed' | 'duplicate' | 'expired' | 'invalid';
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<{
    scans: QRCodeScanEvent[];
    total: number;
    summary: {
      totalScans: number;
      successfulScans: number;
      failedScans: number;
      uniqueUsers: number;
    };
  }>> {
    try {
      const params = filters ? {
        ...filters,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString()
      } : {};

      return await apiService.get(`${this.basePath}/events/${eventId}/scan-history`, { params });
    } catch (error) {
      return this.handleError(error, 'getScanHistory');
    }
  }

  /**
   * Obtenir les analytics de scan en temps réel
   */
  async getRealtimeScanAnalytics(eventId: string): Promise<ApiResponse<{
    currentScans: number;
    scansLastHour: number;
    scansToday: number;
    activeUsers: number;
    recentScans: Array<{
      userId: string;
      userName: string;
      scanTime: Date;
      result: string;
    }>;
    scanRate: number; // scans per minute
    peakScanTime?: Date;
  }>> {
    try {
      return await apiService.get(`${this.basePath}/events/${eventId}/realtime-analytics`);
    } catch (error) {
      return this.handleError(error, 'getRealtimeScanAnalytics');
    }
  }

  // ==================== TÉLÉCHARGEMENT ET PARTAGE ====================

  /**
   * Télécharger l'image du QR code
   */
  async downloadQRCodeImage(
    eventId: string, 
    options: { 
      format?: 'png' | 'jpg' | 'svg' | 'pdf'; 
      size?: number;
      includeEventInfo?: boolean;
      customText?: string;
    } = {}
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (options.format) params.append('format', options.format);
      if (options.size) params.append('size', options.size.toString());
      if (options.includeEventInfo) params.append('includeEventInfo', 'true');
      if (options.customText) params.append('customText', options.customText);

      const response = await fetch(
        `${apiService.getBaseUrl()}${this.basePath}/events/${eventId}/download?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${apiService.getAuthToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download QR code image');
      }

      return response.blob();
    } catch (error) {
      return this.handleError(error, 'downloadQRCodeImage');
    }
  }

  /**
   * Générer une URL de check-in pour partage
   */
  generateCheckInUrl(eventId: string, qrCodeData?: string): string {
    const baseUrl = window.location.origin;
    const params = qrCodeData ? `?qr=${encodeURIComponent(qrCodeData)}` : '';
    return `${baseUrl}/check-in/${eventId}${params}`;
  }

  /**
   * Générer un lien de partage avec QR code intégré
   */
  async generateShareableLink(
    eventId: string,
    options?: {
      includeQRCode?: boolean;
      customMessage?: string;
      expiresIn?: number; // hours
    }
  ): Promise<ApiResponse<{
    shareUrl: string;
    qrCodeUrl?: string;
    expiresAt?: Date;
    shareId: string;
  }>> {
    try {
      return await apiService.post(`${this.basePath}/events/${eventId}/generate-share-link`, options);
    } catch (error) {
      return this.handleError(error, 'generateShareableLink');
    }
  }

  // ==================== UTILITAIRES DEVICE/CAMERA ====================

  /**
   * Vérifier si le navigateur supporte la caméra
   */
  async checkCameraSupport(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  /**
   * Demander les permissions de caméra
   */
  async requestCameraPermission(): Promise<{
    granted: boolean;
    error?: string;
  }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Caméra arrière par défaut
        } 
      });
      
      // Arrêter immédiatement le stream
      stream.getTracks().forEach(track => track.stop());
      
      return { granted: true };
    } catch (error: any) {
      return { 
        granted: false, 
        error: error.name === 'NotAllowedError' ? 'Permission refusée' : 'Caméra non disponible'
      };
    }
  }

  /**
   * Obtenir la géolocalisation actuelle
   */
  async getCurrentLocation(): Promise<{
    location?: { latitude: number; longitude: number };
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ error: 'Géolocalisation non supportée' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout de géolocalisation';
              break;
          }
          resolve({ error: errorMessage });
        },
        {
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
          enableHighAccuracy: true
        }
      );
    });
  }

  /**
   * Détecter le type d'appareil
   */
  getDeviceInfo(): {
    type: 'web' | 'mobile' | 'tablet';
    userAgent: string;
    platform: string;
    isMobile: boolean;
    hasCamera: boolean;
    hasGeolocation: boolean;
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform;
    
    let type: 'web' | 'mobile' | 'tablet' = 'web';
    
    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      type = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      type = 'mobile';
    }
    
    return {
      type,
      userAgent: navigator.userAgent,
      platform,
      isMobile: type === 'mobile' || type === 'tablet',
      hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasGeolocation: !!navigator.geolocation
    };
  }

  // ==================== GESTION D'ERREURS ET DIAGNOSTICS ====================

  /**
   * Diagnostiquer les problèmes de QR code
   */
  async diagnoseQRCodeIssues(eventId: string): Promise<ApiResponse<{
    issues: Array<{
      type: 'expired' | 'inactive' | 'usage_limit' | 'location_restriction' | 'time_restriction';
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
    health: 'good' | 'warning' | 'critical';
    recommendations: string[];
  }>> {
    try {
      return await apiService.get(`${this.basePath}/events/${eventId}/diagnose`);
    } catch (error) {
      return this.handleError(error, 'diagnoseQRCodeIssues');
    }
  }

  /**
   * Tester la validité d'un QR code sans l'utiliser
   */
  async testQRCode(
    qrCodeData: string,
    context?: {
      location?: { latitude: number; longitude: number };
      simulateUser?: string;
    }
  ): Promise<ApiResponse<{
    isValid: boolean;
    canCheckIn: boolean;
    issues: string[];
    warnings: string[];
    metadata: Record<string, any>;
  }>> {
    try {
      return await apiService.post(`${this.basePath}/test`, {
        qrCodeData,
        ...context
      });
    } catch (error) {
      return this.handleError(error, 'testQRCode');
    }
  }
}

export const qrCodeService = new UnifiedQRCodeService();