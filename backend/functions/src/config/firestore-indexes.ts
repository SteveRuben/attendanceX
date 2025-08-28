/**
 * Configuration des index Firestore pour la gestion de présence
 */

export interface FirestoreIndex {
  collectionGroup?: string;
  collection?: string;
  fields: Array<{
    fieldPath: string;
    order?: 'ASCENDING' | 'DESCENDING';
    arrayConfig?: 'CONTAINS';
  }>;
  queryScope?: 'COLLECTION' | 'COLLECTION_GROUP';
}

/**
 * Index pour les collections de gestion de présence
 */
export const presenceManagementIndexes: FirestoreIndex[] = [
  // ============================================================================
  // INDEX POUR LA COLLECTION EMPLOYEES
  // ============================================================================
  {
    collection: 'employees',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'isActive', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'employees',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'departmentId', order: 'ASCENDING' },
      { fieldPath: 'isActive', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'employees',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'isActive', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'employees',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'position', order: 'ASCENDING' },
      { fieldPath: 'hireDate', order: 'ASCENDING' }
    ]
  },

  // ============================================================================
  // INDEX POUR LA COLLECTION PRESENCE_ENTRIES
  // ============================================================================
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'isValidated', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'hasAnomalies', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'clockInTime', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'clockInTime', order: 'ASCENDING' },
      { fieldPath: 'clockOutTime', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'departmentId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },

  // Index pour les requêtes de plage de dates
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'ASCENDING' },
      { fieldPath: 'totalHours', order: 'DESCENDING' }
    ]
  },

  // ============================================================================
  // INDEX POUR LA COLLECTION WORK_SCHEDULES
  // ============================================================================
  {
    collection: 'work_schedules',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'isActive', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'work_schedules',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'name', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'work_schedules',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'isDefault', order: 'ASCENDING' }
    ]
  },

  // ============================================================================
  // INDEX POUR LA COLLECTION LEAVE_REQUESTS
  // ============================================================================
  {
    collection: 'leave_requests',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'startDate', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'leave_requests',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'startDate', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'leave_requests',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'startDate', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'leave_requests',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'startDate', order: 'ASCENDING' },
      { fieldPath: 'endDate', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'leave_requests',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'approverId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },

  // ============================================================================
  // INDEX POUR LA COLLECTION PRESENCE_REPORTS
  // ============================================================================
  {
    collection: 'presence_reports',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_reports',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_reports',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_reports',
    fields: [
      { fieldPath: 'createdBy', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_reports',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'isScheduled', order: 'ASCENDING' },
      { fieldPath: 'nextRunDate', order: 'ASCENDING' }
    ]
  },

  // ============================================================================
  // INDEX POUR LA COLLECTION PRESENCE_AUDIT_LOGS
  // ============================================================================
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'action', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'success', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'resource', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'details.suspicious', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'details.suspicious', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },

  // ============================================================================
  // INDEX POUR LA COLLECTION ORGANIZATION_PRESENCE_SETTINGS
  // ============================================================================
  {
    collection: 'organization_presence_settings',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'isActive', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'organization_presence_settings',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' }
    ]
  },

  // ============================================================================
  // INDEX POUR LA COLLECTION PRESENCE_NOTIFICATIONS
  // ============================================================================
  {
    collection: 'presence_notifications',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'scheduledFor', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'presence_notifications',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'presence_notifications',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },

  // ============================================================================
  // INDEX COMPOSITES POUR REQUÊTES COMPLEXES
  // ============================================================================
  
  // Recherche d'employés présents actuellement
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'ASCENDING' },
      { fieldPath: 'clockInTime', order: 'ASCENDING' },
      { fieldPath: 'clockOutTime', order: 'ASCENDING' }
    ]
  },

  // Analyse des anomalies par période
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'hasAnomalies', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'ASCENDING' },
      { fieldPath: 'anomalyTypes', arrayConfig: 'CONTAINS' }
    ]
  },

  // Rapports par département et période
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'departmentId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'ASCENDING' },
      { fieldPath: 'totalHours', order: 'DESCENDING' }
    ]
  },

  // Suivi des validations par manager
  {
    collection: 'presence_entries',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'validatedBy', order: 'ASCENDING' },
      { fieldPath: 'validatedAt', order: 'DESCENDING' }
    ]
  },

  // Recherche d'audit par plage de temps et action
  {
    collection: 'presence_audit_logs',
    fields: [
      { fieldPath: 'organizationId', order: 'ASCENDING' },
      { fieldPath: 'action', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'ASCENDING' },
      { fieldPath: 'success', order: 'ASCENDING' }
    ]
  }
];

/**
 * Index pour les requêtes de collection group (si nécessaire)
 */
export const presenceCollectionGroupIndexes: FirestoreIndex[] = [
  // Index pour rechercher dans toutes les entrées de présence
  {
    collectionGroup: 'presence_entries',
    fields: [
      { fieldPath: 'employeeId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION_GROUP'
  },

  // Index pour rechercher dans tous les logs d'audit
  {
    collectionGroup: 'presence_audit_logs',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION_GROUP'
  }
];

/**
 * Fonction pour générer le fichier firestore.indexes.json
 */
export function generateFirestoreIndexesConfig(): {
  indexes: Array<{
    collectionGroup?: string;
    queryScope?: string;
    fields: Array<{
      fieldPath: string;
      order?: string;
      arrayConfig?: string;
    }>;
  }>;
} {
  const allIndexes = [...presenceManagementIndexes, ...presenceCollectionGroupIndexes];
  
  return {
    indexes: allIndexes.map(index => ({
      ...(index.collectionGroup && { collectionGroup: index.collectionGroup }),
      ...(index.queryScope && { queryScope: index.queryScope }),
      fields: index.fields.map(field => ({
        fieldPath: field.fieldPath,
        ...(field.order && { order: field.order }),
        ...(field.arrayConfig && { arrayConfig: field.arrayConfig })
      }))
    }))
  };
}

/**
 * Instructions pour créer les index manuellement
 */
export const manualIndexInstructions = `
Pour créer ces index manuellement dans la console Firebase :

1. Allez dans la console Firebase > Firestore > Index
2. Cliquez sur "Créer un index"
3. Configurez chaque index selon les spécifications ci-dessus

Ou utilisez la CLI Firebase :
1. Créez un fichier firestore.indexes.json avec la configuration générée
2. Exécutez : firebase deploy --only firestore:indexes

Index critiques à créer en priorité :
- presence_entries : organizationId + date (DESC)
- presence_entries : employeeId + date (DESC)
- presence_audit_logs : organizationId + timestamp (DESC)
- employees : organizationId + isActive + createdAt (DESC)
`;

/**
 * Estimation des coûts de lecture pour les requêtes courantes
 */
export const queryPerformanceEstimates = {
  'getCurrentlyPresentEmployees': {
    description: 'Obtenir les employés actuellement présents',
    estimatedReads: 'O(n) où n = nombre d\'employés présents',
    indexUsed: 'organizationId + date + clockInTime + clockOutTime',
    optimizationNotes: 'Index composite requis pour éviter les lectures multiples'
  },
  'getPresenceEntriesByEmployee': {
    description: 'Obtenir les entrées de présence d\'un employé',
    estimatedReads: 'O(log n + k) où k = nombre de résultats',
    indexUsed: 'employeeId + date (DESC)',
    optimizationNotes: 'Index simple suffisant, très efficace'
  },
  'getAnomaliesForOrganization': {
    description: 'Obtenir les anomalies de présence',
    estimatedReads: 'O(log n + k) où k = nombre d\'anomalies',
    indexUsed: 'organizationId + hasAnomalies + date (DESC)',
    optimizationNotes: 'Index composite requis pour filtrer efficacement'
  },
  'getAuditLogsByTimeRange': {
    description: 'Obtenir les logs d\'audit par période',
    estimatedReads: 'O(log n + k) où k = nombre de logs dans la période',
    indexUsed: 'organizationId + timestamp (DESC)',
    optimizationNotes: 'Index simple suffisant pour les requêtes temporelles'
  }
};