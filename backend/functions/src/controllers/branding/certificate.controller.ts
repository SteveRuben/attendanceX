// backend/functions/src/controllers/certificate.controller.ts - Contrôleur des certificats

import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { certificateService } from "../../services";
import { AuthenticatedRequest } from "../../types";



export class CertificateController {
  /**
   * Générer un certificat pour une présence
   */
  static generateAttendanceCertificate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { attendanceId } = req.params;

    const certificate = await certificateService.generateAttendanceCertificate(attendanceId);

    res.status(201).json({
      success: true,
      message: "Certificat généré avec succès",
      data: certificate,
    });
  });

  /**
   * Génération en masse de certificats pour un événement
   */
  static bulkGenerateCertificates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;

    const certificates = await certificateService.bulkGenerateCertificates(eventId);

    res.json({
      success: true,
      message: `${certificates.length} certificats générés avec succès`,
      data: {
        certificates,
        count: certificates.length
      },
    });
  });

  /**
   * Valider un certificat
   */
  static validateCertificate = asyncHandler(async (req: Request, res: Response) => {
    const { certificateId } = req.params;

    const validation = await certificateService.validateCertificate(certificateId);

    res.json({
      success: true,
      data: validation,
    });
  });

  /**
   * Obtenir les certificats d'un utilisateur
   */
  static getUserCertificates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user.uid;

    // Vérifier que l'utilisateur peut accéder à ces certificats
    if (userId !== currentUserId) {
      // Vérifier les permissions pour voir les certificats d'autres utilisateurs
      const hasPermission = req.user.permissions['view_all_certificates'];
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view other user certificates'
        });
      }
    }

    // Méthode temporaire - à implémenter dans le service
    const certificates = await certificateService.getCertificatesByUser(userId);

    return res.json({
      success: true,
      data: certificates,
    });
  });

  /**
   * Obtenir les certificats d'un événement
   */
  static getEventCertificates = asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Méthode temporaire - à implémenter dans le service
    const result = await certificateService.getCertificatesByEvent(eventId, { page, limit });

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Télécharger un certificat
   */
  static downloadCertificate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { certificateId } = req.params;
    const userId = req.user.uid;

    // Méthode temporaire - à implémenter dans le service
    const result = await certificateService.getCertificateDownloadUrl(certificateId, userId);

    if (!result.canDownload) {
      return res.status(403).json({
        success: false,
        error: result.reason || 'Download not allowed'
      });
    }

    // Rediriger vers l'URL du PDF ou servir le fichier directement
    if (result.downloadUrl) {
      return res.redirect(result.downloadUrl);
    } else {
      return res.status(404).json({
        success: false,
        error: 'Certificate file not found'
      });
    }
  });

  /**
   * Créer un template de certificat
   */
  static createCertificateTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templateData = req.body;
    const userId = req.user.uid;
    
    // Récupérer l'organisation de l'utilisateur - temporaire
    const organizationId = 'default-org'; // À récupérer depuis le contexte utilisateur
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization to create templates'
      });
    }

    const template = await certificateService.customizeCertificateTemplate(organizationId, {
      ...templateData,
      createdBy: userId
    });

    return res.status(201).json({
      success: true,
      message: "Template de certificat créé avec succès",
      data: template,
    });
  });

  /**
   * Obtenir les templates de certificats
   */
  static getCertificateTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = 'default-org'; // À récupérer depuis le contexte utilisateur
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization'
      });
    }

    // Méthode temporaire - à implémenter dans le service
    const templates = await certificateService.getTemplatesByOrganization(organizationId);

    return res.json({
      success: true,
      data: templates,
    });
  });

  /**
   * Mettre à jour un template de certificat
   */
  static updateCertificateTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { templateId } = req.params;
    const updates = req.body;
    const userId = req.user.uid;

    const template = await certificateService.updateCertificateTemplate(templateId, updates, userId);

    res.json({
      success: true,
      message: "Template mis à jour avec succès",
      data: template,
    });
  });

  /**
   * Supprimer un template de certificat
   */
  static deleteCertificateTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { templateId } = req.params;
    const userId = req.user.uid;

    await certificateService.deleteCertificateTemplate(templateId, userId);

    res.json({
      success: true,
      message: "Template supprimé avec succès",
    });
  });

  /**
   * Obtenir les statistiques des certificats
   */
  static getCertificateStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = 'default-org'; // À récupérer depuis le contexte utilisateur
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization'
      });
    }

    // Méthode temporaire - à implémenter dans le service
    const stats = await certificateService.getStatsByOrganization(organizationId);

    return res.json({
      success: true,
      data: stats,
    });
  });
}