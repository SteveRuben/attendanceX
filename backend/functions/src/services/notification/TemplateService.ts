import { EmailTemplate, SmsTemplate } from "@attendance-x/shared";
import { logger } from "firebase-functions";
import { collections } from "../../config";


/**
 * Service de gestion des templates
 * Permet de gérer les templates pour SMS et emails
 */
export class TemplateService {
  /**
   * Traite un template en remplaçant les variables par leurs valeurs
   */
  processTemplate(template: string, data: Record<string, any>): string {
    try {
      // Remplacer les variables du type {variableName}
      const processedTemplate = template.replace(
        /{([^{}]+)}/g,
        (match, variableName) => {
          // Gérer les variables imbriquées (ex: user.name)
          const value = this.getNestedValue(data, variableName.trim());

          // Si la valeur est null ou undefined, garder la variable telle quelle
          if (value === null || value === undefined) {
            logger.warn(`Template variable not found: ${variableName}`);
            return match;
          }

          return String(value);
        }
      );

      return processedTemplate;
    } catch (error) {
      logger.error("Error processing template", {
        error: error instanceof Error ? error.message : String(error),
        template: template.substring(0, 100), // Log only a preview
      });

      // En cas d'erreur, retourner le template original
      return template;
    }
  }

  /**
   * Récupère une valeur imbriquée dans un objet
   * Exemple: getNestedValue({user: {profile: {name: 'John'}}}, 'user.profile.name') => 'John'
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    try {
      return path.split(".").reduce((prev, curr) => prev?.[curr], obj);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Récupère un template SMS par ID
   */
  async getSmsTemplate(templateId: string): Promise<SmsTemplate | null> {
    try {
      const snapshot = await collections.smsTemplates.doc(templateId).get();

      if (snapshot.exists) {
        const data = snapshot.data() as SmsTemplate;
        return {
          ...data,
          id: snapshot.id,
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error retrieving SMS template: ${templateId}`, error);
      return null;
    }
  }

  /**
   * Récupère un template email par ID
   */
  async getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      const snapshot = await collections.emailTemplates.doc(templateId).get();

      if (snapshot.exists) {
        const data = snapshot.data() as EmailTemplate;
        return {
          id: snapshot.id,
          ...data,
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error retrieving email template: ${templateId}`, error);
      return null;
    }
  }

  /**
   * Crée ou met à jour un template SMS
   */
  async saveSmsTemplate(template: SmsTemplate): Promise<SmsTemplate> {
    try {
      const {id, ...data} = template;

      // Validation de base
      if (!data.name || !data.content) {
        throw new Error("Template name and content are required");
      }

      // Mettre à jour les timestamps
      const now = new Date();
      const templateData = {
        ...data,
        updatedAt: now,
      };

      if (id) {
        // Mise à jour
        await collections.smsTemplates.doc(id).update(templateData);

        logger.info(`SMS template updated: ${id}`);
        return {id, ...templateData};
      } else {
        // Création
        const newTemplate = {
          ...templateData,
          createdAt: now,
        };

        const ref = await collections.smsTemplates.add(newTemplate);

        logger.info(`SMS template created: ${ref.id}`);
        return {id: ref.id, ...newTemplate};
      }
    } catch (error) {
      logger.error("Error saving SMS template", error);
      throw error;
    }
  }

  /**
   * Crée ou met à jour un template email
   */
  async saveEmailTemplate(template: EmailTemplate): Promise<EmailTemplate> {
    try {
      const {id, ...data} = template;

      // Validation de base
      if (!data.name || !data.subject || !data.htmlContent) {
        throw new Error("Template name, subject and htmlContent are required");
      }

      // Mettre à jour les timestamps
      const now = new Date();
      const templateData = {
        ...data,
        updatedAt: now,
      };

      if (id) {
        // Mise à jour
        await collections.emailTemplates.doc(id).update(templateData);

        logger.info(`Email template updated: ${id}`);
        return {id, ...templateData};
      } else {
        // Création
        const newTemplate = {
          ...templateData,
          createdAt: now,
        };

        const ref = await collections.emailTemplates.add(newTemplate);

        logger.info(`Email template created: ${ref.id}`);
        return {id: ref.id, ...newTemplate};
      }
    } catch (error) {
      logger.error("Error saving email template", error);
      throw error;
    }
  }

  /**
   * Supprime un template SMS
   */
  async deleteSmsTemplate(id: string): Promise<boolean> {
    try {
      await collections.smsTemplates.doc(id).delete();
      logger.info(`SMS template deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting SMS template: ${id}`, error);
      return false;
    }
  }

  /**
   * Supprime un template email
   */
  async deleteEmailTemplate(id: string): Promise<boolean> {
    try {
      await collections.emailTemplates.doc(id).delete();
      logger.info(`Email template deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting email template: ${id}`, error);
      return false;
    }
  }

  /**
   * Liste tous les templates SMS
   */
  async listSmsTemplates(): Promise<SmsTemplate[]> {
    try {
      const snapshot = await collections.smsTemplates.get();

      return snapshot.docs.map((doc) => ({
        ...doc.data() as SmsTemplate,
        id: doc.id
      }));
    } catch (error) {
      logger.error("Error listing SMS templates", error);
      return [];
    }
  }

  /**
   * Liste tous les templates email
   */
  async listEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const snapshot = await collections.emailTemplates.get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data() as EmailTemplate,
      }));
    } catch (error) {
      logger.error("Error listing email templates", error);
      return [];
    }
  }

  /**
   * Valide les variables dans un template
   * Retourne les variables manquantes
   */
  validateTemplateVariables(template: string, data: Record<string, any>): string[] {
    // Extraire toutes les variables du template
    const variables: string[] = [];
    const regex = /{([^{}]+)}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1].trim());
    }

    // Vérifier quelles variables sont manquantes
    const missingVariables = variables.filter((variable) => {
      return this.getNestedValue(data, variable) === undefined;
    });

    return missingVariables;
  }
}
