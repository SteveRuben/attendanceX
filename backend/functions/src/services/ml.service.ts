// backend/functions/src/services/ml.service.ts

import {getFirestore} from "firebase-admin/firestore";
import {userService} from "./user.service";
import {eventService} from "./event.service";
import * as tf from "@tensorflow/tfjs-node";
import {
  AttendancePrediction,
  AttendanceStatus,
  ERROR_CODES,
  FeatureImportance,
  InfluencingFactor,
  MLDataSet,
  MLInsight,
  ModelPerformance,
  ModelTrainingRequest,
  User,
  UserRole,
} from "@attendance-x/shared";
import {TriggerLogger} from "../triggers/trigger.utils";
import {logger} from "firebase-functions";
import {attendanceService} from "./attendance.service";


export class MLService {
  public async getModelStatus() {
    return {ok:"ok"}
  }
  private readonly db = getFirestore();
  private readonly modelCache = new Map<string, { model: tf.LayersModel; lastUsed: Date }>();
  private readonly predictionCache = new Map<string, { result: any; expiry: Date }>();
  private readonly featureExtractors = new Map<string, (filters: any) => Promise<MLDataSet>>();

  constructor() {
    this.initializeFeatureExtractors();
    // AVERTISSEMENT: L'auto-nettoyage via setInterval n'est pas fiable en environnement serverless.
    // Une fonction "cron" séparée (onSchedule) doit être utilisée pour appeler périodiquement
    // des méthodes de nettoyage.
  }

  // 🔧 INITIALISATION DES EXTRACTEURS DE CARACTÉRISTIQUES
  private initializeFeatureExtractors(): void {
    this.featureExtractors.set("attendance_prediction", this.extractAttendanceFeatures.bind(this));
    this.featureExtractors.set("behavior_analysis", this.extractBehaviorFeatures.bind(this));
    this.featureExtractors.set("anomaly_detection", this.extractAnomalyFeatures.bind(this));
    this.featureExtractors.set("event_optimization", this.extractOptimizationFeatures.bind(this));
  }

  // 🧠 ENTRAÎNEMENT DE MODÈLES COMPLET
  async trainModel(request: ModelTrainingRequest): Promise<{
    modelId: string;
    performance: ModelPerformance;
    featureImportance: FeatureImportance[];
    insights: MLInsight[];
  }> {
    try {
      if (!await this.canTrainModels(request.requestedBy)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }
      this.validateTrainingRequest(request);

      const dataset = await this.prepareTrainingData(request);
      if (dataset.metadata.recordCount < (request.dataFilters.minSamples || 100)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_DATA);
      }

      const model = await this.buildModel(request.type, dataset);
      const trainedModel = await this.trainTensorFlowModel(model, dataset, request.hyperparameters);
      const performance = await this.evaluateModel(trainedModel, dataset);
      const featureImportance = await this.calculateFeatureImportance(trainedModel, dataset);
      const insights = await this.generateModelInsights(performance, featureImportance, dataset);

      const modelId = await this.saveModel(trainedModel, {
        type: request.type,
        version: this.generateModelVersion(),
        performance,
        featureImportance,
        insights,
        trainedBy: request.requestedBy,
        trainedAt: new Date(),
        dataFilters: request.dataFilters,
        hyperparameters: request.hyperparameters,
      });

      this.modelCache.set(modelId, {model: trainedModel, lastUsed: new Date()});
      await this.logMLAction("model_trained", modelId, request.requestedBy, { /* ... */ });

      return {modelId, performance, featureImportance, insights};
    } catch (error: any) {
      TriggerLogger.error("MLService", "trainModel", request.type, error);
      throw new Error(error.message || ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // 🔮 PRÉDICTIONS DE PRÉSENCE AVANCÉES
  async predictAttendance(request: {
    eventId: string;
    userIds: string[];
    modelId?: string;
    includeRecommendations?: boolean;
  }): Promise<AttendancePrediction[]> {
    try {
      const event = await eventService.getEventById(request.eventId);
      const modelId = request.modelId || await this.getDefaultModelId("attendance_prediction");
      const model = await this.getModel(modelId);
      const predictions: AttendancePrediction[] = [];

      // Traitement par lots pour optimiser
      for (let i = 0; i < request.userIds.length; i += 50) {
        const batchUserIds = request.userIds.slice(i, i + 50);
        const batchPromises = batchUserIds.map(async (userId) => {
          try {
            const cacheKey = `attendance_${request.eventId}_${userId}_${modelId}`;
            const cached = this.predictionCache.get(cacheKey);
            if (cached && cached.expiry > new Date()) return cached.result;

            const user = await userService.getUserById(userId);
            const userHistory = await this.getUserAttendanceHistory(userId);
            const features = await this.extractPredictionFeatures(user.getData(), event.getData(), userHistory);
            const prediction = await this.makePrediction(model, features);
            // Calculer les facteurs d'influence
            const influencingFactors = await this.analyzeInfluencingFactors(features, prediction);
            // Générer des recommandations si demandées
            const recommendations = request.includeRecommendations ?
              await this.generateAttendanceRecommendations(prediction, features, userHistory) :
              [];

            const result: AttendancePrediction = {
              userId,
              userName: user.getData().displayName,
              eventId: request.eventId,
              prediction: {
                willAttend: prediction.probability > 0.5,
                probability: prediction.probability,
                confidence: prediction.confidence > 0.7 ? "high" : prediction.confidence > 0.5 ? "medium" : "low",
                expectedStatus: this.mapProbabilityToStatus(prediction.probability),
                riskLevel: this.calculateRiskLevel(prediction.probability, user.getData()),
                expectedArrivalTime: this.predictArrivalTime(prediction, features),
              },
              influencingFactors,
              recommendations,
              generatedAt: new Date(),
              modelVersion: modelId,
            };
            this.predictionCache.set(cacheKey, {result, expiry: new Date(Date.now() + 5 * 60 * 1000)});
            return result;
          } catch (error) {
            TriggerLogger.error("MLService", "predictAttendance_user", userId, error);
            return null;
          }
        });
        const batchResults = (await Promise.all(batchPromises)).filter((p): p is AttendancePrediction => p !== null);
        predictions.push(...batchResults);
      }
      return predictions;
    } catch (error) {
      TriggerLogger.error("MLService", "predictAttendance", request.eventId, error);
      throw new Error(ERROR_CODES.PREDICTION_FAILED);
    }
  }


  /**
  * Simule la prédiction de l'heure d'arrivée basée sur l'historique de ponctualité.
  * NOTE: Une implémentation réelle nécessiterait un modèle de régression distinct.
  * @param eventStartTime - L'heure de début de l'événement.
  * @param userHistory - L'historique de présence de l'utilisateur.
  * @returns Une heure d'arrivée prédite.
  */
  predictArrivalTime(prediction: { probability: number; confidence: number; }, features: any): Date {
    /* const punctuality = userHistory.punctualityScore || 0.8; // Score par défaut de 80%
    const deviationMinutes = (1 - punctuality) * 30; // Max 30 minutes de déviation

    // Si ponctuel, arrive un peu en avance; sinon, un peu en retard.
    const arrivalTime = new Date(eventStartTime.getTime());
    if (punctuality > 0.7) {
      arrivalTime.setMinutes(arrivalTime.getMinutes() - (punctuality - 0.7) * 15); // Arrive jusqu'à 5 min en avance
    } else {
      arrivalTime.setMinutes(arrivalTime.getMinutes() + deviationMinutes);
    } */

    return new Date();
  }


  public async initializeUserProfile(userId: string, userData: Partial<User>): Promise<void> {/* ... */}
  public async updateUserProfile(userId: string, userData: Partial<User>): Promise<void> {/* ... */}
  public async deleteUserProfile(userId: string): Promise<void> {/* ... */}
  public async updateUserBehaviorData(userId: string, attendanceData: any): Promise<void> {/* ... */}
  public async removeUserBehaviorData(userId: string, attendance: any): Promise<void> {/* ... */}

  // 🔄 --- GESTION DES ÉVÉNEMENTS ---

  public async predictEventAttendance(eventId: string, eventData: any): Promise<void> {
    try {
      const participants = eventData.participants || [];
      if (participants.length === 0) return;

      const predictions = await this.predictAttendance({eventId, userIds: participants});
      const expectedAttendees = predictions.filter((p) => p.prediction.willAttend).length;
      const expectedAttendanceRate = (expectedAttendees / participants.length) * 100;

      await this.db.collection("event_predictions").doc(eventId).set({
        // ... sauvegarde des prédictions agrégées
        expectedAttendanceRate,
      });
    } catch (error) {
      TriggerLogger.error("MLService", "predictEventAttendance", eventId, error);
    }
  }
  public async updateEventPredictions(eventId: string, eventData: any): Promise<void> {/* ... */}
  public async cleanupEventData(eventId: string): Promise<void> {/* ... */}
  public async analyzeCheckInPatterns(userId: string, attendance: any): Promise<void> {/* ... */}

  private async canTrainModels(userId: string): Promise<boolean> {
    const user = await userService.getUserById(userId);
    const userData = user.getData();
    return [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ANALYST].includes(userData.role);
  }

  private validateTrainingRequest(request: ModelTrainingRequest): void {
    if (!request.type) throw new Error(ERROR_CODES.INVALID_MODEL_TYPE);
    if (!request.dataFilters.dateRange) throw new Error(ERROR_CODES.INVALID_DATE_RANGE);
    const daysDiff = (new Date(request.dataFilters.dateRange.end).getTime() - new Date(request.dataFilters.dateRange.start).getTime()) / 86400000;
    if (daysDiff < 30) throw new Error(ERROR_CODES.INSUFFICIENT_DATA_TIMEFRAME);
  }

  private async prepareTrainingData(request: ModelTrainingRequest): Promise<MLDataSet> {
    const extractor = this.featureExtractors.get(request.type);
    if (!extractor) throw new Error(ERROR_CODES.FEATURE_EXTRACTOR_NOT_FOUND);
    return extractor(request.dataFilters);
  }

  private async buildModel(modelType: string, dataset: MLDataSet): Promise<tf.LayersModel> {
    const inputShape = [dataset.metadata.featureCount];
    const model = tf.sequential({
      layers: [
        tf.layers.dense({inputShape, units: 128, activation: "relu"}),
        tf.layers.dropout({rate: 0.3}),
        tf.layers.dense({units: 64, activation: "relu"}),
        tf.layers.dense({
          units: modelType === "attendance_prediction" ? 1 : 2, // Simplifié
          activation: modelType === "attendance_prediction" ? "sigmoid" : "softmax",
        }),
      ],
    });
    model.compile({optimizer: tf.train.adam(0.001), loss: "binaryCrossentropy", metrics: ["accuracy"]});
    return model;
  }


  /**
   * Placeholder: Extraire et transformer les données pour l'analyse de comportement.
   */
  private async extractBehaviorFeatures(filters: any): Promise<MLDataSet> {
    TriggerLogger.info("MLService", "extractBehaviorFeatures", "Extracting features for behavior analysis...");
    // TODO: Implémenter la logique réelle.
    return {
      features: [],
      labels: [],
      featureNames: [],
      metadata: {
        featureCount: 0, recordCount: 0,
        dateRange: {
          start: new Date(filters.dateRange.start),
          end: new Date(filters.dateRange.end),
        },
        version: "",
      },
    };
  }

  /**
   * Placeholder: Extraire et transformer les données pour l'optimisation d'événements.
   */
  private async extractOptimizationFeatures(filters: any): Promise<MLDataSet> {
    TriggerLogger.info("MLService", "extractOptimizationFeatures", "Extracting features for event optimization...");
    // TODO: Implémenter la logique réelle.
    return {
      features: [],
      labels: [],
      featureNames: [],
      metadata: {
        featureCount: 0, recordCount: 0,
        dateRange: {
          start: new Date(filters.dateRange.start),
          end: new Date(filters.dateRange.end),
        },
        version: "",
      },
    };
  }


  private async makePrediction(model: any, features: any): Promise<{ probability: number; confidence: number }> {
    return model.predict(features);
  }
  private generateModelVersion(): string {
    return `v${Date.now()}_v1`;
  }

  /**
  * Placeholder: Extraire et transformer les données pour la prédiction de présence.
  * @param filters - Filtres pour la requête de données (ex: plage de dates).
  * @returns Un jeu de données prêt pour l'entraînement.
  */
  private async extractAttendanceFeatures(filters: any): Promise<MLDataSet> {
    try {
      TriggerLogger.info("MLService", "extractAttendanceFeatures", "Starting feature extraction...");
      // @ts-ignore
      const {dateRange, userIds, eventTypes, departments} = filters;

      // 1. Récupérer les données brutes
      const attendanceOptions = {
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end),
        },
      };

      const attendancesResult = await attendanceService.getAttendances(attendanceOptions);
      const attendances = attendancesResult.attendances;

      // Filtrer selon les critères
      const filteredAttendances = attendances.filter((attendance) => {
        if (userIds && !userIds.includes(attendance.userId)) return false;
        /*  if (eventTypes && !eventTypes.includes(attendance.eventType)) return false; */
        return true;
      });

      // 2. Récupérer les données des utilisateurs et événements
      const userIds_unique = [...new Set(filteredAttendances.map((a) => a.userId))];
      const eventIds_unique = [...new Set(filteredAttendances.map((a) => a.eventId))];

      const [users, events] = await Promise.all([
        this.getUsersData(userIds_unique),
        this.getEventsData(eventIds_unique),
      ]);

      const userMap = new Map(users.map((u) => [u.id!, u]));
      const eventMap = new Map(events.map((e) => [e.id!, e]));

      // 3. Extraire les features pour chaque présence
      const features: number[][] = [];
      const labels: number[] = [];
      const featureNames = [
        "user_historical_attendance_rate",
        "user_punctuality_score",
        "user_role_numeric",
        "user_tenure_days",
        "event_type_numeric",
        "event_duration_hours",
        "event_day_of_week",
        "event_hour",
        "event_is_weekend",
        "event_participant_count",
        "weather_score", // Simulé
        "season_numeric",
        "month_numeric",
        "user_recent_activity_score",
        "event_popularity_score",
      ];

      for (const attendance of filteredAttendances) {
        const user = userMap.get(attendance.userId);
        const event = eventMap.get(attendance.eventId);

        if (!user || !event) continue;

        // Calculer les features utilisateur
        const userHistory = await this.calculateUserHistoricalStats(user.id!, dateRange);
        const userFeatures = this.extractUserFeatures(user, userHistory);

        // Calculer les features événement
        const eventFeatures = this.extractEventFeatures(event, attendance.createdAt || new Date());

        // Calculer les features contextuelles
        const contextFeatures = this.extractContextualFeatures(event.startDateTime, attendance.createdAt || new Date());

        // Combiner toutes les features
        const combinedFeatures = [
          ...userFeatures,
          ...eventFeatures,
          ...contextFeatures,
        ];

        features.push(combinedFeatures);

        // Label: 1 si présent/en retard, 0 si absent/excusé
        const label = [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status) ? 1 : 0;
        labels.push(label);
      }

      TriggerLogger.info("MLService", "extractAttendanceFeatures", `Extracted ${features.length} samples with ${featureNames.length} features`);

      return {
        features,
        labels,
        featureNames,
        metadata: {
          featureCount: featureNames.length,
          recordCount: features.length,
          dateRange: {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end),
          },
          version: "v1.0",
        },
      };
    } catch (error) {
      TriggerLogger.error("MLService", "extractAttendanceFeatures", "Feature extraction failed", error);
      throw error;
    }
  }

  /**
   *
   * @param userId
   * @param dateRange
   * @returns
   */
  private async calculateUserHistoricalStats(userId: string, dateRange: any): Promise<{
    attendanceRate: number;
    punctualityScore: number;
    recentActivityScore: number;
    averageResponseTime: number;
  }> {
    try {
      // Récupérer l'historique des 6 derniers mois
      const historyStart = new Date(dateRange.start);
      historyStart.setMonth(historyStart.getMonth() - 6);

      const userAttendances = await attendanceService.getAttendancesByUser(userId, {
        startDate: historyStart,
        endDate: new Date(dateRange.start),
      });

      if (userAttendances.length === 0) {
        return {
          attendanceRate: 0.5, // Valeur neutre pour nouveaux utilisateurs
          punctualityScore: 0.5,
          recentActivityScore: 0.3,
          averageResponseTime: 0,
        };
      }

      // Calculer le taux de présence
      const presentCount = userAttendances.filter((a) =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.getData().status as any)
      ).length;
      const attendanceRate = presentCount / userAttendances.length;

      // Calculer le score de ponctualité
      const punctualCount = userAttendances.filter((a) => a.getData().status === AttendanceStatus.PRESENT).length;
      const punctualityScore = presentCount > 0 ? punctualCount / presentCount : 0.5;

      // Calculer l'activité récente (30 derniers jours)
      const recentStart = new Date(dateRange.start);
      recentStart.setDate(recentStart.getDate() - 30);
      const recentAttendances = userAttendances.filter((a) =>
        a.createdAt && a.createdAt >= recentStart
      );
      const recentActivityScore = Math.min(recentAttendances.length / 10, 1); // Normalisé sur 10 événements

      // Calculer le temps de réponse moyen (simulation)
      const averageResponseTime = userAttendances
        .filter((a) => a.getData().checkInTime)
        .reduce((sum, a, _, arr) => sum + Math.random() * 30, 0) / Math.max(userAttendances.length, 1);

      return {
        attendanceRate,
        punctualityScore,
        recentActivityScore,
        averageResponseTime,
      };
    } catch (error) {
      TriggerLogger.error("MLService", "calculateUserHistoricalStats", userId, error);
      return {
        attendanceRate: 0.5,
        punctualityScore: 0.5,
        recentActivityScore: 0.3,
        averageResponseTime: 0,
      };
    }
  }

  /**
    * Récupérer les données des utilisateurs par ID
    * @param user - Utilisateur à traiter
    * @param history - Historique de présence de l'utilisateur
    * @returns Promise résolue avec les données des utilisateurs
    */
  private extractUserFeatures(user: any, history: any): number[] {
    return [
      history.attendanceRate,
      history.punctualityScore,
      this.encodeUserRole(user.role),
      this.calculateTenure(user.createdAt),
      history.recentActivityScore,
    ];
  }

  /**
   *
   * @param event
   * @param contextDate
   * @returns
   */
  private extractEventFeatures(event: any, contextDate: Date): number[] {
    const duration = event.endDateTime ?
      (event.endDateTime.getTime() - event.startDateTime.getTime()) / (1000 * 60 * 60) : 2; // Durée en heures

    return [
      this.encodeEventType(event.type),
      duration,
      event.startDateTime.getDay(), // Jour de la semaine
      event.startDateTime.getHours(), // Heure
      event.startDateTime.getDay() === 0 || event.startDateTime.getDay() === 6 ? 1 : 0, // Weekend
      event.participants?.length || 0,
    ];
  }

  // 🌍 EXTRACTION DES FEATURES CONTEXTUELLES
  private extractContextualFeatures(eventDate: Date, contextDate: Date): number[] {
    return [
      this.getWeatherScore(eventDate), // Simulé
      this.encodeSeason(eventDate),
      eventDate.getMonth(),
      this.calculateEventPopularity(eventDate), // Simulé
    ];
  }

  // 🔮 EXTRACTION DES FEATURES POUR PRÉDICTION
  private async extractPredictionFeatures(userData: any, eventData: any, userHistory: any): Promise<any> {
    try {
      const user = userData;
      const event = eventData;

      // Features utilisateur
      const userFeatures = [
        userHistory.attendanceRate || 0.5,
        userHistory.punctualityScore || 0.5,
        this.encodeUserRole(user.role),
        this.calculateTenure(user.createdAt),
        userHistory.recentActivityScore || 0.3,
      ];

      // Features événement
      const eventDuration = event.endDateTime ?
        (event.endDateTime.getTime() - event.startDateTime.getTime()) / (1000 * 60 * 60) : 2;

      const eventFeatures = [
        this.encodeEventType(event.type),
        eventDuration,
        event.startDateTime.getDay(),
        event.startDateTime.getHours(),
        event.startDateTime.getDay() === 0 || event.startDateTime.getDay() === 6 ? 1 : 0,
        event.participants?.length || 0,
      ];

      // Features contextuelles
      const contextFeatures = [
        this.getWeatherScore(event.startDateTime),
        this.encodeSeason(event.startDateTime),
        event.startDateTime.getMonth(),
        this.calculateEventPopularity(event.startDateTime),
      ];

      // Normaliser les features
      const allFeatures = [...userFeatures, ...eventFeatures, ...contextFeatures];
      const normalizedFeatures = this.normalizeFeatures(allFeatures);

      return {
        features: normalizedFeatures,
        userFeatures,
        eventFeatures,
        contextFeatures,
        // Métadonnées pour l'analyse
        metadata: {
          userId: user.id,
          eventId: event.id,
          extractedAt: new Date(),
        },
      };
    } catch (error) {
      TriggerLogger.error("MLService", "extractPredictionFeatures", "Feature extraction failed", error);
      throw error;
    }
  }

  // 📚 RÉCUPÉRATION DE L'HISTORIQUE UTILISATEUR
  private async getUserAttendanceHistory(userId: string): Promise<any> {
    try {
      // Récupérer les 6 derniers mois d'historique
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const attendances = await attendanceService.getAttendancesByUser(userId, {
        startDate: sixMonthsAgo,
        endDate: new Date(),
      });

      if (attendances.length === 0) {
        return this.getDefaultUserHistory();
      }

      // Calculer les statistiques détaillées
      const totalEvents = attendances.length;
      const presentCount = attendances.filter((a) =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.getData().status as any)
      ).length;
      const punctualCount = attendances.filter((a) => a.getData().status === AttendanceStatus.PRESENT).length;
      const lateCount = attendances.filter((a) => a.getData().status === AttendanceStatus.LATE).length;

      // Analyser les patterns temporels
      const dayOfWeekStats = this.analyzeDayOfWeekPattern(attendances);
      const timeOfDayStats = this.analyzeTimeOfDayPattern(attendances);
      const eventTypeStats = this.analyzeEventTypePattern(attendances);

      // Calculer les tendances récentes
      const recentTrend = this.calculateRecentTrend(attendances);

      return {
        totalEvents,
        attendanceRate: presentCount / totalEvents,
        punctualityScore: presentCount > 0 ? punctualCount / presentCount : 0.5,
        lateRate: totalEvents > 0 ? lateCount / totalEvents : 0,
        averageResponseTime: this.calculateAverageResponseTime(attendances),
        recentActivityScore: Math.min(attendances.filter((a) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return a.createdAt && a.createdAt >= thirtyDaysAgo;
        }).length / 10, 1),
        patterns: {
          dayOfWeek: dayOfWeekStats,
          timeOfDay: timeOfDayStats,
          eventType: eventTypeStats,
        },
        trends: {
          recent: recentTrend,
          overall: this.calculateOverallTrend(attendances),
        },
        lastActivity: attendances.length > 0 ?
          Math.max(...attendances.map((a) => a.createdAt?.getTime() || 0)) : 0,
      };
    } catch (error) {
      TriggerLogger.error("MLService", "getUserAttendanceHistory", userId, error);
      return this.getDefaultUserHistory();
    }
  }

  // 🧠 ANALYSE DES FACTEURS D'INFLUENCE INTELLIGENTE
  private async analyzeInfluencingFactors(features: any, prediction: { probability: number; confidence: number }): Promise<InfluencingFactor[]> {
    try {
      const factors: InfluencingFactor[] = [];

      // Profil de référence (utilisateur moyen)
      const baseline = {
        attendanceRate: 0.75,
        punctualityScore: 0.80,
        recentActivity: 0.60,
        eventPopularity: 0.65,
      };

      // 1. Analyser l'historique de présence
      const attendanceImpact = features.userFeatures[0] - baseline.attendanceRate;
      if (Math.abs(attendanceImpact) > 0.15) {
        factors.push({
          name: "Historique de présence",
          influence: attendanceImpact > 0 ? "positive" : "negative",
          description: `Taux de présence historique: ${(features.userFeatures[0] * 100).toFixed(1)}% (moyenne: 75%)`,
          weight: Math.abs(attendanceImpact) * 2.0, // Facteur très important
          category: "historical",
          impact: attendanceImpact > 0.2 ? "major" : attendanceImpact > 0.1 ? "moderate" : "minor",
        });
      }

      // 2. Analyser la ponctualité
      const punctualityImpact = features.userFeatures[1] - baseline.punctualityScore;
      if (Math.abs(punctualityImpact) > 0.10) {
        factors.push({
          name: "Ponctualité",
          influence: punctualityImpact > 0 ? "positive" : "negative",
          description: `Score de ponctualité: ${(features.userFeatures[1] * 100).toFixed(1)}% (moyenne: 80%)`,
          weight: Math.abs(punctualityImpact) * 1.5,
          category: "behavioral",
          impact: punctualityImpact > 0.15 ? "major" : "moderate",
        });
      }

      // 3. Analyser l'activité récente
      const activityImpact = features.userFeatures[4] - baseline.recentActivity;
      if (Math.abs(activityImpact) > 0.20) {
        factors.push({
          name: "Activité récente",
          influence: activityImpact > 0 ? "positive" : "negative",
          description: `Activité récente ${activityImpact > 0 ? "élevée" : "faible"} comparée à la moyenne`,
          weight: Math.abs(activityImpact) * 1.2,
          category: "temporal",
          impact: activityImpact > 0.3 ? "major" : "moderate",
        });
      }

      // 4. Analyser le type d'événement
      const eventType = features.eventFeatures[0];
      if (eventType > 0.7) { // Événement populaire
        factors.push({
          name: "Type d'événement",
          influence: "positive",
          description: "Type d'événement généralement bien fréquenté",
          weight: 0.8,
          category: "contextual",
          impact: "moderate",
        });
      } else if (eventType < 0.3) { // Événement moins populaire
        factors.push({
          name: "Type d'événement",
          influence: "negative",
          description: "Type d'événement avec participation généralement plus faible",
          weight: 0.6,
          category: "contextual",
          impact: "minor",
        });
      }

      // 5. Analyser le timing (weekend/semaine)
      if (features.eventFeatures[4] === 1) { // Weekend
        factors.push({
          name: "Timing",
          influence: "negative",
          description: "Événement programmé le weekend, participation généralement plus faible",
          weight: 0.7,
          category: "temporal",
          impact: "moderate",
        });
      }

      // 6. Analyser l'heure de l'événement
      const eventHour = features.eventFeatures[3];
      if (eventHour < 8 || eventHour > 18) {
        factors.push({
          name: "Heure de l'événement",
          influence: "negative",
          description: "Événement en dehors des heures de bureau standard",
          weight: 0.5,
          category: "temporal",
          impact: "minor",
        });
      }

      // 7. Analyser la taille de l'événement
      const participantCount = features.eventFeatures[5];
      if (participantCount > 50) {
        factors.push({
          name: "Taille de l'événement",
          influence: "negative",
          description: "Événement de grande taille, risque de désengagement individuel",
          weight: 0.4,
          category: "social",
          impact: "minor",
        });
      } else if (participantCount < 10) {
        factors.push({
          name: "Taille de l'événement",
          influence: "positive",
          description: "Événement en petit comité, engagement personnel plus élevé",
          weight: 0.6,
          category: "social",
          impact: "moderate",
        });
      }

      // Trier par importance et garder les plus significatifs
      factors.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

      return factors.slice(0, 5); // Top 5 facteurs les plus influents
    } catch (error) {
      TriggerLogger.error("MLService", "analyzeInfluencingFactors", "Analysis failed", error);
      return [{
        name: "Analyse indisponible",
        influence: "neutral",
        description: "Impossible d'analyser les facteurs d'influence pour cette prédiction",
        weight: 0,
        category: "error",
        impact: "unknown",
      }];
    }
  }

  // 💡 GÉNÉRATION DE RECOMMANDATIONS INTELLIGENTES
  private async generateAttendanceRecommendations(
    prediction: { probability: number; confidence: number },
    features: any,
    userHistory: any
  ): Promise<string[]> {
    try {
      const recommendations: string[] = [];
      const probability = prediction.probability;
      const confidence = prediction.confidence;

      // Recommandations basées sur le niveau de risque
      if (probability < 0.3) { // Risque très élevé
        recommendations.push("🚨 PRIORITÉ ÉLEVÉE: Contacter personnellement cet utilisateur");
        recommendations.push("📧 Envoyer un rappel personnalisé avec contexte de l'importance");
        recommendations.push("📞 Considérer un appel téléphonique de suivi");

        if (userHistory.attendanceRate < 0.5) {
          recommendations.push("🔄 Programmer un entretien pour comprendre les obstacles à la participation");
        }
      } else if (probability < 0.6) { // Risque modéré
        recommendations.push("⚠️ Inclure dans la campagne de rappel ciblée");
        recommendations.push("💬 Envoyer un message personnalisé mentionnant l'intérêt de l'événement");

        if (userHistory.punctualityScore < 0.7) {
          recommendations.push("⏰ Ajouter un rappel supplémentaire 1h avant l'événement");
        }
      } else if (probability > 0.8) { // Très probable
        recommendations.push("✅ Aucune action particulière requise");

        if (userHistory.attendanceRate > 0.9) {
          recommendations.push("⭐ Considérer comme ambassadeur pour encourager d'autres participants");
        }
      }

      // Recommandations basées sur la confiance
      if (confidence < 0.6) {
        recommendations.push("🔍 Prédiction incertaine - surveiller de près les signaux de dernière minute");
        recommendations.push("📊 Collecter plus de données sur ce profil utilisateur");
      }

      // Recommandations basées sur les patterns historiques
      if (userHistory.patterns?.dayOfWeek) {
        const eventDay = features.eventFeatures[2]; // Jour de la semaine
        const userDayPreference = userHistory.patterns.dayOfWeek[eventDay] || 0.5;

        if (userDayPreference < 0.4) {
          recommendations.push(`📅 Cet utilisateur participe moins le ${this.getDayName(eventDay)} - renforcer la communication`);
        }
      }

      if (userHistory.patterns?.timeOfDay) {
        const eventHour = features.eventFeatures[3];
        const userTimePreference = userHistory.patterns.timeOfDay[Math.floor(eventHour / 4)] || 0.5;

        if (userTimePreference < 0.4) {
          recommendations.push("🕐 Créneau horaire moins favorable pour cet utilisateur - adapter si possible");
        }
      }

      // Recommandations proactives
      if (userHistory.trends?.recent === "declining") {
        recommendations.push("📉 Tendance de participation en baisse - intervention recommandée");
        recommendations.push("🤝 Proposer un entretien informel pour identifier les points d'amélioration");
      }

      return recommendations.filter((r) => r && r.length > 0);
    } catch (error) {
      TriggerLogger.error("MLService", "generateAttendanceRecommendations", "Generation failed", error);
      return ["⚠️ Impossible de générer des recommandations spécifiques"];
    }
  }

  // ⚠️ CALCUL DU NIVEAU DE RISQUE
  private calculateRiskLevel(probability: number, user: User): "high" | "medium" | "low" {
    try {
      // Facteurs de risque basés sur le profil utilisateur
      let riskScore = 1 - probability; // Base: inverse de la probabilité

      // Ajustements basés sur le rôle
      if ([UserRole.CONTRIBUTOR, UserRole.MODERATOR].includes(user.role)) {
        riskScore *= 1.2; // Légèrement plus de risque
      } else if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
        riskScore *= 0.8; // Moins de risque
      }

      // Ajustements basés sur l'ancienneté
      const tenure = this.calculateTenure(user.createdAt);
      if (tenure < 30) { // Moins de 30 jours
        riskScore *= 1.3; // Nouveaux utilisateurs plus à risque
      } else if (tenure > 365) { // Plus d'un an
        riskScore *= 0.9; // Utilisateurs expérimentés moins à risque
      }

      // Classification du risque
      if (riskScore > 0.7) return "high";
      if (riskScore > 0.4) return "medium";
      return "low";
    } catch (error) {
      TriggerLogger.error("MLService", "calculateRiskLevel", user.id ?? "unknown", error);
      return "medium"; // Valeur par défaut en cas d'erreur
    }
  }

  // 🎯 MAPPING PROBABILITÉ VERS STATUT
  private mapProbabilityToStatus(probability: number): AttendanceStatus {
    if (probability >= 0.85) return AttendanceStatus.PRESENT;
    if (probability >= 0.60) return AttendanceStatus.MAYBE;
    if (probability >= 0.40) return AttendanceStatus.LATE;
    if (probability >= 0.20) return AttendanceStatus.EXCUSED;
    return AttendanceStatus.ABSENT;
  }

  // 🤖 ENTRAÎNEMENT TENSORFLOW RÉEL
  private async trainTensorFlowModel(
    model: tf.LayersModel,
    dataset: MLDataSet,
    hyperparameters?: any
  ): Promise<tf.LayersModel> {
    try {
      TriggerLogger.info("MLService", "trainTensorFlowModel", "Starting real model training...");

      const {features, labels} = dataset;

      if (features.length === 0 || labels.length === 0) {
        throw new Error("No training data available");
      }

      // Conversion en tenseurs TensorFlow
      const xs = tf.tensor2d(features);
      const ys = tf.tensor1d(labels);

      // Validation de la forme des données
      console.log(`Training data shape: xs=${xs.shape}, ys=${ys.shape}`);

      // Configuration d'entraînement
      const epochs = hyperparameters?.epochs || 100;
      const batchSize = hyperparameters?.batchSize || 32;
      const validationSplit = hyperparameters?.validationSplit || 0.2;
      const learningRate = hyperparameters?.learningRate || 0.001;

      // Reconfigurer l'optimiseur si nécessaire
      if (learningRate !== 0.001) {
        model.compile({
          optimizer: tf.train.adam(learningRate),
          loss: "binaryCrossentropy",
          metrics: ["accuracy", "precision", "recall"],
        });
      }

      // Callbacks pour monitoring
      const callbacks = {
        onEpochEnd: (epoch: number, metrics: any) => {
          if (epoch % 10 === 0) {
            TriggerLogger.info("MLService", "trainTensorFlowModel",
              `Epoch ${epoch}: loss=${metrics.loss?.toFixed(4)}, accuracy=${metrics.acc?.toFixed(4)}`);
          }
        },
        onTrainEnd: () => {
          TriggerLogger.info("MLService", "trainTensorFlowModel", "Training completed successfully");
        },
      };

      // Entraînement du modèle
      const history = await model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit,
        callbacks,
        shuffle: true,
        verbose: 0,
      });

      // Nettoyage mémoire
      xs.dispose();
      ys.dispose();

      // Log des résultats finaux
      const finalMetrics = history.history;
      const finalLoss = Array.isArray(finalMetrics.loss) ?
        finalMetrics.loss[finalMetrics.loss.length - 1] : finalMetrics.loss;
      const finalAccuracy = Array.isArray(finalMetrics.acc) ?
        finalMetrics.acc[finalMetrics.acc.length - 1] : finalMetrics.acc;

      TriggerLogger.info("MLService", "trainTensorFlowModel",
        `Final metrics: loss=${finalLoss}, accuracy=${finalAccuracy}`);

      return model;
    } catch (error) {
      TriggerLogger.error("MLService", "trainTensorFlowModel", "Training failed", error);
      throw new Error(`Model training failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // 📊 ÉVALUATION COMPLÈTE DU MODÈLE
  private async evaluateModel(model: tf.LayersModel, dataset: MLDataSet): Promise<ModelPerformance> {
    try {
      TriggerLogger.info("MLService", "evaluateModel", "Starting model evaluation...");

      const {features, labels} = dataset;

      if (features.length === 0) {
        throw new Error("No evaluation data available");
      }

      // Diviser les données en train/test (80/20)
      const splitIndex = Math.floor(features.length * 0.8);
      const testFeatures = features.slice(splitIndex);
      const testLabels = labels.slice(splitIndex);

      if (testFeatures.length === 0) {
        throw new Error("Insufficient data for evaluation");
      }

      // Prédictions sur les données de test
      const testXs = tf.tensor2d(testFeatures);
      const predictions = model.predict(testXs) as tf.Tensor;
      const predictionValues = await predictions.data();

      // Calculer les métriques
      let truePositives = 0; let falsePositives = 0; let trueNegatives = 0; let falseNegatives = 0;

      for (let i = 0; i < testLabels.length; i++) {
        const predicted = predictionValues[i] > 0.5 ? 1 : 0;
        const actual = testLabels[i];

        if (predicted === 1 && actual === 1) truePositives++;
        else if (predicted === 1 && actual === 0) falsePositives++;
        else if (predicted === 0 && actual === 0) trueNegatives++;
        else if (predicted === 0 && actual === 1) falseNegatives++;
      }

      const accuracy = (truePositives + trueNegatives) / testLabels.length;
      const precision = truePositives / Math.max(truePositives + falsePositives, 1);
      const recall = truePositives / Math.max(truePositives + falseNegatives, 1);
      const f1Score = 2 * (precision * recall) / Math.max(precision + recall, 0.001);

      // Calculer la perte sur les données de test
      const testYs = tf.tensor1d(testLabels);
      const lossResult = model.evaluate(testXs, testYs, {verbose: 0}) as tf.Scalar[];
      const loss = await lossResult[0].data();

      // Détecter le surapprentissage
      const overfittingAnalysis = await this.detectOverfitting(model, dataset);

      // Nettoyage mémoire
      testXs.dispose();
      testYs.dispose();
      predictions.dispose();
      lossResult.forEach((tensor) => tensor.dispose());

      const performance: ModelPerformance = {
        accuracy: Math.round(accuracy * 1000) / 1000,
        precision: Math.round(precision * 1000) / 1000,
        recall: Math.round(recall * 1000) / 1000,
        f1Score: Math.round(f1Score * 1000) / 1000,
        loss: Math.round(loss[0] * 1000) / 1000,
        validationAccuracy: accuracy, // Simplifié pour cet exemple
        overfitting: overfittingAnalysis,
      };

      TriggerLogger.info("MLService", "evaluateModel", `Performance: ${JSON.stringify(performance)}`);

      return performance;
    } catch (error) {
      TriggerLogger.error("MLService", "evaluateModel", "Evaluation failed", error);
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        loss: 1,
        validationAccuracy: 0,
        overfitting: {
          detected: true,
          severity: "none",
          recommendations: ["Erreur lors de l'évaluation"],
        },
      };
    }
  }

  // 🔍 DÉTECTION DU SURAPPRENTISSAGE
  private async detectOverfitting(model: tf.LayersModel, dataset: MLDataSet): Promise<{
    detected: boolean;
    severity: "none" | "mild" | "moderate" | "severe";
    recommendations: string[];
  }> {
    try {
      // Analyse simplifiée du surapprentissage
      // @ts-ignore
      const {features, labels} = dataset;

      if (features.length < 100) {
        return {
          detected: true,
          severity: "severe",
          recommendations: [
            "Dataset trop petit pour un entraînement fiable",
            "Collecter plus de données",
            "Utiliser des techniques de régularisation",
          ],
        };
      }

      // Simulation d'analyse plus complexe
      const datasetSize = features.length;
      const featureCount = features[0]?.length || 0;
      const complexityRatio = featureCount / datasetSize;

      if (complexityRatio > 0.1) {
        return {
          detected: true,
          severity: "moderate",
          recommendations: [
            "Ratio features/données élevé",
            "Appliquer dropout plus agressif",
            "Réduire la complexité du modèle",
            "Augmenter la taille du dataset",
          ],
        };
      }

      return {
        detected: false,
        severity: "mild",
        recommendations: ["Modèle semble stable"],
      };
    } catch (error) {
      return {
        detected: true,
        severity: "none",
        recommendations: ["Impossible d'analyser le surapprentissage"],
      };
    }
  }

  // 📊 CALCUL DE L'IMPORTANCE DES FEATURES
  private async calculateFeatureImportance(model: tf.LayersModel, dataset: MLDataSet): Promise<FeatureImportance[]> {
    try {
      TriggerLogger.info("MLService", "calculateFeatureImportance", "Calculating feature importance...");

      const {features, featureNames} = dataset;

      if (features.length === 0 || !featureNames) {
        return [];
      }

      // Méthode de permutation pour calculer l'importance
      const baselineAccuracy = await this.calculateAccuracy(model, features, dataset.labels);
      const importanceScores: FeatureImportance[] = [];

      for (let i = 0; i < featureNames.length; i++) {
        try {
          // Créer une copie des features avec la feature i permutée
          const permutedFeatures = features.map((row) => [...row]);
          const originalColumn = permutedFeatures.map((row) => row[i]);

          // Permuter aléatoirement la colonne
          const shuffled = [...originalColumn].sort(() => Math.random() - 0.5);
          permutedFeatures.forEach((row, idx) => {
            row[i] = shuffled[idx];
          });

          // Calculer la nouvelle précision
          const permutedAccuracy = await this.calculateAccuracy(model, permutedFeatures, dataset.labels);
          const importance = Math.max(0, baselineAccuracy - permutedAccuracy);

          importanceScores.push({
            feature: featureNames[i],
            importance: Math.round(importance * 1000) / 1000,
            description: this.getFeatureDescription(featureNames[i]),
            category: this.getFeatureCategory(featureNames[i]),
            impact: importance > 0.1 ? "positive" : importance > 0.05 ? "mixed" : "negative",
          });
        } catch (error) {
          console.warn(`Error calculating importance for feature ${featureNames[i]}:`, error);
        }
      }

      // Trier par importance décroissante
      importanceScores.sort((a, b) => b.importance - a.importance);

      TriggerLogger.info("MLService", "calculateFeatureImportance",
        `Calculated importance for ${importanceScores.length} features`);

      return importanceScores;
    } catch (error) {
      TriggerLogger.error("MLService", "calculateFeatureImportance", "Calculation failed", error);
      return [];
    }
  }

  // 🧠 GÉNÉRATION D'INSIGHTS ML
  private async generateModelInsights(
    performance: ModelPerformance,
    importance: FeatureImportance[],
    dataset: MLDataSet
  ): Promise<MLInsight[]> {
    try {
      const insights: MLInsight[] = [];

      // Insight sur la performance globale
      if (performance.accuracy > 0.9) {
        insights.push({
          id: crypto.randomUUID(),
          type: "prediction",
          title: "Excellente performance du modèle",
          description: `Le modèle atteint une précision de ${(performance.accuracy * 100).toFixed(1)}%, indiquant une très bonne capacité prédictive.`,
          confidence: 0.95,
          impact: "major",
          actionable: false,
          priority: "high",
          category: "quality",
          targetAudience: [UserRole.ANALYST, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        });
      } else if (performance.accuracy < 0.7) {
        insights.push({
          id: crypto.randomUUID(),
          type: "anomaly",
          title: "Performance du modèle à améliorer",
          description: `La précision de ${(performance.accuracy * 100).toFixed(1)}% suggère qu'il faut collecter plus de données ou ajuster les features.`,
          confidence: 0.9,
          impact: "major",
          actionable: true,
          priority: "high",
          category: "risk",
          targetAudience: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        });
      }

      // Insight sur les features importantes
      const topFeature = importance[0];
      if (topFeature && topFeature.importance > 0.1) {
        insights.push({
          id: crypto.randomUUID(),
          type: "trend",
          title: `${topFeature.feature} est le facteur le plus déterminant`,
          description: `Cette caractéristique explique ${(topFeature.importance * 100).toFixed(1)}% de la capacité prédictive du modèle.`,
          confidence: 0.85,
          impact: "moderate",
          actionable: true,
          priority: "medium",
          category: "opportunity",
          targetAudience: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        });
      }

      // Insight sur la taille du dataset
      if (dataset.metadata.recordCount < 1000) {
        insights.push({
          id: crypto.randomUUID(),
          type: "recommendation",
          title: "Dataset limité",
          description: `Avec ${dataset.metadata.recordCount} échantillons, collecter plus de données améliorerait la fiabilité des prédictions.`,
          confidence: 0.8,
          impact: "moderate",
          actionable: true,
          priority: "medium",
          category: "risk",
          targetAudience: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        });
      }

      // Insight sur le surapprentissage
      if (performance.overfitting.detected) {
        insights.push({
          id: crypto.randomUUID(),
          type: "anomaly",
          title: "Risque de surapprentissage détecté",
          description: `Le modèle pourrait être trop spécialisé sur les données d'entraînement. ${performance.overfitting.recommendations.join(". ")}.`,
          confidence: 0.75,
          impact: "major",
          actionable: true,
          priority: "high",
          category: "risk",
          targetAudience: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        });
      }

      // Insight sur l'équilibre des classes
      const classBalance = this.analyzeClassBalance(dataset.labels);
      if (classBalance.imbalance > 0.3) {
        insights.push({
          id: crypto.randomUUID(),
          type: "recommendation",
          title: "Déséquilibre des classes détecté",
          description: `Les données montrent un déséquilibre de ${(classBalance.imbalance * 100).toFixed(1)}% entre les classes. Considérer des techniques de rééquilibrage.`,
          confidence: 0.9,
          impact: "moderate",
          actionable: true,
          priority: "medium",
          category: "risk",
          targetAudience: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        });
      }

      return insights;
    } catch (error) {
      TriggerLogger.error("MLService", "generateModelInsights", "Insight generation failed", error);
      return [];
    }
  }

  // 💾 SAUVEGARDE DU MODÈLE
  private async saveModel(model: tf.LayersModel, metadata: any): Promise<string> {
    try {
      const modelId = `model_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      // Note: Dans un environnement de production, sauvegarder sur Cloud Storage
      // await model.save(`gs://your-bucket/models/${modelId}`);

      // Pour l'instant, sauvegarder les métadonnées dans Firestore
      const modelMetadata = {
        ...metadata,
        id: modelId,
        status: "active",
        createdAt: new Date(),
        lastUsed: new Date(),
        usageCount: 0,
      };

      await this.db.collection("ml_models").doc(modelId).set(modelMetadata);

      TriggerLogger.info("MLService", "saveModel", `Model saved with ID: ${modelId}`);

      return modelId;
    } catch (error) {
      TriggerLogger.error("MLService", "saveModel", "Model save failed", error);
      throw new Error("Failed to save model");
    }
  }

  // 📥 CHARGEMENT DU MODÈLE
  private async getModel(modelId: string): Promise<any> {
    try {
      // Vérifier le cache en premier
      const cached = this.modelCache.get(modelId);
      if (cached) {
        cached.lastUsed = new Date();
        return cached.model;
      }

      // Charger les métadonnées depuis Firestore
      const modelDoc = await this.db.collection("ml_models").doc(modelId).get();
      if (!modelDoc.exists) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Note: Dans un environnement de production, charger depuis Cloud Storage
      // const model = await tf.loadLayersModel(`gs://your-bucket/models/${modelId}/model.json`);

      // Pour l'instant, retourner un modèle simulé
      const mockModel = {
        predict: (features: number[]) => {
          // Simulation basée sur les features
          const score = features.reduce((sum, f, i) => sum + f * (i + 1) * 0.1, 0) / features.length;
          return {
            probability: Math.max(0.1, Math.min(0.9, score)),
            confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
          };
        },
        metadata: modelDoc.data(),
      };

      // Mettre en cache
      this.modelCache.set(modelId, {model: mockModel as any, lastUsed: new Date()});

      // Mettre à jour l'usage
      await this.db.collection("ml_models").doc(modelId).update({
        lastUsed: new Date(),
        usageCount: (modelDoc.data()?.usageCount || 0) + 1,
      });

      return mockModel;
    } catch (error) {
      TriggerLogger.error("MLService", "getModel", modelId, error);
      throw new Error(`Failed to load model: ${modelId}`);
    }
  }

  // 🔧 MÉTHODES UTILITAIRES PRIVÉES

  private async getUsersData(userIds: string[]): Promise<any[]> {
    const users = [];
    for (const userId of userIds) {
      try {
        const user = await userService.getUserById(userId);
        users.push(user.getData());
      } catch (error) {
        console.warn(`Could not fetch user ${userId}`);
      }
    }
    return users;
  }

  private async getEventsData(eventIds: string[]): Promise<any[]> {
    const events = [];
    for (const eventId of eventIds) {
      try {
        const event = await eventService.getEventById(eventId);
        events.push(event.getData());
      } catch (error) {
        console.warn(`Could not fetch event ${eventId}`);
      }
    }
    return events;
  }

  private encodeUserRole(role: UserRole): number {
    const roleMapping = {
      [UserRole.ANALYST]: 0.1,
      [UserRole.CONTRIBUTOR]: 0.3,
      [UserRole.MODERATOR]: 0.5,
      [UserRole.MANAGER]: 0.7,
      [UserRole.ADMIN]: 0.8,
      [UserRole.SUPER_ADMIN]: 1.0,
      [UserRole.GUEST]: 0.1,
      [UserRole.VIEWER]: 0.1,
      [UserRole.PARTICIPANT]: 0.1,
      [UserRole.ORGANIZER]: 0.7,
    };
    return roleMapping[role] || 0.3;
  }

  private encodeEventType(type: string): number {
    const typeMapping: Record<string, number> = {
      "meeting": 0.7,
      "training": 0.8,
      "conference": 0.9,
      "workshop": 0.6,
      "presentation": 0.5,
      "seminar": 0.4,
    };
    return typeMapping[type] || 0.5;
  }

  private calculateTenure(createdAt: Date): number {
    if (!createdAt) return 0;
    return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getWeatherScore(date: Date): number {
    // Simulation basée sur la saison
    const month = date.getMonth();
    if (month >= 3 && month <= 8) return 0.8; // Printemps/été
    return 0.6; // Automne/hiver
  }

  private encodeSeason(date: Date): number {
    const month = date.getMonth();
    if (month <= 2 || month === 11) return 0.25; // Hiver
    if (month <= 5) return 0.5; // Printemps
    if (month <= 8) return 0.75; // Été
    return 1.0; // Automne
  }

  private calculateEventPopularity(date: Date): number {
    // Simulation basée sur le jour de la semaine
    const day = date.getDay();
    if (day === 0 || day === 6) return 0.3; // Weekend
    if (day === 1 || day === 5) return 0.6; // Lundi/Vendredi
    return 0.8; // Mardi-Jeudi
  }

  private normalizeFeatures(features: number[]): number[] {
    // Normalisation min-max simple
    return features.map((f) => Math.max(0, Math.min(1, f)));
  }

  private getDefaultUserHistory(): any {
    return {
      totalEvents: 0,
      attendanceRate: 0.5,
      punctualityScore: 0.5,
      lateRate: 0.2,
      averageResponseTime: 0,
      recentActivityScore: 0.3,
      patterns: {
        dayOfWeek: {},
        timeOfDay: {},
        eventType: {},
      },
      trends: {
        recent: "stable",
        overall: "stable",
      },
      lastActivity: 0,
    };
  }

  private analyzeDayOfWeekPattern(attendances: any[]): Record<number, number> {
    const dayStats: Record<number, { total: number; attended: number }> = {};

    attendances.forEach((attendance) => {
      if (!attendance.createdAt) return;

      const day = attendance.createdAt.getDay();
      if (!dayStats[day]) dayStats[day] = {total: 0, attended: 0};

      dayStats[day].total++;
      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        dayStats[day].attended++;
      }
    });

    const result: Record<number, number> = {};
    Object.keys(dayStats).forEach((day) => {
      const stats = dayStats[parseInt(day)];
      result[parseInt(day)] = stats.total > 0 ? stats.attended / stats.total : 0.5;
    });

    return result;
  }

  private analyzeTimeOfDayPattern(attendances: any[]): Record<number, number> {
    // Grouper par créneaux de 6h: 0-6, 6-12, 12-18, 18-24
    const timeStats: Record<number, { total: number; attended: number }> = {};

    attendances.forEach((attendance) => {
      if (!attendance.createdAt) return;

      const hour = attendance.createdAt.getHours();
      const timeSlot = Math.floor(hour / 6);

      if (!timeStats[timeSlot]) timeStats[timeSlot] = {total: 0, attended: 0};

      timeStats[timeSlot].total++;
      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        timeStats[timeSlot].attended++;
      }
    });

    const result: Record<number, number> = {};
    Object.keys(timeStats).forEach((slot) => {
      const stats = timeStats[parseInt(slot)];
      result[parseInt(slot)] = stats.total > 0 ? stats.attended / stats.total : 0.5;
    });

    return result;
  }

  private analyzeEventTypePattern(attendances: any[]): Record<string, number> {
    // Nécessiterait l'accès aux données d'événement pour obtenir le type
    // Simulation pour l'exemple
    return {
      "meeting": 0.8,
      "training": 0.9,
      "conference": 0.7,
    };
  }

  private calculateRecentTrend(attendances: any[]): "improving" | "declining" | "stable" {
    if (attendances.length < 10) return "stable";

    // Comparer les 30% derniers avec les 30% précédents
    const recent = attendances.slice(-Math.floor(attendances.length * 0.3));
    const previous = attendances.slice(-Math.floor(attendances.length * 0.6), -Math.floor(attendances.length * 0.3));

    const recentRate = recent.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
    ).length / recent.length;

    const previousRate = previous.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
    ).length / previous.length;

    const diff = recentRate - previousRate;
    if (diff > 0.1) return "improving";
    if (diff < -0.1) return "declining";
    return "stable";
  }

  private calculateOverallTrend(attendances: any[]): "improving" | "declining" | "stable" {
    // Analyse de tendance sur tout l'historique
    return this.calculateRecentTrend(attendances);
  }

  private calculateAverageResponseTime(attendances: any[]): number {
    const responseTimes = attendances
      .filter((a) => a.checkInTime && a.createdAt)
      .map((a) => Math.abs(a.checkInTime.getTime() - a.createdAt.getTime()) / (1000 * 60)); // en minutes

    return responseTimes.length > 0 ?
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
  }

  /* private calculateAverageResponseTime(attendances: any[]): number {
    const attendancesWithResponseTime = attendances.filter(a =>
      a.checkInTime && a.createdAt
    );

    if (attendancesWithResponseTime.length === 0) return 5; // 5 minutes par défaut

    const responseTimes = attendancesWithResponseTime.map(a => {
      // Temps entre la création de l'attendance et le check-in (en minutes)
      return Math.abs(a.checkInTime.getTime() - a.createdAt.getTime()) / (1000 * 60);
    });

    // Filtrer les temps de réponse aberrants (> 24h)
    const validResponseTimes = responseTimes.filter(time => time <= 24 * 60);

    if (validResponseTimes.length === 0) return 5;

    const totalTime = validResponseTimes.reduce((sum, time) => sum + time, 0);
    return totalTime / validResponseTimes.length;
  } */


  private getDayName(day: number): string {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[day] || "Jour inconnu";
  }

  private async calculateAccuracy(model: tf.LayersModel, features: number[][], labels: number[]): Promise<number> {
    try {
      if (features.length === 0) return 0;

      const xs = tf.tensor2d(features);
      const predictions = model.predict(xs) as tf.Tensor;
      const predictionValues = await predictions.data();

      let correct = 0;
      for (let i = 0; i < labels.length; i++) {
        const predicted = predictionValues[i] > 0.5 ? 1 : 0;
        if (predicted === labels[i]) correct++;
      }

      xs.dispose();
      predictions.dispose();

      return correct / labels.length;
    } catch (error) {
      console.warn("Error calculating accuracy:", error);
      return 0;
    }
  }

  private getFeatureDescription(featureName: string): string {
    const descriptions: Record<string, string> = {
      "user_historical_attendance_rate": "Taux de présence historique de l'utilisateur",
      "user_punctuality_score": "Score de ponctualité de l'utilisateur",
      "user_role_numeric": "Niveau hiérarchique de l'utilisateur",
      "user_tenure_days": "Ancienneté de l'utilisateur en jours",
      "event_type_numeric": "Type d'événement encodé",
      "event_duration_hours": "Durée de l'événement en heures",
      "event_day_of_week": "Jour de la semaine de l'événement",
      "event_hour": "Heure de début de l'événement",
      "event_is_weekend": "Indicateur weekend",
      "event_participant_count": "Nombre de participants attendus",
      "weather_score": "Score météorologique simulé",
      "season_numeric": "Saison encodée",
      "month_numeric": "Mois de l'année",
      "user_recent_activity_score": "Score d'activité récente",
      "event_popularity_score": "Score de popularité de l'événement",
    };

    return descriptions[featureName] || featureName;
  }

  private getFeatureCategory(featureName: string):
    "temporal" | "behavioral" | "contextual" | "historical" | "environmental" | "social" {
    if (featureName.startsWith("user_")) return "behavioral";
    if (featureName.startsWith("event_")) return "contextual";
    return "contextual";
  }

  private analyzeClassBalance(labels: number[]): { imbalance: number; majorityClass: number } {
    if (labels.length === 0) return {imbalance: 0, majorityClass: 0};

    const positiveCount = labels.filter((l) => l === 1).length;
    const negativeCount = labels.length - positiveCount;

    const imbalance = Math.abs(positiveCount - negativeCount) / labels.length;
    const majorityClass = positiveCount > negativeCount ? 1 : 0;

    return {imbalance, majorityClass};
  }

  private async getDefaultModelId(modelType: string): Promise<string> {
    try {
      // Chercher le modèle par défaut le plus récent pour ce type
      const modelsSnapshot = await this.db
        .collection("ml_models")
        .where("type", "==", modelType)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (modelsSnapshot.empty) {
        throw new Error(`No default model found for type: ${modelType}`);
      }

      return modelsSnapshot.docs[0].id;
    } catch (error) {
      TriggerLogger.error("MLService", "getDefaultModelId", modelType, error);
      // Retourner un ID de modèle simulé
      return `default_${modelType}_v1`;
    }
  }

  private async logMLAction(action: string, modelId: string, userId: string, details: any): Promise<void> {
    try {
      await this.db.collection("ml_audit_logs").add({
        action,
        modelId,
        userId,
        details,
        timestamp: new Date(),
        service: "MLService",
      });
    } catch (error) {
      console.warn("Failed to log ML action:", error);
    }
  }

  /**
   * 🚨 DÉTECTION D'ANOMALIES - Extraction de features pour identifier les comportements suspects
   */
  private async extractAnomalyFeatures(filters: any): Promise<MLDataSet> {
    try {
      TriggerLogger.info("MLService", "extractAnomalyFeatures", "Starting anomaly detection feature extraction...");

      const {dateRange, userIds, eventIds} = filters;

      // 1. Récupérer les données d'attendance pour analyse
      const attendanceOptions = {
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end),
        },
      };

      const attendancesResult = await attendanceService.getAttendances(attendanceOptions);
      const attendances = attendancesResult.attendances;

      // Filtrer selon les critères
      const filteredAttendances = attendances.filter((attendance) => {
        if (userIds && !userIds.includes(attendance.userId)) return false;
        if (eventIds && !eventIds.includes(attendance.eventId)) return false;
        return true;
      });

      // 2. Récupérer les données des utilisateurs et événements
      const userIds_unique = [...new Set(filteredAttendances.map((a) => a.userId))];
      const eventIds_unique = [...new Set(filteredAttendances.map((a) => a.eventId))];

      const [users, events] = await Promise.all([
        this.getUsersData(userIds_unique),
        this.getEventsData(eventIds_unique),
      ]);

      const userMap = new Map(users.map((u) => [u.id!, u]));
      const eventMap = new Map(events.map((e) => [e.id!, e]));

      // 3. Calculer les statistiques de référence pour chaque utilisateur
      const userBaselines = await this.calculateUserBaselines(userIds_unique, dateRange);

      // 4. Extraire les features d'anomalie pour chaque présence
      const features: number[][] = [];
      const labels: number[] = []; // 1 = anomalie, 0 = normal
      const featureNames = [
        // Features temporelles
        "unusual_check_in_time", // Heure inhabituelle par rapport à l'historique
        "extreme_delay_minutes", // Retard extrême vs habitude
        "rapid_successive_checkins", // Check-ins multiples rapprochés
        "off_hours_activity", // Activité en dehors des heures normales

        // Features géographiques/techniques
        "location_deviation_score", // Écart de localisation suspect
        "method_inconsistency", // Changement inhabituel de méthode
        "device_anomaly_score", // Nouvel appareil ou signature technique

        // Features comportementales
        "attendance_pattern_break", // Rupture dans le pattern habituel
        "response_time_anomaly", // Temps de réponse anormal
        "event_type_mismatch", // Participation à événements inhabituels

        // Features de fréquence
        "unusual_frequency_spike", // Pic d'activité inhabituel
        "long_absence_return", // Retour après longue absence
        "weekend_unusual_activity", // Activité weekend anormale

        // Features sociales/contextuelles
        "isolation_score", // Check-in isolé sans autres participants
        "bulk_operation_indicator", // Possibles opérations en lot suspectes
      ];

      for (const attendance of filteredAttendances) {
        const user = userMap.get(attendance.userId);
        const event = eventMap.get(attendance.eventId);
        const baseline = userBaselines.get(attendance.userId);

        if (!user || !event || !baseline) continue;

        // Extraire toutes les features d'anomalie
        const anomalyFeatures = await this.extractAnomalyFeaturesForAttendance(
          attendance, user, event, baseline, filteredAttendances
        );

        features.push(anomalyFeatures);

        // Labellisation basée sur des heuristiques (pour entraînement supervisé)
        const isAnomaly = this.detectAnomalyHeuristics(attendance, anomalyFeatures, baseline);
        labels.push(isAnomaly ? 1 : 0);
      }

      TriggerLogger.info("MLService", "extractAnomalyFeatures",
        `Extracted ${features.length} samples, ${labels.filter((l) => l === 1).length} anomalies detected`);

      return {
        features,
        labels,
        featureNames,
        metadata: {
          featureCount: featureNames.length,
          recordCount: features.length,
          dateRange: {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end),
          },
          version: "v1.0_anomaly",
          /* anomalyRate: labels.filter(l => l === 1).length / labels.length,
          totalAnomalies: labels.filter(l => l === 1).length */
        },
      };
    } catch (error) {
      TriggerLogger.error("MLService", "extractAnomalyFeatures", "Feature extraction failed", error);
      throw error;
    }
  }

  // 📊 CALCUL DES BASELINES UTILISATEUR POUR DÉTECTION D'ANOMALIES
  private async calculateUserBaselines(userIds: string[], dateRange: any): Promise<Map<string, any>> {
    const baselines = new Map();

    // Période de référence : 3 mois avant la période d'analyse
    const baselineStart = new Date(dateRange.start);
    baselineStart.setMonth(baselineStart.getMonth() - 3);
    const baselineEnd = new Date(dateRange.start);

    for (const userId of userIds) {
      try {
        const historicalAttendances = await attendanceService.getAttendancesByUser(userId, {
          startDate: baselineStart,
          endDate: baselineEnd,
        });

        if (historicalAttendances.length === 0) {
          // Utilisateur nouveau - utiliser des valeurs par défaut
          baselines.set(userId, this.getDefaultBaseline());
          continue;
        }

        const baseline = {
          // Patterns temporels
          averageCheckInHour: this.calculateAverageCheckInHour(historicalAttendances),
          typicalDelayMinutes: this.calculateTypicalDelay(historicalAttendances),
          preferredDaysOfWeek: this.calculatePreferredDays(historicalAttendances),

          // Patterns comportementaux
          averageResponseTime: this.calculateAverageResponseTime(historicalAttendances),
          preferredMethods: this.calculatePreferredMethods(historicalAttendances),
          attendanceFrequency: historicalAttendances.length / 12, // Par semaine moyenne

          // Patterns d'événements
          preferredEventTypes: this.calculatePreferredEventTypes(historicalAttendances),
          typicalEventDuration: this.calculateTypicalEventDuration(historicalAttendances),

          // Métriques de variabilité
          checkInTimeVariance: this.calculateCheckInTimeVariance(historicalAttendances),
          locationConsistency: this.calculateLocationConsistency(historicalAttendances),

          // Méta-données
          totalHistoricalEvents: historicalAttendances.length,
          longestAbsence: this.calculateLongestAbsence(historicalAttendances),
          lastActivityDate: this.getLastActivityDate(historicalAttendances),
        };

        baselines.set(userId, baseline);
      } catch (error) {
        logger.warn("MLService", "calculateUserBaselines", `Failed for user ${userId}`, error);
        baselines.set(userId, this.getDefaultBaseline());
      }
    }

    return baselines;
  }

  // 🔍 EXTRACTION DES FEATURES D'ANOMALIE POUR UNE ATTENDANCE
  private async extractAnomalyFeaturesForAttendance(
    attendance: any,
    user: any,
    event: any,
    baseline: any,
    allAttendances: any[]
  ): Promise<number[]> {
    // 1. Features temporelles
    const unusualCheckInTime = this.calculateUnusualCheckInTime(attendance, baseline);
    const extremeDelayMinutes = this.calculateExtremeDelay(attendance, event, baseline);
    const rapidSuccessiveCheckins = this.detectRapidSuccessiveCheckins(attendance, allAttendances);
    const offHoursActivity = this.detectOffHoursActivity(attendance);

    // 2. Features géographiques/techniques
    const locationDeviationScore = this.calculateLocationDeviation(attendance, baseline);
    const methodInconsistency = this.calculateMethodInconsistency(attendance, baseline);
    const deviceAnomalyScore = this.calculateDeviceAnomaly(attendance, baseline);

    // 3. Features comportementales
    const attendancePatternBreak = this.calculatePatternBreak(attendance, baseline);
    const responseTimeAnomaly = this.calculateResponseTimeAnomaly(attendance, baseline);
    const eventTypeMismatch = this.calculateEventTypeMismatch(event, baseline);

    // 4. Features de fréquence
    const unusualFrequencySpike = this.calculateFrequencySpike(attendance, allAttendances, baseline);
    const longAbsenceReturn = this.detectLongAbsenceReturn(attendance, baseline);
    const weekendUnusualActivity = this.detectWeekendActivity(attendance, baseline);

    // 5. Features sociales/contextuelles
    const isolationScore = this.calculateIsolationScore(attendance, allAttendances);
    const bulkOperationIndicator = this.detectBulkOperation(attendance, allAttendances);

    return [
      unusualCheckInTime,
      extremeDelayMinutes,
      rapidSuccessiveCheckins,
      offHoursActivity,
      locationDeviationScore,
      methodInconsistency,
      deviceAnomalyScore,
      attendancePatternBreak,
      responseTimeAnomaly,
      eventTypeMismatch,
      unusualFrequencySpike,
      longAbsenceReturn,
      weekendUnusualActivity,
      isolationScore,
      bulkOperationIndicator,
    ];
  }

  // 🚨 DÉTECTION D'ANOMALIES PAR HEURISTIQUES
  private detectAnomalyHeuristics(attendance: any, features: number[], baseline: any): boolean {
    // Seuils pour classification d'anomalie
    const [
      unusualCheckInTime,
      extremeDelayMinutes,
      rapidSuccessiveCheckins,
      offHoursActivity,
      locationDeviationScore,
      methodInconsistency,
      deviceAnomalyScore,
      attendancePatternBreak,
      responseTimeAnomaly,
      eventTypeMismatch,
      unusualFrequencySpike,
      longAbsenceReturn,
      weekendUnusualActivity,
      isolationScore,
      bulkOperationIndicator,
    ] = features;

    // Score d'anomalie composite
    let anomalyScore = 0;
    let criticalFlags = 0;

    // Indicateurs critiques (poids fort)
    if (extremeDelayMinutes > 0.8) {
      anomalyScore += 3; criticalFlags++;
    }
    if (rapidSuccessiveCheckins > 0.7) {
      anomalyScore += 3; criticalFlags++;
    }
    if (locationDeviationScore > 0.9) {
      anomalyScore += 4; criticalFlags++;
    }
    if (longAbsenceReturn > 0.5) {
      anomalyScore += 7; criticalFlags++;
    }
    if (deviceAnomalyScore > 0.8) {
      anomalyScore += 3; criticalFlags++;
    }
    if (bulkOperationIndicator > 0.8) {
      anomalyScore += 4; criticalFlags++;
    }

    // Indicateurs modérés (poids moyen)
    if (unusualCheckInTime > 0.7) anomalyScore += 2;
    if (methodInconsistency > 0.6) anomalyScore += 2;
    if (attendancePatternBreak > 0.7) anomalyScore += 2;
    if (responseTimeAnomaly > 0.8) anomalyScore += 2;

    // Indicateurs légers (poids faible)
    if (offHoursActivity > 0.5) anomalyScore += 1;
    if (eventTypeMismatch > 0.6) anomalyScore += 1;
    if (unusualFrequencySpike > 0.7) anomalyScore += 1;
    if (weekendUnusualActivity > 0.6) anomalyScore += 1;
    if (isolationScore > 0.8) anomalyScore += 1;

    // Classification finale
    // Anomalie si : score élevé OU au moins 2 indicateurs critiques
    return anomalyScore >= 6 || criticalFlags >= 2;
  }

  // 🛠️ MÉTHODES DE CALCUL DES FEATURES INDIVIDUELLES

  private calculateUnusualCheckInTime(attendance: any, baseline: any): number {
    if (!attendance.checkInTime || !baseline.averageCheckInHour) return 0;

    const checkInHour = attendance.checkInTime.getHours() + attendance.checkInTime.getMinutes() / 60;
    const deviation = Math.abs(checkInHour - baseline.averageCheckInHour);

    // Normaliser sur 24h, avec seuil de 2h pour "normal"
    return Math.min(1, Math.max(0, (deviation - 2) / 10));
  }

  private calculateExtremeDelay(attendance: any, event: any, baseline: any): number {
    if (!attendance.checkInTime || !event.startDateTime) return 0;

    const delayMinutes = (attendance.checkInTime.getTime() - event.startDateTime.getTime()) / (1000 * 60);
    const typicalDelay = baseline.typicalDelayMinutes || 0;

    // Anomalie si retard > 3x le retard habituel ET > 30 minutes
    const extremeThreshold = Math.max(30, typicalDelay * 3);
    return delayMinutes > extremeThreshold ? Math.min(1, delayMinutes / 120) : 0;
  }

  private detectRapidSuccessiveCheckins(attendance: any, allAttendances: any[]): number {
    if (!attendance.checkInTime) return 0;

    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const sameUserCheckins = allAttendances.filter((a) =>
      a.userId === attendance.userId &&
      a.checkInTime &&
      Math.abs(a.checkInTime.getTime() - attendance.checkInTime.getTime()) < timeWindow
    );

    // Suspect si plus de 3 check-ins en 10 minutes
    return sameUserCheckins.length > 3 ? Math.min(1, sameUserCheckins.length / 10) : 0;
  }

  private detectOffHoursActivity(attendance: any): number {
    if (!attendance.checkInTime) return 0;

    const hour = attendance.checkInTime.getHours();
    const isWeekend = [0, 6].includes(attendance.checkInTime.getDay());

    // Heures suspectes : très tôt (5h-7h), très tard (20h-23h), nuit (23h-5h)
    if (hour >= 23 || hour <= 5) return 1.0; // Nuit = très suspect
    if (hour <= 7 || hour >= 20) return 0.7; // Tôt/tard = suspect
    if (isWeekend && (hour <= 8 || hour >= 18)) return 0.5; // Weekend hors heures = modérément suspect

    return 0;
  }

  private calculateLocationDeviation(attendance: any, baseline: any): number {
    // Simulation - en production, comparer avec les localisations habituelles
    const hasLocationData = attendance.location || attendance.geolocation;
    if (!hasLocationData) return 0.3; // Absence de données de localisation = léger suspect

    // Simuler un score de déviation géographique
    return Math.random() * 0.3; // Normalement faible sauf anomalie
  }

  private calculateMethodInconsistency(attendance: any, baseline: any): number {
    if (!baseline.preferredMethods || Object.keys(baseline.preferredMethods).length === 0) return 0;

    const preferredMethod = Object.keys(baseline.preferredMethods)[0];
    const currentMethod = attendance.method;

    // Anomalie si méthode jamais utilisée OU changement vers méthode moins sécurisée
    const methodSecurity = {biometric: 1.0, nfc: 0.8, qr_code: 0.6, manual: 0.2};
    const preferredSecurity = methodSecurity[preferredMethod as keyof typeof methodSecurity] || 0.5;
    const currentSecurity = methodSecurity[currentMethod as keyof typeof methodSecurity] || 0.5;

    if (currentMethod !== preferredMethod && currentSecurity < preferredSecurity) {
      return 0.8; // Changement vers méthode moins sécurisée
    }

    return currentMethod === preferredMethod ? 0 : 0.3;
  }

  private calculateDeviceAnomaly(attendance: any, baseline: any): number {
    // Simulation - en production, analyser l'empreinte digitale de l'appareil
    // Facteurs : nouvel User-Agent, nouvelle IP, nouveau device ID, etc.

    const hasDeviceInfo = attendance.metadata?.deviceInfo;
    if (!hasDeviceInfo) return 0.4; // Absence d'info device = suspect

    // Simuler détection de nouvel appareil
    return Math.random() > 0.9 ? 0.8 : 0.1; // 10% de chance d'appareil suspect
  }

  private calculatePatternBreak(attendance: any, baseline: any): number {
    if (!attendance.createdAt) return 0;

    const dayOfWeek = attendance.createdAt.getDay();
    const preferredDays = baseline.preferredDaysOfWeek || {};

    // Score basé sur la fréquence habituelle de ce jour
    const dayFrequency = preferredDays[dayOfWeek] || 0;

    // Anomalie si participation un jour où l'utilisateur ne vient jamais/rarement
    return dayFrequency < 0.2 ? 0.7 : 0;
  }

  private calculateResponseTimeAnomaly(attendance: any, baseline: any): number {
    if (!attendance.checkInTime || !attendance.createdAt) return 0;

    const responseTime = Math.abs(attendance.checkInTime.getTime() - attendance.createdAt.getTime()) / (1000 * 60);
    const typicalResponseTime = baseline.averageResponseTime || 5; // 5 minutes par défaut

    // Anomalie si temps de réponse > 10x la normale
    const deviation = Math.abs(responseTime - typicalResponseTime) / typicalResponseTime;
    return Math.min(1, Math.max(0, (deviation - 2) / 8)); // Seuil à 2x la normale
  }

  private calculateEventTypeMismatch(event: any, baseline: any): number {
    const preferredTypes = baseline.preferredEventTypes || {};
    const eventType = event.type;

    const typeFrequency = preferredTypes[eventType] || 0;

    // Anomalie si participation à un type d'événement jamais fréquenté
    return typeFrequency === 0 ? 0.6 : 0;
  }

  private calculateFrequencySpike(attendance: any, allAttendances: any[], baseline: any): number {
    if (!attendance.createdAt) return 0;

    // Compter les attendances dans les 7 derniers jours
    const weekAgo = new Date(attendance.createdAt);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentCount = allAttendances.filter((a) =>
      a.userId === attendance.userId &&
      a.createdAt &&
      a.createdAt >= weekAgo &&
      a.createdAt <= attendance.createdAt
    ).length;

    const typicalWeeklyFrequency = baseline.attendanceFrequency || 2;

    // Anomalie si fréquence > 3x la normale
    return recentCount > typicalWeeklyFrequency * 3 ?
      Math.min(1, recentCount / (typicalWeeklyFrequency * 5)) : 0;
  }

  private detectLongAbsenceReturn(attendance: any, baseline: any): number {
    const lastActivity = baseline.lastActivityDate;
    if (!lastActivity || !attendance.createdAt) return 0;

    const absenceDays = (attendance.createdAt.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    const longestAbsence = baseline.longestAbsence || 30;

    // Anomalie si retour après absence > 2x la plus longue absence habituelle
    return absenceDays > longestAbsence * 2 ? Math.min(1, absenceDays / (longestAbsence * 4)) : 0;
  }

  private detectWeekendActivity(attendance: any, baseline: any): number {
    if (!attendance.createdAt) return 0;

    const isWeekend = [0, 6].includes(attendance.createdAt.getDay());
    if (!isWeekend) return 0;

    const preferredDays = baseline.preferredDaysOfWeek || {};
    const weekendActivity = (preferredDays[0] || 0) + (preferredDays[6] || 0);

    // Anomalie si activité weekend alors que l'utilisateur ne travaille jamais le weekend
    return weekendActivity < 0.1 ? 0.6 : 0;
  }

  private calculateIsolationScore(attendance: any, allAttendances: any[]): number {
    if (!attendance.eventId || !attendance.checkInTime) return 0;

    // Compter les autres participants au même événement
    const sameEventAttendances = allAttendances.filter((a) =>
      a.eventId === attendance.eventId &&
      a.userId !== attendance.userId
    );

    // Suspect si seule personne à un événement supposé avoir plusieurs participants
    return sameEventAttendances.length === 0 ? 0.5 : 0;
  }

  private detectBulkOperation(attendance: any, allAttendances: any[]): number {
    if (!attendance.createdAt) return 0;

    const timeWindow = 60 * 1000; // 1 minute
    const sameBatch = allAttendances.filter((a) =>
      a.createdAt &&
      Math.abs(a.createdAt.getTime() - attendance.createdAt.getTime()) < timeWindow
    );

    // Très suspect si plus de 10 check-ins dans la même minute
    return sameBatch.length > 10 ? Math.min(1, sameBatch.length / 50) : 0;
  }

  // 🔧 MÉTHODES UTILITAIRES POUR CALCUL DE BASELINE

  private getDefaultBaseline(): any {
    return {
      averageCheckInHour: 9, // 9h par défaut
      typicalDelayMinutes: 5,
      preferredDaysOfWeek: {1: 0.8, 2: 0.8, 3: 0.8, 4: 0.8, 5: 0.7}, // Lun-Ven
      averageResponseTime: 5,
      preferredMethods: {qr_code: 0.7},
      attendanceFrequency: 2,
      preferredEventTypes: {meeting: 0.6},
      typicalEventDuration: 2,
      checkInTimeVariance: 1.0,
      locationConsistency: 0.8,
      totalHistoricalEvents: 0,
      longestAbsence: 7,
      lastActivityDate: new Date(),
    };
  }
  private calculateAverageCheckInHour(attendances: any[]): number {
    const validCheckins = attendances.filter((a) => a.checkInTime);
    if (validCheckins.length === 0) return 9; // 9h par défaut

    const totalHours = validCheckins.reduce((sum, a) =>
      sum + a.checkInTime.getHours() + a.checkInTime.getMinutes() / 60, 0);

    return totalHours / validCheckins.length;
  }

  private calculateTypicalDelay(attendances: any[]): number {
    // Calculer les retards réels si on a les données d'événement
    const lateAttendances = attendances.filter((a) => a.status === AttendanceStatus.LATE);

    if (lateAttendances.length === 0) return 0;

    // Si on a les métriques de retard stockées
    const delaysWithMetrics = lateAttendances.filter((a) => a.metrics?.lateMinutes);

    if (delaysWithMetrics.length > 0) {
      const totalDelay = delaysWithMetrics.reduce((sum, a) => sum + a.metrics.lateMinutes, 0);
      return totalDelay / delaysWithMetrics.length;
    }

    // Sinon, estimation basée sur le nombre de retards
    const lateRate = lateAttendances.length / attendances.length;
    return lateRate > 0.3 ? 15 : lateRate > 0.1 ? 8 : 3; // Estimation en minutes
  }

  private calculatePreferredDays(attendances: any[]): Record<number, number> {
    const dayCounts: Record<number, number> = {};
    const total = attendances.length;

    if (total === 0) return {};

    attendances.forEach((a) => {
      if (a.createdAt) {
        const day = a.createdAt.getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    // Convertir en fréquences (0-1)
    const frequencies: Record<number, number> = {};
    Object.keys(dayCounts).forEach((day) => {
      const dayNum = parseInt(day);
      frequencies[dayNum] = dayCounts[dayNum] / total;
    });

    return frequencies;
  }

  private calculatePreferredMethods(attendances: any[]): Record<string, number> {
    const methodCounts: Record<string, number> = {};
    const total = attendances.length;

    if (total === 0) return {};

    attendances.forEach((a) => {
      if (a.method) {
        methodCounts[a.method] = (methodCounts[a.method] || 0) + 1;
      }
    });

    // Convertir en fréquences
    const frequencies: Record<string, number> = {};
    Object.keys(methodCounts).forEach((method) => {
      frequencies[method] = methodCounts[method] / total;
    });

    return frequencies;
  }

  private calculatePreferredEventTypes(attendances: any[]): Record<string, number> {
    // Note: Nécessiterait l'accès aux données d'événement pour obtenir les vrais types
    // Pour l'instant, simulation basée sur des patterns typiques

    const total = attendances.length;
    if (total === 0) return {};

    // Simulation basée sur la distribution typique des événements
    const simulatedTypes: Record<string, number> = {};

    // Répartition simulée réaliste
    if (total >= 10) {
      simulatedTypes.meeting = 0.4; // 40% meetings
      simulatedTypes.training = 0.25; // 25% formations
      simulatedTypes.conference = 0.15; // 15% conférences
      simulatedTypes.workshop = 0.12; // 12% ateliers
      simulatedTypes.seminar = 0.08; // 8% séminaires
    } else {
      // Pour peu d'événements, répartition plus simple
      simulatedTypes.meeting = 0.6;
      simulatedTypes.training = 0.4;
    }

    return simulatedTypes;
  }

  private calculateTypicalEventDuration(attendances: any[]): number {
    // Note: Nécessiterait l'accès aux données d'événement pour calculer la vraie durée
    // Simulation basée sur les patterns typiques

    const total = attendances.length;
    if (total === 0) return 2; // 2 heures par défaut

    // Simulation basée sur des durées typiques d'événements
    if (total < 5) return 1.5; // Réunions courtes pour nouveaux utilisateurs
    if (total < 20) return 2; // Durée moyenne
    if (total < 50) return 2.5; // Utilisateurs actifs, événements plus longs
    return 3; // Utilisateurs très actifs, formations longues
  }

  private calculateCheckInTimeVariance(attendances: any[]): number {
    const validCheckins = attendances.filter((a) => a.checkInTime);
    if (validCheckins.length < 2) return 1.0; // Variance par défaut

    // Convertir les heures en nombres décimaux
    const hours = validCheckins.map((a) =>
      a.checkInTime.getHours() + a.checkInTime.getMinutes() / 60
    );

    // Calculer la moyenne
    const mean = hours.reduce((sum, h) => sum + h, 0) / hours.length;

    // Calculer la variance
    const squaredDifferences = hours.map((h) => Math.pow(h - mean, 2));
    const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / hours.length;

    // Retourner l'écart-type (racine carrée de la variance)
    return Math.sqrt(variance);
  }

  private calculateLocationConsistency(attendances: any[]): number {
    // Simulation de consistance géographique
    // En production, analyserait les données de géolocalisation réelles

    const attendancesWithLocation = attendances.filter((a) =>
      a.location || a.geolocation || a.metadata?.location
    );

    if (attendancesWithLocation.length === 0) {
      return 0.5; // Consistance moyenne si pas de données de localisation
    }

    const total = attendances.length;
    const withLocation = attendancesWithLocation.length;

    // Simulation : plus l'utilisateur a de données de localisation, plus il est consistant
    const locationDataRate = withLocation / total;

    if (locationDataRate > 0.8) return 0.9; // Très consistant
    if (locationDataRate > 0.6) return 0.8; // Consistant
    if (locationDataRate > 0.4) return 0.7; // Moyennement consistant
    if (locationDataRate > 0.2) return 0.6; // Peu consistant
    return 0.5; // Consistance inconnue
  }

  private calculateLongestAbsence(attendances: any[]): number {
    if (attendances.length < 2) return 0;

    // Trier les présences par date
    const sortedAttendances = attendances
      .filter((a) => a.createdAt)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (sortedAttendances.length < 2) return 0;

    let longestGap = 0;

    for (let i = 1; i < sortedAttendances.length; i++) {
      const currentDate = sortedAttendances[i].createdAt;
      const previousDate = sortedAttendances[i - 1].createdAt;

      // Calculer l'écart en jours
      const gapDays = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);

      if (gapDays > longestGap) {
        longestGap = gapDays;
      }
    }

    return Math.floor(longestGap);
  }

  private getLastActivityDate(attendances: any[]): Date {
    const validDates = attendances
      .filter((a) => a.createdAt)
      .map((a) => a.createdAt);

    if (validDates.length === 0) {
      return new Date(); // Date actuelle si pas d'historique
    }

    // Retourner la date la plus récente
    const latestTimestamp = Math.max(...validDates.map((d) => d.getTime()));
    return new Date(latestTimestamp);
  }


  /*private validateAttendanceData(attendances: any[]): {
    valid: any[];
    invalid: any[];
    stats: {
      total: number;
      withCheckIn: number;
      withLocation: number;
      withMetrics: number;
    };
  } {
    const valid: any[] = [];
    const invalid: any[] = [];

    let withCheckIn = 0;
    let withLocation = 0;
    let withMetrics = 0;

    attendances.forEach((attendance) => {
      // Validation de base
      if (attendance.userId && attendance.eventId && attendance.status) {
        valid.push(attendance);

        // Compteurs pour statistiques
        if (attendance.checkInTime) withCheckIn++;
        if (attendance.location || attendance.geolocation) withLocation++;
        if (attendance.metrics) withMetrics++;
      } else {
        invalid.push(attendance);
      }
    });

    return {
      valid,
      invalid,
      stats: {
        total: attendances.length,
        withCheckIn,
        withLocation,
        withMetrics,
      },
    };
  }*/

  // @ts-ignore
  private updateBaselineIncremental(
    currentBaseline: any,
    newAttendance: any,
    totalHistoricalCount: number
  ): any {
    // Mise à jour incrémentale pour optimisation performance
    // Utile quand on ajoute une nouvelle attendance

    const updatedBaseline = {...currentBaseline};

    if (newAttendance.checkInTime) {
      // Mise à jour moyenne pondérée de l'heure de check-in
      const newHour = newAttendance.checkInTime.getHours() +
        newAttendance.checkInTime.getMinutes() / 60;

      const currentWeight = totalHistoricalCount;
      const newWeight = currentWeight + 1;

      updatedBaseline.averageCheckInHour =
        (currentBaseline.averageCheckInHour * currentWeight + newHour) / newWeight;
    }

    if (newAttendance.createdAt) {
      // Mise à jour des jours préférés
      const dayOfWeek = newAttendance.createdAt.getDay();
      const currentDayFreq = currentBaseline.preferredDaysOfWeek[dayOfWeek] || 0;
      const totalEvents = totalHistoricalCount + 1;

      // Recalculer la fréquence pour ce jour
      const dayCount = Math.round(currentDayFreq * totalHistoricalCount) + 1;
      updatedBaseline.preferredDaysOfWeek[dayOfWeek] = dayCount / totalEvents;
    }

    if (newAttendance.method) {
      // Mise à jour des méthodes préférées
      const currentMethodFreq = currentBaseline.preferredMethods[newAttendance.method] || 0;
      const totalEvents = totalHistoricalCount + 1;

      const methodCount = Math.round(currentMethodFreq * totalHistoricalCount) + 1;
      updatedBaseline.preferredMethods[newAttendance.method] = methodCount / totalEvents;
    }

    // Mise à jour de la dernière activité
    updatedBaseline.lastActivityDate = new Date();
    updatedBaseline.totalHistoricalEvents = totalHistoricalCount + 1;

    return updatedBaseline;
  }
}

export const mlService = new MLService();
