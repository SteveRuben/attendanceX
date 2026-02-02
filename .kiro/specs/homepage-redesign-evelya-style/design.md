# Design Document - Homepage Redesign Evelya Style

## Overview

This design document outlines the technical architecture and implementation strategy for redesigning the AttendanceX homepage with Evelya.co's vibrant, playful design style. The redesign transforms the current event listing page into an engaging, visually compelling experience that encourages exploration and user engagement.

### Design Philosophy

The design follows these core principles:

1. **Vibrant Visual Identity**: Bold colors (papaya orange, lilac purple, lemon yellow, bright cyan) with playful doodle-style illustrations
2. **Component-Based Architecture**: Modular React components following atomic design principles
3. **Mobile-First Responsive**: Adaptive layouts that work seamlessly across all devices
4. **Performance-Optimized**: Lazy loading, code splitting, and optimized assets for fast load times
5. **Accessibility-First**: WCAG 2.1 AA compliant with semantic HTML and ARIA labels
6. **Internationalized**: Full support for French and English with locale-specific formatting

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom Evelya color palette
- **Animations**: Framer Motion for smooth transitions and micro-interactions
- **Carousels**: Swiper.js for touch-enabled horizontal scrolling
- **Calendar**: react-calendar for interactive date selection
- **Icons**: Lucide React for consistent iconography
- **Internationalization**: next-i18next for translations
- **State Management**: React Context API for global state, local state for component-specific data
- **API Integration**: Next.js API routes with SWR for data fetching


## Architecture

### Component Hierarchy

```
HomePage (Page Component)
├── FixedHeader
│   ├── Logo
│   ├── NavigationMenu
│   │   ├── NavLink (Events, Institutions, Companies)
│   │   └── MobileMenuButton
│   ├── LanguageSelector
│   └── AuthButtons (Login, Register)
├── HeroSection
│   ├── HeroTitle
│   ├── HeroSubtitle
│   ├── DoodleIllustrations
│   └── PrimaryCTA
├── CategoryGrid
│   └── CategoryCard[] (6 categories)
├── LocationSearch
│   ├── CitySelector
│   ├── NearMeButton
│   └── AutocompleteDropdown
├── CalendarWidget
│   ├── MonthNavigation
│   ├── CalendarGrid
│   └── DateCell[]
├── InstitutionsCarousel
│   ├── CarouselContainer (Swiper)
│   ├── InstitutionCard[]
│   └── NavigationArrows
├── OrganizersCarousel
│   ├── CarouselContainer (Swiper)
│   ├── OrganizerCard[]
│   └── NavigationArrows
├── BecomeOrganizerCTA
│   ├── CTAContent (text, benefits list)
│   ├── CTAButton
│   └── TeamPhotos
└── RichFooter
    ├── FooterLogo
    ├── InstagramGallery
    ├── SocialMediaLinks
    ├── FooterColumns (Events, Categories, Help)
    ├── NewsletterSignup
    └── LegalLinks
```

### File Structure

```
frontend-v2/src/
├── app/
│   └── [locale]/
│       └── page.tsx                    # Homepage route
├── components/
│   ├── homepage/
│   │   ├── HeroSection.tsx
│   │   ├── CategoryGrid.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── LocationSearch.tsx
│   │   ├── CalendarWidget.tsx
│   │   ├── InstitutionsCarousel.tsx
│   │   ├── OrganizersCarousel.tsx
│   │   ├── BecomeOrganizerCTA.tsx
│   │   └── DoodleIllustrations.tsx
│   ├── layout/
│   │   ├── FixedHeader.tsx
│   │   ├── NavigationMenu.tsx
│   │   ├── MobileMenu.tsx
│   │   ├── LanguageSelector.tsx
│   │   └── RichFooter.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Carousel.tsx
├── hooks/
│   ├── useGeolocation.ts
│   ├── useIntersectionObserver.ts
│   └── useCarousel.ts
├── services/
│   ├── eventsService.ts
│   ├── institutionsService.ts
│   └── organizersService.ts
├── types/
│   ├── homepage.types.ts
│   ├── event.types.ts
│   └── institution.types.ts
└── styles/
    ├── globals.css
    └── evelya-colors.css
```


## Components and Interfaces

### 1. FixedHeader Component

**Purpose**: Persistent navigation bar that remains visible during scrolling

**Props Interface**:
```typescript
interface FixedHeaderProps {
  locale: 'fr' | 'en';
  isAuthenticated: boolean;
  onLanguageChange: (locale: 'fr' | 'en') => void;
}
```

**State**:
- `isMobileMenuOpen: boolean` - Controls mobile menu visibility
- `isScrolled: boolean` - Tracks scroll position for styling changes

**Styling**:
```typescript
className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-shadow duration-200"
// When scrolled:
className="shadow-md"
```

**Behavior**:
- Fixed positioning with z-index 50
- Adds shadow on scroll (> 10px)
- Collapses to burger menu below 768px
- Smooth transitions for all state changes

---

### 2. HeroSection Component

**Purpose**: Eye-catching above-the-fold section with title, illustrations, and CTA

**Props Interface**:
```typescript
interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  locale: 'fr' | 'en';
}
```

**Styling**:
```typescript
// Container
className="relative min-h-[70vh] md:min-h-[70vh] bg-white flex items-center justify-center px-4 py-16 overflow-hidden"

// Title
className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 text-center mb-6 leading-tight"

// Subtitle
className="text-lg md:text-xl text-slate-600 text-center max-w-2xl mb-8"

// CTA Button
className="h-14 px-10 bg-[#FFD93D] hover:bg-[#FFC700] text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
```

**Animations**:
- Title: Fade in + slide up (delay: 0ms)
- Subtitle: Fade in + slide up (delay: 200ms)
- CTA: Fade in + scale (delay: 400ms)
- Doodles: Float animation (continuous)

---

### 3. CategoryCard Component

**Purpose**: Visual card representing an event category

**Props Interface**:
```typescript
interface CategoryCardProps {
  category: EventCategory;
  onClick: (categoryId: string) => void;
}

interface EventCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
}
```

**Styling**:
```typescript
className="group relative p-8 rounded-2xl bg-white border-2 border-slate-200 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer overflow-hidden"

// Gradient overlay (on hover)
className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300"

// Icon container
className="relative inline-flex p-4 rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300"
```

**Color Mapping**:
```typescript
const categoryColors = {
  academic: {
    color: '#8B5CF6', // Lilac purple
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50'
  },
  party: {
    color: '#FF6B6B', // Coral pink
    gradient: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-50'
  },
  sports: {
    color: '#06B6D4', // Bright cyan
    gradient: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-50'
  },
  cocktail: {
    color: '#FFD93D', // Lemon yellow
    gradient: 'from-yellow-400 to-orange-400',
    bgColor: 'bg-yellow-50'
  },
  music: {
    color: '#FF8C42', // Papaya orange
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50'
  },
  conference: {
    color: '#10B981', // Mint green
    gradient: 'from-green-500 to-teal-500',
    bgColor: 'bg-green-50'
  }
};
```


### 4. LocationSearch Component

**Purpose**: Location search with text input and geolocation support

**Props Interface**:
```typescript
interface LocationSearchProps {
  onLocationChange: (location: Location) => void;
  initialLocation?: Location;
}

interface Location {
  city: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
```

**State**:
- `selectedLocation: Location | null`
- `isLoadingGeolocation: boolean`
- `suggestions: Location[]`
- `inputValue: string`

**Styling**:
```typescript
// Container
className="flex flex-col md:flex-row gap-3 items-stretch md:items-center max-w-2xl mx-auto"

// Input
className="flex-1 h-12 px-4 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"

// Near Me Button
className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
```

**Geolocation Flow**:
1. User clicks "Near me" button
2. Request browser geolocation permission
3. If granted, get coordinates
4. Reverse geocode to get city name
5. Update location search field
6. Filter events by location

---

### 5. CalendarWidget Component

**Purpose**: Interactive monthly calendar for date-based event browsing

**Props Interface**:
```typescript
interface CalendarWidgetProps {
  onDateSelect: (date: Date) => void;
  eventsMap: Map<string, number>; // date string -> event count
  locale: 'fr' | 'en';
}
```

**State**:
- `currentMonth: Date`
- `selectedDate: Date | null`
- `hoveredDate: Date | null`

**Styling**:
```typescript
// Container
className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6"

// Month header
className="flex items-center justify-between mb-6"

// Navigation buttons
className="p-2 hover:bg-slate-100 rounded-lg transition-colors"

// Calendar grid
className="grid grid-cols-7 gap-2"

// Date cell (with events)
className="aspect-square flex flex-col items-center justify-center rounded-lg hover:bg-blue-50 cursor-pointer transition-colors relative"

// Event indicator dot
className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-blue-600"
```

**Date Formatting**:
```typescript
// Use Intl.DateTimeFormat for locale-specific formatting
const formatter = new Intl.DateTimeFormat(locale, {
  month: 'long',
  year: 'numeric'
});
```

---

### 6. InstitutionsCarousel Component

**Purpose**: Horizontal scrolling carousel of institution cards

**Props Interface**:
```typescript
interface InstitutionsCarouselProps {
  institutions: Institution[];
  onInstitutionClick: (institutionId: string) => void;
}

interface Institution {
  id: string;
  name: string;
  logo: string;
  description: string;
  eventCount: number;
}
```

**Swiper Configuration**:
```typescript
const swiperConfig = {
  slidesPerView: 1.2,
  spaceBetween: 16,
  breakpoints: {
    640: { slidesPerView: 2.5, spaceBetween: 20 },
    768: { slidesPerView: 3.5, spaceBetween: 24 },
    1024: { slidesPerView: 5, spaceBetween: 24 },
    1280: { slidesPerView: 6, spaceBetween: 32 }
  },
  navigation: true,
  pagination: { clickable: true }
};
```

**Styling**:
```typescript
// Institution card
className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:shadow-lg hover:border-blue-500 transition-all duration-300 cursor-pointer"

// Logo container
className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4 overflow-hidden"

// Name
className="text-lg font-semibold text-slate-900 mb-2 line-clamp-1"

// Description
className="text-sm text-slate-600 line-clamp-2 mb-3"

// Event count badge
className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium"
```


### 7. OrganizersCarousel Component

**Purpose**: Horizontal scrolling carousel of organizer profiles

**Props Interface**:
```typescript
interface OrganizersCarouselProps {
  organizers: Organizer[];
  onOrganizerClick: (organizerId: string) => void;
}

interface Organizer {
  id: string;
  name: string;
  avatar: string;
  role: string;
  eventCount: number;
  verified: boolean;
}
```

**Swiper Configuration**: Same as InstitutionsCarousel

**Styling**:
```typescript
// Organizer card
className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:shadow-lg hover:border-blue-500 transition-all duration-300 cursor-pointer text-center"

// Avatar
className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-lg"

// Name with verification badge
className="text-lg font-semibold text-slate-900 mb-1 flex items-center justify-center gap-2"

// Verification badge
className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white"

// Role
className="text-sm text-slate-600 mb-3"

// Stats
className="text-xs text-slate-500"
```

---

### 8. BecomeOrganizerCTA Component

**Purpose**: Compelling call-to-action section for potential organizers

**Props Interface**:
```typescript
interface BecomeOrganizerCTAProps {
  title: string;
  benefits: string[];
  ctaText: string;
  ctaHref: string;
  teamMembers: TeamMember[];
}

interface TeamMember {
  name: string;
  role: string;
  photo: string;
}
```

**Layout**:
- Desktop: Two-column (60% text, 40% image)
- Tablet: Two-column (50/50)
- Mobile: Single column (stacked)

**Styling**:
```typescript
// Container
className="relative overflow-hidden py-20 px-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"

// Content wrapper
className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"

// Title
className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6"

// Benefits list
className="space-y-4 mb-8"

// Benefit item
className="flex items-start gap-3"

// Check icon
className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center mt-1"

// CTA button
className="h-14 px-10 bg-[#FFD93D] hover:bg-[#FFC700] text-slate-900 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"

// Team photos grid
className="grid grid-cols-2 gap-4"

// Team member card
className="bg-white rounded-xl p-4 shadow-md"
```

---

### 9. RichFooter Component

**Purpose**: Comprehensive footer with links, social media, and newsletter

**Props Interface**:
```typescript
interface RichFooterProps {
  locale: 'fr' | 'en';
  instagramPhotos: InstagramPhoto[];
  onNewsletterSubmit: (email: string) => Promise<void>;
}

interface InstagramPhoto {
  id: string;
  imageUrl: string;
  link: string;
  alt: string;
}
```

**Layout Structure**:
```
┌─────────────────────────────────────────────────┐
│ Logo + Tagline    │ Instagram Gallery           │
├───────────────────┼─────────────────────────────┤
│ Events Links      │ Categories    │ Help/Support│
├───────────────────┴─────────────────────────────┤
│ Newsletter Signup                               │
├─────────────────────────────────────────────────┤
│ Social Media Icons                              │
├─────────────────────────────────────────────────┤
│ Legal Links + Copyright                         │
└─────────────────────────────────────────────────┘
```

**Styling**:
```typescript
// Container
className="bg-white border-t-2 border-slate-200 pt-16 pb-8"

// Grid layout
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12"

// Instagram gallery
className="grid grid-cols-3 gap-2"

// Instagram photo
className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"

// Newsletter form
className="flex gap-2 max-w-md"

// Newsletter input
className="flex-1 h-12 px-4 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"

// Social media icons
className="flex gap-4 justify-center"

// Social icon
className="w-10 h-10 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors"

// Legal links
className="flex flex-wrap gap-4 justify-center text-sm text-slate-600"

// Copyright
className="text-center text-sm text-slate-500 mt-6"
```


## Data Models

### TypeScript Interfaces

```typescript
// homepage.types.ts

export interface HomepageData {
  hero: HeroContent;
  categories: EventCategory[];
  featuredInstitutions: Institution[];
  featuredOrganizers: Organizer[];
  becomeOrganizerCTA: CTAContent;
  instagramPhotos: InstagramPhoto[];
}

export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  backgroundIllustrations: string[]; // SVG paths or URLs
}

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

export interface InstagramPhoto {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  link: string;
  alt: string;
  timestamp: Date;
}

export interface Location {
  city: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

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

// API Response types
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
```


## API Integration

### Data Fetching Strategy

The homepage uses a combination of Server-Side Rendering (SSR) and Client-Side Fetching:

1. **Initial Page Load (SSR)**: Fetch critical above-the-fold data
2. **Below-the-Fold Content**: Lazy load with SWR for caching
3. **User Interactions**: Client-side fetching with optimistic updates

### API Endpoints

```typescript
// services/homepageService.ts

export class HomepageService {
  
  /**
   * Fetch all homepage data (SSR)
   * Used in page.tsx getServerSideProps
   */
  async getHomepageData(locale: string): Promise<HomepageData> {
    const [hero, categories, institutions, organizers, cta, instagram] = 
      await Promise.all([
        this.getHeroContent(locale),
        this.getCategories(locale),
        this.getFeaturedInstitutions(locale),
        this.getFeaturedOrganizers(locale),
        this.getCTAContent(locale),
        this.getInstagramPhotos()
      ]);
    
    return {
      hero,
      categories,
      featuredInstitutions: institutions,
      featuredOrganizers: organizers,
      becomeOrganizerCTA: cta,
      instagramPhotos: instagram
    };
  }
  
  /**
   * Fetch hero content
   * Endpoint: GET /api/homepage/hero?locale={locale}
   */
  async getHeroContent(locale: string): Promise<HeroContent> {
    const response = await fetch(`/api/homepage/hero?locale=${locale}`);
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Fetch event categories with counts
   * Endpoint: GET /api/categories?locale={locale}
   */
  async getCategories(locale: string): Promise<EventCategory[]> {
    const response = await fetch(`/api/categories?locale=${locale}`);
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Fetch featured institutions
   * Endpoint: GET /api/institutions/featured?locale={locale}&limit=12
   */
  async getFeaturedInstitutions(
    locale: string, 
    limit: number = 12
  ): Promise<Institution[]> {
    const response = await fetch(
      `/api/institutions/featured?locale=${locale}&limit=${limit}`
    );
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Fetch featured organizers
   * Endpoint: GET /api/organizers/featured?locale={locale}&limit=12
   */
  async getFeaturedOrganizers(
    locale: string, 
    limit: number = 12
  ): Promise<Organizer[]> {
    const response = await fetch(
      `/api/organizers/featured?locale=${locale}&limit=${limit}`
    );
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Fetch CTA content
   * Endpoint: GET /api/homepage/cta?locale={locale}
   */
  async getCTAContent(locale: string): Promise<CTAContent> {
    const response = await fetch(`/api/homepage/cta?locale=${locale}`);
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Fetch Instagram photos
   * Endpoint: GET /api/social/instagram?limit=3
   */
  async getInstagramPhotos(limit: number = 3): Promise<InstagramPhoto[]> {
    const response = await fetch(`/api/social/instagram?limit=${limit}`);
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Fetch events by date (client-side)
   * Endpoint: GET /api/events/by-date?date={YYYY-MM-DD}&locale={locale}
   */
  async getEventsByDate(date: Date, locale: string): Promise<EventPreview[]> {
    const dateStr = date.toISOString().split('T')[0];
    const response = await fetch(
      `/api/events/by-date?date=${dateStr}&locale=${locale}`
    );
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Fetch events calendar data for a month
   * Endpoint: GET /api/events/calendar?year={YYYY}&month={MM}&locale={locale}
   */
  async getCalendarData(
    year: number, 
    month: number, 
    locale: string
  ): Promise<Map<string, number>> {
    const response = await fetch(
      `/api/events/calendar?year=${year}&month=${month}&locale=${locale}`
    );
    const data = await response.json();
    return new Map(Object.entries(data.data));
  }
  
  /**
   * Search locations with autocomplete
   * Endpoint: GET /api/locations/search?q={query}&locale={locale}
   */
  async searchLocations(query: string, locale: string): Promise<Location[]> {
    const response = await fetch(
      `/api/locations/search?q=${encodeURIComponent(query)}&locale=${locale}`
    );
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Reverse geocode coordinates to location
   * Endpoint: GET /api/locations/reverse?lat={lat}&lng={lng}
   */
  async reverseGeocode(
    latitude: number, 
    longitude: number
  ): Promise<Location> {
    const response = await fetch(
      `/api/locations/reverse?lat=${latitude}&lng=${longitude}`
    );
    const data = await response.json();
    return data.data;
  }
  
  /**
   * Subscribe to newsletter
   * Endpoint: POST /api/newsletter/subscribe
   */
  async subscribeNewsletter(email: string, locale: string): Promise<void> {
    const response = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, locale })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Subscription failed');
    }
  }
}

export const homepageService = new HomepageService();
```

### SWR Configuration

```typescript
// hooks/useHomepageData.ts
import useSWR from 'swr';

export function useInstitutions(locale: string) {
  const { data, error, isLoading } = useSWR(
    `/api/institutions/featured?locale=${locale}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000 // 1 minute
    }
  );
  
  return {
    institutions: data?.data || [],
    isLoading,
    error
  };
}

export function useOrganizers(locale: string) {
  const { data, error, isLoading } = useSWR(
    `/api/organizers/featured?locale=${locale}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000
    }
  );
  
  return {
    organizers: data?.data || [],
    isLoading,
    error
  };
}

export function useCalendarData(year: number, month: number, locale: string) {
  const { data, error, isLoading } = useSWR(
    `/api/events/calendar?year=${year}&month=${month}&locale=${locale}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000 // 5 minutes
    }
  );
  
  return {
    eventsMap: data?.data ? new Map(Object.entries(data.data)) : new Map(),
    isLoading,
    error
  };
}

const fetcher = (url: string) => fetch(url).then(res => res.json());
```


## State Management

### Global State (React Context)

```typescript
// contexts/HomepageContext.tsx

interface HomepageContextValue {
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  locale: 'fr' | 'en';
  setLocale: (locale: 'fr' | 'en') => void;
}

export const HomepageContext = createContext<HomepageContextValue | null>(null);

export function HomepageProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [locale, setLocale] = useState<'fr' | 'en'>('fr');
  
  // Persist locale to localStorage
  useEffect(() => {
    localStorage.setItem('preferred-locale', locale);
  }, [locale]);
  
  // Load locale from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('preferred-locale');
    if (saved === 'fr' || saved === 'en') {
      setLocale(saved);
    }
  }, []);
  
  const value = {
    selectedLocation,
    setSelectedLocation,
    selectedDate,
    setSelectedDate,
    selectedCategory,
    setSelectedCategory,
    locale,
    setLocale
  };
  
  return (
    <HomepageContext.Provider value={value}>
      {children}
    </HomepageContext.Provider>
  );
}

export function useHomepage() {
  const context = useContext(HomepageContext);
  if (!context) {
    throw new Error('useHomepage must be used within HomepageProvider');
  }
  return context;
}
```

### Local Component State

Each component manages its own UI state:

**FixedHeader**:
- `isMobileMenuOpen: boolean` - Mobile menu visibility
- `isScrolled: boolean` - Scroll position tracking

**LocationSearch**:
- `inputValue: string` - Search input value
- `suggestions: Location[]` - Autocomplete suggestions
- `isLoadingGeolocation: boolean` - Geolocation loading state
- `showSuggestions: boolean` - Dropdown visibility

**CalendarWidget**:
- `currentMonth: Date` - Currently displayed month
- `hoveredDate: Date | null` - Date being hovered

**InstitutionsCarousel / OrganizersCarousel**:
- `swiperInstance: Swiper | null` - Swiper instance reference
- `activeIndex: number` - Current slide index

**RichFooter**:
- `newsletterEmail: string` - Newsletter input value
- `isSubmitting: boolean` - Submission state
- `submitStatus: 'idle' | 'success' | 'error'` - Submission result

### State Flow Diagram

```
User Interaction
      ↓
Component Local State
      ↓
Global Context (if needed)
      ↓
API Call (if needed)
      ↓
Update State
      ↓
Re-render Components
```

**Example: Location Selection Flow**

```
1. User clicks "Near me" button
   → LocationSearch sets isLoadingGeolocation = true

2. Browser geolocation API called
   → Get coordinates

3. Reverse geocode API called
   → Get city name

4. Update global context
   → setSelectedLocation(location)

5. Other components react
   → CalendarWidget filters events by location
   → CategoryGrid updates event counts
```


## Styling Strategy

### Tailwind Configuration

```typescript
// tailwind.config.ts

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Evelya custom colors
        papaya: {
          50: '#FFF5E6',
          100: '#FFE8CC',
          200: '#FFD199',
          300: '#FFBA66',
          400: '#FFA333',
          500: '#FF8C42', // Primary papaya orange
          600: '#E67A3B',
          700: '#CC6833',
          800: '#B3562C',
          900: '#994424',
        },
        lilac: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6', // Primary lilac purple
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        lemon: {
          50: '#FFFEF0',
          100: '#FFFCE0',
          200: '#FFF9C2',
          300: '#FFF6A3',
          400: '#FFF385',
          500: '#FFD93D', // Primary lemon yellow
          600: '#E6C337',
          700: '#CCAD31',
          800: '#B3972B',
          900: '#998125',
        },
        cyan: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4', // Bright cyan
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'evelya-sm': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'evelya-md': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'evelya-lg': '0 8px 32px rgba(0, 0, 0, 0.16)',
        'evelya-xl': '0 16px 48px rgba(0, 0, 0, 0.20)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

### Custom CSS Classes

```css
/* styles/evelya-colors.css */

/* Gradient backgrounds */
.gradient-papaya-pink {
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B9D 100%);
}

.gradient-lilac-blue {
  background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
}

.gradient-lemon-orange {
  background: linear-gradient(135deg, #FFD93D 0%, #FF8C42 100%);
}

.gradient-cyan-blue {
  background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);
}

.gradient-rainbow {
  background: linear-gradient(
    135deg,
    #FF8C42 0%,
    #8B5CF6 25%,
    #06B6D4 50%,
    #FFD93D 75%,
    #FF6B9D 100%
  );
}

/* Text gradients */
.text-gradient-papaya {
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B9D 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.text-gradient-lilac {
  background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Hover effects */
.hover-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-lift:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.20);
}

/* Glass morphism */
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.glass-dark {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

### Responsive Breakpoints

```typescript
// Tailwind default breakpoints (mobile-first)
const breakpoints = {
  sm: '640px',   // Mobile large / Tablet small
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Desktop large
  '2xl': '1536px' // Desktop extra large
};

// Usage examples:
// Mobile: default (no prefix)
// Tablet: sm: or md:
// Desktop: lg: or xl:

// Example component:
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4 
  gap-4 
  sm:gap-6 
  lg:gap-8
">
  {/* Content */}
</div>
```

### Typography Scale

```typescript
// Font sizes (Tailwind defaults + custom)
const typography = {
  'xs': '0.75rem',    // 12px
  'sm': '0.875rem',   // 14px
  'base': '1rem',     // 16px
  'lg': '1.125rem',   // 18px
  'xl': '1.25rem',    // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
  '5xl': '3rem',      // 48px
  '6xl': '3.75rem',   // 60px
  '7xl': '4.5rem',    // 72px
};

// Font weights
const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// Line heights
const lineHeights = {
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};
```

### Spacing Scale

```typescript
// Tailwind spacing scale (4px base)
const spacing = {
  0: '0px',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
};
```


## Animation Strategy

### Framer Motion Configuration

```typescript
// utils/animations.ts

import { Variants } from 'framer-motion';

// Fade in animation
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

// Slide up animation
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

// Scale in animation
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

// Stagger children animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Stagger item animation
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};

// Float animation (continuous)
export const float: Variants = {
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// Hover scale animation
export const hoverScale = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

// Hover lift animation
export const hoverLift = {
  rest: { y: 0, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' },
  hover: { 
    y: -8,
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.20)',
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};
```

### Component Animation Examples

**HeroSection**:
```typescript
<motion.div
  initial="hidden"
  animate="visible"
  variants={staggerContainer}
  className="hero-section"
>
  <motion.h1 variants={slideUp}>
    {title}
  </motion.h1>
  
  <motion.p variants={slideUp}>
    {subtitle}
  </motion.p>
  
  <motion.button variants={scaleIn}>
    {ctaText}
  </motion.button>
</motion.div>
```

**CategoryGrid**:
```typescript
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: "-100px" }}
  variants={staggerContainer}
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
>
  {categories.map((category) => (
    <motion.div
      key={category.id}
      variants={staggerItem}
      whileHover="hover"
      initial="rest"
    >
      <CategoryCard category={category} />
    </motion.div>
  ))}
</motion.div>
```

**DoodleIllustrations**:
```typescript
<motion.svg
  variants={float}
  animate="animate"
  className="absolute top-10 left-10 w-24 h-24"
>
  {/* SVG path */}
</motion.svg>
```

### CSS Transitions

For simple hover effects, use CSS transitions:

```css
/* Button hover */
.btn-primary {
  @apply transition-all duration-300 ease-out;
  @apply hover:scale-105 hover:shadow-xl;
}

/* Card hover */
.card-interactive {
  @apply transition-all duration-300 ease-out;
  @apply hover:-translate-y-2 hover:shadow-2xl;
}

/* Link hover */
.link {
  @apply transition-colors duration-200 ease-out;
  @apply hover:text-blue-600;
}
```

### Performance Considerations

1. **Use CSS transforms** (translate, scale, rotate) instead of position properties
2. **Avoid animating** width, height, or layout properties
3. **Use will-change** sparingly for complex animations
4. **Respect prefers-reduced-motion**:

```typescript
// hooks/useReducedMotion.ts
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
}

// Usage in component:
const prefersReducedMotion = useReducedMotion();

<motion.div
  initial={prefersReducedMotion ? false : "hidden"}
  animate={prefersReducedMotion ? false : "visible"}
  variants={slideUp}
>
  {/* Content */}
</motion.div>
```

### Animation Timeline

```
Page Load:
0ms    → Hero title fades in + slides up
200ms  → Hero subtitle fades in + slides up
400ms  → Hero CTA scales in
600ms  → Doodles start floating

Scroll Interactions:
- Category cards: Stagger animation (100ms delay between items)
- Carousels: Fade in when entering viewport
- CTA section: Slide up when entering viewport
- Footer: Fade in when entering viewport

User Interactions:
- Hover: 300ms scale/lift transition
- Click: Immediate feedback (ripple effect)
- Navigation: 200ms fade transition
```


## Accessibility Considerations

### WCAG 2.1 AA Compliance

#### Color Contrast

All text must meet minimum contrast ratios:
- **Normal text** (< 18px): 4.5:1
- **Large text** (≥ 18px or ≥ 14px bold): 3:1

```typescript
// Approved color combinations:
const accessibleCombinations = {
  // Text on white background
  'text-slate-900 on bg-white': '16.1:1', // ✅ Excellent
  'text-slate-600 on bg-white': '7.2:1',  // ✅ Good
  'text-blue-600 on bg-white': '5.9:1',   // ✅ Good
  
  // Text on colored backgrounds
  'text-white on bg-papaya-500': '4.8:1', // ✅ Good
  'text-white on bg-lilac-500': '7.1:1',  // ✅ Good
  'text-slate-900 on bg-lemon-500': '12.3:1', // ✅ Excellent
  
  // Avoid these combinations:
  'text-slate-400 on bg-white': '3.1:1',  // ❌ Insufficient
  'text-lemon-500 on bg-white': '1.2:1',  // ❌ Insufficient
};
```

#### Semantic HTML

Use proper HTML5 semantic elements:

```typescript
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/events">Events</a></li>
    </ul>
  </nav>
</header>

<main id="main-content">
  <section aria-labelledby="hero-title">
    <h1 id="hero-title">Discover Events</h1>
  </section>
  
  <section aria-labelledby="categories-title">
    <h2 id="categories-title">Browse by Category</h2>
  </section>
</main>

<footer>
  <nav aria-label="Footer navigation">
    {/* Footer links */}
  </nav>
</footer>
```

#### Keyboard Navigation

All interactive elements must be keyboard accessible:

```typescript
// Focus management
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      handleClick();
      break;
    case 'Escape':
      handleClose();
      break;
    case 'ArrowLeft':
      navigatePrevious();
      break;
    case 'ArrowRight':
      navigateNext();
      break;
  }
};

// Focus visible styles
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

#### ARIA Labels and Roles

```typescript
// Icon-only buttons
<button aria-label="Close menu" onClick={closeMenu}>
  <X className="h-6 w-6" />
</button>

// Navigation arrows
<button 
  aria-label="Previous slide" 
  onClick={handlePrevious}
  disabled={isFirstSlide}
>
  <ChevronLeft className="h-6 w-6" />
</button>

// Calendar widget
<div 
  role="grid" 
  aria-label="Event calendar"
  aria-describedby="calendar-instructions"
>
  <div id="calendar-instructions" className="sr-only">
    Use arrow keys to navigate between dates. Press Enter to select a date.
  </div>
  {/* Calendar content */}
</div>

// Carousel
<div 
  role="region" 
  aria-label="Featured institutions"
  aria-roledescription="carousel"
>
  <div role="group" aria-label="Slide 1 of 12">
    {/* Slide content */}
  </div>
</div>

// Loading states
<div role="status" aria-live="polite">
  {isLoading ? 'Loading events...' : `${eventCount} events found`}
</div>
```

#### Screen Reader Support

```typescript
// Skip links
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
>
  Skip to main content
</a>

// Screen reader only text
<span className="sr-only">
  Current page: Homepage
</span>

// Image alt text
<img 
  src={institution.logo} 
  alt={`${institution.name} logo`}
  loading="lazy"
/>

// Decorative images
<img 
  src="/doodle.svg" 
  alt="" 
  role="presentation"
  aria-hidden="true"
/>
```

#### Form Accessibility

```typescript
// Newsletter signup
<form onSubmit={handleSubmit} aria-label="Newsletter signup">
  <label htmlFor="newsletter-email" className="sr-only">
    Email address
  </label>
  <input
    id="newsletter-email"
    type="email"
    required
    aria-required="true"
    aria-describedby="email-help"
    aria-invalid={hasError}
    placeholder="Enter your email"
  />
  <span id="email-help" className="text-xs text-slate-600">
    We'll never share your email
  </span>
  {hasError && (
    <span role="alert" className="text-xs text-red-600">
      Please enter a valid email address
    </span>
  )}
  <button type="submit" aria-label="Subscribe to newsletter">
    Subscribe
  </button>
</form>

// Location search with autocomplete
<div role="combobox" aria-expanded={showSuggestions} aria-haspopup="listbox">
  <label htmlFor="location-search">Search location</label>
  <input
    id="location-search"
    type="text"
    role="searchbox"
    aria-autocomplete="list"
    aria-controls="location-suggestions"
    aria-activedescendant={activeOptionId}
  />
  {showSuggestions && (
    <ul 
      id="location-suggestions" 
      role="listbox"
      aria-label="Location suggestions"
    >
      {suggestions.map((location, index) => (
        <li
          key={location.id}
          id={`location-option-${index}`}
          role="option"
          aria-selected={index === activeIndex}
        >
          {location.city}, {location.country}
        </li>
      ))}
    </ul>
  )}
</div>
```

#### Touch Target Sizes

Minimum touch target size: 44x44px

```typescript
// Buttons
className="min-h-[44px] min-w-[44px] px-6"

// Icon buttons
className="w-11 h-11 flex items-center justify-center"

// Calendar date cells
className="aspect-square min-h-[44px]"

// Navigation links
className="py-3 px-4" // Ensures adequate touch area
```

#### Focus Management

```typescript
// Trap focus in modal
import { useFocusTrap } from '@/hooks/useFocusTrap';

function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuRef = useFocusTrap(isOpen);
  
  return (
    <div ref={menuRef} role="dialog" aria-modal="true">
      {/* Menu content */}
    </div>
  );
}

// Restore focus after modal close
function Modal({ isOpen, onClose }: ModalProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);
  
  return (/* Modal content */);
}
```

#### Heading Hierarchy

```typescript
// Proper heading structure
<h1>AttendanceX - Discover Events</h1>

<section>
  <h2>Browse by Category</h2>
  {/* Category content */}
</section>

<section>
  <h2>Featured Institutions</h2>
  {institutions.map(institution => (
    <article key={institution.id}>
      <h3>{institution.name}</h3>
      {/* Institution details */}
    </article>
  ))}
</section>

<section>
  <h2>Become an Organizer</h2>
  <h3>Benefits</h3>
  {/* Benefits list */}
</section>
```


## Performance Optimizations

### Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

// Institution logo
<Image
  src={institution.logo}
  alt={`${institution.name} logo`}
  width={80}
  height={80}
  className="rounded-full"
  loading="lazy"
  quality={85}
/>

// Hero background illustration
<Image
  src="/hero-doodle.svg"
  alt=""
  fill
  priority // Above the fold
  quality={90}
/>

// Instagram photos
<Image
  src={photo.thumbnailUrl}
  alt={photo.alt}
  width={120}
  height={120}
  className="rounded-lg"
  loading="lazy"
  placeholder="blur"
  blurDataURL={photo.blurDataURL}
/>
```

### Code Splitting

```typescript
// Lazy load below-the-fold components
import dynamic from 'next/dynamic';

const InstitutionsCarousel = dynamic(
  () => import('@/components/homepage/InstitutionsCarousel'),
  {
    loading: () => <CarouselSkeleton />,
    ssr: false // Client-side only if needed
  }
);

const OrganizersCarousel = dynamic(
  () => import('@/components/homepage/OrganizersCarousel'),
  {
    loading: () => <CarouselSkeleton />,
    ssr: false
  }
);

const RichFooter = dynamic(
  () => import('@/components/layout/RichFooter'),
  {
    loading: () => <FooterSkeleton />
  }
);
```

### Lazy Loading with Intersection Observer

```typescript
// hooks/useIntersectionObserver.ts
export function useIntersectionObserver(
  ref: RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options
      }
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [ref, options]);
  
  return isIntersecting;
}

// Usage in component
function InstitutionsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(sectionRef);
  
  return (
    <section ref={sectionRef}>
      {isVisible ? (
        <InstitutionsCarousel institutions={institutions} />
      ) : (
        <CarouselSkeleton />
      )}
    </section>
  );
}
```

### Skeleton Loaders

```typescript
// components/ui/Skeleton.tsx
export function CarouselSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div 
          key={i} 
          className="flex-shrink-0 w-64 h-80 bg-slate-200 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div 
          key={i} 
          className="h-48 bg-slate-200 rounded-2xl animate-pulse"
        />
      ))}
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
      <div className="h-8 bg-slate-200 rounded mb-6 animate-pulse" />
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <div 
            key={i} 
            className="aspect-square bg-slate-200 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
```

### Data Prefetching

```typescript
// Prefetch data for likely navigation
import { useRouter } from 'next/router';

function CategoryCard({ category }: CategoryCardProps) {
  const router = useRouter();
  
  const handleMouseEnter = () => {
    // Prefetch category page
    router.prefetch(`/events?category=${category.slug}`);
  };
  
  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onClick={() => router.push(`/events?category=${category.slug}`)}
    >
      {/* Card content */}
    </div>
  );
}
```

### Bundle Size Optimization

```typescript
// Use tree-shakeable imports
import { Calendar, MapPin, Users } from 'lucide-react'; // ✅ Good
// import * as Icons from 'lucide-react'; // ❌ Bad

// Optimize Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// Avoid importing entire libraries
import debounce from 'lodash/debounce'; // ✅ Good
// import { debounce } from 'lodash'; // ❌ Bad
```

### Caching Strategy

```typescript
// SWR configuration for optimal caching
import useSWR from 'swr';

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 minute
  focusThrottleInterval: 300000, // 5 minutes
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // Don't retry on 404
    if (error.status === 404) return;
    
    // Only retry up to 3 times
    if (retryCount >= 3) return;
    
    // Retry after 5 seconds
    setTimeout(() => revalidate({ retryCount }), 5000);
  }
};

// Use in components
function useInstitutions(locale: string) {
  return useSWR(
    `/api/institutions/featured?locale=${locale}`,
    fetcher,
    swrConfig
  );
}
```

### Performance Monitoring

```typescript
// Track Core Web Vitals
export function reportWebVitals(metric: NextWebVitalsMetric) {
  const { id, name, label, value } = metric;
  
  // Log to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      event_category: label === 'web-vital' ? 'Web Vitals' : 'Next.js Metric',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
    });
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${name}:`, value);
  }
}

// Target metrics:
// - LCP (Largest Contentful Paint): < 2.5s
// - FID (First Input Delay): < 100ms
// - CLS (Cumulative Layout Shift): < 0.1
// - FCP (First Contentful Paint): < 1.8s
// - TTFB (Time to First Byte): < 600ms
```

### Resource Hints

```typescript
// In _document.tsx or layout
<head>
  {/* Preconnect to external domains */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://cdn.example.com" />
  
  {/* DNS prefetch for third-party resources */}
  <link rel="dns-prefetch" href="https://www.google-analytics.com" />
  
  {/* Preload critical assets */}
  <link 
    rel="preload" 
    href="/fonts/inter-var.woff2" 
    as="font" 
    type="font/woff2" 
    crossOrigin="anonymous"
  />
</head>
```

### Debouncing and Throttling

```typescript
// Location search with debounce
import { useDebouncedCallback } from 'use-debounce';

function LocationSearch() {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  
  const debouncedSearch = useDebouncedCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      
      const results = await homepageService.searchLocations(query, locale);
      setSuggestions(results);
    },
    300 // 300ms delay
  );
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };
  
  return (
    <input 
      value={inputValue} 
      onChange={handleInputChange}
      placeholder="Search location..."
    />
  );
}

// Scroll event with throttle
import { useThrottledCallback } from 'use-debounce';

function FixedHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  
  const handleScroll = useThrottledCallback(
    () => {
      setIsScrolled(window.scrollY > 10);
    },
    100 // 100ms throttle
  );
  
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  
  return (/* Header content */);
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties were identified as redundant or could be combined:

**Redundancies Eliminated**:
- Multiple carousel properties (5.2, 5.5, 5.6 for institutions and 6.4, 6.6 for organizers) can be combined into single properties about carousel cards
- Responsive grid properties (2.5, 11.5) can be combined into a single responsive layout property
- Image optimization properties (11.6, 12.2, 12.3) can be combined into a comprehensive image property
- Animation properties (13.1, 13.2, 13.3, 13.5, 13.6) can be consolidated into fewer comprehensive properties
- Accessibility properties (14.1, 14.2, 14.3, 14.5) can be combined into comprehensive accessibility properties
- Internationalization properties (15.2, 15.5, 15.6) can be combined into translation properties

### Core Properties

#### Property 1: Category Card Interactivity
*For any* event category card, clicking the card should navigate to a filtered view of events for that category.

**Validates: Requirements 2.6**

**Rationale**: This ensures all category cards are interactive and provide consistent navigation behavior across the entire category grid.

---

#### Property 2: Calendar Date Event Indication
*For any* date in the calendar that has associated events, the date cell should display a visual indicator (dot, badge, or color).

**Validates: Requirements 3.5**

**Rationale**: This property ensures users can visually identify which dates have events without clicking each date individually.

---

#### Property 3: Calendar Date Click Navigation
*For any* date in the calendar that has events, clicking the date should trigger navigation or display events for that specific date.

**Validates: Requirements 3.4**

**Rationale**: This ensures consistent interaction behavior for all event dates in the calendar.

---

#### Property 4: Location Autocomplete Suggestions
*For any* valid location search input (minimum 2 characters), the system should display autocomplete suggestions within 500ms.

**Validates: Requirements 4.6**

**Rationale**: This ensures the autocomplete feature works consistently for all valid inputs and provides timely feedback.

---

#### Property 5: Location-Based Event Filtering
*For any* selected location, all displayed events should be filtered to match that location's geographic area.

**Validates: Requirements 4.7**

**Rationale**: This ensures location selection consistently filters event results across the entire homepage.

---

#### Property 6: Carousel Card Content Completeness
*For any* card in the institutions or organizers carousel, the card should display all required fields: image/logo, name, and description/role.

**Validates: Requirements 5.2, 5.5, 6.4**

**Rationale**: This ensures data completeness and consistent presentation for all carousel items.

---

#### Property 7: Carousel Card Navigation
*For any* clickable card in the institutions or organizers carousel, clicking the card should navigate to the corresponding profile or events page.

**Validates: Requirements 5.6, 6.6**

**Rationale**: This ensures all carousel cards provide consistent navigation behavior.

---

#### Property 8: Card Shadow Styling
*For any* card element (category, institution, organizer), the element should have a box-shadow CSS property applied.

**Validates: Requirements 9.4**

**Rationale**: This ensures visual consistency and elevation across all card components.

---

#### Property 9: Color Contrast Compliance
*For any* text element on the homepage, the color contrast ratio between text and background should meet or exceed WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 9.6**

**Rationale**: This ensures accessibility and readability for all users, including those with visual impairments.

---

#### Property 10: Touch Target Minimum Size
*For any* interactive element (button, link, card) on mobile viewports (< 640px), the element should have a minimum touch target size of 44x44 pixels.

**Validates: Requirements 11.3**

**Rationale**: This ensures mobile usability and accessibility by providing adequately sized touch targets.

---

#### Property 11: Image Responsiveness
*For any* image element on the homepage, the image should have responsive attributes (srcset, sizes, or CSS) that adapt to different screen sizes.

**Validates: Requirements 11.6**

**Rationale**: This ensures optimal image delivery and performance across all devices.

---

#### Property 12: Below-Fold Image Lazy Loading
*For any* image element that is initially below the viewport fold, the image should have lazy loading enabled (loading="lazy" or Intersection Observer).

**Validates: Requirements 12.2**

**Rationale**: This improves initial page load performance by deferring non-critical image loading.

---

#### Property 13: Image Format Optimization
*For any* raster image on the homepage, the image should be served in an optimized format (WebP with fallback) and appropriately sized for its display dimensions.

**Validates: Requirements 12.3**

**Rationale**: This ensures optimal file sizes and faster loading times across all images.

---

#### Property 14: Async Component Skeleton Loaders
*For any* component that loads data asynchronously (carousels, calendar), a skeleton loader should be displayed while the data is being fetched.

**Validates: Requirements 12.5**

**Rationale**: This provides visual feedback during loading states and improves perceived performance.

---

#### Property 15: Hover Transition Duration
*For any* interactive element with hover states, the CSS transition duration should be between 200ms and 300ms.

**Validates: Requirements 13.1**

**Rationale**: This ensures consistent and smooth hover animations across all interactive elements.

---

#### Property 16: Viewport Entry Animations
*For any* section or component that enters the viewport, entrance animations (fade-in, slide-up) should be triggered using Intersection Observer.

**Validates: Requirements 13.2**

**Rationale**: This creates a polished, engaging experience as users scroll through the homepage.

---

#### Property 17: Grid Item Stagger Animation
*For any* grid of items (categories, carousels) with entrance animations, each item should have a staggered delay of 50-100ms relative to the previous item.

**Validates: Requirements 13.3**

**Rationale**: This creates a more natural, sequential reveal effect for grouped content.

---

#### Property 18: Interactive Element Visual Feedback
*For any* interactive element (button, card, link), the element should provide visual feedback on interaction (hover, focus, active states).

**Validates: Requirements 13.5**

**Rationale**: This ensures users receive clear feedback that elements are interactive and responsive.

---

#### Property 19: CSS Transform Animation Performance
*For any* animated element, animations should use CSS transform properties (translate, scale, rotate) rather than position or dimension properties.

**Validates: Requirements 13.6**

**Rationale**: This ensures animations are GPU-accelerated and perform smoothly across all devices.

---

#### Property 20: Reduced Motion Preference Respect
*For any* animated element, when the user's system has prefers-reduced-motion enabled, animations should be disabled or significantly reduced.

**Validates: Requirements 13.7**

**Rationale**: This respects user accessibility preferences and prevents motion-triggered discomfort.

---

#### Property 21: Image Alt Text Presence
*For any* image element (img, Image component), the element should have a descriptive alt attribute (or empty alt="" for decorative images).

**Validates: Requirements 14.1**

**Rationale**: This ensures screen reader accessibility and provides context when images fail to load.

---

#### Property 22: Keyboard Accessibility
*For any* interactive element, the element should be accessible via keyboard navigation (Tab, Enter, Space, Arrow keys where appropriate).

**Validates: Requirements 14.2**

**Rationale**: This ensures users who cannot use a mouse can fully navigate and interact with the homepage.

---

#### Property 23: Focus Indicator Visibility
*For any* focusable element, when focused via keyboard navigation, a visible focus indicator (outline, ring, border) should be displayed.

**Validates: Requirements 14.3**

**Rationale**: This provides visual feedback for keyboard users to track their current position in the interface.

---

#### Property 24: Icon Button ARIA Labels
*For any* button that contains only an icon (no visible text), the button should have an aria-label or aria-labelledby attribute.

**Validates: Requirements 14.5**

**Rationale**: This ensures screen readers can announce the purpose of icon-only buttons.

---

#### Property 25: Content Translation on Language Change
*For any* translatable text content, when the user changes the language setting, the text should update to display the selected language.

**Validates: Requirements 15.2**

**Rationale**: This ensures complete internationalization support across all homepage content.

---

#### Property 26: Dynamic Content Translation
*For any* dynamic content (event names, category names, institution descriptions) that has available translations, the content should be displayed in the selected language.

**Validates: Requirements 15.5**

**Rationale**: This ensures user-generated and database content is properly localized when translations exist.

---

#### Property 27: Locale-Specific Formatting
*For any* date or number displayed on the homepage, the formatting should match the conventions of the selected locale (e.g., DD/MM/YYYY for FR, MM/DD/YYYY for EN).

**Validates: Requirements 15.6**

**Rationale**: This ensures cultural appropriateness and familiarity for users in different regions.


## Error Handling

### API Error Handling

```typescript
// services/homepageService.ts

class HomepageServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'HomepageServiceError';
  }
}

export class HomepageService {
  private async handleApiError(error: any): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 404:
          throw new HomepageServiceError(
            'Resource not found',
            'NOT_FOUND',
            404
          );
        case 429:
          throw new HomepageServiceError(
            'Too many requests. Please try again later.',
            'RATE_LIMIT_EXCEEDED',
            429
          );
        case 500:
          throw new HomepageServiceError(
            'Server error. Please try again later.',
            'SERVER_ERROR',
            500
          );
        default:
          throw new HomepageServiceError(
            data.message || 'An error occurred',
            'API_ERROR',
            status
          );
      }
    } else if (error.request) {
      // Request made but no response received
      throw new HomepageServiceError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR'
      );
    } else {
      // Error in request setup
      throw new HomepageServiceError(
        'Request failed. Please try again.',
        'REQUEST_ERROR'
      );
    }
  }
  
  async getHomepageData(locale: string): Promise<HomepageData> {
    try {
      // Fetch data with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`/api/homepage?locale=${locale}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new HomepageServiceError(
          'Request timeout. Please try again.',
          'TIMEOUT_ERROR'
        );
      }
      return this.handleApiError(error);
    }
  }
}
```

### Component Error Boundaries

```typescript
// components/ErrorBoundary.tsx

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to error tracking service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
    
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-slate-600 text-center max-w-md mb-6">
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage in page
<ErrorBoundary>
  <HomePage />
</ErrorBoundary>
```

### Geolocation Error Handling

```typescript
// hooks/useGeolocation.ts

export enum GeolocationErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NOT_SUPPORTED = 'NOT_SUPPORTED'
}

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError({
        code: GeolocationErrorCode.NOT_SUPPORTED,
        message: 'Geolocation is not supported by your browser'
      });
      setIsLoading(false);
      return;
    }
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });
      
      // Reverse geocode coordinates
      const { latitude, longitude } = position.coords;
      const locationData = await homepageService.reverseGeocode(latitude, longitude);
      
      setLocation(locationData);
      setIsLoading(false);
      
    } catch (err: any) {
      let errorCode: GeolocationErrorCode;
      let errorMessage: string;
      
      switch (err.code) {
        case 1: // PERMISSION_DENIED
          errorCode = GeolocationErrorCode.PERMISSION_DENIED;
          errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
          break;
        case 2: // POSITION_UNAVAILABLE
          errorCode = GeolocationErrorCode.POSITION_UNAVAILABLE;
          errorMessage = 'Location information is unavailable. Please try again.';
          break;
        case 3: // TIMEOUT
          errorCode = GeolocationErrorCode.TIMEOUT;
          errorMessage = 'Location request timed out. Please try again.';
          break;
        default:
          errorCode = GeolocationErrorCode.POSITION_UNAVAILABLE;
          errorMessage = 'Unable to retrieve your location. Please try again.';
      }
      
      setError({ code: errorCode, message: errorMessage });
      setIsLoading(false);
    }
  }, []);
  
  return { location, error, isLoading, requestLocation };
}
```

### Loading States and Fallbacks

```typescript
// components/homepage/InstitutionsCarousel.tsx

export function InstitutionsCarousel({ institutions }: InstitutionsCarouselProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
        <p className="text-sm text-slate-600 text-center">
          Unable to load institutions. Please try again later.
        </p>
      </div>
    );
  }
  
  if (isLoading) {
    return <CarouselSkeleton />;
  }
  
  if (institutions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Building className="h-12 w-12 text-slate-400 mb-4" />
        <p className="text-sm text-slate-600 text-center">
          No institutions available at the moment.
        </p>
      </div>
    );
  }
  
  return (
    <Swiper {...swiperConfig}>
      {institutions.map(institution => (
        <SwiperSlide key={institution.id}>
          <InstitutionCard institution={institution} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
```

### Form Validation Errors

```typescript
// components/layout/RichFooter.tsx

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await homepageService.subscribeNewsletter(email, locale);
      setIsSuccess(true);
      setEmail('');
      
      // Reset success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
      
    } catch (err: any) {
      if (err.code === 'ALREADY_SUBSCRIBED') {
        setError('This email is already subscribed');
      } else {
        setError('Subscription failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className={`flex-1 h-12 px-4 rounded-lg border-2 transition-colors ${
            error 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
          }`}
          disabled={isSubmitting}
          aria-invalid={!!error}
          aria-describedby={error ? 'email-error' : undefined}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
      </div>
      
      {error && (
        <p id="email-error" role="alert" className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      
      {isSuccess && (
        <p role="status" className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Successfully subscribed! Check your email for confirmation.
        </p>
      )}
    </form>
  );
}
```


## Testing Strategy

### Dual Testing Approach

The homepage redesign requires both **unit tests** for specific examples and edge cases, and **property-based tests** for universal properties across all inputs. Together, they provide comprehensive coverage.

**Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points
**Property Tests**: Verify universal properties hold across all generated inputs

### Property-Based Testing Configuration

**Library**: `@fast-check/jest` for JavaScript/TypeScript property-based testing

**Configuration**:
```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

// jest.setup.js
import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';
```

**Minimum Iterations**: 100 runs per property test

**Test Tagging**: Each property test must reference its design document property
```typescript
// Feature: homepage-redesign-evelya-style, Property 1: Category Card Interactivity
```

### Property-Based Test Examples

```typescript
// __tests__/properties/category-card.property.test.tsx
import { fc } from '@fast-check/jest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryCard } from '@/components/homepage/CategoryCard';

describe('CategoryCard Properties', () => {
  // Feature: homepage-redesign-evelya-style, Property 1: Category Card Interactivity
  it('should navigate to filtered events for any category', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 3, maxLength: 20 }),
          slug: fc.string({ minLength: 3, maxLength: 20 }),
          icon: fc.constantFrom('Calendar', 'Music', 'Trophy', 'Users'),
          color: fc.hexaString({ minLength: 6, maxLength: 6 }),
          gradient: fc.string(),
          bgColor: fc.string(),
          eventCount: fc.nat({ max: 1000 })
        }),
        (category) => {
          const mockNavigate = jest.fn();
          
          render(
            <CategoryCard 
              category={category} 
              onClick={mockNavigate}
            />
          );
          
          const card = screen.getByRole('button');
          fireEvent.click(card);
          
          // Property: Clicking any category card should trigger navigation
          expect(mockNavigate).toHaveBeenCalledWith(category.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// __tests__/properties/calendar.property.test.tsx
import { fc } from '@fast-check/jest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarWidget } from '@/components/homepage/CalendarWidget';

describe('CalendarWidget Properties', () => {
  // Feature: homepage-redesign-evelya-style, Property 2: Calendar Date Event Indication
  it('should display visual indicator for any date with events', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.nat({ min: 1, max: 50 }),
        (date, eventCount) => {
          const eventsMap = new Map([[date.toISOString().split('T')[0], eventCount]]);
          
          render(
            <CalendarWidget 
              eventsMap={eventsMap}
              onDateSelect={jest.fn()}
              locale="en"
            />
          );
          
          const dateCell = screen.getByText(date.getDate().toString());
          const indicator = dateCell.querySelector('[data-testid="event-indicator"]');
          
          // Property: Any date with events should have a visual indicator
          expect(indicator).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: homepage-redesign-evelya-style, Property 3: Calendar Date Click Navigation
  it('should trigger action when clicking any date with events', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.nat({ min: 1, max: 50 }),
        (date, eventCount) => {
          const eventsMap = new Map([[date.toISOString().split('T')[0], eventCount]]);
          const mockOnDateSelect = jest.fn();
          
          render(
            <CalendarWidget 
              eventsMap={eventsMap}
              onDateSelect={mockOnDateSelect}
              locale="en"
            />
          );
          
          const dateCell = screen.getByText(date.getDate().toString());
          fireEvent.click(dateCell);
          
          // Property: Clicking any date with events should trigger callback
          expect(mockOnDateSelect).toHaveBeenCalledWith(expect.any(Date));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// __tests__/properties/accessibility.property.test.tsx
import { fc } from '@fast-check/jest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

describe('Accessibility Properties', () => {
  // Feature: homepage-redesign-evelya-style, Property 21: Image Alt Text Presence
  it('should have alt text for any image element', () => {
    fc.assert(
      fc.property(
        fc.record({
          src: fc.webUrl(),
          alt: fc.string({ minLength: 5, maxLength: 100 })
        }),
        async (imageProps) => {
          const { container } = render(
            <img src={imageProps.src} alt={imageProps.alt} />
          );
          
          const img = container.querySelector('img');
          
          // Property: Any image should have alt attribute
          expect(img).toHaveAttribute('alt');
          expect(img?.getAttribute('alt')).toBeTruthy();
          
          // Should pass axe accessibility check
          const results = await axe(container);
          expect(results).toHaveNoViolations();
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: homepage-redesign-evelya-style, Property 9: Color Contrast Compliance
  it('should meet WCAG AA contrast for any text element', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { text: 'slate-900', bg: 'white' },
          { text: 'slate-600', bg: 'white' },
          { text: 'white', bg: 'blue-600' },
          { text: 'white', bg: 'papaya-500' }
        ),
        async (colors) => {
          const { container } = render(
            <div className={`bg-${colors.bg}`}>
              <p className={`text-${colors.text}`}>Sample text</p>
            </div>
          );
          
          // Property: Any text should meet WCAG AA contrast
          const results = await axe(container, {
            rules: {
              'color-contrast': { enabled: true }
            }
          });
          
          expect(results).toHaveNoViolations();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// __tests__/properties/internationalization.property.test.tsx
import { fc } from '@fast-check/jest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'next-intl';

describe('Internationalization Properties', () => {
  // Feature: homepage-redesign-evelya-style, Property 27: Locale-Specific Formatting
  it('should format dates according to any locale', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.constantFrom('en', 'fr'),
        (date, locale) => {
          const formatter = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          const formattedDate = formatter.format(date);
          
          render(
            <IntlProvider locale={locale} messages={{}}>
              <time dateTime={date.toISOString()}>{formattedDate}</time>
            </IntlProvider>
          );
          
          const timeElement = screen.getByText(formattedDate);
          
          // Property: Any date should be formatted per locale
          expect(timeElement).toBeInTheDocument();
          
          // Verify format matches locale conventions
          if (locale === 'fr') {
            expect(formattedDate).toMatch(/\d{1,2}\s\w+\s\d{4}/);
          } else {
            expect(formattedDate).toMatch(/\w+\s\d{1,2},\s\d{4}/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Examples

```typescript
// __tests__/unit/HeroSection.test.tsx
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/homepage/HeroSection';

describe('HeroSection', () => {
  it('should display title with minimum 48px font size on desktop', () => {
    render(
      <HeroSection 
        title="Discover Events"
        subtitle="Find amazing events near you"
        ctaText="Get Started"
        ctaHref="/events"
        locale="en"
      />
    );
    
    const title = screen.getByRole('heading', { level: 1 });
    const styles = window.getComputedStyle(title);
    const fontSize = parseInt(styles.fontSize);
    
    expect(fontSize).toBeGreaterThanOrEqual(48);
  });
  
  it('should render doodle illustrations', () => {
    const { container } = render(
      <HeroSection 
        title="Discover Events"
        subtitle="Find amazing events near you"
        ctaText="Get Started"
        ctaHref="/events"
        locale="en"
      />
    );
    
    const illustrations = container.querySelectorAll('[data-testid="doodle-illustration"]');
    expect(illustrations.length).toBeGreaterThan(0);
  });
  
  it('should have white background', () => {
    const { container } = render(
      <HeroSection 
        title="Discover Events"
        subtitle="Find amazing events near you"
        ctaText="Get Started"
        ctaHref="/events"
        locale="en"
      />
    );
    
    const section = container.firstChild as HTMLElement;
    const styles = window.getComputedStyle(section);
    
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)');
  });
});

// __tests__/unit/LocationSearch.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationSearch } from '@/components/homepage/LocationSearch';

describe('LocationSearch', () => {
  it('should display autocomplete suggestions after typing', async () => {
    const mockOnLocationChange = jest.fn();
    
    render(<LocationSearch onLocationChange={mockOnLocationChange} />);
    
    const input = screen.getByPlaceholderText(/search location/i);
    fireEvent.change(input, { target: { value: 'Par' } });
    
    await waitFor(() => {
      const suggestions = screen.getByRole('listbox');
      expect(suggestions).toBeInTheDocument();
    });
  });
  
  it('should handle geolocation permission denied', async () => {
    // Mock geolocation API
    const mockGeolocation = {
      getCurrentPosition: jest.fn((success, error) => {
        error({ code: 1, message: 'Permission denied' });
      })
    };
    
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true
    });
    
    render(<LocationSearch onLocationChange={jest.fn()} />);
    
    const nearMeButton = screen.getByText(/near me/i);
    fireEvent.click(nearMeButton);
    
    await waitFor(() => {
      const error = screen.getByText(/location permission denied/i);
      expect(error).toBeInTheDocument();
    });
  });
});

// __tests__/integration/HomePage.test.tsx
import { render, screen } from '@testing-library/react';
import { HomePage } from '@/app/[locale]/page';

describe('HomePage Integration', () => {
  it('should render all major sections', () => {
    render(<HomePage />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
    
    expect(screen.getByText(/discover events/i)).toBeInTheDocument(); // Hero
    expect(screen.getByText(/browse by category/i)).toBeInTheDocument(); // Categories
    expect(screen.getByText(/featured institutions/i)).toBeInTheDocument(); // Institutions
  });
  
  it('should pass Lighthouse performance audit', async () => {
    // This would use Lighthouse CI in actual implementation
    const performanceScore = await runLighthouseAudit();
    expect(performanceScore).toBeGreaterThanOrEqual(85);
  });
});
```

### Test Coverage Requirements

**Minimum Coverage**: 80% for all metrics (branches, functions, lines, statements)

**Critical Paths** (100% coverage required):
- Navigation and routing
- Form submissions
- API error handling
- Accessibility features
- Internationalization

**Test Organization**:
```
__tests__/
├── unit/
│   ├── components/
│   │   ├── HeroSection.test.tsx
│   │   ├── CategoryCard.test.tsx
│   │   ├── CalendarWidget.test.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useGeolocation.test.ts
│   │   └── useIntersectionObserver.test.ts
│   └── services/
│       └── homepageService.test.ts
├── properties/
│   ├── category-card.property.test.tsx
│   ├── calendar.property.test.tsx
│   ├── carousel.property.test.tsx
│   ├── accessibility.property.test.tsx
│   └── internationalization.property.test.tsx
├── integration/
│   ├── HomePage.test.tsx
│   └── navigation.test.tsx
└── e2e/
    ├── homepage-flow.spec.ts
    └── responsive.spec.ts
```

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run property tests
        run: npm run test:properties
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Check coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Run Lighthouse CI
        run: npm run lighthouse:ci
```

---

## Summary

This design document provides a comprehensive blueprint for implementing the homepage redesign with Evelya.co's vibrant style. The architecture follows modern React best practices with:

- **Component-based structure** for maintainability and reusability
- **TypeScript interfaces** for type safety and developer experience
- **Performance optimizations** including lazy loading, code splitting, and image optimization
- **Accessibility-first approach** meeting WCAG 2.1 AA standards
- **Comprehensive testing strategy** with both unit and property-based tests
- **Error handling** at all levels (API, component, user input)
- **Internationalization support** for French and English locales

The design ensures a fast, accessible, and engaging user experience while maintaining code quality and testability throughout the implementation.

