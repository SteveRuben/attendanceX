import {Router} from "express";
import {authenticate, requireTenantPermission} from "../../middleware/auth";
import {validateBody, validateParams, validateQuery} from "../../middleware/validation";
import {rateLimit} from "../../middleware/rateLimit";
import {z} from "zod";
import { MLController } from "../../controllers/report/ml.controller";

const router = Router();

// 🔒 Authentification requise pour toutes les routes ML
router.use(authenticate);

// 🏥 Health check (accessible à tous les utilisateurs authentifiés)
router.get("/health", MLController.healthCheck);

// 🔮 PRÉDICTIONS DE PRÉSENCE
router.post("/predict-attendance",
  requireTenantPermission("view_reports"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  validateBody(z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
    eventId: z.string().min(1, "ID événement requis"),
    includeFactors: z.boolean().default(false),
  })),
  MLController.predictAttendance
);

// 💡 RECOMMANDATIONS INTELLIGENTES
router.post("/recommendations",
  requireTenantPermission("view_reports"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),
  validateBody(z.object({
    type: z.enum(["attendance", "event", "user", "department", "global"]),
    targetId: z.string().optional(),
    context: z.record(z.any()).optional(),
  })),
  MLController.getRecommendations
);

// 🚨 DÉTECTION D'ANOMALIES
router.post("/anomalies",
  requireTenantPermission("view_reports"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 20,
  }),
  validateBody(z.object({
    type: z.enum(["attendance", "behavior", "event"]),
    timeframe: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    threshold: z.number().min(0).max(1).default(0.7),
    includeRecommendations: z.boolean().default(false),
  })),
  MLController.detectAnomalies
);

// 📊 GÉNÉRATION D'INSIGHTS
router.post("/insights",
  requireTenantPermission("view_reports"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
  }),
  validateBody(z.object({
    type: z.enum(["user", "event", "department", "global"]),
    targetId: z.string().optional(),
    timeframe: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    includeRecommendations: z.boolean().default(false),
  })),
  MLController.generateInsights
);

// 🔍 ANALYSE DES FACTEURS D'INFLUENCE
router.post("/analyze-factors",
  requireTenantPermission("view_reports"),
  validateBody(z.object({
    userId: z.string().optional(),
    eventId: z.string().optional(),
    timeframe: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
  })),
  MLController.analyzeFactors
);

// 🤖 GESTION DES MODÈLES ML (Admin uniquement)
router.get("/models",
  requireTenantPermission("manage_tenant_settings"),
  validateQuery(z.object({
    type: z.string().optional(),
    status: z.enum(["active", "training", "failed", "archived"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })),
  MLController.listModels
);

router.get("/models/:id",
  requireTenantPermission("manage_tenant_settings"),
  validateParams(z.object({
    id: z.string().min(1, "ID modèle requis"),
  })),
  MLController.getModelDetails
);

router.post("/models/train",
  requireTenantPermission("manage_tenant_settings"),
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3, // Maximum 3 entraînements par 5 minutes
  }),
  validateBody(z.object({
    type: z.enum(["attendance_prediction", "behavior_analysis", "anomaly_detection"]),
    config: z.object({
      epochs: z.number().int().min(10).max(1000).default(100),
      batchSize: z.number().int().min(16).max(512).default(32),
      learningRate: z.number().min(0.0001).max(0.1).default(0.001),
      validationSplit: z.number().min(0.1).max(0.5).default(0.2),
    }).optional(),
    description: z.string().max(500).optional(),
  })),
  MLController.trainModel
);

// 📈 MÉTRIQUES ET PERFORMANCE DES MODÈLES
router.get("/models/:id/performance",
  requireTenantPermission("view_reports"),
  validateParams(z.object({
    id: z.string().min(1, "ID modèle requis"),
  })),
  validateQuery(z.object({
    timeframe: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  })),
  MLController.getModelDetails // Réutilise la même méthode qui inclut les performances
);

// 🧪 TEST ET VALIDATION
router.post("/test-prediction",
  requireTenantPermission("manage_tenant_settings"),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),
  validateBody(z.object({
    modelId: z.string().min(1, "ID modèle requis"),
    testData: z.object({
      userId: z.string().min(1),
      eventId: z.string().min(1),
    }),
  })),
  MLController.predictAttendance // Réutilise la méthode de prédiction
);

// 📊 ANALYTICS ML
router.get("/analytics",
  requireTenantPermission("view_reports"),
  validateQuery(z.object({
    timeframe: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    type: z.enum(["predictions", "accuracy", "usage", "performance"]).optional(),
  })),
  MLController.generateInsights // Réutilise pour les analytics générales
);

// 🔄 BATCH PREDICTIONS (pour traitement en masse)
router.post("/batch-predict",
  requireTenantPermission("view_reports"),
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // Maximum 5 batch par 5 minutes
  }),
  validateBody(z.object({
    eventId: z.string().min(1, "ID événement requis"),
    userIds: z.array(z.string()).min(1).max(1000, "Maximum 1000 utilisateurs par batch"),
    includeFactors: z.boolean().default(false),
    includeRecommendations: z.boolean().default(false),
  })),
  MLController.predictAttendance // Adapté pour traiter plusieurs utilisateurs
);

export {router as mlRoutes};