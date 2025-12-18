import { Timestamp } from "firebase-admin/firestore";

export interface RelationTuple {
  // Identifiant unique du tuple
  id: string;
  
  // Tenant isolation
  tenantId: string;
  
  // Subject (qui a la permission)
  subject: {
    type: 'user' | 'team' | 'role' | 'organization';
    id: string;
    relation?: string; // Pour les relations indirectes (ex: member#organization:123)
  };
  
  // Relation (type de lien)
  relation: string; // 'owner', 'member', 'viewer', 'editor', etc.
  
  // Object (ressource concernée)
  object: {
    type: string; // 'organization', 'event', 'client', 'project', etc.
    id: string;
  };
  
  // Métadonnées
  createdAt: Timestamp;
  createdBy?: string;
  expiresAt?: Timestamp; // Pour les relations temporaires

  // Conditions (optionnel)
  condition?: {
    expression: string; // Ex: "object.status == 'draft'"
    context?: Record<string, any>;
  };
  
  // Audit
  source: 'system' | 'manual' | 'migration' | 'delegation';
  metadata?: Record<string, any>;
}