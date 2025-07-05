import {DocumentSnapshot} from "firebase-admin/firestore";
import {
  EmailTemplate,
  EmailTemplateCategory,
} from "@attendance-x/shared";
import {BaseModel} from "./base.model";


export class EmailTemplateModel extends BaseModel<EmailTemplate> {
  constructor(data: Partial<EmailTemplate>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const template = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(template, [
      "name", "category", "subject", "htmlContent", "language", "isActive", "createdBy",
    ]);

    // Validation des longueurs
    this.validateLength(template.name, 3, 100, "name");
    this.validateLength(template.subject, 5, 200, "subject");
    this.validateLength(template.htmlContent, 50, 100000, "htmlContent");

    // Validation de la catégorie
    BaseModel.validateEnum(template.category, EmailTemplateCategory, "category");

    // Validation du contenu pour les variables
    this.validateTemplateVariables(template.htmlContent, template.subject, template.variables);

    // Validation de la langue
    if (!["fr", "en", "es", "de"].includes(template.language)) {
      throw new Error("Unsupported language");
    }

    // Validation du HTML (basique)
    this.validateHtmlContent(template.htmlContent);

    return true;
  }

  private validateTemplateVariables(htmlContent: string, subject: string, variables: string[]): void {
    // Extraire les variables du contenu HTML et du sujet
    const htmlVariables = htmlContent.match(/\{\{([^}]+)\}\}/g)?.map((v) => v.slice(2, -2).trim()) || [];
    const subjectVariables = subject.match(/\{\{([^}]+)\}\}/g)?.map((v) => v.slice(2, -2).trim()) || [];
    const allUsedVariables = [...new Set([...htmlVariables, ...subjectVariables])];

    // Vérifier que toutes les variables utilisées sont déclarées
    const undeclaredVars = allUsedVariables.filter((v) => !variables.includes(v));
    if (undeclaredVars.length > 0) {
      throw new Error(`Undeclared variables in template: ${undeclaredVars.join(", ")}`);
    }

    // Vérifier que toutes les variables déclarées sont utilisées
    const unusedVars = variables.filter((v) => !allUsedVariables.includes(v));
    if (unusedVars.length > 0) {
      console.warn(`Unused variables in template: ${unusedVars.join(", ")}`);
    }
  }

  private validateHtmlContent(htmlContent: string): void {
    // Validation basique du HTML
    const dangerousTags = /<script|<object|<embed|<iframe|<form/gi;
    if (dangerousTags.test(htmlContent)) {
      throw new Error("HTML content contains potentially dangerous tags");
    }

    // Vérifier la structure HTML basique
    const htmlTagCount = (htmlContent.match(/<html/gi) || []).length;
    const bodyTagCount = (htmlContent.match(/<body/gi) || []).length;

    if (htmlTagCount > 1 || bodyTagCount > 1) {
      throw new Error("HTML content should not contain multiple html or body tags");
    }
  }

  toFirestore() {
    const {id, ...data} = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): EmailTemplateModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = EmailTemplateModel.prototype.convertDatesFromFirestore(data);

    return new EmailTemplateModel({
      id: doc.id,
      ...convertedData,
    });
  }

  // Méthodes d'instance
  processTemplate(variables: Record<string, string>): { subject: string; htmlContent: string; textContent?: string } {
    let processedSubject = this.data.subject;
    let processedHtml = this.data.htmlContent;
    let processedText = this.data.textContent;

    // Remplacer toutes les variables dans le sujet
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      processedSubject = processedSubject.replace(regex, value || "");
      processedHtml = processedHtml.replace(regex, value || "");
      if (processedText) {
        processedText = processedText.replace(regex, value || "");
      }
    });

    // Vérifier qu'il ne reste pas de variables non remplacées
    const remainingVars = processedHtml.match(/\{\{([^}]+)\}\}/g);
    if (remainingVars) {
      throw new Error(`Unresolved variables: ${remainingVars.join(", ")}`);
    }

    return {
      subject: processedSubject,
      htmlContent: processedHtml,
      textContent: processedText,
    };
  }

  generateTextFromHtml(): string {
    // Convertir HTML en texte brut (version simplifiée)
    let text = this.data.htmlContent;

    // Remplacer les balises courantes par leur équivalent texte
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/div>/gi, "\n");
    text = text.replace(/<\/h[1-6]>/gi, "\n\n");
    text = text.replace(/<hr\s*\/?>/gi, "\n---\n");

    // Supprimer toutes les autres balises HTML
    text = text.replace(/<[^>]+>/g, "");

    // Décoder les entités HTML
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, "\"");

    // Nettoyer les espaces multiples et les retours à la ligne
    text = text.replace(/\s+/g, " ");
    text = text.replace(/\n\s*\n/g, "\n\n");
    text = text.trim();

    return text;
  }

  cloneNew(newName: string, createdBy: string): EmailTemplateModel {
    return new EmailTemplateModel({
      ...this.data,
      id: undefined,
      name: newName,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      isDefault: false,
      usage: {
        timesUsed: 0,
        lastUsed: undefined,
        avgOpenRate: undefined,
        avgClickRate: undefined,
      },
    });
  }

  incrementVersion(): void {
    this.update({
      version: this.data.version + 1,
    });
  }

  incrementUsage(openRate?: number, clickRate?: number): void {
    const usage = this.data.usage;
    const newTimesUsed = usage.timesUsed + 1;

    let newAvgOpenRate = usage.avgOpenRate;
    let newAvgClickRate = usage.avgClickRate;

    // Calculer les nouvelles moyennes si les taux sont fournis
    if (openRate !== undefined) {
      newAvgOpenRate = usage.avgOpenRate ?
        (usage.avgOpenRate * usage.timesUsed + openRate) / newTimesUsed :
        openRate;
    }

    if (clickRate !== undefined) {
      newAvgClickRate = usage.avgClickRate ?
        (usage.avgClickRate * usage.timesUsed + clickRate) / newTimesUsed :
        clickRate;
    }

    this.update({
      usage: {
        timesUsed: newTimesUsed,
        lastUsed: new Date(),
        avgOpenRate: newAvgOpenRate,
        avgClickRate: newAvgClickRate,
      },
    });
  }

  isPopular(): boolean {
    return this.data.usage.timesUsed >= 10;
  }

  hasGoodPerformance(): boolean {
    return (this.data.usage.avgOpenRate || 0) >= 20 && // 20% d'ouverture
           (this.data.usage.avgClickRate || 0) >= 2; // 2% de clic
  }
}
