import { DocumentSnapshot } from "firebase-admin/firestore";
import {
  DEFAULT_SERVICE_COLORS,
  Service,
  VALIDATION_PATTERNS,
  VALIDATION_RULES
} from "@attendance-x/shared";
import { BaseModel } from "./base.model";

/**
 * Modèle de données pour les services
 * 
 * Ce modèle gère la validation, la transformation et la manipulation des services.
 * Il inclut des méthodes pour valider les paramètres de service et gérer les praticiens associés.
 */
export class ServiceModel extends BaseModel<Service> {
  constructor(data: Partial<Service>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const service = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(service, [
      "organizationId", "name", "duration", "color", "isActive"
    ]);

    // Validation du nom
    this.validateLength(
      service.name,
      VALIDATION_RULES.SERVICE.NAME_MIN_LENGTH,
      VALIDATION_RULES.SERVICE.NAME_MAX_LENGTH,
      "name"
    );

    // Validation de la description si présente
    if (service.description) {
      this.validateLength(
        service.description,
        0,
        VALIDATION_RULES.SERVICE.DESCRIPTION_MAX_LENGTH,
        "description"
      );
    }

    // Validation de la durée
    this.validateRange(
      service.duration,
      VALIDATION_RULES.SERVICE.MIN_DURATION_MINUTES,
      VALIDATION_RULES.SERVICE.MAX_DURATION_MINUTES,
      "duration"
    );

    // Validation du prix si présent
    if (service.price !== undefined && service.price !== null) {
      this.validateRange(
        service.price,
        VALIDATION_RULES.SERVICE.MIN_PRICE_CENTS,
        VALIDATION_RULES.SERVICE.MAX_PRICE_CENTS,
        "price"
      );
    }

    // Validation de la couleur
    if (!VALIDATION_PATTERNS.SERVICE_COLOR.test(service.color)) {
      throw new Error("Invalid color format (expected hexadecimal color)");
    }

    // Validation des praticiens
    if (!Array.isArray(service.practitioners)) {
      throw new Error("Practitioners must be an array");
    }

    if (service.practitioners.length > VALIDATION_RULES.SERVICE.MAX_PRACTITIONERS) {
      throw new Error(`Maximum ${VALIDATION_RULES.SERVICE.MAX_PRACTITIONERS} practitioners allowed`);
    }

    // Validation que tous les IDs de praticiens sont des chaînes non vides
    const invalidPractitioners = service.practitioners.filter(id => 
      typeof id !== 'string' || id.trim().length === 0
    );
    if (invalidPractitioners.length > 0) {
      throw new Error("All practitioner IDs must be non-empty strings");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): ServiceModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = ServiceModel.prototype.convertDatesFromFirestore(data);

    return new ServiceModel({
      id: doc.id,
      ...convertedData,
      practitioners: convertedData.practitioners || []
    });
  }

  static createDefault(organizationId: string, name: string, duration: number): ServiceModel {
    const colorIndex = Math.floor(Math.random() * DEFAULT_SERVICE_COLORS.length);
    
    return new ServiceModel({
      organizationId,
      name,
      duration,
      color: DEFAULT_SERVICE_COLORS[colorIndex],
      practitioners: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Méthodes utilitaires

  /**
   * Formate la durée pour l'affichage
   */
  getFormattedDuration(): string {
    const hours = Math.floor(this.data.duration / 60);
    const minutes = this.data.duration % 60;
    
    if (hours === 0) {
      return `${minutes}min`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h${minutes}min`;
    }
  }

  /**
   * Formate le prix pour l'affichage
   */
  getFormattedPrice(currency: string = 'EUR'): string {
    if (this.data.price === undefined || this.data.price === null) {
      return 'Prix non défini';
    }

    const price = this.data.price / 100; // Conversion des centimes en euros
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(price);
  }

  /**
   * Vérifie si le service est disponible
   */
  isAvailable(): boolean {
    return this.data.isActive && this.data.practitioners.length > 0;
  }

  /**
   * Vérifie si un praticien est assigné à ce service
   */
  hasPractitioner(practitionerId: string): boolean {
    return this.data.practitioners.includes(practitionerId);
  }

  /**
   * Ajoute un praticien au service
   */
  addPractitioner(practitionerId: string, addedBy: string): void {
    if (!practitionerId || typeof practitionerId !== 'string') {
      throw new Error("Invalid practitioner ID");
    }

    if (this.data.practitioners.includes(practitionerId)) {
      throw new Error("Practitioner is already assigned to this service");
    }

    if (this.data.practitioners.length >= VALIDATION_RULES.SERVICE.MAX_PRACTITIONERS) {
      throw new Error(`Maximum ${VALIDATION_RULES.SERVICE.MAX_PRACTITIONERS} practitioners allowed`);
    }

    const oldPractitioners = [...this.data.practitioners];
    this.data.practitioners.push(practitionerId);

    this.update({ practitioners: this.data.practitioners }, {
      action: "practitioner_added",
      performedBy: addedBy,
      oldValue: { practitioners: oldPractitioners },
      newValue: { practitioners: this.data.practitioners }
    });
  }

  /**
   * Retire un praticien du service
   */
  removePractitioner(practitionerId: string, removedBy: string): void {
    const index = this.data.practitioners.indexOf(practitionerId);
    if (index === -1) {
      throw new Error("Practitioner is not assigned to this service");
    }

    const oldPractitioners = [...this.data.practitioners];
    this.data.practitioners.splice(index, 1);

    this.update({ practitioners: this.data.practitioners }, {
      action: "practitioner_removed",
      performedBy: removedBy,
      oldValue: { practitioners: oldPractitioners },
      newValue: { practitioners: this.data.practitioners }
    });
  }

  /**
   * Met à jour les informations du service
   */
  updateInfo(updates: {
    name?: string;
    description?: string;
    duration?: number;
    price?: number;
    color?: string;
  }, updatedBy: string): void {
    // Validation des nouvelles données
    if (updates.name) {
      this.validateLength(
        updates.name,
        VALIDATION_RULES.SERVICE.NAME_MIN_LENGTH,
        VALIDATION_RULES.SERVICE.NAME_MAX_LENGTH,
        "name"
      );
    }

    if (updates.description) {
      this.validateLength(
        updates.description,
        0,
        VALIDATION_RULES.SERVICE.DESCRIPTION_MAX_LENGTH,
        "description"
      );
    }

    if (updates.duration) {
      this.validateRange(
        updates.duration,
        VALIDATION_RULES.SERVICE.MIN_DURATION_MINUTES,
        VALIDATION_RULES.SERVICE.MAX_DURATION_MINUTES,
        "duration"
      );
    }

    if (updates.price !== undefined) {
      this.validateRange(
        updates.price,
        VALIDATION_RULES.SERVICE.MIN_PRICE_CENTS,
        VALIDATION_RULES.SERVICE.MAX_PRICE_CENTS,
        "price"
      );
    }

    if (updates.color && !VALIDATION_PATTERNS.SERVICE_COLOR.test(updates.color)) {
      throw new Error("Invalid color format (expected hexadecimal color)");
    }

    const oldValues = {
      name: this.data.name,
      description: this.data.description,
      duration: this.data.duration,
      price: this.data.price,
      color: this.data.color
    };

    this.update(updates, {
      action: "service_info_updated",
      performedBy: updatedBy,
      oldValue: oldValues,
      newValue: updates
    });
  }

  /**
   * Active ou désactive le service
   */
  setActive(isActive: boolean, updatedBy: string): void {
    if (this.data.isActive === isActive) {
      return; // Pas de changement
    }

    this.update({ isActive }, {
      action: isActive ? "service_activated" : "service_deactivated",
      performedBy: updatedBy,
      oldValue: { isActive: this.data.isActive },
      newValue: { isActive }
    });
  }

  /**
   * Vérifie si le service peut être supprimé
   */
  canBeDeleted(): { canDelete: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Ici on pourrait ajouter des vérifications comme:
    // - Vérifier s'il y a des rendez-vous futurs avec ce service
    // - Vérifier s'il y a des rendez-vous non terminés
    // Ces vérifications seraient faites au niveau du service

    if (this.data.isActive) {
      reasons.push("Le service doit être désactivé avant suppression");
    }

    return {
      canDelete: reasons.length === 0,
      reasons
    };
  }

  /**
   * Génère un objet pour l'affichage dans l'interface
   */
  toDisplayObject() {
    return {
      id: this.data.id,
      name: this.data.name,
      description: this.data.description,
      duration: this.data.duration,
      formattedDuration: this.getFormattedDuration(),
      price: this.data.price,
      formattedPrice: this.getFormattedPrice(),
      color: this.data.color,
      practitionerCount: this.data.practitioners.length,
      isActive: this.data.isActive,
      isAvailable: this.isAvailable(),
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt
    };
  }

  /**
   * Recherche dans les données du service
   */
  matchesSearch(query: string): boolean {
    const searchQuery = query.toLowerCase().trim();
    if (!searchQuery) {return true;}

    const searchableFields = [
      this.data.name,
      this.data.description
    ];

    return searchableFields.some(field => 
      field?.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * Clone le service avec un nouveau nom
   */
  cloneWithNewName(newName: string, clonedBy: string): ServiceModel {
    const clonedService = new ServiceModel({
      ...this.data,
      id: undefined, // Nouveau ID sera généré
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return clonedService;
  }

  /**
   * Calcule le temps total de service par jour si tous les créneaux sont pris
   */
  calculateDailyCapacity(slotsPerDay: number): number {
    return this.data.duration * slotsPerDay;
  }

  /**
   * Estime le revenu journalier potentiel
   */
  estimateDailyRevenue(slotsPerDay: number): number {
    if (!this.data.price) {return 0;}
    return (this.data.price / 100) * slotsPerDay;
  }
}