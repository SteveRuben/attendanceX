import { TemplateService } from "./TemplateService";

/**
 * Instance partagée du TemplateService pour éviter les dépendances circulaires
 */
export const templateService = new TemplateService();