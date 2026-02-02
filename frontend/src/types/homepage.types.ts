/**
 * Homepage Types - AttendanceX
 * 
 * Type definitions for the homepage redesign with Evelya style.
 * These types support the vibrant, playful design with comprehensive data models.
 */

import { LucideIcon } from 'lucide-react';

// ============================================
// MAIN HOMEPAGE DATA
// ============================================

export interface HomepageData {
  hero: HeroContent;
  categories: EventCategory[];
  featuredInstitutions: Institution[];
  featuredOrganizers: Organizer[];
  becomeOrganizerCTA: CTAContent;
  instagramPhotos: InstagramPhoto[];
}

// ============================================
// HERO SECTION
// ============================================

export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  backgroundIllustrations: string[]; // SVG paths or URLs
}

// ============================================
// EVENT CATEGORIES
// ============================================

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon name
  color: string; // Hex color
  gradient: string; // Tailwind gradient classes
  bgColor: string; // Tailwind background class
  eventCount: number;
}

export const CategoryColors = {
  academic: {
    color: '#8B5CF6', // Lilac purple
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  party: {
    color: '#FF6B6B', // Coral pink
    gradient: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-50 dark:bg-pink-950/50',
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
  sports: {
    color: '#06B6D4', // Bright cyan
    gradient: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  cocktail: {
    color: '#FFD93D', // Lemon yellow
    gradient: 'from-yellow-400 to-orange-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  music: {
    color: '#FF8C42', // Papaya orange
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  conference: {
    color: '#10B981', // Mint green
    gradient: 'from-green-500 to-teal-500',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
    iconColor: 'text-green-600 dark:text-green-400',
  },
} as const;

export type CategoryType = keyof typeof CategoryColors;

// ============================================
// INSTITUTIONS
// ============================================

export interface Institution {
  id: string;
  name: string;
  slug: string;
  logo: string; // URL
  description: string;
  eventCount: number;
  location: {
    city: string;
    country: string;
  };
  verified: boolean;
}

// ============================================
// ORGANIZERS
// ============================================

export interface Organizer {
  id: string;
  name: string;
  slug: string;
  avatar: string; // URL
  role: string;
  bio: string;
  eventCount: number;
  verified: boolean;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

// ============================================
// CTA SECTION
// ============================================

export interface CTAContent {
  title: string;
  subtitle: string;
  benefits: string[];
  ctaText: string;
  ctaHref: string;
  teamMembers: TeamMember[];
  backgroundImage?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  photo: string; // URL
}

// ============================================
// INSTAGRAM INTEGRATION
// ============================================

export interface InstagramPhoto {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  link: string;
  alt: string;
  timestamp: Date;
}

// ============================================
// LOCATION
// ============================================

export interface Location {
  city: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================
// CALENDAR
// ============================================

export interface CalendarEvent {
  date: Date;
  eventCount: number;
  events: EventPreview[];
}

export interface EventPreview {
  id: string;
  title: string;
  startDate: Date;
  category: string;
  location: string;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  locale: 'fr' | 'en';
}

export interface CategoryCardProps {
  category: EventCategory;
  onClick: (categoryId: string) => void;
}

export interface CategoryGridProps {
  categories: EventCategory[];
  onCategoryClick: (categoryId: string) => void;
}

export interface LocationSearchProps {
  onLocationChange: (location: Location) => void;
  initialLocation?: Location;
}

export interface CalendarWidgetProps {
  onDateSelect: (date: Date) => void;
  eventsMap: Map<string, number>; // date string -> event count
  locale: 'fr' | 'en';
}

export interface InstitutionsCarouselProps {
  institutions: Institution[];
  onInstitutionClick: (institutionId: string) => void;
}

export interface OrganizersCarouselProps {
  organizers: Organizer[];
  onOrganizerClick: (organizerId: string) => void;
}

export interface BecomeOrganizerCTAProps {
  title: string;
  benefits: string[];
  ctaText: string;
  ctaHref: string;
  teamMembers: TeamMember[];
}

export interface RichFooterProps {
  locale: 'fr' | 'en';
  instagramPhotos: InstagramPhoto[];
  onNewsletterSubmit: (email: string) => Promise<void>;
}

export interface FixedHeaderProps {
  locale: 'fr' | 'en';
  isAuthenticated: boolean;
  onLanguageChange: (locale: 'fr' | 'en') => void;
}

// ============================================
// STATE MANAGEMENT
// ============================================

export interface HomepageContextValue {
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  locale: 'fr' | 'en';
  setLocale: (locale: 'fr' | 'en') => void;
}

// ============================================
// GEOLOCATION
// ============================================

export enum GeolocationErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

export interface GeolocationState {
  location: Location | null;
  error: GeolocationError | null;
  isLoading: boolean;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isValidLocation(location: any): location is Location {
  return (
    typeof location === 'object' &&
    location !== null &&
    typeof location.city === 'string' &&
    typeof location.country === 'string' &&
    typeof location.countryCode === 'string' &&
    location.city.length > 0 &&
    location.country.length > 0 &&
    location.countryCode.length === 2
  );
}

export function isValidEventCategory(category: any): category is EventCategory {
  return (
    typeof category === 'object' &&
    category !== null &&
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.slug === 'string' &&
    typeof category.icon === 'string' &&
    typeof category.color === 'string' &&
    typeof category.gradient === 'string' &&
    typeof category.bgColor === 'string' &&
    typeof category.eventCount === 'number'
  );
}

export function isValidInstitution(institution: any): institution is Institution {
  return (
    typeof institution === 'object' &&
    institution !== null &&
    typeof institution.id === 'string' &&
    typeof institution.name === 'string' &&
    typeof institution.slug === 'string' &&
    typeof institution.logo === 'string' &&
    typeof institution.description === 'string' &&
    typeof institution.eventCount === 'number' &&
    typeof institution.verified === 'boolean' &&
    typeof institution.location === 'object' &&
    typeof institution.location.city === 'string' &&
    typeof institution.location.country === 'string'
  );
}

export function isValidOrganizer(organizer: any): organizer is Organizer {
  return (
    typeof organizer === 'object' &&
    organizer !== null &&
    typeof organizer.id === 'string' &&
    typeof organizer.name === 'string' &&
    typeof organizer.slug === 'string' &&
    typeof organizer.avatar === 'string' &&
    typeof organizer.role === 'string' &&
    typeof organizer.bio === 'string' &&
    typeof organizer.eventCount === 'number' &&
    typeof organizer.verified === 'boolean'
  );
}

// ============================================
// VALIDATORS
// ============================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// ============================================
// UTILITY TYPES
// ============================================

export type Locale = 'fr' | 'en';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

// ============================================
// CONSTANTS
// ============================================

export const DEFAULT_LOCALE: Locale = 'fr';

export const SUPPORTED_LOCALES: Locale[] = ['fr', 'en'];

export const DEFAULT_PAGINATION_LIMIT = 12;

export const CALENDAR_MONTHS = 12;

export const CALENDAR_DAYS_IN_WEEK = 7;

export const GEOLOCATION_TIMEOUT = 10000; // 10 seconds

export const API_TIMEOUT = 10000; // 10 seconds

export const DEBOUNCE_DELAY = 300; // 300ms for search inputs

export const THROTTLE_DELAY = 100; // 100ms for scroll events
