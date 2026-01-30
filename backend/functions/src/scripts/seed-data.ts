/**
 * Script de seed pour Firestore
 * À exécuter via une Cloud Function HTTP temporaire
 */

import { Request, Response } from 'express';
import { collections } from '../config/database';
import { Timestamp } from 'firebase-admin/firestore';

export const seedDatabase = async (req: Request, res: Response) => {
  try {
    console.log('🚀 Démarrage du seed...');

    // Vérifier le secret pour sécuriser l'endpoint
    const secret = req.query.secret || req.headers['x-seed-secret'];
    if (secret !== 'seed-attendancex-2026') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const events = [
      {
        title: "Tech Conference Paris 2026",
        slug: "tech-conference-paris-2026",
        description: "La plus grande conférence technologique de l'année",
        shortDescription: "La plus grande conférence tech à Paris",
        visibility: "public",
        status: "published",
        category: "tech",
        location: {
          type: "physical",
          city: "Paris",
          country: "France",
          venue: "Palais des Congrès"
        },
        pricing: { type: "paid", amount: 299, currency: "EUR" },
        capacity: { total: 500, available: 500, registered: 0 },
        rating: { average: 4.5, count: 120 },
        featured: true,
        tags: ["tech", "conference", "ai"],
        images: [],
        coverImage: "",
        organizerId: "org-tech-events",
        organizerName: "Tech Events Paris",
        organizerSlug: "tech-events-paris",
        organizerRating: 4.8,
        seo: {
          metaTitle: "Tech Conference Paris 2026",
          metaDescription: "La plus grande conférence tech",
          keywords: ["tech"],
          ogImage: ""
        },
        startDate: Timestamp.fromDate(new Date("2026-06-15T09:00:00Z")),
        endDate: Timestamp.fromDate(new Date("2026-06-17T18:00:00Z")),
        timezone: "Europe/Paris",
        publishedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        title: "Business Summit London 2026",
        slug: "business-summit-london-2026",
        description: "Annual business summit",
        shortDescription: "Connect with business leaders",
        visibility: "public",
        status: "published",
        category: "business",
        location: {
          type: "physical",
          city: "London",
          country: "United Kingdom"
        },
        pricing: { type: "paid", amount: 450, currency: "GBP" },
        capacity: { total: 800, available: 650, registered: 150 },
        rating: { average: 4.7, count: 89 },
        featured: true,
        tags: ["business", "summit"],
        images: [],
        coverImage: "",
        organizerId: "org-business-uk",
        organizerName: "Business Events UK",
        organizerSlug: "business-events-uk",
        organizerRating: 4.6,
        seo: {
          metaTitle: "Business Summit London 2026",
          metaDescription: "Connect with business leaders",
          keywords: ["business"],
          ogImage: ""
        },
        startDate: Timestamp.fromDate(new Date("2026-07-10T08:00:00Z")),
        endDate: Timestamp.fromDate(new Date("2026-07-12T17:00:00Z")),
        timezone: "Europe/London",
        publishedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        title: "Free Yoga in the Park",
        slug: "free-yoga-madrid-2026",
        description: "Relaxing outdoor yoga session",
        shortDescription: "Free outdoor yoga",
        visibility: "public",
        status: "published",
        category: "health",
        location: {
          type: "physical",
          city: "Madrid",
          country: "Spain"
        },
        pricing: { type: "free" },
        capacity: { total: 50, available: 30, registered: 20 },
        rating: { average: 4.8, count: 67 },
        featured: false,
        tags: ["health", "yoga", "free"],
        images: [],
        coverImage: "",
        organizerId: "org-wellness",
        organizerName: "Wellness Madrid",
        organizerSlug: "wellness-madrid",
        organizerRating: 4.7,
        seo: {
          metaTitle: "Free Yoga",
          metaDescription: "Free outdoor yoga",
          keywords: ["yoga"],
          ogImage: ""
        },
        startDate: Timestamp.fromDate(new Date("2026-06-20T08:00:00Z")),
        endDate: Timestamp.fromDate(new Date("2026-06-20T09:30:00Z")),
        timezone: "Europe/Madrid",
        publishedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];

    // Créer les événements
    const createdEvents = [];
    for (const event of events) {
      const docRef = collections.events.doc();
      await docRef.set(event);
      createdEvents.push({ id: docRef.id, title: event.title });
      console.log(`✅ Created: ${event.title}`);
    }

    // Vérifier
    const publicEvents = await collections.events
      .where('visibility', '==', 'public')
      .where('status', '==', 'published')
      .get();

    res.json({
      success: true,
      message: 'Database seeded successfully',
      created: createdEvents.length,
      publicEventsCount: publicEvents.size,
      events: createdEvents
    });

  } catch (error: any) {
    console.error('❌ Seed error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
