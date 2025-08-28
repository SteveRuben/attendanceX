// backend/functions/src/types/globals.d.ts - Déclarations de types globaux

/**
 * Déclarations pour les variables globales utilisées dans l'application
 */

// TensorFlow.js - Utilisé dans ml.service.ts
declare const tf: any;

// Types ES2020 - Utilisés dans health-check.ts
declare type PromiseSettledResult<T> = PromiseFulfilledResult<T> | PromiseRejectedResult<T>;

interface PromiseFulfilledResult<T> {
  status: "fulfilled";
  value: T;
}

interface PromiseRejectedResult {
  status: "rejected";
  reason: any;
}

// Types Node.js - Utilisés dans attendance-alerts.service.ts
declare namespace NodeJS {
  interface Timeout {
    ref(): this;
    unref(): this;
  }
  
  interface Timer extends Timeout {
    hasRef(): boolean;
    refresh(): this;
  }
}

// Définitions de rôles - Importées depuis security.config.ts
// Les ROLE_DEFINITIONS sont maintenant centralisées dans security.config.ts

// Extensions globales pour les modules
declare global {
  namespace Express {
    interface Request {
      clientIp?: string;
      getClientIp?: () => string;
    }
  }
}

// Types pour les modules externes qui n'ont pas de types
declare module "some-external-module" {
  export function someFunction(): any;
}

export {};