import {BaseEntity, AuditLog} from "@attendance-x/shared";
import {DocumentData, DocumentSnapshot} from "firebase-admin/firestore";

// 🆕 CLASSE D'ERREUR PERSONNALISÉE
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export abstract class BaseModel<T extends BaseEntity> {
  protected data: T;
  protected isDirty = false; // Track changes
  private originalData: T; // Pour détecter les changements

  constructor(data: Partial<T>) {
    this.data = {
      ...data,
      id: data.id || this.generateId(),
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    } as T;
    this.originalData = {...this.data};
  }

  // 🆕 Génération d'ID unique
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 🆕 Détection des changements
  hasChanges(): boolean {
    return this.isDirty ||
        JSON.stringify(this.data) !== JSON.stringify(this.originalData);
  }

  // 🆕 Reset des changements
  resetChanges(): void {
    this.originalData = {...this.data};
    this.isDirty = false;
  }

  // Getters
  // eslint-disable-next-line require-jsdoc
  get id(): string | any {
    return this.data.id;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  // Méthodes abstraites que chaque modèle doit implémenter
  abstract validate(): Promise<boolean>;
  abstract toFirestore(): DocumentData;

  // Méthodes statiques abstraites
  static fromFirestore(
    doc: DocumentSnapshot
  ): BaseModel<any> | null {
    if (!doc.exists) return null;
    throw new Error(`fromFirestore must be implemented in ${this.name}`);
  }

  // Méthodes communes de validation
  protected static validateRequired(data: any, requiredFields: string[]): void {
    const missing = requiredFields.filter((field) => {
      const value = this.getNestedValue(data, field);
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(", ")}`);
    }
  }


  // 🆕 Support pour champs imbriqués
  private static getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  // 🆕 Validation améliorée des emails
  protected static validateEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false;

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim().toLowerCase());
  }

  // 🆕 Validation téléphone international
  protected static validatePhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== "string") return false;

    // Nettoyage du numéro
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

    // Validation format international
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleaned);
  }

  protected static validateDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  protected static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 🆕 Validation de plages de dates
  protected validateDateRange(startDate: Date, endDate: Date, fieldName: string): void {
    if (!BaseModel.validateDate(startDate) || !BaseModel.validateDate(endDate)) {
      throw new ValidationError(`Invalid dates for ${fieldName}`);
    }

    if (endDate <= startDate) {
      throw new ValidationError(`End date must be after start date for ${fieldName}`);
    }
  }

  // 🆕 Sanitization avancée
  protected static sanitizeHtml(value: string): string {
    if (!value) return "";

    return value
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/[<>]/g, "");
  }

  // Méthodes de sanitisation
  protected static sanitize<T>(data: any, allowedFields: (keyof T)[]): Partial<T> {
    const sanitized: Partial<T> = {};
    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    });
    return sanitized;
  }

  protected static sanitizeString(value: string): string {
    return value?.trim().replace(/[<>]/g, "") || "";
  }

  // Gestion des timestamps
  protected updateTimestamp(): void {
    this.data.updatedAt = new Date();
  }

  // Conversion vers/depuis Firestore
  protected convertDatesToFirestore(data: any): any {
    const converted = {...data};

    Object.keys(converted).forEach((key) => {
      if (converted[key] instanceof Date) {
        // Laisser Firestore gérer la conversion automatique
      } else if (typeof converted[key] === "object" && converted[key] !== null) {
        converted[key] = this.convertDatesToFirestore(converted[key]);
      }
    });

    return converted;
  }

  protected convertDatesFromFirestore(data: any): any {
    const converted = {...data};

    Object.keys(converted).forEach((key) => {
      if (converted[key] && typeof converted[key].toDate === "function") {
        converted[key] = converted[key].toDate();
      } else if (typeof converted[key] === "object" && converted[key] !== null) {
        converted[key] = this.convertDatesFromFirestore(converted[key]);
      }
    });

    return converted;
  }

  // Méthodes publiques
  public getData(): T {
    return {...this.data};
  }

  // 🔧 AMÉLIORATION DU UPDATE
  public update(updates: Partial<T>, auditLog?: Omit<AuditLog, "performedAt">): void {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    const oldData = {...this.data};

    // Validation avant mise à jour
    const updatedData = {...this.data, ...updates};
    this.validateUpdateData(updatedData);

    this.data = updatedData;
    this.updateTimestamp();
    this.isDirty = true;

    // Audit log amélioré
    if (auditLog && "auditLog" in this.data) {
      const log: AuditLog = {
        ...auditLog,
        performedAt: new Date(),
        oldValue: this.getChangedFields(oldData, updates),
        newValue: updates,
      };

      (this.data as any).auditLog = (this.data as any).auditLog || [];
      (this.data as any).auditLog.push(log);
    }
  }

  // 🆕 Détection des champs modifiés
  private getChangedFields(oldData: T, updates: Partial<T>): Partial<T> {
    const changes: Partial<T> = {};

    Object.keys(updates).forEach((key) => {
      const typedKey = key as keyof T;
      if (oldData[typedKey] !== updates[typedKey]) {
        changes[typedKey] = oldData[typedKey];
      }
    });

    return changes;
  }

  public toJSON(): T {
    return this.getData();
  }

  // Validation générique
  protected validateLength(value: string, min: number, max: number, fieldName: string): void {
    if (value.length < min || value.length > max) {
      throw new Error(`${fieldName} must be between ${min} and ${max} characters`);
    }
  }

  protected validateRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw new Error(`${fieldName} must be between ${min} and ${max}`);
    }
  }

  /*  protected validateEnum<E>(value: any, enumObject: E, fieldName: string): void {
    const values = Object.values(enumObject as any);
    if (!values.includes(value)) {
      throw new Error(`${fieldName} must be one of: ${values.join(", ")}`);
    }
  } */
  // Ajout de la méthode statique ET d'instance
  protected static validateEnum<E>(value: any, enumObject: E, fieldName: string): void {
    const values = Object.values(enumObject as any);
    if (!values.includes(value)) {
      throw new ValidationError(`${fieldName} must be one of: ${values.join(", ")}`, fieldName);
    }
  }

  // Méthode d'instance qui délègue à la statique
  protected validateEnum<E>(value: any, enumObject: E, fieldName: string): void {
    BaseModel.validateEnum(value, enumObject, fieldName);
  }
  // 🆕 Validation des données de mise à jour
  protected validateUpdateData(data: T): void {
    // Override dans les classes enfants si nécessaire
  }

  // 🆕 Clonage profond
  public clone(): BaseModel<T> {
    const CloneConstructor = this.constructor as new (data: Partial<T>) => BaseModel<T>;
    return new CloneConstructor({...this.data, id: undefined});
  }

  // 🆕 Sérialisation pour API
  public toAPI(): Partial<T> {
    const {auditLog, ...apiData} = this.data as any;
    return apiData;
  }
}
