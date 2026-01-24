// backend/functions/src/controllers/qrcode.controller.ts - Contrôleur pour la gestion des QR codes

import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { AuthenticatedRequest } from "../../types";
import { qrCodeService } from "../../services/qrcode/qrcode.service";



export class QRCodeController {
  /**
   * Générer un QR code pour un événement
   */
  static generateEventQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const eventId = req.params.eventId as string;
    const options = req.body;

    // Convertir les dates string en objets Date
    if (options.expiresAt) {
      options.expiresAt = new Date(options.expiresAt);
    }
    if (options.timeWindow) {
      options.timeWindow.start = new Date(options.timeWindow.start);
      options.timeWindow.end = new Date(options.timeWindow.end);
    }

    // TODO: Adapter pour utiliser le nouveau service
    const qrCode = await qrCodeService.generateQRCode({
      type: 'event',
      eventId,
      userId: req.user.uid,
      expiresAt: options.expiresAt?.toISOString(),
      options: {
        size: 256,
        format: 'png'
      }
    });

    res.status(201).json({
      success: true,
      message: "QR code généré avec succès",
      data: qrCode,
    });
  });

  /**
   * Générer un QR code générique pour check-in
   */
  static generateGenericQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type, eventId, userId, expiresAt, options } = req.body;
    const currentUserId = req.user.uid;

    // Validation des paramètres
    if (!type || !eventId) {
      return res.status(400).json({
        success: false,
        message: "Type and eventId are required"
      });
    }

    try {
      // Utiliser le service QR code
      const qrCode = await qrCodeService.generateQRCode({
        type,
        eventId,
        userId: userId || currentUserId,
        expiresAt,
        options
      });

      return res.status(201).json({
        success: true,
        message: "QR code généré avec succès",
        data: {
          qrCodeId: qrCode.qrCodeId,
          url: qrCode.url,
          imageBase64: qrCode.imageBase64,
          expiresAt: qrCode.expiresAt,
          token: qrCode.token
        }
      });

    } catch (error) {
      console.error('Error generating QR code:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR code'
      });
    }
  });

  /**
   * Valider un QR code scanné
   */
  static validateQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { qrCodeId, qrCodeData, userId, location } = req.body;
    const currentUserId = req.user.uid;

    // Déterminer l'ID du QR code à valider
    const codeToValidate = qrCodeId || qrCodeData;
    
    if (!codeToValidate) {
      return res.status(400).json({
        success: false,
        message: 'QR code ID or data is required'
      });
    }

    try {
      // Utiliser le service QR code pour la validation
      const validationResult = await qrCodeService.validateQRCode(
        codeToValidate, 
        userId || currentUserId, 
        location
      );

      if (!validationResult.valid) {
        return res.json({
          success: true,
          data: validationResult
        });
      }

      // Si valide, créer un enregistrement de check-in
      const qrCode = validationResult.qrCode!;
      const checkInRecord = {
        id: `checkin_${Date.now()}`,
        eventId: qrCode.data.eventId,
        userId: userId || currentUserId,
        userName: 'QR Code User', // TODO: Récupérer le vrai nom depuis la DB
        method: 'qr_code' as const,
        timestamp: new Date().toISOString(),
        status: 'checked_in' as const,
        location,
        qrCodeId: codeToValidate,
        metadata: {
          qrType: qrCode.data.type,
          validatedAt: new Date().toISOString(),
          validatedBy: currentUserId,
          usageCount: qrCode.usageCount + 1
        }
      };

      // TODO: Sauvegarder le check-in en base de données
      // await checkInService.recordCheckIn(checkInRecord);

      return res.json({
        success: true,
        data: {
          valid: true,
          checkIn: checkInRecord,
          message: 'QR code validated successfully'
        }
      });

    } catch (error) {
      console.error('Error validating QR code:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate QR code'
      });
    }
  });

  /**
   * Régénérer un QR code
   */
  static regenerateQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const eventId = req.params.eventId as string;

    const qrCode = await qrCodeService.regenerateQRCode(eventId);

    res.json({
      success: true,
      message: "QR code régénéré avec succès",
      data: qrCode,
    });
  });

  /**
   * Désactiver un QR code
   */
  static deactivateQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const eventId = req.params.eventId as string;

    await qrCodeService.deactivateQRCode(eventId);

    res.json({
      success: true,
      message: "QR code désactivé avec succès",
    });
  });

  /**
   * Obtenir les statistiques d'usage d'un QR code
   */
  static getQRCodeStats = asyncHandler(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;

    const stats = await qrCodeService.getQRCodeStats(eventId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Télécharger l'image du QR code
   */
  static downloadQRCode = asyncHandler(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const format = req.query.format as string || 'png';
    const size = parseInt(req.query.size as string) || 256;

    const qrCodeImage = await qrCodeService.generateQRCodeImage(eventId, { format, size });

    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-qrcode.${format}"`);
    res.send(qrCodeImage);
  });
}