// src/services/qrCodeService.ts - Service frontend pour la gestion des QR codes

import { apiService, type ApiResponse, API_BASE_URL } from './api';

export interface EventQRCode {
  eventId: string;
  qrCodeData: string;
  generatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  validationRules?: {
    timeWindow?: { start: Date; end: Date };
    locationRadius?: { center: { latitude: number; longitude: number }; radius: number };
    maxScansPerUser?: number;
  };
}

export interface QRCodeGenerationOptions {
  expiresAt?: Date;
  maxUsage?: number;
  timeWindow?: { start: Date; end: Date };
  locationRadius?: { center: { latitude: number; longitude: number }; radius: number };
  maxScansPerUser?: number;
}

export interface QRCodeValidationResult {
  isValid: boolean;
  eventId?: string;
  reason?: string;
}

export interface QRCodeStats {
  totalScans: number;
  uniqueUsers: number;
  scansByHour: Record<string, number>;
  isActive: boolean;
  expiresAt?: Date;
  generatedAt: Date;
}

class QRCodeService {
  /**
   * Générer un QR code pour un événement
   */
  async generateEventQRCode(
    eventId: string,
    options: QRCodeGenerationOptions = {}
  ): Promise<ApiResponse<EventQRCode>> {
    const payload = {
      ...options,
      expiresAt: options.expiresAt?.toISOString(),
      timeWindow: options.timeWindow ? {
        start: options.timeWindow.start.toISOString(),
        end: options.timeWindow.end.toISOString()
      } : undefined
    };

    return apiService.post<EventQRCode>(`/qr-codes/events/${eventId}/generate`, payload);
  }

  /**
   * Valider un QR code scanné
   */
  async validateQRCode(
    qrCodeData: string,
    location?: { latitude: number; longitude: number }
  ): Promise<ApiResponse<QRCodeValidationResult>> {
    return apiService.post<QRCodeValidationResult>('/qr-codes/validate', {
      qrCodeData,
      location
    });
  }

  /**
   * Régénérer un QR code
   */
  async regenerateQRCode(eventId: string): Promise<ApiResponse<EventQRCode>> {
    return apiService.post<EventQRCode>(`/qr-codes/events/${eventId}/regenerate`);
  }

  /**
   * Désactiver un QR code
   */
  async deactivateQRCode(eventId: string): Promise<ApiResponse<void>> {
    return apiService.delete(`/qr-codes/events/${eventId}`);
  }

  /**
   * Obtenir les statistiques d'un QR code
   */
  async getQRCodeStats(eventId: string): Promise<ApiResponse<QRCodeStats>> {
    return apiService.get<QRCodeStats>(`/qr-codes/events/${eventId}/stats`);
  }

  /**
   * Télécharger l'image du QR code
   */
  async downloadQRCodeImage(
    eventId: string,
    options: { format?: 'png' | 'jpg' | 'svg'; size?: number } = {}
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.size) params.append('size', options.size.toString());

    // Get auth token from localStorage (same way the ApiService does it)
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/qr-codes/events/${eventId}/download?${params}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Failed to download QR code image');
    }

    return response.blob();
  }

  /**
   * Obtenir le QR code d'un événement
   */
  async getEventQRCode(eventId: string): Promise<ApiResponse<EventQRCode | null>> {
    return apiService.get<EventQRCode | null>(`/events/${eventId}/qr-code`);
  }

  /**
   * Rafraîchir l'expiration d'un QR code
   */
  async refreshQRCodeExpiration(
    eventId: string,
    newExpiresAt: Date
  ): Promise<ApiResponse<EventQRCode>> {
    return apiService.patch<EventQRCode>(`/qr-codes/events/${eventId}/refresh`, {
      expiresAt: newExpiresAt.toISOString()
    });
  }

  /**
   * Traiter un scan de QR code et effectuer le check-in
   */
  async processQRCodeCheckIn(
    qrCodeData: string,
    location?: { latitude: number; longitude: number }
  ): Promise<ApiResponse<{
    success: boolean;
    attendance?: any;
    message: string;
  }>> {
    try {
      // D'abord valider le QR code
      const validation = await this.validateQRCode(qrCodeData, location);

      if (!validation.success || !validation.data?.isValid) {
        return {
          success: false,
          error: validation.data?.reason || 'QR code invalide',
          data: {
            success: false,
            message: validation.data?.reason || 'QR code invalide'
          }
        };
      }

      // Effectuer le check-in
      const checkInResponse = await apiService.post('/attendances/check-in', {
        eventId: validation.data.eventId,
        method: 'qr_code',
        qrCodeData,
        deviceInfo: {
          type: this.getDeviceType(),
          location
        }
      });

      return {
        success: checkInResponse.success,
        data: {
          success: checkInResponse.success,
          attendance: checkInResponse.data?.attendance,
          message: checkInResponse.data?.message || 'Check-in effectué avec succès'
        },
        error: checkInResponse.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors du check-in',
        data: {
          success: false,
          message: error.message || 'Erreur lors du check-in'
        }
      };
    }
  }

  /**
   * Générer une URL de check-in pour partage
   */
  generateCheckInUrl(eventId: string, qrCodeData?: string): string {
    const baseUrl = window.location.origin;
    const params = qrCodeData ? `?qr=${encodeURIComponent(qrCodeData)}` : '';
    return `${baseUrl}/checkin/${eventId}${params}`;
  }

  /**
   * Vérifier si le navigateur supporte la caméra
   */
  async checkCameraSupport(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  /**
   * Demander les permissions de caméra
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Arrêter immédiatement
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir la géolocalisation actuelle
   */
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          resolve(null);
        },
        {
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
          enableHighAccuracy: true
        }
      );
    });
  }

  // Méthodes utilitaires privées

  private getDeviceType(): 'web' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet';
    }

    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
      return 'mobile';
    }

    return 'web';
  }
}

export const qrCodeService = new QRCodeService();
export default qrCodeService;