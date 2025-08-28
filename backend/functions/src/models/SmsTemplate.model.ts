import {DocumentSnapshot} from "firebase-admin/firestore";
import {BaseModel} from "./base.model";
import {SmsTemplate} from "@attendance-x/shared";

/**
 * Modèle de données pour les templates SMS
 *
 * Ce modèle gère la validation, la transformation et la manipulation des templates SMS.
 * Il inclut des méthodes pour valider le contenu, estimer les segments et le coût,
 * ainsi que pour cloner et incrémenter la version du template.
 */
export class SmsTemplateModel extends BaseModel<SmsTemplate> {
  constructor(data: Partial<SmsTemplate>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const template = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(template, [
      "name", "content", "language", "isActive", "createdBy",
    ]);

    // Validation des longueurs
    this.validateLength(template.name, 3, 100, "name");
    this.validateLength(template.content, 10, 1600, "content"); // SMS max length

    // Validation du contenu pour les variables
    this.validateTemplateVariables(template.content, template.variables);

    // Validation de la langue
    if (!["fr", "en", "es", "de"].includes(template.language)) {
      throw new Error("Unsupported language");
    }

    return true;
  }

  private validateTemplateVariables(content: string, variables: string[]): void {
    // Extraire les variables du contenu
    const contentVariables = content.match(/{([^}]+)}/g)?.map((v) => v.slice(1, -1)) || [];

    // Vérifier que toutes les variables utilisées sont déclarées
    const undeclaredVars = contentVariables.filter((v) => !variables.includes(v));
    if (undeclaredVars.length > 0) {
      throw new Error(`Undeclared variables in template: ${undeclaredVars.join(", ")}`);
    }

    // Vérifier que toutes les variables déclarées sont utilisées
    const unusedVars = variables.filter((v) => !contentVariables.includes(v));
    if (unusedVars.length > 0) {
      console.warn(`Unused variables in template: ${unusedVars.join(", ")}`);
    }
  }

  toFirestore() {
    const {id, ...data} = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): SmsTemplateModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = SmsTemplateModel.prototype.convertDatesFromFirestore(data);

    return new SmsTemplateModel({
      id: doc.id,
      ...convertedData,
    });
  }

  // Méthodes d'instance
  processTemplate(variables: Record<string, string>): string {
    let processed = this.data.content;

    // Remplacer toutes les variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, "g");
      processed = processed.replace(regex, value || "");
    });

    // Vérifier qu'il ne reste pas de variables non remplacées
    const remainingVars = processed.match(/{([^}]+)}/g);
    if (remainingVars) {
      throw new Error(`Unresolved variables: ${remainingVars.join(", ")}`);
    }

    return processed;
  }

  estimateSegments(): number {
    const content = this.data.content;

    // Estimation basique : 160 caractères par segment pour GSM7
    // 70 caractères par segment si caractères spéciaux (UCS2)
    const hasSpecialChars = /[^\x01-\x7F]/.test(content);
    const segmentLength = hasSpecialChars ? 70 : 160;

    return Math.ceil(content.length / segmentLength);
  }

  estimateCost(costPerSms: number): number {
    return this.estimateSegments() * costPerSms;
  }

  cloneAsNew(newName: string, createdBy: string): SmsTemplateModel {
    return new SmsTemplateModel({
      ...this.data,
      id: undefined,
      name: newName,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });
  }

  incrementVersion(): void {
    this.update({
      version: this.data.version + 1,
    });
  }
}
