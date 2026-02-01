# 🔧 Spécifications Techniques Backend - AttendanceX

## Date: 2026-01-30
## Architecture: MVC avec Firebase Functions

---

## 📋 TABLE DES MATIÈRES

1. [API de Localisation](#1-api-de-localisation)
2. [API de Billetterie](#2-api-de-billetterie)
3. [API de Statistiques](#3-api-de-statistiques)
4. [API de Reviews](#4-api-de-reviews)
5. [API de Favoris](#5-api-de-favoris)
6. [Système de Notifications](#6-système-de-notifications)
7. [Modèles de Données](#7-modèles-de-données)

---

## 1. API DE LOCALISATION

### 1.1 Structure des Fichiers
```
backend/functions/src/
├── routes/location/
│   └── location.routes.ts
├── controllers/location/
│   └── location.controller.ts
├── services/location/
│   ├── location.service.ts
│   └── geocoding.service.ts
├── models/
│   └── location.model.ts
└── types/
    └── location.types.ts
```

### 1.2 Types TypeScript
```typescript
// types/location.types.ts
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface City {
  id: string;
  name: string;
  country: string;
  coordinates: Coordinates;
  timezone: string;
}

export interface DistanceCalculation {
  from: Coordinates;
  to: Coordinates;
  distance: number; // en km
  unit: 'km' | 'mi';
}

export interface NearbyEventsQuery {
  coordinates: Coordinates;
  radius: number; // en km
  category?: string;
  startDate?: Date;
  endDate?: Date;
}
```

### 1.3 Endpoints


#### GET /api/v1/location/cities
**Description**: Recherche de villes avec autocomplétion

**Query Parameters**:
- `search` (string, required): Terme de recherche
- `limit` (number, optional): Nombre de résultats (default: 10)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "montreal-qc-ca",
      "name": "Montréal",
      "country": "Canada",
      "coordinates": { "latitude": 45.5017, "longitude": -73.5673 },
      "timezone": "America/Montreal"
    }
  ]
}
```

#### GET /api/v1/location/nearby
**Description**: Événements à proximité d'une position

**Query Parameters**:
- `lat` (number, required): Latitude
- `lng` (number, required): Longitude
- `radius` (number, optional): Rayon en km (default: 10)
- `category` (string, optional): Filtrer par catégorie
- `limit` (number, optional): Nombre de résultats (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "events": [...],
    "center": { "latitude": 45.5017, "longitude": -73.5673 },
    "radius": 10,
    "total": 42
  }
}
```

#### POST /api/v1/location/calculate-distance
**Description**: Calcul de distance entre deux points

**Body**:
```json
{
  "from": { "latitude": 45.5017, "longitude": -73.5673 },
  "to": { "latitude": 45.5088, "longitude": -73.5878 },
  "unit": "km"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "distance": 2.5,
    "unit": "km",
    "duration": "8 minutes" // estimation
  }
}
```

### 1.4 Service Implementation
```typescript
// services/location/location.service.ts
import { Coordinates, NearbyEventsQuery } from '../../types/location.types';
import { collections } from '../../config/database';

export class LocationService {
  
  /**
   * Calcule la distance entre deux points (formule Haversine)
   */
  calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLon = this.toRad(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.latitude)) * 
      Math.cos(this.toRad(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Trouve les événements à proximité
   */
  async getNearbyEvents(query: NearbyEventsQuery) {
    const { coordinates, radius, category, startDate, endDate } = query;
    
    // Firestore ne supporte pas les requêtes géospatiales natives
    // On récupère tous les événements et on filtre en mémoire
    let eventsQuery = collections.events
      .where('status', '==', 'published')
      .where('isPublic', '==', true);
    
    if (category) {
      eventsQuery = eventsQuery.where('category', '==', category);
    }
    
    if (startDate) {
      eventsQuery = eventsQuery.where('startDate', '>=', startDate);
    }
    
    const snapshot = await eventsQuery.get();
    
    // Filtrer par distance
    const nearbyEvents = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(event => {
        if (!event.location?.coordinates) return false;
        
        const distance = this.calculateDistance(
          coordinates,
          event.location.coordinates
        );
        
        return distance <= radius;
      })
      .map(event => ({
        ...event,
        distance: this.calculateDistance(
          coordinates,
          event.location.coordinates
        )
      }))
      .sort((a, b) => a.distance - b.distance);
    
    return nearbyEvents;
  }

  /**
   * Recherche de villes
   */
  async searchCities(search: string, limit: number = 10) {
    // Utiliser une API externe comme Google Places ou une base de données de villes
    // Pour l'instant, retourner des villes prédéfinies
    const cities = await collections.cities
      .where('name', '>=', search)
      .where('name', '<=', search + '\uf8ff')
      .limit(limit)
      .get();
    
    return cities.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const locationService = new LocationService();
```

---

## 2. API DE BILLETTERIE

### 2.1 Structure des Fichiers
```
backend/functions/src/
├── routes/tickets/
│   └── tickets.routes.ts
├── controllers/tickets/
│   └── tickets.controller.ts
├── services/tickets/
│   ├── tickets.service.ts
│   ├── stripe.service.ts
│   ├── pdf-generator.service.ts
│   └── qr-code.service.ts
├── models/
│   └── ticket.model.ts
└── types/
    └── ticket.types.ts
```

### 2.2 Types TypeScript
```typescript
// types/ticket.types.ts
export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  tenantId: string;
  ticketType: TicketType;
  quantity: number;
  totalAmount: number;
  status: TicketStatus;
  qrCode: string;
  purchaseDate: Date;
  paymentIntentId?: string;
  metadata?: Record<string, any>;
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  available: number;
  total: number;
}

export enum TicketStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  USED = 'used',
  REFUNDED = 'refunded'
}

export interface PurchaseTicketRequest {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  paymentMethodId: string;
}
```

### 2.3 Endpoints

#### POST /api/v1/tickets/purchase
**Description**: Acheter des billets

**Headers**:
- `Authorization: Bearer <token>`

**Body**:
```json
{
  "eventId": "event123",
  "ticketTypeId": "type1",
  "quantity": 2,
  "paymentMethodId": "pm_xxx"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "ticketId": "ticket123",
    "status": "confirmed",
    "totalAmount": 50.00,
    "currency": "EUR",
    "qrCode": "data:image/png;base64,...",
    "downloadUrl": "/api/v1/tickets/ticket123/download"
  }
}
```

#### GET /api/v1/tickets/my-tickets
**Description**: Liste des billets de l'utilisateur

**Query Parameters**:
- `status` (string, optional): Filtrer par statut
- `upcoming` (boolean, optional): Seulement événements à venir

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ticket123",
      "event": {...},
      "ticketType": "VIP",
      "quantity": 2,
      "totalAmount": 50.00,
      "status": "confirmed",
      "qrCode": "...",
      "purchaseDate": "2026-01-30T10:00:00Z"
    }
  ]
}
```

#### GET /api/v1/tickets/:id/download
**Description**: Télécharger le billet en PDF

**Response**: PDF file

#### POST /api/v1/tickets/:id/cancel
**Description**: Annuler un billet

**Response**:
```json
{
  "success": true,
  "message": "Ticket cancelled successfully",
  "data": {
    "refundAmount": 50.00,
    "refundStatus": "pending"
  }
}
```

### 2.4 Service Implementation
```typescript
// services/tickets/tickets.service.ts
import Stripe from 'stripe';
import { Ticket, PurchaseTicketRequest, TicketStatus } from '../../types/ticket.types';
import { collections } from '../../config/database';
import { stripeService } from './stripe.service';
import { pdfGeneratorService } from './pdf-generator.service';
import { qrCodeService } from './qr-code.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export class TicketsService {
  
  async purchaseTicket(
    request: PurchaseTicketRequest,
    userId: string,
    tenantId: string
  ): Promise<Ticket> {
    // 1. Vérifier la disponibilité
    const event = await this.getEvent(request.eventId);
    const ticketType = event.ticketTypes.find(t => t.id === request.ticketTypeId);
    
    if (!ticketType || ticketType.available < request.quantity) {
      throw new Error('Tickets not available');
    }
    
    // 2. Créer le Payment Intent Stripe
    const amount = ticketType.price * request.quantity * 100; // en centimes
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: ticketType.currency.toLowerCase(),
      payment_method: request.paymentMethodId,
      confirm: true,
      metadata: {
        eventId: request.eventId,
        userId,
        tenantId
      }
    });
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment failed');
    }
    
    // 3. Créer le billet
    const ticketRef = collections.tickets.doc();
    const qrCode = await qrCodeService.generate(ticketRef.id);
    
    const ticket: Ticket = {
      id: ticketRef.id,
      eventId: request.eventId,
      userId,
      tenantId,
      ticketType,
      quantity: request.quantity,
      totalAmount: ticketType.price * request.quantity,
      status: TicketStatus.CONFIRMED,
      qrCode,
      purchaseDate: new Date(),
      paymentIntentId: paymentIntent.id
    };
    
    await ticketRef.set(ticket);
    
    // 4. Mettre à jour la disponibilité
    await this.updateTicketAvailability(
      request.eventId,
      request.ticketTypeId,
      -request.quantity
    );
    
    // 5. Envoyer l'email de confirmation
    await this.sendConfirmationEmail(ticket);
    
    return ticket;
  }

  async generatePDF(ticketId: string): Promise<Buffer> {
    const ticket = await this.getTicket(ticketId);
    return pdfGeneratorService.generateTicketPDF(ticket);
  }

  async cancelTicket(ticketId: string, userId: string): Promise<void> {
    const ticket = await this.getTicket(ticketId);
    
    if (ticket.userId !== userId) {
      throw new Error('Unauthorized');
    }
    
    if (ticket.status !== TicketStatus.CONFIRMED) {
      throw new Error('Cannot cancel this ticket');
    }
    
    // Rembourser via Stripe
    if (ticket.paymentIntentId) {
      await stripe.refunds.create({
        payment_intent: ticket.paymentIntentId
      });
    }
    
    // Mettre à jour le statut
    await collections.tickets.doc(ticketId).update({
      status: TicketStatus.CANCELLED
    });
    
    // Remettre les billets disponibles
    await this.updateTicketAvailability(
      ticket.eventId,
      ticket.ticketType.id,
      ticket.quantity
    );
  }

  private async getEvent(eventId: string) {
    const doc = await collections.events.doc(eventId).get();
    if (!doc.exists) throw new Error('Event not found');
    return { id: doc.id, ...doc.data() };
  }

  private async getTicket(ticketId: string) {
    const doc = await collections.tickets.doc(ticketId).get();
    if (!doc.exists) throw new Error('Ticket not found');
    return { id: doc.id, ...doc.data() } as Ticket;
  }

  private async updateTicketAvailability(
    eventId: string,
    ticketTypeId: string,
    delta: number
  ) {
    // Utiliser une transaction pour éviter les race conditions
    const eventRef = collections.events.doc(eventId);
    
    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      const event = eventDoc.data();
      
      const ticketTypes = event.ticketTypes.map(t => 
        t.id === ticketTypeId 
          ? { ...t, available: t.available + delta }
          : t
      );
      
      transaction.update(eventRef, { ticketTypes });
    });
  }

  private async sendConfirmationEmail(ticket: Ticket) {
    // Implémenter l'envoi d'email
    // Utiliser le service de notification existant
  }
}

export const ticketsService = new TicketsService();
```

---

## 3. API DE STATISTIQUES

### 3.1 Endpoints

#### GET /api/v1/analytics/dashboard
**Description**: Statistiques du dashboard utilisateur

**Response**:
```json
{
  "success": true,
  "data": {
    "eventsCreated": 12,
    "upcomingEvents": 5,
    "totalParticipants": 1247,
    "totalRevenue": 15420.50,
    "trends": {
      "eventsGrowth": 15.2,
      "participantsGrowth": 23.5,
      "revenueGrowth": 18.7
    }
  }
}
```

#### GET /api/v1/analytics/events/:id/stats
**Description**: Statistiques détaillées d'un événement

**Response**:
```json
{
  "success": true,
  "data": {
    "eventId": "event123",
    "views": 1542,
    "registrations": 245,
    "conversionRate": 15.9,
    "revenue": 6125.00,
    "ticketsSold": {
      "VIP": 45,
      "Standard": 150,
      "Early Bird": 50
    },
    "demographics": {...},
    "timeline": [...]
  }
}
```

---

## 4. API DE REVIEWS

### 4.1 Types
```typescript
export interface Review {
  id: string;
  eventId: string;
  userId: string;
  rating: number; // 1-5
  comment: string;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
  helpful: number;
  reported: boolean;
}
```

### 4.2 Endpoints

#### POST /api/v1/events/:id/reviews
**Body**:
```json
{
  "rating": 5,
  "comment": "Excellent événement!",
  "photos": ["url1", "url2"]
}
```

#### GET /api/v1/events/:id/reviews
**Query**: `?page=1&limit=10&sort=recent`

---

## 5. MODÈLES DE DONNÉES FIRESTORE

### Collection: events
```typescript
{
  id: string
  title: string
  slug: string
  description: string
  category: string
  tags: string[]
  coverImage: string
  startDate: Timestamp
  endDate: Timestamp
  location: {
    type: 'physical' | 'online'
    venue?: string
    address?: string
    city?: string
    country?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    onlineUrl?: string
  }
  ticketTypes: TicketType[]
  capacity: {
    total: number
    registered: number
    available: number
  }
  pricing: {
    type: 'free' | 'paid'
    amount?: number
    currency?: string
  }
  organizerId: string
  tenantId: string
  status: 'draft' | 'published' | 'cancelled'
  isPublic: boolean
  featured: boolean
  rating: {
    average: number
    count: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: tickets
```typescript
{
  id: string
  eventId: string
  userId: string
  tenantId: string
  ticketType: TicketType
  quantity: number
  totalAmount: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'used' | 'refunded'
  qrCode: string
  purchaseDate: Timestamp
  paymentIntentId?: string
  usedAt?: Timestamp
  metadata?: Record<string, any>
}
```

### Collection: reviews
```typescript
{
  id: string
  eventId: string
  userId: string
  rating: number
  comment: string
  photos: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  helpful: number
  reported: boolean
}
```

### Collection: favorites
```typescript
{
  id: string
  userId: string
  eventId: string
  createdAt: Timestamp
}
```

---

## 6. INTÉGRATIONS EXTERNES

### 6.1 Stripe
- **Package**: `stripe`
- **Configuration**: `STRIPE_SECRET_KEY` dans `.env`
- **Webhooks**: `/api/v1/webhooks/stripe`

### 6.2 Google Maps
- **Package**: `@googlemaps/google-maps-services-js`
- **Configuration**: `GOOGLE_MAPS_API_KEY` dans `.env`
- **Services**: Geocoding, Distance Matrix

### 6.3 SendGrid (Emails)
- **Package**: `@sendgrid/mail`
- **Configuration**: `SENDGRID_API_KEY` dans `.env`
- **Templates**: Confirmation, Rappels, Annulation

---

## 7. SÉCURITÉ ET VALIDATION

### 7.1 Middleware Chain
```typescript
router.use(
  smartRateLimit,
  authMiddleware,
  tenantContextMiddleware,
  permissionMiddleware
);
```

### 7.2 Validation des Données
- Utiliser Joi ou Zod pour validation
- Valider tous les inputs utilisateur
- Sanitiser les données avant insertion

### 7.3 Gestion des Erreurs
- Classes d'erreur personnalisées
- Logging structuré
- Réponses d'erreur standardisées

---

**Prochaine étape**: Implémenter l'API de localisation
