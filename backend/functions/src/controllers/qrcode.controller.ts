// backend/functions/src/controllers/qrcode.controller.ts - Contrôleur pour la gestion des QR codes

import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { qrCodeService } from "../services/qrcode.service";
import { AuthenticatedRequest } from "../types/middleware.types";


export class QRCodeController {
  /**
   * Générer un QR code pour un événement
   */
  static generateEventQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const options = req.body;

    // Convertir les dates string en objets Date
    if (options.expiresAt) {
      options.expiresAt = new Date(options.expiresAt);
    }
    if (options.timeWindow) {
      options.timeWindow.start = new Date(options.timeWindow.start);
      options.timeWindow.end = new Date(options.timeWindow.end);
    }

    const qrCode = await qrCodeService.generateEventQRCode(eventId, options);

    res.status(201).json({
      success: true,
      message: "QR code généré avec succès",
      data: qrCode,
    });
  });

  /**
   * Valider un QR code scanné
   */
  static validateQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { qrCodeData, location } = req.body;
    const userId = req.user.uid;

    const validation = await qrCodeService.validateQRCode(qrCodeData, userId, location);

    res.json({
      success: true,
      data: validation,
    });
  });

  /**
   * Régénérer un QR code
   */
  static regenerateQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;

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
    const { eventId } = req.params;

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
    const { eventId } = req.params;

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
    const { eventId } = req.params;
    const format = req.query.format as string || 'png';
    const size = parseInt(req.query.size as string) || 256;

    const qrCodeImage = await qrCodeService.generateQRCodeImage(eventId, { format, size });

    res.setHeader('Content-Type', `image/${format}`);
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-qrcode.${format}"`);
    res.send(qrCodeImage);
  });
}