import { DocumentSnapshot } from "firebase-admin/firestore";
import {
  Client,
  ClientPreferences,
  REMINDER_METHODS,
  SUPPORTED_LANGUAGES,
  VALIDATION_RULES
} from "@attendance-x/shared";
import { BaseModel } from "./base.model";

/**
 * Modèle de données pour les clients
 * 
 * Ce modèle gère la validation, la transformation et la manipulation des données clients.
 * Il inclut des méthodes pour valider les informations de contact et gérer les préférences.
 */
export class ClientModel extends BaseModel<Client> {
  constructor(data: Partial<Client>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const client = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(client, [
      "organizationId", "firstName", "lastName", "email", "phone", "preferences"
    ]);

    // Validation des longueurs de noms
    this.validateLength(
      client.firstName,
      VALIDATION_RULES.CLIENT.FIRST_NAME_MIN_LENGTH,
      VALIDATION_RULES.CLIENT.FIRST_NAME_MAX_LENGTH,
      "firstName"
    );

    this.validateLength(
      client.lastName,
      VALIDATION_RULES.CLIENT.LAST_NAME_MIN_LENGTH,
      VALIDATION_RULES.CLIENT.LAST_NAME_MAX_LENGTH,
      "lastName"
    );

    // Validation de l'email
    if (!BaseModel.validateEmail(client.email)) {
      throw new Error("Invalid email format");
    }

    // Validation du téléphone
    if (!BaseModel.validatePhoneNumber(client.phone)) {
      throw new Error("Invalid phone number format");
    }

    // Validation des préférences
    if (client.preferences) {
      await this.validatePreferences(client.preferences);
    }

    return true;
  }

  private async validatePreferences(preferences: ClientPreferences): Promise<void> {
    // Validation de la méthode de rappel
    BaseModel.validateEnum(preferences.reminderMethod, REMINDER_METHODS, "reminderMethod");

    // Validation de la langue
    BaseModel.validateEnum(preferences.language, SUPPORTED_LANGUAGES, "language");

    // Validation du fuseau horaire si présent
    if (preferences.timezone) {
      // Validation basique du fuseau horaire
      try {
        Intl.DateTimeFormat(undefined, { timeZone: preferences.timezone });
      } catch (error) {
        throw new Error("Invalid timezone");
      }
    }
  }

  toFirestore() {
    const { id, fullName, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): ClientModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = ClientModel.prototype.convertDatesFromFirestore(data);

    return new ClientModel({
      id: doc.id,
      ...convertedData
    });
  }

  // Méthodes utilitaires

  /**
   * Génère le nom complet du client
   */
  getFullName(): string {
    return `${this.data.firstName} ${this.data.lastName}`.trim();
  }

  /**
   * Génère les initiales du client
   */
  getInitials(): string {
    const firstInitial = this.data.firstName.charAt(0).toUpperCase();
    const lastInitial = this.data.lastName.charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }

  /**
   * Formate le numéro de téléphone pour l'affichage
   */
  getFormattedPhone(): string {
    const phone = this.data.phone.replace(/\D/g, '');
    
    // Format français
    if (phone.startsWith('33') && phone.length === 11) {
      return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '+$1 $2 $3 $4 $5');
    }
    
    // Format international générique
    if (phone.length >= 10) {
      return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    
    return this.data.phone;
  }

  /**
   * Vérifie si le client préfère recevoir des rappels par email
   */
  prefersEmailReminders(): boolean {
    return this.data.preferences.reminderMethod === REMINDER_METHODS.EMAIL ||
           this.data.preferences.reminderMethod === REMINDER_METHODS.BOTH;
  }

  /**
   * Vérifie si le client préfère recevoir des rappels par SMS
   */
  prefersSmsReminders(): boolean {
    return this.data.preferences.reminderMethod === REMINDER_METHODS.SMS ||
           this.data.preferences.reminderMethod === REMINDER_METHODS.BOTH;
  }

  /**
   * Met à jour les préférences du client
   */
  updatePreferences(newPreferences: Partial<ClientPreferences>, updatedBy: string): void {
    const oldPreferences = { ...this.data.preferences };
    const updatedPreferences = { ...this.data.preferences, ...newPreferences };

    this.update({ preferences: updatedPreferences }, {
      action: "preferences_updated",
      performedBy: updatedBy,
      oldValue: { preferences: oldPreferences },
      newValue: { preferences: updatedPreferences }
    });
  }

  /**
   * Met à jour les informations de contact
   */
  updateContactInfo(updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }, updatedBy: string): void {
    // Validation des nouvelles données
    if (updates.firstName) {
      this.validateLength(
        updates.firstName,
        VALIDATION_RULES.CLIENT.FIRST_NAME_MIN_LENGTH,
        VALIDATION_RULES.CLIENT.FIRST_NAME_MAX_LENGTH,
        "firstName"
      );
    }

    if (updates.lastName) {
      this.validateLength(
        updates.lastName,
        VALIDATION_RULES.CLIENT.LAST_NAME_MIN_LENGTH,
        VALIDATION_RULES.CLIENT.LAST_NAME_MAX_LENGTH,
        "lastName"
      );
    }

    if (updates.email && !BaseModel.validateEmail(updates.email)) {
      throw new Error("Invalid email format");
    }

    if (updates.phone && !BaseModel.validatePhoneNumber(updates.phone)) {
      throw new Error("Invalid phone number format");
    }

    const oldValues = {
      firstName: this.data.firstName,
      lastName: this.data.lastName,
      email: this.data.email,
      phone: this.data.phone
    };

    this.update(updates, {
      action: "contact_info_updated",
      performedBy: updatedBy,
      oldValue: oldValues,
      newValue: updates
    });
  }

  /**
   * Vérifie si le client a des informations complètes
   */
  hasCompleteInfo(): boolean {
    return !!(
      this.data.firstName &&
      this.data.lastName &&
      this.data.email &&
      this.data.phone &&
      this.data.preferences
    );
  }

  /**
   * Génère un objet pour l'affichage dans l'interface
   */
  toDisplayObject() {
    return {
      id: this.data.id,
      fullName: this.getFullName(),
      initials: this.getInitials(),
      email: this.data.email,
      phone: this.getFormattedPhone(),
      language: this.data.preferences.language,
      reminderMethod: this.data.preferences.reminderMethod,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt
    };
  }

  /**
   * Recherche dans les données du client
   */
  matchesSearch(query: string): boolean {
    const searchQuery = query.toLowerCase().trim();
    if (!searchQuery) {return true;}

    const searchableFields = [
      this.data.firstName,
      this.data.lastName,
      this.getFullName(),
      this.data.email,
      this.data.phone
    ];

    return searchableFields.some(field => 
      field?.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * Vérifie si le client peut être supprimé
   */
  canBeDeleted(): { canDelete: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Ici on pourrait ajouter des vérifications comme:
    // - Vérifier s'il y a des rendez-vous futurs
    // - Vérifier s'il y a des rendez-vous non terminés
    // Ces vérifications seraient faites au niveau du service

    return {
      canDelete: reasons.length === 0,
      reasons
    };
  }

  /**
   * Anonymise les données du client (pour RGPD)
   */
  anonymize(anonymizedBy: string): void {
    const anonymizedData = {
      firstName: "Client",
      lastName: "Anonymisé",
      email: `anonymized_${this.data.id}@example.com`,
      phone: "+33000000000",
      preferences: {
        ...this.data.preferences,
        language: SUPPORTED_LANGUAGES.FR
      }
    };

    this.update(anonymizedData, {
      action: "client_anonymized",
      performedBy: anonymizedBy,
      reason: "GDPR compliance - client data anonymized"
    });
  }

  /**
   * Exporte les données du client (pour RGPD)
   */
  exportData() {
    return {
      personalInfo: {
        firstName: this.data.firstName,
        lastName: this.data.lastName,
        email: this.data.email,
        phone: this.data.phone
      },
      preferences: this.data.preferences,
      metadata: {
        createdAt: this.data.createdAt,
        updatedAt: this.data.updatedAt
      }
    };
  }
}