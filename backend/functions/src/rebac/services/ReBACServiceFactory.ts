import { ReBACService } from "./ReBACService";
import { TupleStore } from "./TupleStore";
import { SchemaRegistry } from "./SchemaRegistry";

let serviceInstance: ReBACService | null = null;

/**
 * Fournit une instance singleton de ReBACService pour les middlewares.
 */
export function getReBACService(): ReBACService {
  if (!serviceInstance) {
    serviceInstance = new ReBACService(new TupleStore(), new SchemaRegistry());
  }
  return serviceInstance;
}

/**
 * Permet d'injecter un ReBACService custom (tests).
 */
export function setReBACService(service: ReBACService | null): void {
  serviceInstance = service;
}
