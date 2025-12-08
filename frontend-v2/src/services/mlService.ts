import { apiClient } from './apiClient'

export interface AttendancePrediction {
  eventId: string
  predictionId: string
  generatedAt: string
  overall: {
    expectedAttendance: number
    totalRegistered: number
    predictedRate: number
    confidence: number
    riskLevel: 'low' | 'medium' | 'high'
  }
  individual?: {
    userId: string
    firstName: string
    lastName: string
    attendanceProbability: number
    confidence: number
    factors: Record<string, number>
    riskFactors: string[]
    recommendations: string[]
  }[]
  insights?: {
    keyFactors: { factor: string; impact: number; description: string }[]
    recommendations: string[]
  }
}

export interface MLRecommendation {
  category: string
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  impact: {
    metric: string
    expectedImprovement: number
    confidence: number
  }
  implementation?: {
    effort: string
    timeframe: string
    resources: string[]
  }
}

export interface MLAnomaly {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  confidence: number
  detectedAt: string
  event?: { id: string; name: string; date: string }
  description: string
  metrics?: { expected: number; actual: number; deviation: number; zScore: number }
  possibleCauses: string[]
  recommendations: string[]
  impact?: { severity: string; affectedUsers: number; potentialRevenue: number }
}

export interface MLInsight {
  category: string
  title: string
  description: string
  confidence: number
  impact: string
  data?: Record<string, any>
  visualization?: { type: string; data: any[] }
  recommendations: string[]
}

export interface MLModel {
  id: string
  name: string
  type: string
  status: 'ready' | 'training' | 'error'
  version: string
  description?: string
  metrics: { accuracy: number; precision: number; recall: number; f1Score: number }
  training: { lastTrained: string; trainingDuration: string; dataPoints: number; features: number }
  usage: { totalPredictions: number; dailyAverage: number; lastUsed: string }
}

export interface MLAnalytics {
  usage: { totalPredictions: number; dailyAverage: number; peakUsage: string; byModel: Record<string, number> }
  performance: { averageResponseTime: string; successRate: number; errorRate: number; uptime: number }
  accuracy: { overall: number; trend: string; lastWeek: number; lastMonth: number }
}

export interface MLHealthStatus {
  status: string
  version: string
  models: Record<string, { status: string; version: string; lastTrained: string; accuracy?: number; precision?: number }>
  services: Record<string, string>
}

export async function getMLHealth(): Promise<MLHealthStatus> {
  return apiClient.get('/ml/health')
}

export async function predictAttendance(params: {
  eventId: string
  predictionType?: 'individual' | 'aggregate'
  timeHorizon?: string
  factors?: { weather?: boolean; historical?: boolean; demographics?: boolean; seasonality?: boolean }
  participants?: { userId: string; registrationDate?: string; previousAttendance?: number }[]
}): Promise<AttendancePrediction> {
  return apiClient.post('/ml/predict-attendance', params)
}

export async function batchPredict(params: {
  eventIds: string[]
  predictionType?: 'individual' | 'aggregate'
  timeHorizon?: string
  includeIndividual?: boolean
}): Promise<AttendancePrediction[]> {
  return apiClient.post('/ml/batch-predict', params)
}

export async function getRecommendations(params: {
  type: string
  context: { eventId?: string; organizationId?: string; timeframe?: string }
  focus?: string[]
}): Promise<{ recommendations: MLRecommendation[]; summary: any }> {
  return apiClient.post('/ml/recommendations', params)
}

export async function detectAnomalies(params: {
  scope: 'organization' | 'event' | 'user'
  timeframe: { start: string; end: string }
  sensitivity?: 'low' | 'medium' | 'high'
  categories?: string[]
}): Promise<{ anomalies: MLAnomaly[]; summary: any; trends: any }> {
  return apiClient.post('/ml/anomalies', params)
}

export async function generateInsights(params: {
  scope: 'organization' | 'event' | 'user' | 'department'
  timeframe: string
  categories?: string[]
  depth?: 'summary' | 'detailed'
  includeRecommendations?: boolean
}): Promise<{ insights: MLInsight[]; summary: any; actionItems: any[] }> {
  return apiClient.post('/ml/insights', params)
}

export async function analyzeFactors(params: {
  eventId?: string
  factors: string[]
  analysisType?: 'correlation' | 'causation'
}): Promise<{ factors: any[]; model: any; recommendations: string[] }> {
  return apiClient.post('/ml/analyze-factors', params)
}

export async function getModels(params?: { status?: string; type?: string }): Promise<MLModel[]> {
  return apiClient.get('/ml/models', { params })
}

export async function getModelDetails(modelId: string): Promise<MLModel & { performance: any; trainingHistory: any[] }> {
  return apiClient.get(`/ml/models/${modelId}`)
}

export async function trainModel(config: any): Promise<{ modelId: string; status: string; estimatedTime: number }> {
  return apiClient.post('/ml/models/train', config)
}

export async function getModelPerformance(modelId: string, period?: string): Promise<any> {
  return apiClient.get(`/ml/models/${modelId}/performance`, { params: { period } })
}

export async function getMLAnalytics(params?: { period?: string; metrics?: string }): Promise<MLAnalytics> {
  return apiClient.get('/ml/analytics', { params })
}

