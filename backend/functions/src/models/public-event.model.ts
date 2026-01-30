/**
 * Public Event Model
 * Handles validation and serialization for public events
 */

import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel, ValidationError } from "./base.model";
import { PublicEvent, EventLocation, EventPricing } from "../types/public-event.types";
import { logger } from "firebase-functions";

export class PublicEventModel extends BaseModel<PublicEvent> {
  constructor(data: Partial<PublicEvent>) {
    super(data);
  }

  /**
   * Validate public event data
   */
  async validate(): Promise<boolean> {
    const event = this.data;

    // Validate required fields
    BaseModel.validateRequired(event, [
      'title',
      'slug',
      'organizerId',
      'startDate',
      'endDate',
      'visibility',
      'category'
    ]);

    // Validate title length
    this.validateLength(event.title, 3, 200, 'title');

    // Validate slug format (URL-friendly)
    if (!/^[a-z0-9-]+$/.test(event.slug)) {
      throw new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate visibility
    const validVisibilities = ['public', 'private', 'unlisted'];
    if (!validVisibilities.includes(event.visibility)) {
      throw new ValidationError(`Visibility must be one of: ${validVisibilities.join(', ')}`);
    }

    // Validate dates
    if (!BaseModel.validateDate(event.startDate)) {
      throw new ValidationError('Invalid start date');
    }

    if (!BaseModel.validateDate(event.endDate)) {
      throw new ValidationError('Invalid end date');
    }

    this.validateDateRange(event.startDate, event.endDate, 'event dates');

    // Validate location
    if (event.location) {
      this.validateLocation(event.location);
    }

    // Validate pricing
    if (event.pricing) {
      this.validatePricing(event.pricing);
    }

    // Validate rating
    if (event.rating) {
      if (event.rating.average < 0 || event.rating.average > 5) {
        throw new ValidationError('Rating average must be between 0 and 5');
      }
      if (event.rating.count < 0) {
        throw new ValidationError('Rating count must be non-negative');
      }
    }

    // Validate capacity
    if (event.capacity) {
      if (event.capacity.total < 0) {
        throw new ValidationError('Capacity total must be non-negative');
      }
      if (event.capacity.registered > event.capacity.total) {
        throw new ValidationError('Registered count cannot exceed total capacity');
      }
    }

    return true;
  }

  /**
   * Validate location data
   */
  private validateLocation(location: EventLocation): void {
    const validTypes = ['physical', 'online', 'hybrid'];
    if (!validTypes.includes(location.type)) {
      throw new ValidationError(`Location type must be one of: ${validTypes.join(', ')}`);
    }

    if (location.type === 'physical' || location.type === 'hybrid') {
      if (!location.city || !location.country) {
        throw new ValidationError('Physical/hybrid events must have city and country');
      }
    }

    // Validate coordinates if provided
    if (location.coordinates) {
      if (location.coordinates.lat < -90 || location.coordinates.lat > 90) {
        throw new ValidationError('Latitude must be between -90 and 90');
      }
      if (location.coordinates.lng < -180 || location.coordinates.lng > 180) {
        throw new ValidationError('Longitude must be between -180 and 180');
      }
    }
  }

  /**
   * Validate pricing data
   */
  private validatePricing(pricing: EventPricing): void {
    const validTypes = ['free', 'paid'];
    if (!validTypes.includes(pricing.type)) {
      throw new ValidationError(`Pricing type must be one of: ${validTypes.join(', ')}`);
    }

    if (pricing.type === 'paid') {
      if (!pricing.amount || pricing.amount <= 0) {
        throw new ValidationError('Paid events must have a positive amount');
      }
      if (!pricing.currency) {
        throw new ValidationError('Paid events must have a currency');
      }
    }

    // Validate early bird pricing if provided
    if (pricing.earlyBird) {
      if (pricing.earlyBird.amount <= 0) {
        throw new ValidationError('Early bird amount must be positive');
      }
      if (!BaseModel.validateDate(pricing.earlyBird.deadline)) {
        throw new ValidationError('Invalid early bird deadline');
      }
    }
  }

  /**
   * Convert to Firestore format
   */
  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = PublicEventModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Serialize for public API (exclude sensitive fields)
   */
  public toPublicAPI(): PublicEvent {
    const data = { ...this.data };
    // Public events don't have sensitive fields to exclude
    // But we ensure all required fields are present
    return data as PublicEvent;
  }

  /**
   * Create from Firestore document
   */
  static fromFirestore(doc: DocumentSnapshot): PublicEventModel | null {
    if (!doc.exists) {
      return null;
    }

    try {
      const data = doc.data()!;
      const convertedData = PublicEventModel.prototype.convertDatesFromFirestore(data);

      // Safe date conversion with fallbacks
      const publicEvent: Partial<PublicEvent> = {
        id: doc.id,
        slug: convertedData.slug || PublicEventModel.generateSlug(convertedData.title, doc.id),
        title: convertedData.title,
        description: convertedData.description || '',
        shortDescription: convertedData.shortDescription || convertedData.description?.substring(0, 160) || '',
        coverImage: convertedData.coverImage || '',
        images: convertedData.images || [],
        organizerId: convertedData.tenantId || convertedData.organizerId,
        organizerName: convertedData.organizerName || 'Unknown',
        organizerSlug: convertedData.organizerSlug || '',
        organizerAvatar: convertedData.organizerAvatar,
        organizerRating: convertedData.organizerRating || 0,
        startDate: PublicEventModel.safeConvertDate(convertedData.startDate, 'startDate'),
        endDate: PublicEventModel.safeConvertDate(convertedData.endDate, 'endDate'),
        timezone: convertedData.timezone || 'UTC',
        location: convertedData.location || { type: 'online', city: '', country: '' },
        category: convertedData.category || 'other',
        tags: convertedData.tags || [],
        pricing: convertedData.pricing || { type: 'free' },
        capacity: convertedData.capacity || { total: 0, available: 0, registered: 0 },
        rating: convertedData.rating || { average: 0, count: 0 },
        visibility: convertedData.visibility || 'public',
        featured: convertedData.featured || false,
        seo: convertedData.seo || {
          metaTitle: convertedData.title,
          metaDescription: convertedData.shortDescription || convertedData.description?.substring(0, 160) || '',
          keywords: convertedData.tags || [],
          ogImage: convertedData.coverImage || ''
        },
        publishedAt: PublicEventModel.safeConvertDate(convertedData.publishedAt, 'publishedAt'),
        createdAt: PublicEventModel.safeConvertDate(convertedData.createdAt, 'createdAt'),
        updatedAt: PublicEventModel.safeConvertDate(convertedData.updatedAt, 'updatedAt')
      };

      return new PublicEventModel(publicEvent);

    } catch (error: any) {
      logger.error('❌ Error creating PublicEventModel from Firestore', {
        docId: doc.id,
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Safely convert Firestore Timestamp or date string to Date object
   */
  private static safeConvertDate(value: any, fieldName: string): Date {
    if (!value) {
      return new Date();
    }
    
    // Firestore Timestamp with toDate method
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch (error) {
        logger.warn(`Failed to convert Firestore Timestamp for ${fieldName}`, { error });
      }
    }
    
    // ISO string or timestamp number
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Already a Date object
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }
    
    // Fallback to current date
    logger.warn(`Invalid date value for ${fieldName}, using current date`, { 
      value: typeof value,
      fieldName 
    });
    return new Date();
  }

  /**
   * Generate URL-friendly slug from title
   */
  private static generateSlug(title: string, id: string): string {
    if (!title) {
      return `event-${id.substring(0, 8)}`;
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return `${slug}-${id.substring(0, 8)}`;
  }

  /**
   * Remove undefined fields from object
   */
  private static removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => PublicEventModel.removeUndefinedFields(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = PublicEventModel.removeUndefinedFields(value);
        }
      });
      return cleaned;
    }

    return obj;
  }
}
