// shared/types/ml.types.ts

import { AttendanceStatus } from './attendance.types';
import { EventType } from './event.types';


// 🤖 TYPES DE BASE ML
export type MLModelType = 'attendance_prediction' | 'behavior_analysis' | 'anomaly_detection' | 'event_optimization';

export type MLModelStatus = 'training' | 'ready' | 'deprecated' | 'failed';

export type PredictionConfidence = 'low' | 'medium' | 'high' | 'very_high';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type OptimizationImpact = 'minimal' | 'moderate' | 'significant' | 'major';

// 📊 MODÈLE ML
export interface MLModel {
  id: string;
  name: string;
  type: MLModelType;
  version: string;
  status: MLModelStatus;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainedAt: Date;
  trainedBy: string;
  dataSize: number;
  featureCount: number;
  hyperparameters: Record<string, any>;
  metadata?: {
    description?: string;
    tags?: string[];
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

// 🎯 REQUÊTES ML
export interface PredictionRequest {
  modelId?: string;
  userId?: string;
  eventId?: string;
  features?: Record<string, number>;
  includeFactors?: boolean;
  includeRecommendations?: boolean;
}

export interface ModelTrainingRequest {
  type: MLModelType;
  name: string;
  dataFilters: {
    dateRange: { start: Date; end: Date };
    userIds?: string[];
    eventTypes?: EventType[];
    departments?: string[];
    minSamples?: number;
  };
  hyperparameters?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
    validationSplit?: number;
    dropout?: number;
    regularization?: number;
  };
  requestedBy: string;
}

// 📈 PRÉDICTIONS DE PRÉSENCE
export interface AttendancePrediction {
  userId: string;
  userName: string;
  eventId: string;
  prediction: {
    willAttend: boolean;
    probability: number; // 0-1
    confidence: PredictionConfidence;
    expectedStatus: AttendanceStatus;
    riskLevel: 'low' | 'medium' | 'high';
    expectedArrivalTime?: Date;
  };
  influencingFactors: InfluencingFactor[];
  recommendations: string[];
  generatedAt: Date;
  modelVersion: string;
}

export interface InfluencingFactor {
  name?: string;
  influence?: string;
  weight?: number; // 0-1
  factor?: string;
  impact: string; // -1 à 1
  description: string;
  category: 'historical' | 'contextual' | 'temporal' | 'environmental' | 'social' | 'behavioral'| 'error';
}

// 🧠 ANALYSE COMPORTEMENTALE
export interface UserBehaviorAnalysis {
  userId: string;
  analysisDate: Date;
  timeframe: { startDate: Date; endDate: Date };
  metrics: {
    attendanceRate: number;
    punctualityRate: number;
    engagementScore: number;
    reliabilityScore: number;
    improvementTrend: number; // -1 à 1
    riskFactors: string[];
  };
  patterns?: BehaviorPattern[];
  futurePredictions?: FutureBehaviorPrediction[];
  insights: BehaviorInsight[];
  recommendations: string[];
}

export interface BehaviorPattern {
  type: 'attendance' | 'punctuality' | 'engagement' | 'seasonal';
  pattern: string;
  confidence: number;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  examples?: string[];
}

export interface FutureBehaviorPrediction {
  timeframe: string;
  predictedAttendanceRate: number;
  predictedPunctualityRate: number;
  riskFactors: string[];
  recommendedActions: string[];
  confidence: PredictionConfidence;
}

export interface BehaviorInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  title: string;
  description: string;
  impact: OptimizationImpact;
  actionable: boolean;
  recommendedActions?: string[];
  priority: 'low' | 'medium' | 'high';
}

// 🚨 DÉTECTION D'ANOMALIES
export interface AnomalyDetection {
  id: string;
  type: 'attendance' | 'behavior' | 'system' | 'security';
  severity: AnomalySeverity;
  title: string;
  description: string;
  detectedAt: Date;
  affectedEntities: {
    users?: string[];
    events?: string[];
    departments?: string[];
  };
  metrics: {
    score: number; // 0-1, plus proche de 1 = plus anormal
    threshold: number;
    confidence: number;
  };
  context: {
    timeframe: { start: Date; end: Date };
    baselineData: Record<string, number>;
    currentData: Record<string, number>;
    deviation: Record<string, number>;
  };
  impact: {
    level: OptimizationImpact;
    description: string;
    estimatedCost?: number;
  };
  recommendedActions: RecommendedAction[];
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface RecommendedAction {
  action: string;
  priority: 'immediate' | 'urgent' | 'normal' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: OptimizationImpact;
  description: string;
  estimatedTime?: string;
  dependencies?: string[];
}

// 🎯 OPTIMISATION D'ÉVÉNEMENTS
export interface EventOptimization {
  eventId: string;
  analysisDate: Date;
  currentAnalysis: {
    attendanceRate: number;
    punctualityRate: number;
    engagementScore: number;
    satisfactionScore?: number;
    costEfficiency?: number;
  };
  optimizations: OptimizationSuggestion[];
  impactSimulation: {
    predictedImprovements: {
      attendanceRate: number;
      punctualityRate: number;
      engagementScore: number;
      costReduction?: number;
    };
    confidence: PredictionConfidence;
    timeToRealize: string;
  };
  implementationPlan: ImplementationStep[];
  generatedAt: Date;
}

export interface OptimizationSuggestion {
  id: string;
  category: 'timing' | 'location' | 'format' | 'communication' | 'incentives';
  title: string;
  description: string;
  rationale: string;
  impact: {
    level: OptimizationImpact;
    metrics: Record<string, number>;
    confidence: number;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    cost: 'free' | 'low' | 'medium' | 'high';
    timeframe: string;
    requirements: string[];
  };
  risks: {
    level: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string[];
  };
  priority: number; // 1-10
}

export interface ImplementationStep {
  step: number;
  title: string;
  description: string;
  estimatedTime: string;
  responsible: 'organizer' | 'admin' | 'system';
  dependencies: number[];
  success_criteria: string[];
}

// 📊 DATASET ET FEATURES
export interface MLDataSet {
  features: number[][];
  labels: number[];
  featureNames: string[];
  metadata: {
    recordCount: number;
    featureCount: number;
    dateRange: { start: Date; end: Date };
    version: string;
    normalizationParams?: {
      means: number[];
      stds: number[];
      mins: number[];
      maxs: number[];
    };
    classDistribution?: Record<string, number>;
  };
}

export interface FeatureVector {
  // Historique utilisateur (0-9)
  averageAttendanceRate: number;
  punctualityScore: number;
  recentTrend: number;
  streakCurrent: number;
  totalEventsAttended: number;
  averageLateness: number;
  preferredMethods: number;
  engagementScore: number;
  reliabilityScore: number;
  seasonalPattern: number;

  // Contexte événement (10-19)
  eventType: number;
  dayOfWeek: number;
  hourOfDay: number;
  duration: number;
  isRecurring: number;
  participantCount: number;
  requiredMethods: number;
  isPrivate: number;
  priority: number;
  advanceNotice: number;

  // Facteurs temporels (20-29)
  timeUntilEvent: number;
  dayOfMonth: number;
  weekOfYear: number;
  monthOfYear: number;
  isHoliday: number;
  isWeekend: number;
  isBusinessHours: number;
  seasonFactor: number;
  vacationSeason: number;
  academicPeriod: number;

  // Facteurs externes (30-39)
  weatherCondition: number;
  temperature: number;
  precipitation: number;
  transportDisruption: number;
  localEvents: number;
  workloadFactor: number;
  stressLevel: number;
  healthFactor: number;
  motivationLevel: number;
  energyLevel: number;

  // Facteurs sociaux (40-49)
  organizerFamiliarity: number;
  teamCohesion: number;
  peerAttendance: number;
  leadershipPresence: number;
  networkEffect: number;
  socialPressure: number;
  groupSize: number;
  diversityIndex: number;
  conflictLevel: number;
  collaborationHistory: number;

  // Facteurs organisationnels (50-59)
  departmentMatch: number;
  roleRelevance: number;
  careerImpact: number;
  mandatoryFlag: number;
  incentiveLevel: number;
  penaltyRisk: number;
  resourceRequirements: number;
  skillRelevance: number;
  learningOpportunity: number;
  networkingValue: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number; // 0-1
  description: string;
  category: 'temporal' | 'behavioral' | 'contextual' | 'historical' | 'environmental' | 'social';
  impact: 'positive' | 'negative' | 'mixed';
}

// 📈 PERFORMANCE ET MÉTRIQUES
export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  loss: number;
  validationAccuracy: number;
  confusionMatrix?: number[][];
  rocAuc?: number;
  crossValidationScore?: number;
  overfitting: {
    detected: boolean;
    severity: 'none' | 'mild' | 'moderate' | 'severe';
    recommendations: string[];
  };
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  validationLoss: number;
  validationAccuracy: number;
  estimatedTimeRemaining: number;
  status: 'running' | 'paused' | 'completed' | 'failed';
}

// 🔍 INSIGHTS ET RECOMMANDATIONS
export interface MLInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation' | 'warning';
  title: string;
  description: string;
  confidence: number;
  impact: OptimizationImpact;
  actionable: boolean;
  recommendedActions?: string[];
  data?: Record<string, any>;
  validUntil?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'efficiency' | 'quality' | 'risk' | 'opportunity';
  targetAudience: string[]; // Changed from UserRole[] to string[] since roles are now in TenantMembership
}

export interface PredictionExplanation {
  prediction: any;
  explanation: {
    topFactors: InfluencingFactor[];
    reasoning: string;
    confidence: PredictionConfidence;
    alternatives: {
      scenario: string;
      probability: number;
      factors: string[];
    }[];
  };
  recommendations: {
    forUser: string[];
    forOrganizer: string[];
    forSystem: string[];
  };
  metadata: {
    modelVersion: string;
    computationTime: number;
    dataFreshness: number;
  };
}

// 🧪 EXPÉRIMENTATION ET A/B TESTING
export interface MLExperiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  type: 'model_comparison' | 'feature_importance' | 'hyperparameter_tuning' | 'algorithm_selection';
  status: 'design' | 'running' | 'analyzing' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  estimatedDuration: number;
  participants: {
    targetGroup: string;
    sampleSize: number;
    controlGroup: number;
    testGroup: number;
  };
  metrics: {
    primary: string[];
    secondary: string[];
  };
  results?: {
    significant: boolean;
    pValue: number;
    effectSize: number;
    confidence: number;
    winner: 'control' | 'test' | 'inconclusive';
    recommendations: string[];
  };
  createdBy: string;
  approvedBy?: string;
}

// 📋 CONFIGURATION ET METADATA
export interface MLConfiguration {
  modelType: MLModelType;
  algorithm: 'neural_network' | 'random_forest' | 'gradient_boosting' | 'svm' | 'logistic_regression';
  hyperparameters: Record<string, any>;
  featureSelection: {
    method: 'automatic' | 'manual' | 'statistical';
    features: string[];
    threshold?: number;
  };
  dataPreprocessing: {
    normalization: 'min_max' | 'z_score' | 'robust' | 'none';
    handleMissing: 'drop' | 'impute_mean' | 'impute_median' | 'impute_mode';
    outlierDetection: 'iqr' | 'zscore' | 'isolation_forest' | 'none';
  };
  validation: {
    method: 'holdout' | 'k_fold' | 'time_series_split';
    splitRatio?: number;
    folds?: number;
  };
}

export interface PredictionResult {
  success: boolean;
  prediction?: any;
  confidence?: number;
  explanation?: PredictionExplanation;
  error?: string;
  metadata: {
    modelId: string;
    modelVersion: string;
    computationTime: number;
    timestamp: Date;
  };
}

// 📊 TYPES D'EXPORT ET REPORTING
export interface MLReport {
  id: string;
  type: 'model_performance' | 'prediction_analysis' | 'anomaly_summary' | 'optimization_results';
  title: string;
  generatedAt: Date;
  generatedBy: string;
  timeframe: { start: Date; end: Date };
  summary: {
    keyMetrics: Record<string, number>;
    insights: string[];
    recommendations: string[];
  };
  data: any;
  visualizations?: {
    type: 'chart' | 'graph' | 'heatmap' | 'scatter';
    config: Record<string, any>;
    data: any[];
  }[];
  format: 'json' | 'pdf' | 'excel' | 'csv';
}

// 🔄 TYPES D'ÉVÉNEMENTS ET HOOKS
export interface MLEvent {
  type: 'prediction_requested' | 'model_trained' | 'anomaly_detected' | 'optimization_generated';
  timestamp: Date;
  userId?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MLHook {
  event: MLEvent['type'];
  callback: (event: MLEvent) => Promise<void>;
  priority: number;
  enabled: boolean;
}

// 🎯 TYPES UTILITAIRES
export type MLModelRegistry = Record<MLModelType, MLModel[]>;

export type PredictionCache = Map<string, {
  result: PredictionResult;
  expiry: Date;
}>;

export type ModelMetrics = Pick<ModelPerformance, 'accuracy' | 'precision' | 'recall' | 'f1Score'>;

export type OptimizationGoals = {
  maximizeAttendance?: boolean;
  improvePunctuality?: boolean;
  minimizeAbsences?: boolean;
  optimizeScheduling?: boolean;
  enhanceEngagement?: boolean;
  reduceCosts?: boolean;
};

// 📤 TYPES D'EXPORT PAR DÉFAUT
export default interface MLTypes {
  MLModel: MLModel;
  AttendancePrediction: AttendancePrediction;
  UserBehaviorAnalysis: UserBehaviorAnalysis;
  AnomalyDetection: AnomalyDetection;
  EventOptimization: EventOptimization;
  PredictionRequest: PredictionRequest;
  ModelTrainingRequest: ModelTrainingRequest;
  MLInsight: MLInsight;
  FeatureVector: FeatureVector;
  ModelPerformance: ModelPerformance;
}