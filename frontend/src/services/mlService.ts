/**
 * Service pour les fonctionnalités ML et IA
 */

import { apiService } from './api';

// Types locaux pour ML
export interface AttendancePrediction {
  userId: string;
  eventId: string;
  probability: number;
  confidence: number;
  factors?: {
    name: string;
    impact: number;
    description: string;
  }[];
}

export interface MLRecommendation {
  id: string;
  type: 'attendance' | 'event' | 'user' | 'department' | 'global';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: number;
  actionable: boolean;
  actions?: string[];
}

export interface Anomaly {
  id: string;
  type: 'attendance' | 'behavior' | 'event';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedEntities: string[];
  detectedAt: Date;
  resolved: boolean;
  recommendations?: MLRecommendation[];
}

export interface MLInsight {
  id: string;
  type: 'user' | 'event' | 'department' | 'global';
  title: string;
  description: string;
  metrics: {
    name: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  }[];
  recommendations?: MLRecommendation[];
}

export interface MLModel {
  id: string;
  name: string;
  type: 'attendance_prediction' | 'behavior_analysis' | 'anomaly_detection';
  status: 'active' | 'training' | 'failed' | 'archived';
  accuracy: number;
  lastTrained: Date;
  version: string;
  description?: string;
}

export interface ModelTrainingConfig {
  type: 'attendance_prediction' | 'behavior_analysis' | 'anomaly_detection';
  config?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    validationSplit?: number;
  };
  description?: string;
}

class MLService {
  private readonly basePath = '/api/ml';

  /**
   * Vérifier la santé du service ML
   */
  async healthCheck() {
    return apiService.get<{
      status: string;
      models: number;
      lastUpdate: Date;
    }>(`${this.basePath}/health`);
  }

  /**
   * Prédire la présence d'un utilisateur à un événement
   */
  async predictAttendance(userId: string, eventId: string, includeFactors = false) {
    return apiService.post<AttendancePrediction>(`${this.basePath}/predict-attendance`, {
      userId,
      eventId,
      includeFactors
    });
  }

  /**
   * Prédictions en lot pour plusieurs utilisateurs
   */
  async batchPredictAttendance(
    eventId: string, 
    userIds: string[], 
    includeFactors = false,
    includeRecommendations = false
  ) {
    return apiService.post<AttendancePrediction[]>(`${this.basePath}/batch-predict`, {
      eventId,
      userIds,
      includeFactors,
      includeRecommendations
    });
  }

  /**
   * Obtenir des recommandations intelligentes
   */
  async getRecommendations(
    type: 'attendance' | 'event' | 'user' | 'department' | 'global',
    targetId?: string,
    context?: Record<string, any>
  ) {
    return apiService.post<MLRecommendation[]>(`${this.basePath}/recommendations`, {
      type,
      targetId,
      context
    });
  }

  /**
   * Détecter des anomalies
   */
  async detectAnomalies(
    type: 'attendance' | 'behavior' | 'event',
    timeframe: { start: string; end: string },
    threshold = 0.7,
    includeRecommendations = false
  ) {
    return apiService.post<Anomaly[]>(`${this.basePath}/anomalies`, {
      type,
      timeframe,
      threshold,
      includeRecommendations
    });
  }

  /**
   * Générer des insights
   */
  async generateInsights(
    type: 'user' | 'event' | 'department' | 'global',
    timeframe: { start: string; end: string },
    targetId?: string,
    includeRecommendations = false
  ) {
    return apiService.post<MLInsight[]>(`${this.basePath}/insights`, {
      type,
      targetId,
      timeframe,
      includeRecommendations
    });
  }

  /**
   * Analyser les facteurs d'influence
   */
  async analyzeFactors(
    userId?: string,
    eventId?: string,
    timeframe?: { start: string; end: string }
  ) {
    return apiService.post<{
      factors: {
        name: string;
        importance: number;
        impact: 'positive' | 'negative';
        description: string;
      }[];
      insights: string[];
    }>(`${this.basePath}/analyze-factors`, {
      userId,
      eventId,
      timeframe
    });
  }

  /**
   * Lister les modèles ML
   */
  async listModels(
    type?: string,
    status?: 'active' | 'training' | 'failed' | 'archived',
    page = 1,
    limit = 20
  ) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type }),
      ...(status && { status })
    });

    return apiService.get<{
      data: MLModel[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.basePath}/models?${params.toString()}`);
  }

  /**
   * Obtenir les détails d'un modèle
   */
  async getModelDetails(modelId: string) {
    return apiService.get<MLModel & {
      performance: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
      };
      trainingHistory: {
        epoch: number;
        loss: number;
        accuracy: number;
        valLoss: number;
        valAccuracy: number;
      }[];
    }>(`${this.basePath}/models/${modelId}`);
  }

  /**
   * Entraîner un nouveau modèle
   */
  async trainModel(config: ModelTrainingConfig) {
    return apiService.post<{
      modelId: string;
      status: string;
      estimatedTime: number;
    }>(`${this.basePath}/models/train`, config);
  }

  /**
   * Obtenir les performances d'un modèle
   */
  async getModelPerformance(modelId: string, timeframe = '7d') {
    return apiService.get<{
      accuracy: number;
      predictions: number;
      successRate: number;
      trends: {
        date: string;
        accuracy: number;
        predictions: number;
      }[];
    }>(`${this.basePath}/models/${modelId}/performance?timeframe=${timeframe}`);
  }

  /**
   * Tester une prédiction avec un modèle spécifique
   */
  async testPrediction(modelId: string, testData: { userId: string; eventId: string }) {
    return apiService.post<AttendancePrediction>(`${this.basePath}/test-prediction`, {
      modelId,
      testData
    });
  }

  /**
   * Obtenir les analytics ML
   */
  async getAnalytics(
    timeframe?: { start: string; end: string },
    type?: 'predictions' | 'accuracy' | 'usage' | 'performance'
  ) {
    const params = new URLSearchParams();
    if (timeframe) {
      params.append('timeframe[start]', timeframe.start);
      params.append('timeframe[end]', timeframe.end);
    }
    if (type) {
      params.append('type', type);
    }

    const queryString = params.toString();
    return apiService.get<{
      totalPredictions: number;
      averageAccuracy: number;
      modelsActive: number;
      insights: MLInsight[];
      trends: {
        date: string;
        predictions: number;
        accuracy: number;
      }[];
    }>(`${this.basePath}/analytics${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtenir des recommandations pour un utilisateur spécifique
   */
  async getUserRecommendations(userId: string) {
    return this.getRecommendations('user', userId);
  }

  /**
   * Obtenir des recommandations pour un événement spécifique
   */
  async getEventRecommendations(eventId: string) {
    return this.getRecommendations('event', eventId);
  }

  /**
   * Obtenir des recommandations globales
   */
  async getGlobalRecommendations() {
    return this.getRecommendations('global');
  }

  /**
   * Obtenir les anomalies récentes
   */
  async getRecentAnomalies(hours = 24) {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    
    return this.detectAnomalies(
      'attendance',
      {
        start: start.toISOString(),
        end: end.toISOString()
      },
      0.7,
      true
    );
  }

  /**
   * Obtenir les insights du tableau de bord
   */
  async getDashboardInsights() {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 jours

    return this.generateInsights(
      'global',
      {
        start: start.toISOString(),
        end: end.toISOString()
      },
      undefined,
      true
    );
  }
}

export const mlService = new MLService();