import { AwsSnsConfig, SmsError, SmsResult } from "@attendance-x/shared";
import { BaseSmsProvider } from "./BaseSmsProvider";
import { logger } from "firebase-functions";
import {
  GetSMSAttributesCommand,
  MessageAttributeValue,
  PublishCommand,
  SNSClient,
} from "@aws-sdk/client-sns";

/**
 * Provider SMS utilisant Amazon SNS
 */
/**
 * Provider SMS utilisant Amazon SNS avec AWS SDK v3
 */
export class AwsSnsProvider extends BaseSmsProvider {
  // @ts-ignore
  private snsClient: SNSClient;
  private awsConfig: AwsSnsConfig;

  constructor(config: AwsSnsConfig) {
    super(config);
    this.awsConfig = config;

    // Initialiser le client SNS avec SDK v3
    try {
      this.snsClient = new SNSClient({
        region: this.awsConfig.credentials.region,
        credentials: {
          accessKeyId: this.awsConfig.credentials.accessKeyId,
          secretAccessKey: this.awsConfig.credentials.secretAccessKey,
        },
      });

      logger.info("AwsSnsProvider initialized successfully", {
        region: this.awsConfig.credentials.region,
      });
    } catch (error: any) {
      logger.error("Failed to initialize AwsSnsProvider", error);
    }
  }

  /**
   * Envoie un SMS via Amazon SNS
   */
 async sendSms(phone: string, message: string): Promise<SmsResult> {
   try {
     // Vérifier les limites de taux
     if (!await this.checkRateLimits()) {
       throw new SmsError("Rate limit exceeded for AWS SNS provider", "rate_limit_exceeded");
     }

     // Normaliser le numéro de téléphone
     const normalizedPhone = this.normalizePhoneNumber(phone);

     // Déterminer le type de message (promo ou transactional)
     const messageType = this.determineMessageType(message);

     // Préparer les attributs de message
     const messageAttributes: Record<string, MessageAttributeValue> = {
       "AWS.SNS.SMS.SenderID": {
         DataType: "String",
         StringValue: this.awsConfig.settings?.defaultSenderId || "AttendanceX",
       },
       "AWS.SNS.SMS.SMSType": {
         DataType: "String",
         StringValue: this.awsConfig.settings?.smsType || "Transactional",
       },
       "AWS.SNS.SMS.MaxPrice": {
         DataType: "String",
         StringValue: this.awsConfig.settings?.maxPrice || "0.50",
       },
     };

     // Ajouter des attributs spécifiques au type de message
     if (this.awsConfig.messageAttributes?.[messageType]) {
       Object.entries(this.awsConfig.messageAttributes[messageType]).forEach(([key, value]) => {
         if (!messageAttributes[key]) {
           messageAttributes[key] = {
             DataType: "String",
             StringValue: String(value),
           };
         }
       });
     }

     // Créer la commande de publication
     const publishCommand = new PublishCommand({
       Message: message,
       PhoneNumber: normalizedPhone,
       MessageAttributes: messageAttributes,
     });

     // Envoyer le SMS via SNS
     logger.debug(`Sending SMS via AWS SNS to ${normalizedPhone}`, {
       provider: "aws_sns",
       to: normalizedPhone,
       messageLength: message.length,
       messageType: messageType,
       region: this.awsConfig.credentials.region,
     });

     const result = await this.snsClient.send(publishCommand);

     // Calculer le coût estimé
     const estimatedCost = this.calculateEstimatedCost(message);

     // Mettre à jour les statistiques
     this.updateStats(true, estimatedCost);

     logger.info("SMS sent successfully via AWS SNS", {
       provider: "aws_sns",
       messageId: result.MessageId,
       region: this.awsConfig.credentials.region,
     });

     // Retourner le résultat
     return {
       success: true,
       messageId: result.MessageId!,
       status: "sent",
       cost: estimatedCost,
       provider: "aws_sns",
       metadata: {
         requestId: result.$metadata?.requestId,
         region: this.awsConfig.credentials.region,
         messageType,
         httpStatusCode: result.$metadata?.httpStatusCode,
       },
     };
   } catch (error: any) {
     // Mettre à jour les statistiques
     this.updateStats(false, 0, error.message);

     // Logger l'erreur
     logger.error("Failed to send SMS via AWS SNS", {
       provider: "aws_sns",
       error: error.message,
       errorCode: error.name,
       to: phone,
       region: this.awsConfig.credentials.region,
     });

     // Convertir l'erreur en SmsError si nécessaire
     if (!(error instanceof SmsError)) {
       let errorCode = "aws_sns_error";
       let retryable = false;

       // Mapper les erreurs AWS spécifiques
       switch (error.name) {
       case "InvalidParameterException":
         errorCode = "aws_sns_invalid_parameter";
         break;
       case "AuthorizationErrorException":
         errorCode = "aws_sns_authorization_error";
         break;
       case "ThrottledException":
         errorCode = "aws_sns_throttled";
         retryable = true;
         break;
       case "InternalErrorException":
         errorCode = "aws_sns_internal_error";
         retryable = true;
         break;
       default:
         errorCode = `aws_sns_${error.name?.toLowerCase() || "unknown"}`;
       }

       const smsError = new SmsError(
         `AWS SNS error: ${error.message}`,
         errorCode,
         error.$metadata?.httpStatusCode,
         retryable
       );
       error = smsError;
     }

     // Mettre à jour le statut du provider si nécessaire
     if (error.code?.includes("authorization") || error.code?.includes("access_denied")) {
       //this.config.availabilityStatus = "unavailable";
       logger.info(error);
     }

     throw error;
   }
 }

  /**
   * Teste la connexion à AWS SNS
   */
 async testConnection(): Promise<boolean> {
   try {
     // Vérifier les permissions en récupérant les attributs SMS
     const getSMSAttributesCommand = new GetSMSAttributesCommand({
       attributes: ["DefaultSenderID", "DefaultSMSType", "MonthlySpendLimit"],
     });

     const result = await this.snsClient.send(getSMSAttributesCommand);

     logger.info("AWS SNS connection test successful", {
       attributes: result.attributes,
       region: this.awsConfig.credentials.region,
     });

     // this.stats.availabilityStatus = "available";
     return true;
   } catch (error: any) {
     logger.error("AWS SNS connection test failed", {
       error: error instanceof Error ? error.message : String(error),
       errorName: error instanceof Error ? error.name : String(error),
       region: this.awsConfig.credentials.region,
     });
     return false;
   }
 }

  /**
   * Détermine le type de message (urgent ou reminder)
   */
  private determineMessageType(message: string): string {
    // Liste de mots-clés qui pourraient indiquer un message urgent
    const urgentKeywords = [
      "urgent", "urgence", "important", "immédiat", "alerte",
      "emergency", "alert", "critical", "priority", "security",
      "rappel", "reminder", "deadline", "expiration",
    ];

    // Vérifier si le message contient des mots-clés urgents
    const lowerMessage = message.toLowerCase();
    const isUrgent = urgentKeywords.some((keyword) => lowerMessage.includes(keyword));

    return isUrgent ? "urgent" : "reminder";
  }

  /**
   * Calcule le coût estimé d'un SMS avec AWS SNS
   */
  private calculateEstimatedCost(message: string): number {
    // Implémentation basée sur les tarifs AWS SNS
    // Les coûts varient selon la région et le pays de destination

    // Taux moyens par région (en USD par SMS)
    const regionRates: Record<string, number> = {
      "us-east-1": 0.00645,
      "us-west-2": 0.00645,
      "eu-west-1": 0.00645,
      "ap-southeast-1": 0.00645,
    };

    const baseRate = regionRates[this.awsConfig.credentials.region] || 0.00645;

    // Calculer le nombre de segments (160 caractères par segment)
    const messageCount = Math.ceil(message.length / 160);

    return baseRate * messageCount;
  }

  /**
   * Récupère les attributs SMS actuels du compte
   */
  async getSMSAttributes(): Promise<Record<string, string>> {
    try {
      const command = new GetSMSAttributesCommand({});
      const result = await this.snsClient.send(command);
      return result.attributes || {};
    } catch (error: any) {
      logger.error("Failed to get SMS attributes from AWS SNS", error);
      throw new SmsError("Failed to retrieve SMS attributes", "aws_sns_attributes_error");
    }
  }

  /**
   * Vérifie le quota de dépenses mensuel
   */
  async checkMonthlySpendLimit(): Promise<{
    limit: number;
    spent: number;
    remaining: number;
  }> {
    try {
      const attributes = await this.getSMSAttributes();

      const monthlySpendLimit = parseFloat(attributes["MonthlySpendLimit"] || "1.00");
      const monthlySpent = parseFloat(attributes["MonthlySpent"] || "0.00");

      return {
        limit: monthlySpendLimit,
        spent: monthlySpent,
        remaining: monthlySpendLimit - monthlySpent,
      };
    } catch (error: any) {
      logger.warn("Could not check monthly spend limit", error);
      return {
        limit: 0,
        spent: 0,
        remaining: 0,
      };
    }
  }

  /**
   * Vérifie si on approche de la limite de dépenses
   */
  async isApproachingSpendLimit(threshold = 0.8): Promise<boolean> {
    try {
      const spendInfo = await this.checkMonthlySpendLimit();

      if (spendInfo.limit === 0) {
        return false; // Pas de limite définie
      }

      const spendRatio = spendInfo.spent / spendInfo.limit;
      return spendRatio >= threshold;
    } catch (error) {
      logger.warn("Could not check spend limit", error);
      return false;
    }
  }
}
