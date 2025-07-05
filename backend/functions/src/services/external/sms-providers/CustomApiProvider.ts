import { CustomApiConfig, SmsResult } from "@attendance-x/shared";
import { BaseSmsProvider } from "./BaseSmsProvider";
import { logger } from "firebase-functions";

/**
 * Provider SMS personnalisé utilisant une API REST
 * Permet d'intégrer n'importe quel fournisseur SMS via une API HTTP
 */
export class CustomApiProvider extends BaseSmsProvider {

  protected config: CustomApiConfig;

  constructor(config: CustomApiConfig) {
    super(config);
    this.config = config;

    /*     logger.info(`CustomApiProvider initialized for endpoint: ${this.config.settings.endpoint}`); */
  }


  sendSms(phone: string, message: string): Promise<SmsResult> {
    throw new Error("Method not implemented.");
  }

  /**
   * Envoie un SMS via l'API personnalisée
   *//*
 async sendSms(phone: string, message: string): Promise<SmsResult> {
   try {
     // Vérifier les limites de taux
     if (!await this.checkRateLimits()) {
       throw new SmsError("Rate limit exceeded for Custom API provider", "rate_limit_exceeded");
     }

     // Normaliser le numéro de téléphone
     const normalizedPhone = phone.replace(/\D/g, "");

     // Préparer le corps de la requête selon le template
     const body = this.prepareRequestBody(normalizedPhone, message);

     // Préparer les entêtes
     const headers = this.config.settings.headers || {
       "Content-Type": "application/json",
     };

     // Configuration de la requête
     const axiosConfig: AxiosRequestConfig = {
       method: this.config.settings.method || "POST",
       url: this.config.settings.endpoint,
       headers,
       data: body,
       timeout: 10000, // 10 secondes
     };

     // Ajouter l'authentification si nécessaire
     if (this.config.credentials.apiKey) {
       // Si l'API key est déjà dans les headers, ne pas la rajouter
       if (!headers["Authorization"]) {
         axiosConfig.headers = {
           ...headers,
           "Authorization": `Bearer ${this.config.credentials.apiKey}`,
         };
       }
     }

     // Envoyer la requête
     logger.debug(`Sending SMS via Custom API to ${normalizedPhone}`, {
       provider: "custom_api",
       to: normalizedPhone,
       messageLength: message.length,
       endpoint: this.config.settings.endpoint,
     });

     const response = await axios(axiosConfig);

     // Vérifier la réponse
     if (response.status < 200 || response.status >= 300) {
       throw new SmsError(
         `Custom API returned status ${response.status}`,
         "custom_api_error"
       );
     }

     // Extraire les informations de la réponse selon le mapping configuré
     const result = this.extractResponseData(response.data);

     logger.info("SMS sent successfully via Custom API", {
       provider: "custom_api",
       messageId: result.messageId,
       status: result.status,
     });

     // Retourner le résultat
     return {
       success: true,
       messageId: result.messageId,
       status: result.status,
       cost: result.cost || 0,
       provider: "custom_api",
       metadata: result.metadata || {},
     };
   } catch (error) {
     // Logger l'erreur
     logger.error("Failed to send SMS via Custom API", {
       provider: "custom_api",
       error: error instanceof Error ? error.name : String(error),
       errorCode: error instanceof Error ?  error.message : String(error),
       to: phone,
     });

     // Convertir l'erreur en SmsError si nécessaire
     /* if (!(error instanceof SmsError)) {
       error = new SmsError(
         `Custom API error: ${error.message}`,
         error.code || "custom_api_error"
       );
     }

     // Mettre à jour le statut du provider si nécessaire
     if (error.code === "custom_api_auth_error" || error.code === "ECONNREFUSED") {
       this.stats.availabilityStatus = "unavailable";
     } *//*

  throw error;
}
}*/

  /**
   * Teste la connexion à l'API personnalisée
   *//*
 async testConnection(): Promise<boolean> {
   try {
     // Si un endpoint de test est spécifié, l'utiliser
     const testEndpoint = this.config.settings.testEndpoint || this.config.settings.endpoint;

     // Configuration de la requête de test
     const axiosConfig: AxiosRequestConfig = {
       method: "GET",
       url: testEndpoint,
       headers: this.config.settings.headers || {},
       timeout: 5000, // 5 secondes
     };

     // Ajouter l'authentification si nécessaire
     if (this.config.credentials.apiKey) {
       axiosConfig.headers = {
         ...axiosConfig.headers,
         "Authorization": `Bearer ${this.config.credentials.apiKey}`,
       };
     }

     // Envoyer la requête de test
     const response = await axios(axiosConfig);

     // Vérifier la réponse
     if (response.status < 200 || response.status >= 300) {
       throw new Error(`Test request returned status ${response.status}`);
     }

     logger.info("Custom API connection test successful");
     /* this.stats.availabilityStatus = "available"; *//*
  return true;
} catch (error) {
  logger.error("Custom API connection test failed", error);
  /* this.stats.availabilityStatus = "unavailable";
  this.stats.lastError = {
    message: error.message,
    timestamp: new Date(),
  }; *//*
  return false;
}
}*/

  /**
   * Prépare le corps de la requête selon le template configuré
   *//*
 private prepareRequestBody(phone: string, message: string): any {
   // Utiliser le template de corps configuré ou un objet par défaut
   const template = this.config.settings.bodyTemplate || {
     to: "{phoneNumber}",
     message: "{message}",
     from: "AttendanceX",
   };

   // Remplacer les variables dans le template
   const body = JSON.parse(JSON.stringify(template));

   // Parcourir toutes les propriétés et remplacer les variables
   const replaceVariables = (obj: any) => {
     for (const key in obj) {
       if (typeof obj[key] === "string") {
         obj[key] = obj[key]
           .replace("{phoneNumber}", phone)
           .replace("{message}", message)
           .replace("{timestamp}", Date.now().toString());
       } else if (typeof obj[key] === "object" && obj[key] !== null) {
         replaceVariables(obj[key]);
       }
     }
   };

   replaceVariables(body);

   return body;
 }*/

  /**
   * Extrait les données de la réponse selon le mapping configuré
   *//*
 private extractResponseData(responseData: any): any {
   // Vérifier la réussite de la requête selon le mapping configuré
   const isSuccess = this.evaluateMapping(this.config.settings.responseMapping?.success, responseData);

   if (!isSuccess) {
     const errorMessage = this.evaluateMapping(this.config.settings.responseMapping?.error, responseData) || "Unknown error";
     throw new SmsError(`Custom API response indicates failure: ${errorMessage}`, "custom_api_response_error");
   }

   // Extraire l'ID du message
   const messageId = this.evaluateMapping(this.config.settings.responseMapping?.messageId, responseData) ||
                     responseData.id ||
                     responseData.messageId ||
                     `custom-${Date.now()}`;

   // Extraire le coût si disponible
   const cost = this.evaluateMapping(this.config.settings.responseMapping?.cost, responseData) || 0;

   // Extraire le statut
   const status = this.evaluateMapping(this.config.settings.responseMapping?.status, responseData) || "sent";

   // Extraire les métadonnées
   const metadata = this.evaluateMapping(this.config.settings.responseMapping?.metadata, responseData) || {};

   return {
     messageId,
     status,
     cost,
     metadata,
   };
 }*/

  /**
   * Évalue une expression de mapping sur les données de réponse
   * Permet d'extraire des valeurs de la réponse de manière flexible
   */
  private evaluateMapping(mapping: string | undefined, data: any): any {
    if (!mapping) {
      return undefined;
    }

    try {
      // Expressions simples comme "data.id" ou "data.result.messageId"
      if (mapping.includes(".") && !mapping.includes(" ")) {
        return mapping.split(".").reduce((obj, key) => obj?.[key], data);
      }

      // Expressions conditionnelles comme "status === 'sent'"
      const func = new Function("data", `
        with(data) {
          try {
            return ${mapping};
          } catch(e) {
            return undefined;
          }
        }
      `);

      return func(data);
    } catch (error) {
      logger.warn(`Error evaluating response mapping: ${mapping}`, error);
      return undefined;
    }
  }
}
