# 🤖 ML & Analytics API

## Vue d'ensemble

L'API ML & Analytics d'Attendance-X fournit des capacités d'intelligence artificielle et d'analyse avancée pour optimiser la gestion des événements et prédire les tendances de présence.

**Base URL:** `/api/ml`

## Fonctionnalités principales

- 🔮 Prédictions de présence basées sur l'IA
- 💡 Recommandations intelligentes pour l'optimisation des événements
- 🚨 Détection d'anomalies et d'patterns inhabituels
- 📊 Génération d'insights automatisés
- 🔍 Analyse des facteurs d'influence sur la présence
- 🤖 Gestion et entraînement des modèles ML

## Health Check

### GET /ml/health
Vérifie le statut du service ML.

**Permissions requises :** Utilisateur authentifié

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "version": "2.1.0",
    "models": {
      "attendance_predictor": {
        "status": "ready",
        "version": "1.3.2",
        "lastTrained": "2024-03-10T14:30:00Z",
        "accuracy": 0.87
      },
      "anomaly_detector": {
        "status": "ready",
        "version": "1.1.0",
        "lastTrained": "2024-03-08T10:15:00Z",
        "precision": 0.92
      }
    },
    "services": {
      "prediction": "operational",
      "recommendations": "operational",
      "insights": "operational"
    }
  }
}
```

## Prédictions de présence

### POST /ml/predict-attendance
Prédit la présence pour un événement ou un ensemble d'événements.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "eventId": "event-123",
  "predictionType": "individual",
  "timeHorizon": "7d",
  "factors": {
    "weather": true,
    "historical": true,
    "demographics": true,
    "seasonality": true
  },
  "participants": [
    {
      "userId": "user-456",
      "registrationDate": "2024-03-10T14:00:00Z",
      "previousAttendance": 0.85
    }
  ]
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "eventId": "event-123",
    "predictionId": "pred-789",
    "generatedAt": "2024-03-15T10:00:00Z",
    "overall": {
      "expectedAttendance": 42,
      "totalRegistered": 50,
      "predictedRate": 0.84,
      "confidence": 0.87,
      "riskLevel": "low"
    },
    "individual": [
      {
        "userId": "user-456",
        "firstName": "Jean",
        "lastName": "Dupont",
        "attendanceProbability": 0.92,
        "confidence": 0.85,
        "factors": {
          "historicalRate": 0.88,
          "dayOfWeek": 0.95,
          "timeOfDay": 0.90,
          "eventType": 0.85,
          "weather": 0.80
        },
        "riskFactors": [],
        "recommendations": [
          "Send reminder 24h before event"
        ]
      }
    ],
    "insights": {
      "keyFactors": [
        {
          "factor": "dayOfWeek",
          "impact": 0.15,
          "description": "Tuesday events have 15% higher attendance"
        },
        {
          "factor": "weather",
          "impact": -0.08,
          "description": "Rain forecast may reduce attendance by 8%"
        }
      ],
      "recommendations": [
        "Consider sending weather-related reminders",
        "Prepare for 8-10 no-shows based on historical patterns"
      ]
    },
    "model": {
      "name": "attendance_predictor_v1.3.2",
      "accuracy": 0.87,
      "lastTrained": "2024-03-10T14:30:00Z"
    }
  }
}
```

### POST /ml/batch-predict
Prédictions en masse pour multiple événements.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "eventIds": ["event-123", "event-456", "event-789"],
  "predictionType": "aggregate",
  "timeHorizon": "30d",
  "includeIndividual": false
}
```

## Recommandations intelligentes

### POST /ml/recommendations
Génère des recommandations pour optimiser les événements.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "type": "event_optimization",
  "context": {
    "eventId": "event-123",
    "organizationId": "org-456",
    "timeframe": "next_month"
  },
  "focus": [
    "attendance_optimization",
    "scheduling",
    "engagement",
    "resource_allocation"
  ]
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "recommendationId": "rec-789",
    "generatedAt": "2024-03-15T10:30:00Z",
    "type": "event_optimization",
    "recommendations": [
      {
        "category": "scheduling",
        "priority": "high",
        "title": "Optimal Time Slot",
        "description": "Schedule events on Tuesday-Thursday between 10:00-11:00 for 23% higher attendance",
        "impact": {
          "metric": "attendance_rate",
          "expectedImprovement": 0.23,
          "confidence": 0.89
        },
        "implementation": {
          "effort": "low",
          "timeframe": "immediate",
          "resources": []
        },
        "evidence": {
          "dataPoints": 156,
          "historicalSuccess": 0.91,
          "similarOrganizations": 0.87
        }
      },
      {
        "category": "engagement",
        "priority": "medium",
        "title": "Pre-Event Communication",
        "description": "Send personalized reminders 48h and 2h before events",
        "impact": {
          "metric": "no_show_rate",
          "expectedImprovement": -0.15,
          "confidence": 0.82
        },
        "implementation": {
          "effort": "medium",
          "timeframe": "1-2 weeks",
          "resources": ["email_templates", "automation_setup"]
        }
      },
      {
        "category": "resource_allocation",
        "priority": "low",
        "title": "Room Capacity Optimization",
        "description": "Book rooms with 15% buffer based on predicted attendance",
        "impact": {
          "metric": "cost_efficiency",
          "expectedImprovement": 0.12,
          "confidence": 0.75
        }
      }
    ],
    "summary": {
      "totalRecommendations": 3,
      "highPriority": 1,
      "mediumPriority": 1,
      "lowPriority": 1,
      "estimatedImpact": {
        "attendanceIncrease": 0.23,
        "costReduction": 0.12,
        "engagementImprovement": 0.18
      }
    }
  }
}
```

## Détection d'anomalies

### POST /ml/anomalies
Détecte les anomalies dans les patterns de présence.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "scope": "organization",
  "timeframe": {
    "start": "2024-02-01T00:00:00Z",
    "end": "2024-03-15T23:59:59Z"
  },
  "sensitivity": "medium",
  "categories": [
    "attendance_drops",
    "unusual_patterns",
    "outlier_events",
    "user_behavior"
  ]
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "analysisId": "anom-456",
    "generatedAt": "2024-03-15T11:00:00Z",
    "timeframe": {
      "start": "2024-02-01T00:00:00Z",
      "end": "2024-03-15T23:59:59Z"
    },
    "summary": {
      "totalAnomalies": 7,
      "highSeverity": 2,
      "mediumSeverity": 3,
      "lowSeverity": 2,
      "falsePositiveRate": 0.05
    },
    "anomalies": [
      {
        "id": "anom-001",
        "type": "attendance_drop",
        "severity": "high",
        "confidence": 0.94,
        "detectedAt": "2024-03-15T11:00:00Z",
        "event": {
          "id": "event-123",
          "name": "Formation React Avancé",
          "date": "2024-03-10T09:00:00Z"
        },
        "description": "Attendance rate dropped to 45% (expected 85%)",
        "metrics": {
          "expected": 0.85,
          "actual": 0.45,
          "deviation": -0.40,
          "zScore": -3.2
        },
        "possibleCauses": [
          "Weather conditions (heavy rain)",
          "Competing event scheduled",
          "Technical issues with registration"
        ],
        "recommendations": [
          "Investigate registration system issues",
          "Send follow-up survey to no-shows",
          "Consider rescheduling similar events during bad weather"
        ],
        "impact": {
          "severity": "high",
          "affectedUsers": 20,
          "potentialRevenue": -1200
        }
      },
      {
        "id": "anom-002",
        "type": "unusual_pattern",
        "severity": "medium",
        "confidence": 0.78,
        "description": "User 'jean.dupont@example.com' missed 5 consecutive events",
        "user": {
          "id": "user-456",
          "name": "Jean Dupont",
          "previousAttendanceRate": 0.92
        },
        "pattern": {
          "consecutiveMisses": 5,
          "timespan": "2 weeks",
          "previousPattern": "highly_regular"
        },
        "recommendations": [
          "Reach out personally to check engagement",
          "Review if event types match user interests"
        ]
      }
    ],
    "trends": {
      "overallTrend": "stable",
      "weeklyVariation": 0.12,
      "seasonalFactors": [
        {
          "factor": "winter_weather",
          "impact": -0.08
        }
      ]
    }
  }
}
```

## Génération d'insights

### POST /ml/insights
Génère des insights automatisés basés sur les données.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "scope": "organization",
  "timeframe": "last_quarter",
  "categories": [
    "attendance_trends",
    "user_engagement",
    "event_performance",
    "operational_efficiency"
  ],
  "depth": "detailed",
  "includeRecommendations": true
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "insightId": "insight-789",
    "generatedAt": "2024-03-15T12:00:00Z",
    "scope": "organization",
    "timeframe": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-03-15T23:59:59Z",
      "label": "Q1 2024"
    },
    "summary": {
      "keyFindings": 5,
      "actionableInsights": 8,
      "confidenceScore": 0.86,
      "dataQuality": "high"
    },
    "insights": [
      {
        "category": "attendance_trends",
        "title": "Peak Attendance Patterns Identified",
        "description": "Tuesday and Wednesday events show 28% higher attendance rates",
        "confidence": 0.91,
        "impact": "high",
        "data": {
          "tuesdayRate": 0.89,
          "wednesdayRate": 0.87,
          "averageRate": 0.68,
          "sampleSize": 156
        },
        "visualization": {
          "type": "bar_chart",
          "data": [
            { "day": "Monday", "rate": 0.65 },
            { "day": "Tuesday", "rate": 0.89 },
            { "day": "Wednesday", "rate": 0.87 },
            { "day": "Thursday", "rate": 0.72 },
            { "day": "Friday", "rate": 0.58 }
          ]
        },
        "recommendations": [
          "Schedule important events on Tuesday-Wednesday",
          "Consider moving Friday events to mid-week",
          "Implement dynamic pricing based on day popularity"
        ]
      },
      {
        "category": "user_engagement",
        "title": "Engagement Segmentation Revealed",
        "description": "Three distinct user segments with different engagement patterns",
        "confidence": 0.84,
        "impact": "medium",
        "segments": [
          {
            "name": "High Engagers",
            "size": 0.25,
            "attendanceRate": 0.94,
            "characteristics": ["Regular attendees", "High feedback scores", "Early registrations"]
          },
          {
            "name": "Selective Participants",
            "size": 0.55,
            "attendanceRate": 0.67,
            "characteristics": ["Topic-specific attendance", "Moderate engagement", "Price-sensitive"]
          },
          {
            "name": "Occasional Attendees",
            "size": 0.20,
            "attendanceRate": 0.32,
            "characteristics": ["Irregular attendance", "Low engagement", "Last-minute decisions"]
          }
        ],
        "recommendations": [
          "Create targeted communication strategies for each segment",
          "Offer loyalty programs for High Engagers",
          "Implement re-engagement campaigns for Occasional Attendees"
        ]
      }
    ],
    "actionItems": [
      {
        "priority": "high",
        "title": "Optimize Event Scheduling",
        "description": "Move 60% of events to Tuesday-Wednesday slots",
        "estimatedImpact": "23% attendance increase",
        "effort": "low",
        "timeframe": "2 weeks"
      },
      {
        "priority": "medium",
        "title": "Implement Segmented Marketing",
        "description": "Create personalized communication for each user segment",
        "estimatedImpact": "15% engagement increase",
        "effort": "medium",
        "timeframe": "1 month"
      }
    ]
  }
}
```

## Analyse des facteurs d'influence

### POST /ml/analyze-factors
Analyse les facteurs qui influencent la présence.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "eventId": "event-123",
  "factors": [
    "weather",
    "day_of_week",
    "time_of_day",
    "event_type",
    "duration",
    "location",
    "price",
    "instructor",
    "historical_attendance"
  ],
  "analysisType": "correlation"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "analysisId": "factor-456",
    "eventId": "event-123",
    "generatedAt": "2024-03-15T13:00:00Z",
    "factors": [
      {
        "name": "day_of_week",
        "correlation": 0.34,
        "significance": 0.001,
        "impact": "high",
        "description": "Tuesday events have significantly higher attendance",
        "values": {
          "monday": 0.65,
          "tuesday": 0.89,
          "wednesday": 0.87,
          "thursday": 0.72,
          "friday": 0.58
        }
      },
      {
        "name": "weather",
        "correlation": -0.28,
        "significance": 0.005,
        "impact": "medium",
        "description": "Rain reduces attendance by average 15%",
        "conditions": {
          "sunny": 0.85,
          "cloudy": 0.78,
          "rainy": 0.63,
          "snowy": 0.55
        }
      },
      {
        "name": "time_of_day",
        "correlation": 0.22,
        "significance": 0.01,
        "impact": "medium",
        "description": "Morning events (9-11 AM) show higher attendance",
        "timeSlots": {
          "09:00-11:00": 0.87,
          "11:00-13:00": 0.82,
          "13:00-15:00": 0.71,
          "15:00-17:00": 0.76,
          "17:00-19:00": 0.68
        }
      }
    ],
    "model": {
      "r_squared": 0.67,
      "adjusted_r_squared": 0.64,
      "f_statistic": 23.4,
      "p_value": 0.0001
    },
    "recommendations": [
      "Schedule events on Tuesday mornings for optimal attendance",
      "Implement weather-based reminder strategies",
      "Consider indoor backup plans for outdoor events"
    ]
  }
}
```

## Gestion des modèles ML

### GET /ml/models
Récupère la liste des modèles ML disponibles.

**Permissions requises :** Admin

**Paramètres de requête :**
- `status` (string) - Filtrer par statut: `ready`, `training`, `error`
- `type` (string) - Filtrer par type: `predictor`, `classifier`, `detector`

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "model-attendance-pred-v1",
      "name": "Attendance Predictor v1.3.2",
      "type": "predictor",
      "status": "ready",
      "version": "1.3.2",
      "description": "Predicts attendance probability for events and users",
      "metrics": {
        "accuracy": 0.87,
        "precision": 0.84,
        "recall": 0.89,
        "f1Score": 0.86
      },
      "training": {
        "lastTrained": "2024-03-10T14:30:00Z",
        "trainingDuration": "2h 15m",
        "dataPoints": 15420,
        "features": 23
      },
      "usage": {
        "totalPredictions": 5678,
        "dailyAverage": 45,
        "lastUsed": "2024-03-15T12:30:00Z"
      }
    }
  ]
}
```

### GET /ml/models/:id
Récupère les détails d'un modèle spécifique.

**Permissions requises :** Admin

### POST /ml/models/train
Lance l'entraînement d'un nouveau modèle.

**Permissions requises :** Admin

**Requête :**
```json
{
  "modelType": "attendance_predictor",
  "version": "1.4.0",
  "trainingData": {
    "startDate": "2023-01-01T00:00:00Z",
    "endDate": "2024-03-15T23:59:59Z",
    "includeWeather": true,
    "includeHolidays": true,
    "minDataPoints": 1000
  },
  "hyperparameters": {
    "learningRate": 0.001,
    "epochs": 100,
    "batchSize": 32
  },
  "validationSplit": 0.2
}
```

### GET /ml/models/:id/performance
Récupère les métriques de performance d'un modèle.

**Permissions requises :** Manager ou Admin

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "modelId": "model-attendance-pred-v1",
    "performance": {
      "overall": {
        "accuracy": 0.87,
        "precision": 0.84,
        "recall": 0.89,
        "f1Score": 0.86,
        "auc": 0.91
      },
      "bySegment": {
        "highEngagers": {
          "accuracy": 0.94,
          "precision": 0.92,
          "recall": 0.96
        },
        "selectiveParticipants": {
          "accuracy": 0.83,
          "precision": 0.81,
          "recall": 0.85
        },
        "occasionalAttendees": {
          "accuracy": 0.78,
          "precision": 0.75,
          "recall": 0.82
        }
      },
      "confusionMatrix": [
        [850, 120],
        [95, 935]
      ],
      "featureImportance": [
        {
          "feature": "historical_attendance_rate",
          "importance": 0.28
        },
        {
          "feature": "day_of_week",
          "importance": 0.19
        },
        {
          "feature": "event_type",
          "importance": 0.15
        }
      ]
    },
    "trends": {
      "accuracyOverTime": [
        {
          "date": "2024-03-01",
          "accuracy": 0.85
        },
        {
          "date": "2024-03-15",
          "accuracy": 0.87
        }
      ]
    }
  }
}
```

## Test et validation

### POST /ml/test-prediction
Teste une prédiction avec des données spécifiques.

**Permissions requises :** Admin

**Requête :**
```json
{
  "modelId": "model-attendance-pred-v1",
  "testData": {
    "userId": "user-123",
    "eventId": "event-456",
    "eventDate": "2024-03-20T10:00:00Z",
    "dayOfWeek": "wednesday",
    "weather": "sunny",
    "historicalRate": 0.85
  }
}
```

## Analytics ML

### GET /ml/analytics
Récupère les analytics du système ML.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `period` (string) - Période: `day`, `week`, `month`
- `metrics` (string) - Métriques: `usage`, `performance`, `accuracy`

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "usage": {
      "totalPredictions": 15678,
      "dailyAverage": 156,
      "peakUsage": "2024-03-15T10:00:00Z",
      "byModel": {
        "attendance_predictor": 12345,
        "anomaly_detector": 2456,
        "recommendation_engine": 877
      }
    },
    "performance": {
      "averageResponseTime": "245ms",
      "successRate": 0.998,
      "errorRate": 0.002,
      "uptime": 0.9995
    },
    "accuracy": {
      "overall": 0.87,
      "trend": "improving",
      "lastWeek": 0.89,
      "lastMonth": 0.85
    }
  }
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `MODEL_NOT_FOUND` | Modèle ML introuvable |
| `INSUFFICIENT_DATA` | Données insuffisantes pour l'analyse |
| `PREDICTION_FAILED` | Échec de la prédiction |
| `MODEL_TRAINING_ERROR` | Erreur lors de l'entraînement |
| `INVALID_PARAMETERS` | Paramètres invalides |
| `SERVICE_UNAVAILABLE` | Service ML indisponible |
| `RATE_LIMIT_EXCEEDED` | Limite de taux dépassée |
| `ANALYSIS_TIMEOUT` | Timeout de l'analyse |

## Exemples d'utilisation

### Prédire la présence pour un événement
```javascript
const prediction = await fetch('/api/ml/predict-attendance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventId: 'event-123',
    predictionType: 'individual',
    timeHorizon: '7d',
    factors: {
      weather: true,
      historical: true,
      demographics: true
    }
  })
});

const result = await prediction.json();
console.log(`Taux de présence prédit: ${result.data.overall.predictedRate * 100}%`);
console.log(`Confiance: ${result.data.overall.confidence * 100}%`);
```

### Obtenir des recommandations
```javascript
const recommendations = await fetch('/api/ml/recommendations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'event_optimization',
    context: {
      eventId: 'event-123',
      organizationId: 'org-456'
    },
    focus: ['attendance_optimization', 'scheduling']
  })
});

const recs = await recommendations.json();
recs.data.recommendations.forEach(rec => {
  console.log(`${rec.priority.toUpperCase()}: ${rec.title}`);
  console.log(`Impact: ${rec.impact.expectedImprovement * 100}%`);
});
```

### Détecter des anomalies
```javascript
const anomalies = await fetch('/api/ml/anomalies', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    scope: 'organization',
    timeframe: {
      start: '2024-02-01T00:00:00Z',
      end: '2024-03-15T23:59:59Z'
    },
    sensitivity: 'medium'
  })
});

const result = await anomalies.json();
console.log(`${result.data.summary.totalAnomalies} anomalies détectées`);
result.data.anomalies.forEach(anomaly => {
  if (anomaly.severity === 'high') {
    console.log(`ALERTE: ${anomaly.description}`);
  }
});
```