/**
 * Mock data for E2E tests
 */

export const mockEvents = [
  {
    id: 'evt_001',
    slug: 'tech-conference-2026-paris',
    title: 'Tech Conference 2026',
    description: 'Join us for the biggest tech conference of 2026 in Paris. Learn from industry leaders about AI, Cloud Computing, and Cybersecurity.',
    shortDescription: 'The biggest tech conference of 2026',
    coverImage: '/placeholder-event.jpg',
    images: [],
    organizerId: 'org_001',
    organizerName: 'TechOrg',
    organizerSlug: 'techorg',
    organizerRating: 4.8,
    startDate: '2026-02-15T09:00:00Z',
    endDate: '2026-02-15T18:00:00Z',
    timezone: 'Europe/Paris',
    location: {
      type: 'physical' as const,
      venue: 'Paris Convention Center',
      address: '123 Rue de Paris',
      city: 'Paris',
      country: 'France',
      coordinates: {
        lat: 48.8566,
        lng: 2.3522,
      },
    },
    category: 'tech',
    tags: ['ai', 'cloud', 'cybersecurity'],
    pricing: {
      type: 'paid' as const,
      amount: 50,
      currency: 'EUR',
    },
    capacity: {
      total: 300,
      available: 50,
      registered: 250,
    },
    rating: {
      average: 4.8,
      count: 120,
    },
    visibility: 'public' as const,
    featured: true,
    seo: {
      metaTitle: 'Tech Conference 2026 - Paris',
      metaDescription: 'Join us for the biggest tech conference of 2026',
      keywords: ['tech', 'conference', 'ai', 'paris'],
      ogImage: '/placeholder-event.jpg',
    },
    publishedAt: '2026-01-01T00:00:00Z',
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'evt_002',
    slug: 'marketing-workshop-online',
    title: 'Marketing Workshop',
    description: 'Learn the latest marketing strategies and techniques in this comprehensive online workshop.',
    shortDescription: 'Master modern marketing strategies',
    coverImage: '/placeholder-event.jpg',
    images: [],
    organizerId: 'org_002',
    organizerName: 'MarketingPro',
    organizerSlug: 'marketingpro',
    organizerRating: 4.5,
    startDate: '2026-02-20T14:00:00Z',
    endDate: '2026-02-20T17:00:00Z',
    timezone: 'UTC',
    location: {
      type: 'online' as const,
      city: 'Online',
      country: 'Global',
    },
    category: 'business',
    tags: ['marketing', 'digital', 'strategy'],
    pricing: {
      type: 'free' as const,
    },
    capacity: {
      total: 500,
      available: 200,
      registered: 300,
    },
    rating: {
      average: 4.2,
      count: 85,
    },
    visibility: 'public' as const,
    featured: false,
    seo: {
      metaTitle: 'Marketing Workshop - Online',
      metaDescription: 'Learn the latest marketing strategies',
      keywords: ['marketing', 'workshop', 'online'],
      ogImage: '/placeholder-event.jpg',
    },
    publishedAt: '2026-01-05T00:00:00Z',
    createdAt: '2025-12-15T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
];

export const mockOrganizer = {
  id: 'org_001',
  slug: 'techorg',
  name: 'TechOrg',
  avatar: '/placeholder-avatar.jpg',
  coverImage: '/placeholder-cover.jpg',
  bio: 'Leading tech event organizer in Europe. We organize conferences, workshops, and meetups for tech professionals.',
  location: {
    city: 'Paris',
    country: 'France',
  },
  website: 'https://techorg.com',
  social: {
    facebook: 'https://facebook.com/techorg',
    twitter: 'https://twitter.com/techorg',
    linkedin: 'https://linkedin.com/company/techorg',
  },
  stats: {
    totalEvents: 50,
    upcomingEvents: 12,
    totalAttendees: 10000,
    rating: 4.9,
    reviewCount: 250,
  },
  verified: true,
  createdAt: '2020-01-01T00:00:00Z',
};

export const mockCategories = [
  { id: 'tech', name: 'Technology', slug: 'tech', count: 150, icon: '💻' },
  { id: 'business', name: 'Business', slug: 'business', count: 120, icon: '💼' },
  { id: 'education', name: 'Education', slug: 'education', count: 80, icon: '📚' },
  { id: 'arts', name: 'Arts & Culture', slug: 'arts', count: 60, icon: '🎨' },
];

export const mockLocations = [
  { city: 'Paris', country: 'France', count: 85 },
  { city: 'London', country: 'United Kingdom', count: 72 },
  { city: 'Berlin', country: 'Germany', count: 65 },
  { city: 'Madrid', country: 'Spain', count: 45 },
];
