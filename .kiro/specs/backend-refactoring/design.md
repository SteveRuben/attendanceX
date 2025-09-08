# Design Document - Backend Refactoring

## Overview

Cette refactorisation vise à réorganiser complètement la structure du backend pour améliorer la maintenabilité, réduire les coûts d'infrastructure, et optimiser les performances. Le design se concentre sur quatre axes principaux :

1. **Consolidation de la documentation** - Centraliser tous les fichiers markdown dans `docs/`
2. **Réorganisation du code** - Structurer les services par domaines fonctionnels
3. **Optimisation des Cloud Functions** - Réduire le nombre de fonctions déployées
4. **Amélioration de la robustesse** - Gestion d'erreurs et connexions Firestore

## Architecture

### Structure de Documentation Cible

```
docs/
├── README.md                          # Index principal de la documentation
├── backend/                           # Documentation technique backend
│   ├── api/                          # Documentation API
│   │   ├── endpoints.md
│   │   ├── authentication.md
│   │   └── rate-limiting.md
│   ├── architecture/                 # Architecture et design
│   │   ├── overview.md
│   │   ├── database-schema.md
│   │   └── cloud-functions.md
│   ├── services/                     # Documentation des services
│   │   ├── presence-system.md
│   │   ├── notification-system.md
│   │   └── organization-management.md
│   └── maintenance/                  # Scripts et maintenance
│       ├── deployment.md
│       ├── monitoring.md
│       └── troubleshooting.md
├── testing/                          # Documentation des tests
│   ├── README.md
│   ├── unit-testing.md
│   ├── integration-testing.md
│   └── e2e-testing.md
└── development/                      # Guides de développement
    ├── setup.md
    ├── contributing.md
    └── coding-standards.md
```

### Structure de Code Cible

```
backend/functions/src/
├── index.ts                          # Point d'entrée principal
├── config/                           # Configuration centralisée
├── controllers/                      # Contrôleurs REST
├── middleware/                       # Middlewares Express
├── models/                           # Modèles de données
├── routes/                           # Définition des routes
├── shared/                           # Code partagé (conservé et amélioré)
│   ├── constants/                # Constantes globales
│   ├── types/                    # Types TypeScript partagés
│   ├── utils/                    # Utilitaires partagés (réorganisés par domaine)
│   │   ├── auth/                # Utilitaires d'authentification
│   │   ├── validation/          # Utilitaires de validation
│   │   ├── formatting/          # Utilitaires de formatage
│   │   └── common/              # Utilitaires génériques
│   └── validators/               # Validateurs Zod/Joi
├── services/                         # Services organisés par domaine
│   ├── auth/                        # Services d'authentification
│   │   ├── auth.service.ts
│   │   ├── token.service.ts
│   │   └── session.service.ts
│   ├── presence/                    # Services de présence
│   │   ├── presence.service.ts
│   │   ├── presence-validation.service.ts
│   │   ├── presence-security.service.ts
│   │   └── presence-report.service.ts
│   ├── organization/                # Services d'organisation
│   │   ├── organization.service.ts
│   │   ├── organization-settings.service.ts
│   │   └── organization-monitoring.service.ts
│   ├── campaigns/                   # Services de campagnes email
│   │   ├── email-campaign.service.ts
│   │   ├── campaign-delivery.service.ts
│   │   └── campaign-analytics.service.ts
│   ├── integrations/               # Services d'intégration
│   │   ├── integration.service.ts
│   │   ├── oauth.service.ts
│   │   └── sync.service.ts
│   └── notifications/              # Services de notification
│       ├── email-verification.service.ts
│       ├── notification.service.ts
│       └── system-templates.service.ts
├── functions/                       # Cloud Functions consolidées (nouvelles)
│   ├── maintenance.function.ts     # Maintenance consolidée
│   ├── metrics.function.ts         # Métriques consolidées
│   └── triggers.function.ts        # Triggers Firestore consolidés
├── scripts/                        # Scripts de maintenance
│   ├── migrations/
│   ├── setup/
│   └── maintenance/
└── dev-tools/                      # Outils de développement
    ├── health-checks/
    ├── test-utilities/
    └── debugging/
```

## Components and Interfaces

### 1. Documentation Migration Service

```typescript
interface DocumentationMigrationService {
  migrateMarkdownFiles(): Promise<void>;
  updateReferences(oldPath: string, newPath: string): Promise<void>;
  validateLinks(): Promise<ValidationResult[]>;
  generateIndex(): Promise<void>;
}
```

### 2. Code Reorganization Service

```typescript
interface CodeReorganizationService {
  moveServicesToDomains(): Promise<void>;
  consolidateUtilities(): Promise<void>;
  updateImports(): Promise<void>;
  validateStructure(): Promise<StructureValidation>;
}
```

### 3. Cloud Functions Consolidation

```typescript
interface FunctionConsolidationService {
  consolidateMaintenanceFunctions(): Promise<void>;
  consolidateMetricsFunctions(): Promise<void>;
  optimizeTriggers(): Promise<void>;
  validateDeployment(): Promise<DeploymentValidation>;
}

// Nouvelle structure des fonctions consolidées
interface MaintenanceFunction {
  type: 'daily' | 'weekly' | 'monthly';
  tasks: MaintenanceTask[];
  schedule: string;
}

interface MetricsFunction {
  collectors: MetricsCollector[];
  schedule: string;
  retention: RetentionPolicy;
}
```

### 4. Firestore Connection Manager

```typescript
interface FirestoreConnectionManager {
  connect(): Promise<FirestoreInstance>;
  retry<T>(operation: () => Promise<T>): Promise<T>;
  handleTimeout(error: FirestoreError): Promise<void>;
  validateConnection(): Promise<boolean>;
}

interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number;
  maxDelay: number;
  retryableErrors: string[];
}
```

## Data Models

### Migration Tracking

```typescript
interface MigrationRecord {
  id: string;
  type: 'documentation' | 'code' | 'functions';
  source: string;
  destination: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  references: string[];
}
```

### Function Consolidation Mapping

```typescript
interface FunctionMapping {
  oldFunctions: string[];
  newFunction: string;
  parameters: FunctionParameter[];
  schedule?: string;
  memory: string;
  timeout: number;
}

interface FunctionParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}
```

## Error Handling

### Firestore Connection Resilience

```typescript
class FirestoreConnectionManager {
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    maxDelay: 10000,
    retryableErrors: ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED']
  };

  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryableError(error) || attempt === this.retryConfig.maxAttempts) {
          throw error;
        }
        
        const delay = Math.min(
          1000 * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
}
```

### Template Initialization Resilience

```typescript
class TemplateInitializationService {
  async initializeTemplatesAsync(): Promise<void> {
    // Initialisation non-bloquante en arrière-plan
    setTimeout(async () => {
      try {
        await this.createMissingTemplates();
      } catch (error) {
        logger.warn('Template initialization failed, using defaults', { error });
        await this.loadDefaultTemplates();
      }
    }, 5000); // Délai de 5 secondes après le démarrage
  }

  async getTemplate(name: string): Promise<Template> {
    try {
      return await this.loadTemplate(name);
    } catch (error) {
      logger.warn(`Template ${name} not found, using default`, { error });
      return this.getDefaultTemplate(name);
    }
  }
}
```

## Testing Strategy

### Migration Testing

1. **Unit Tests** - Tester chaque service de migration individuellement
2. **Integration Tests** - Vérifier que les références sont correctement mises à jour
3. **End-to-End Tests** - Valider que l'application fonctionne après migration
4. **Rollback Tests** - S'assurer que les migrations peuvent être annulées

### Performance Testing

1. **Function Cold Start** - Mesurer l'impact de la consolidation sur les temps de démarrage
2. **Memory Usage** - Vérifier que la consolidation n'augmente pas excessivement l'usage mémoire
3. **Concurrent Execution** - Tester les fonctions consolidées sous charge

### Validation Strategy

```typescript
interface ValidationSuite {
  validateDocumentationStructure(): Promise<ValidationResult>;
  validateCodeOrganization(): Promise<ValidationResult>;
  validateFunctionConsolidation(): Promise<ValidationResult>;
  validatePerformance(): Promise<PerformanceMetrics>;
}
```

## Implementation Phases

### Phase 1: Documentation Migration
- Créer la nouvelle structure `docs/`
- Migrer tous les fichiers markdown
- Mettre à jour les références
- Générer l'index principal

### Phase 2: Code Reorganization
- Réorganiser les services par domaines
- Déplacer les outils de développement
- Mettre à jour les imports
- Valider la compilation

### Phase 3: Function Consolidation
- Consolider les fonctions de maintenance
- Consolider les fonctions de métriques
- Optimiser les triggers
- Tester le déploiement

### Phase 4: Robustesse et Optimisation
- Implémenter la gestion d'erreur Firestore
- Optimiser l'initialisation des templates
- Ajouter le monitoring
- Tests de performance

## Monitoring and Metrics

### Migration Metrics
- Nombre de fichiers migrés
- Nombre de références mises à jour
- Temps de migration par phase
- Erreurs rencontrées

### Performance Metrics
- Réduction du nombre de fonctions déployées
- Temps de démarrage à froid
- Usage mémoire
- Coûts d'infrastructure

### Health Checks
- Validation de la structure de documentation
- Validation de l'organisation du code
- Validation des fonctions consolidées
- Validation des connexions Firestore