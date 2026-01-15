import { logger } from 'firebase-functions';
import { openAIService, GeneratedEventData, EventGenerationPrompt } from './openai.service';
import { collections } from '../../config/database';
import { EventModel } from '../../models/event.model';
import { CreateEventRequest } from '../../common/types/event.types';

export interface EventGenerationRequest {
  naturalLanguageInput: string;
  tenantId: string;
  userId: string;
  preferences?: {
    defaultBudget?: number;
    preferredVenues?: string[];
    defaultDuration?: number;
  };
}

export interface GeneratedEventResponse {
  event: GeneratedEventData;
  suggestions: {
    venues: string[];
    improvements: string[];
    alternatives: string[];
  };
  metadata: {
    processingTime: number;
    confidence: number;
    model: string;
  };
}

export class EventGeneratorService {
  
  async generateEvent(request: EventGenerationRequest): Promise<GeneratedEventResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('🚀 Starting event generation', {
        input: request.naturalLanguageInput,
        tenantId: request.tenantId,
        userId: request.userId
      });

      // 1. Générer l'événement avec OpenAI
      const prompt: EventGenerationPrompt = {
        userInput: request.naturalLanguageInput,
        context: {
          tenantId: request.tenantId,
          userId: request.userId,
          preferences: request.preferences
        }
      };

      const generatedEvent = await openAIService.generateEvent(prompt);

      // 2. Enrichir avec des suggestions contextuelles
      const suggestions = await this.generateSuggestions(generatedEvent, request);

      // 3. Calculer les métadonnées
      const processingTime = Date.now() - startTime;
      const metadata = {
        processingTime,
        confidence: generatedEvent.confidence,
        model: 'gpt-4-turbo-preview'
      };

      logger.info('✅ Event generation completed', {
        processingTime,
        confidence: generatedEvent.confidence,
        eventType: generatedEvent.type,
        tasksGenerated: generatedEvent.tasks.length
      });

      return {
        event: generatedEvent,
        suggestions,
        metadata
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Event generation failed', {
        error: error.message,
        processingTime,
        input: request.naturalLanguageInput
      });
      throw new Error(`Event generation failed: ${error.message}`);
    }
  }

  async createEventFromGenerated(
    generatedEvent: GeneratedEventData,
    tenantId: string,
    userId: string
  ): Promise<string> {
    try {
      logger.info('📝 Creating event from generated data', {
        title: generatedEvent.title,
        type: generatedEvent.type,
        tenantId
      });

      // Convertir les données générées en format CreateEventRequest
      const eventData: CreateEventRequest = {
        title: generatedEvent.title,
        description: generatedEvent.description,
        type: generatedEvent.type as any,
        startDateTime: generatedEvent.suggestedDate ? new Date(generatedEvent.suggestedDate) : new Date(),
        endDateTime: this.calculateEndDate(generatedEvent),
        timezone: 'Europe/Paris',
        location: {
          type: 'physical',
          address: {
            street: 'À définir',
            city: 'À définir',
            country: 'France'
          }
        },
        participants: [],
        attendanceSettings: {
          requireQRCode: false,
          requireGeolocation: false,
          requireBiometric: false,
          lateThresholdMinutes: 15,
          earlyThresholdMinutes: 15,
          allowManualMarking: true,
          requireValidation: false,
          required: true,
          allowLateCheckIn: true,
          allowEarlyCheckOut: true,
          requireApproval: false,
          autoMarkAbsent: false,
          autoMarkAbsentAfterMinutes: 30,
          allowSelfCheckIn: true,
          allowSelfCheckOut: true,
          checkInWindow: {
            beforeMinutes: 30,
            afterMinutes: 15
          }
        },
        maxParticipants: generatedEvent.estimatedParticipants,
        registrationRequired: false,
        tags: ['ai-generated'],
        isPrivate: false
      };

      // Créer l'événement avec le modèle existant
      const eventModel = EventModel.fromCreateRequest(eventData, userId);

      await eventModel.validate();

      const eventRef = collections.events.doc();
      await eventRef.set(eventModel.toFirestore());

      logger.info('✅ Event created successfully from AI generation', {
        eventId: eventRef.id,
        title: generatedEvent.title,
        confidence: generatedEvent.confidence
      });

      return eventRef.id;

    } catch (error: any) {
      logger.error('❌ Failed to create event from generated data', {
        error: error.message,
        title: generatedEvent.title
      });
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  private async generateSuggestions(
    event: GeneratedEventData,
    request: EventGenerationRequest
  ): Promise<{ venues: string[]; improvements: string[]; alternatives: string[] }> {
    
    // Pour le MVP, on génère des suggestions basiques
    // Plus tard, on pourra utiliser des APIs de lieux, des données historiques, etc.
    
    const venues = this.generateVenueSuggestions(event);
    const improvements = this.generateImprovementSuggestions(event);
    const alternatives = this.generateAlternativeSuggestions(event);

    return { venues, improvements, alternatives };
  }

  private generateVenueSuggestions(event: GeneratedEventData): string[] {
    const suggestions: string[] = [];
    
    switch (event.type) {
      case 'conference':
        suggestions.push('Centre de conférences', 'Hôtel avec salle de séminaire', 'Espace coworking');
        break;
      case 'meeting':
        suggestions.push('Salle de réunion', 'Bureau', 'Café avec espace privé');
        break;
      case 'workshop':
        suggestions.push('Atelier créatif', 'Salle de formation', 'Fablab');
        break;
      case 'social':
        suggestions.push('Restaurant', 'Bar', 'Parc', 'Salle des fêtes');
        break;
      case 'wedding':
        suggestions.push('Château', 'Domaine viticole', 'Salle de réception', 'Jardin');
        break;
      default:
        suggestions.push('Salle polyvalente', 'Espace événementiel');
    }

    return suggestions;
  }

  private generateImprovementSuggestions(event: GeneratedEventData): string[] {
    const suggestions: string[] = [];

    if (event.confidence < 0.7) {
      suggestions.push('Préciser la date et l\'heure');
      suggestions.push('Définir le budget plus clairement');
    }

    if (event.estimatedParticipants > 50) {
      suggestions.push('Prévoir un système d\'inscription en ligne');
      suggestions.push('Organiser la logistique d\'accueil');
    }

    if (event.type === 'conference') {
      suggestions.push('Prévoir un système de streaming');
      suggestions.push('Organiser des pauses networking');
    }

    return suggestions;
  }

  private generateAlternativeSuggestions(event: GeneratedEventData): string[] {
    const alternatives: string[] = [];

    // Suggestions d'alternatives basées sur le type d'événement
    if (event.type === 'meeting') {
      alternatives.push('Organiser en visioconférence');
      alternatives.push('Diviser en plusieurs petites réunions');
    }

    if (event.estimatedParticipants > 100) {
      alternatives.push('Organiser en format hybride');
      alternatives.push('Créer plusieurs sessions plus petites');
    }

    return alternatives;
  }

  private calculateEndDate(event: GeneratedEventData): Date {
    const startDate = event.suggestedDate ? new Date(event.suggestedDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + event.estimatedDuration);
    return endDate;
  }

  async refineEvent(
    eventId: string,
    refinementPrompt: string,
    tenantId: string,
    userId: string
  ): Promise<GeneratedEventResponse> {
    try {
      // Récupérer l'événement existant
      const eventDoc = await collections.events.doc(eventId).get();
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();
      if (eventData?.tenantId !== tenantId) {
        throw new Error('Unauthorized access to event');
      }

      // Créer un prompt de raffinement
      const refinementRequest: EventGenerationRequest = {
        naturalLanguageInput: `Améliore cet événement : "${eventData?.title}". ${refinementPrompt}`,
        tenantId,
        userId
      };

      return await this.generateEvent(refinementRequest);

    } catch (error: any) {
      logger.error('❌ Event refinement failed', {
        error: error.message,
        eventId,
        refinementPrompt
      });
      throw new Error(`Event refinement failed: ${error.message}`);
    }
  }
}

export const eventGeneratorService = new EventGeneratorService();