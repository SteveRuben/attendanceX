// src/services/mlService.ts - Service ML/IA pour le frontend
import { apiService, type ApiResponse } from './apiService';

// Types pour les prédictions
export interface AttendancePrediction {
  userId: string;
  userName: string;
  eventId: string;
  prediction: {
    willAttend: boolean;
    probability: number;
    confidence: 'low' | 'medium' | 'high';
    expectedStatus: 'present' | 'late' | 'absent' | 'excused';
    riskLevel: 'low' | 'medium' | 'high';
    expectedArrivalTime?: string;
  };
  influencingFactors: Array<{
    name: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
  recommendations: string[];
  generatedAt: string;
  modelVersion: string;
}

// Types pour les recommandations
export interface MLRecommendation {
  type: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  action?: {
    type: string;
    description: string;
    target?: string;
  };
}

// Types pour les anomalies
export interface MLAnomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedEntities: string[];
  detectedAt: string;
  confidence: number;
  recommendations?: string[];
}

// Types pour les insights
export interface MLInsight {
  type: string;
  title: string;
  description: string;
  confidence: number;
  category: string;
  actionable: boolean;
  action?: {
    type: string;
    description: string;
    target?: string;
  };
  data?: Record<string, any>;
}

// Types pour les modèles
export interface MLModel {
  id: string;
  type: string;
  description: string;
  status: 'active' | 'training' | 'failed' | 'archived';
  performance?: {
    accuracy: number;
    f1Score: number;
  };
  trainedAt: string;
  trainedBy: string;
  lastUsed?: string;
}

// Types pour les facteurs d'influence
export interface InfluencingFactor {
  name: string;
  impact: number;
  direction: 'positive' | 'negative';
}

// Types pour les tendances
export interface MLTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  significance: 'low' | 'medium' | 'high';
}

// Types pour les analytics ML
export interface MLAnalytics {
  insights: MLInsight[];
  trends: MLTrend[];
  recommendations: string[];
}

class MLService {
  // 🔮 PRÉDICTIONS DE PRÉSENCE
  async predictAttendance(data: {
    userId: string;
    eventId: string;
    includeFactors?: boolean;
  }): Promise<ApiResponse<AttendancePrediction>> {
    return apiService.post<AttendancePrediction>('/ml/predict-attendance', data);
  }

  // Prédictions en masse
  async batchPredictAttendance(data: {
    eventId: string;
    userIds: string[];
    includeFactors?: boolean;
    includeRecommendations?: boolean;
  }): Promise<ApiResponse<AttendancePrediction[]>> {
    return apiService.post<AttendancePrediction[]>('/ml/batch-predict', data);
  }

  // 💡 RECOMMANDATIONS INTELLIGENTES
  async getRecommendations(data: {
    type: 'attendance' | 'event' | 'user' | 'department';
    targetId: string;
    context?: Record<string, any>;
  }): Promise<ApiResponse<{
    recommendations: string[];
    confidence: number;
    basedOn: string[];
  }>> {
    return apiService.post('/ml/recommendations', data);
  }

  // 🚨 DÉTECTION D'ANOMALIES
  async detectAnomalies(data: {
    type: 'attendance' | 'behavior' | 'event';
    timeframe: {
      start: string;
      end: string;
    };
    threshold?: number;
    includeRecommendations?: boolean;
  }): Promise<ApiResponse<{
    anomalies: MLAnomaly[];
    summary: {
      totalAnomalies: number;
      severityBreakdown: Record<string, number>;
      mostCommonType: string;
    };
  }>> {
    return apiService.post('/ml/anomalies', data);
  }

  // 📊 GÉNÉRATION D'INSIGHTS
  async generateInsights(data: {
    type: 'user' | 'event' | 'department' | 'global';
    targetId?: string;
    timeframe: {
      start: string;
      end: string;
    };
    includeRecommendations?: boolean;
  }): Promise<ApiResponse<MLAnalytics>> {
    return apiService.post<MLAnalytics>('/ml/insights', data);
  }

  // 🔍 ANALYSE DES FACTEURS D'INFLUENCE
  async analyzeFactors(data: {
    userId?: string;
    eventId?: string;
    timeframe?: {
      start: string;
      end: string;
    };
  }): Promise<ApiResponse<InfluencingFactor[]>> {
    return apiService.post<InfluencingFactor[]>('/ml/analyze-factors', data);
  }

  // 🤖 GESTION DES MODÈLES ML
  async listModels(filters: {
    type?: string;
    status?: 'active' | 'training' | 'failed' | 'archived';
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{
    data: MLModel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    return apiService.get('/ml/models', filters);
  }

  async getModelDetails(id: string): Promise<ApiResponse<MLModel & {
    featureImportance?: Array<{
      featureName: string;
      importance: number;
      rank: number;
    }>;
    config: Record<string, any>;
    usageCount?: number;
  }>> {
    return apiService.get(`/ml/models/${id}`);
  }

  async trainModel(data: {
    type: 'attendance_prediction' | 'behavior_analysis' | 'anomaly_detection';
    config?: {
      epochs?: number;
      batchSize?: number;
      learningRate?: number;
      validationSplit?: number;
    };
    description?: string;
  }): Promise<ApiResponse<{
    modelId: string;
    status: string;
    estimatedCompletionTime?: string;
  }>> {
    return apiService.post('/ml/models/train', data);
  }

  // 📈 ANALYTICS ML
  async getMLAnalytics(filters: {
    timeframe?: {
      start: string;
      end: string;
    };
    type?: 'predictions' | 'accuracy' | 'usage' | 'performance';
  } = {}): Promise<ApiResponse<{
    totalPredictions: number;
    accuracyRate: number;
    modelUsage: Record<string, number>;
    trends: MLTrend[];
    insights: MLInsight[];
  }>> {
    return apiService.get('/ml/analytics', filters);
  }

  // 🧪 TEST ET VALIDATION
  async testPrediction(data: {
    modelId: string;
    testData: {
      userId: string;
      eventId: string;
    };
  }): Promise<ApiResponse<AttendancePrediction>> {
    return apiService.post('/ml/test-prediction', data);
  }

  // 🏥 SANTÉ DU SERVICE ML
  async healthCheck(): Promise<ApiResponse<{
    status: string;
    models: {
      total: number;
      active: number;
    };
    lastTraining?: string;
    version: string;
  }>> {
    return apiService.get('/ml/health');
  }

  // 🎯 MÉTHODES UTILITAIRES

  // Formater la probabilité en pourcentage
  formatProbability(probability: number): string {
    return `${Math.round(probability * 100)}%`;
  }

  // Obtenir la couleur selon le niveau de risque
  getRiskColor(riskLevel: 'low' | 'medium' | 'high'): string {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-red-600'
    };
    return colors[riskLevel];
  }

  // Obtenir l'icône selon le niveau de confiance
  getConfidenceIcon(confidence: 'low' | 'medium' | 'high'): string {
    const icons = {
      low: '⚠️',
      medium: '✅',
      high: '🎯'
    };
    return icons[confidence];
  }

  // Formater les facteurs d'influence
  formatInfluencingFactors(factors: InfluencingFactor[]): string {
    const positive = factors.filter(f => f.direction === 'positive');
    const negative = factors.filter(f => f.direction === 'negative');

    let result = '';
    if (positive.length > 0) {
      result += `Facteurs positifs: ${positive.map(f => f.name).join(', ')}. `;
    }
    if (negative.length > 0) {
      result += `Facteurs négatifs: ${negative.map(f => f.name).join(', ')}.`;
    }

    return result.trim();
  }

  // Obtenir le statut de prédiction en français
  getStatusLabel(status: string): string {
    const labels = {
      present: 'Présent',
      late: 'En retard',
      absent: 'Absent',
      excused: 'Excusé'
    };
    return labels[status as keyof typeof labels] || status;
  }

  // Calculer le score de fiabilité global
  calculateReliabilityScore(predictions: AttendancePrediction[]): number {
    if (predictions.length === 0) return 0;

    const totalConfidence = predictions.reduce((sum, pred) => {
      const confidenceScore = pred.prediction.confidence === 'high' ? 1 :
        pred.prediction.confidence === 'medium' ? 0.7 : 0.4;
      return sum + confidenceScore;
    }, 0);

    return Math.round((totalConfidence / predictions.length) * 100);
  }

  // Grouper les anomalies par sévérité
  groupAnomaliesBySeverity(anomalies: MLAnomaly[]): Record<string, MLAnomaly[]> {
    return anomalies.reduce((groups, anomaly) => {
      const severity = anomaly.severity;
      if (!groups[severity]) {
        groups[severity] = [];
      }
      groups[severity].push(anomaly);
      return groups;
    }, {} as Record<string, MLAnomaly[]>);
  }

  // Obtenir les recommandations prioritaires
  getPriorityRecommendations(recommendations: MLRecommendation[]): MLRecommendation[] {
    return recommendations
      .filter(rec => rec.actionable && rec.priority === 'high')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }
}

export const mlService = new MLService();
export default mlService;