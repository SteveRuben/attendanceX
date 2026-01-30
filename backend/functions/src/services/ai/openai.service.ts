import OpenAI from 'openai';
import { logger } from 'firebase-functions';
import { 
  ValidationError, 
  ExternalServiceError, 
  ConfigurationError 
} from "../../utils/common/errors";

export enum EventType {
  CONFERENCE = 'conference',
  MEETING = 'meeting',
  WORKSHOP = 'workshop',
  SOCIAL = 'social',
  WEDDING = 'wedding',
  OTHER = 'other'
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface UserPreferences {
  defaultEventType?: EventType;
  preferredDuration?: number;
  budgetRange?: {
    min: number;
    max: number;
    currency: string;
  };
  defaultParticipants?: number;
  timezone?: string;
  defaultBudget?: number;
  preferredVenues?: string[];
}

export interface EventGenerationPrompt {
  userInput: string;
  context: {
    tenantId: string;
    userId: string;
    preferences?: UserPreferences;
  };
}

export interface GeneratedEventData {
  title: string;
  description: string;
  type: EventType;
  estimatedDuration: number; // en minutes
  estimatedParticipants: number;
  suggestedDate?: string;
  suggestedTime?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  tasks: Array<{
    title: string;
    description: string;
    priority: TaskPriority;
    estimatedTime: number; // en minutes
    dueDate?: string;
  }>;
  requirements: {
    venue: string[];
    catering: string[];
    equipment: string[];
    staff: string[];
  };
  confidence: number; // 0-1
}

export interface OpenAIUsageMetrics {
  tenantId: string;
  userId: string;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
}

export class OpenAIService {
  private client: OpenAI | null = null;

  private initializeClient(): OpenAI {
    if (this.client) {
      return this.client;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ConfigurationError('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
    });

    return this.client;
  }

  async generateEvent(prompt: EventGenerationPrompt): Promise<GeneratedEventData> {
    const client = this.initializeClient(); // Lazy initialize
    const startTime = Date.now();
    
    // Validate input
    this.validatePrompt(prompt);
    
    try {
      logger.info('🤖 Generating event with OpenAI', {
        userInput: prompt.userInput.substring(0, 100) + '...', // Truncate for logging
        tenantId: prompt.context.tenantId,
        userId: prompt.context.userId,
      });

      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(prompt);

      const completion = await client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new ExternalServiceError('No response from OpenAI', { service: 'openai' });
      }

      let generatedData: GeneratedEventData;
      try {
        generatedData = JSON.parse(response) as GeneratedEventData;
      } catch (parseError) {
        throw new ExternalServiceError('Invalid JSON response from OpenAI', { 
          service: 'openai',
          response: response.substring(0, 200) 
        });
      }
      
      // Validation de la réponse
      this.validateGeneratedData(generatedData);

      // Track usage for monitoring and billing
      const tokensUsed = completion.usage?.total_tokens || 0;
      await this.trackUsage(prompt.context.tenantId, prompt.context.userId, tokensUsed);

      const duration = Date.now() - startTime;
      logger.info('✅ Event generated successfully', {
        duration,
        eventType: generatedData.type,
        confidence: generatedData.confidence,
        tasksCount: generatedData.tasks.length,
        tokensUsed,
        tenantId: prompt.context.tenantId
      });

      return generatedData;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error generating event', {
        error: error.message,
        duration,
        userInput: prompt.userInput.substring(0, 100),
        tenantId: prompt.context.tenantId,
        userId: prompt.context.userId
      });

      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        throw new ExternalServiceError('OpenAI quota exceeded', { service: 'openai' });
      }

      if (error.code === 'invalid_request_error') {
        throw new ValidationError('Invalid request to OpenAI', { details: error.message });
      }

      if (error.code === 'rate_limit_exceeded') {
        throw new ExternalServiceError('OpenAI rate limit exceeded', { service: 'openai' });
      }

      // Re-throw our custom errors
      if (error instanceof ValidationError || error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(`OpenAI service error: ${error.message}`, { 
        service: 'openai',
        originalError: error.code 
      });
    }
  }

  private validatePrompt(prompt: EventGenerationPrompt): void {
    if (!prompt.userInput || prompt.userInput.trim().length === 0) {
      throw new ValidationError('User input is required and cannot be empty');
    }

    if (prompt.userInput.length > 2000) {
      throw new ValidationError('User input is too long (max 2000 characters)');
    }

    if (!prompt.context?.tenantId) {
      throw new ValidationError('Tenant context is required for event generation');
    }

    if (!prompt.context?.userId) {
      throw new ValidationError('User context is required for event generation');
    }
  }

  private async trackUsage(
    tenantId: string, 
    userId: string, 
    tokensUsed: number
  ): Promise<void> {
    try {
      const cost = this.calculateCost(tokensUsed);
      
      logger.info('📊 OpenAI usage tracked', {
        tenantId,
        userId,
        tokensUsed,
        cost
      });

      // TODO: Store usage metrics in Firestore for billing/monitoring
      // This could be implemented later for cost tracking and rate limiting
    } catch (error) {
      // Don't fail the main operation if usage tracking fails
      logger.warn('Failed to track OpenAI usage', { error, tenantId, userId });
    }
  }

  private calculateCost(tokens: number): number {
    // GPT-4 Turbo pricing: ~$0.01 per 1K tokens (input) + $0.03 per 1K tokens (output)
    return (tokens / 1000) * 0.02; // Approximate average
  }

  private buildSystemPrompt(): string {
    return `Tu es un assistant IA expert en organisation d'événements. 
    
Ton rôle est de transformer une description en langage naturel en un événement structuré et actionnable.

RÈGLES IMPORTANTES :
- Réponds UNIQUEMENT en JSON valide
- Sois précis et réaliste dans tes estimations
- Génère des tâches concrètes et actionnables
- Adapte le niveau de complexité au type d'événement
- Utilise le français pour tous les textes
- Assigne un score de confiance basé sur la clarté de la demande

TYPES D'ÉVÉNEMENTS SUPPORTÉS :
- conference : Conférences, séminaires, formations
- meeting : Réunions, assemblées, présentations
- workshop : Ateliers, formations pratiques
- social : Fêtes, brunches, événements sociaux
- wedding : Mariages, cérémonies
- other : Autres types d'événements

FORMAT DE RÉPONSE JSON :
{
  "title": "Titre de l'événement",
  "description": "Description détaillée",
  "type": "conference|meeting|workshop|social|wedding|other",
  "estimatedDuration": 120,
  "estimatedParticipants": 50,
  "suggestedDate": "2024-03-15",
  "suggestedTime": "14:00",
  "budget": {
    "min": 1000,
    "max": 2000,
    "currency": "EUR"
  },
  "tasks": [
    {
      "title": "Réserver le lieu",
      "description": "Trouver et réserver un lieu adapté",
      "priority": "high",
      "estimatedTime": 60,
      "dueDate": "2024-03-01"
    }
  ],
  "requirements": {
    "venue": ["Salle de 50 personnes", "Projecteur", "Wifi"],
    "catering": ["Café", "Viennoiseries"],
    "equipment": ["Micro", "Ordinateur portable"],
    "staff": ["1 organisateur", "1 technicien"]
  },
  "confidence": 0.85
}`;
  }

  private buildUserPrompt(prompt: EventGenerationPrompt): string {
    let userPrompt = `Génère un événement basé sur cette demande : "${prompt.userInput}"`;
    
    if (prompt.context.preferences) {
      userPrompt += `\n\nPréférences utilisateur : ${JSON.stringify(prompt.context.preferences)}`;
    }

    userPrompt += `\n\nDate actuelle : ${new Date().toISOString().split('T')[0]}`;
    
    return userPrompt;
  }

  private validateGeneratedData(data: GeneratedEventData): void {
    const required = ['title', 'description', 'type', 'estimatedDuration', 'estimatedParticipants', 'tasks', 'requirements', 'confidence'];
    
    for (const field of required) {
      if (!(field in data)) {
        throw new ValidationError(`Missing required field in generated data: ${field}`);
      }
    }

    if (data.confidence < 0 || data.confidence > 1) {
      throw new ValidationError('Confidence must be between 0 and 1');
    }

    if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
      throw new ValidationError('Tasks must be a non-empty array');
    }

    // Validate event type
    if (!Object.values(EventType).includes(data.type)) {
      throw new ValidationError(`Invalid event type: ${data.type}`);
    }

    // Validate task priorities
    for (const task of data.tasks) {
      if (!Object.values(TaskPriority).includes(task.priority)) {
        throw new ValidationError(`Invalid task priority: ${task.priority}`);
      }
    }

    // Validate numeric fields
    if (data.estimatedDuration <= 0) {
      throw new ValidationError('Estimated duration must be positive');
    }

    if (data.estimatedParticipants <= 0) {
      throw new ValidationError('Estimated participants must be positive');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = this.initializeClient();
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return !!response.choices[0]?.message?.content;
    } catch (error: any) {
      logger.error('OpenAI connection test failed', { 
        error: error.message,
        code: error.code 
      });
      return false;
    }
  }
}

export const openAIService = new OpenAIService();