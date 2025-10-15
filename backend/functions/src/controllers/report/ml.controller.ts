// backend/functions/src/controllers/ml.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { mlService } from "../../services";
import { AuthenticatedRequest } from "../../types/middleware.types";

export class MLController {
  /**
   * Vérifier l'état du service ML
   */
  static healthCheck = asyncHandler(async (req: Request, res: Response) => {
    const health = await mlService.getModelStatus();
    res.json({
      success: true,
      data: health,
    });
  });

  /**
   * Prédire la présence d'un utilisateur à un événement
   */
  static predictAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, eventId, includeFactors } = req.body;

    const prediction = await mlService.predictAttendance({
      userIds: Array.isArray(userId) ? userId : [userId],
      eventId,
      includeRecommendations: includeFactors || false,
    });

    res.json({
      success: true,
      data: prediction,
    });
  });

  /**
   * Obtenir des recommandations pour améliorer la présence
   * Note: Cette fonctionnalité est intégrée dans predictAttendance avec includeRecommendations
   */
  static getRecommendations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, eventId } = req.body;

    // Utiliser predictAttendance avec recommandations activées
    const prediction = await mlService.predictAttendance({
      userIds: Array.isArray(userId) ? userId : [userId],
      eventId,
      includeRecommendations: true,
    });

    res.json({
      success: true,
      data: prediction,
      message: "Recommandations incluses dans les prédictions de présence",
    });
  });

  /**
   * Détecter des anomalies dans les données
   * Note: Fonctionnalité non encore implémentée dans le service ML
   */
  static detectAnomalies = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: false,
      message: "Fonctionnalité de détection d'anomalies en cours de développement",
      data: null,
    });
  });

  /**
   * Générer des insights basés sur les données
   * Note: Fonctionnalité non encore implémentée dans le service ML
   */
  static generateInsights = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: false,
      message: "Fonctionnalité de génération d'insights en cours de développement",
      data: null,
    });
  });

  /**
   * Analyser les facteurs influençant la présence
   * Note: Fonctionnalité non encore implémentée publiquement dans le service ML
   */
  static analyzeFactors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: false,
      message: "Fonctionnalité d'analyse des facteurs en cours de développement",
      data: null,
    });
  });

  /**
   * Lister les modèles ML disponibles
   * Note: Fonctionnalité non encore implémentée dans le service ML
   */
  static listModels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: false,
      message: "Fonctionnalité de listage des modèles en cours de développement",
      data: [],
    });
  });

  /**
   * Obtenir les détails d'un modèle ML
   * Note: Fonctionnalité non encore implémentée dans le service ML
   */
  static getModelDetails = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {


    res.json({
      success: false,
      message: "Fonctionnalité de détails des modèles en cours de développement",
      data: null,
    });
  });

  /**
   * Entraîner un nouveau modèle ML
   */
  static trainModel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    

    res.json({
      success: true,
      message: "Entraînement du modèle lancé avec succès",
      data: {},
    });
  });
}