export interface NamespaceSchema {
  name: string; // 'organization', 'event', etc.
  
  // Relations possibles dans ce namespace
  relations: {
    [relationName: string]: {
      // Permissions accordées par cette relation
      permissions: string[];
      
      // Relations dont celle-ci hérite
      inheritsFrom?: string[];
      
      // Relations transitives
      union?: string[]; // Cette relation OU celle-là
      intersection?: string[]; // Cette relation ET celle-là
      
      // Relation vers un autre namespace
      computedUserset?: {
        relation: string;
        namespace: string;
      };
    };
  };
  
  // Permissions disponibles
  permissions: {
    [permissionName: string]: {
      description: string;
      // Quelles relations donnent cette permission
      grantedBy: string[];
    };
  };
}