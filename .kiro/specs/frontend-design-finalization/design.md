# Frontend Design Finalization - Design Document

## Architecture Overview

### Component Hierarchy
```
App
├── PublicLayout
│   ├── Header (Logo, Search, Navigation, User Menu)
│   ├── LocationBar (City Selector, "Near Me" Button)
│   └── Content
│       ├── HomePage
│       ├── EventsListPage
│       └── EventDetailsPage
└── AppLayout (Authenticated)
    ├── Sidebar (Navigation)
    ├── Header (Notifications, Profile)
    └── Content
        ├── DashboardPage
        ├── CreateEventPage
        └── MyEventsPage
```

## Design System Implementation

### Color Tokens
```typescript
// tailwind.config.ts
export const colors = {
  primary: {
    DEFAULT: '#4F46E5', // indigo-600
    hover: '#4338CA',   // indigo-700
    light: '#6366F1',   // indigo-500
  },
  accent: {
    DEFAULT: '#F59E0B', // amber-500
    hover: '#D97706',   // amber-600
    light: '#FCD34D',   // amber-300
  },
  background: '#F9FAFB', // gray-50
  card: '#FFFFFF',
  text: {
    primary: '#1F2937',   // gray-800
    secondary: '#6B7280', // gray-500
  },
  border: '#E5E7EB', // gray-200
}
```

### Typography Scale
```typescript
// Font sizes and weights
const typography = {
  h1: 'text-4xl font-bold',      // 36px, 700
  h2: 'text-2xl font-semibold',  // 24px, 600
  h3: 'text-xl font-semibold',   // 20px, 600
  body: 'text-base font-normal', // 16px, 400
  small: 'text-sm font-normal',  // 14px, 400
}
```


### Spacing System
```typescript
// Consistent spacing scale (4px base)
const spacing = {
  xs: '0.5rem',  // 8px
  sm: '1rem',    // 16px
  md: '1.5rem',  // 24px
  lg: '2rem',    // 32px
  xl: '2.5rem',  // 40px
}
```

## Core Components

### 1. EventCard Component
**Location**: `frontend/src/components/events/EventCard.tsx`

**Props**:
```typescript
interface EventCardProps {
  event: Event;
  distance?: number; // in km
  onFavoriteToggle?: (eventId: string) => void;
  isFavorite?: boolean;
}
```

**Features**:
- Image 16:9 ratio with rounded top corners
- Category badge overlay (top-left)
- Distance badge (top-right) if distance provided
- Favorite icon (heart) top-right
- Date/time with calendar icon
- Location with map pin icon
- Participants count with users icon
- Price badge (highlighted)
- "S'inscrire" or "Voir détails" button
- Hover: elevation + subtle zoom on image

**Styling**:
```typescript
className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
```

### 2. LocationSelector Component
**Location**: `frontend/src/components/location/LocationSelector.tsx`

**Props**:
```typescript
interface LocationSelectorProps {
  onCitySelect: (city: City) => void;
  onNearMeClick: () => void;
  currentCity?: City;
  isDetecting?: boolean;
}
```

**Features**:
- Dropdown with search
- Popular cities suggested
- "Près de moi" button with GPS icon
- Current city display with location icon
- Loading state during geolocation


### 3. DistanceFilter Component
**Location**: `frontend/src/components/location/DistanceFilter.tsx`

**Props**:
```typescript
interface DistanceFilterProps {
  value: number; // current radius in km
  onChange: (radius: number) => void;
  presets?: number[]; // default: [5, 10, 25, 50, 100]
}
```

**Features**:
- Slider for custom radius
- Preset badges (5km, 10km, 25km, 50km, 100km+)
- Active badge highlighted
- Real-time update

### 4. InteractiveMap Component
**Location**: `frontend/src/components/location/InteractiveMap.tsx`

**Props**:
```typescript
interface InteractiveMapProps {
  events: Event[];
  center?: Coordinates;
  zoom?: number;
  onEventClick?: (eventId: string) => void;
  onMapClick?: (coords: Coordinates) => void;
}
```

**Features**:
- Google Maps integration
- Custom event markers
- Marker clustering for dense areas
- Info window popup on marker click
- Recenter button
- Zoom controls

**Dependencies**:
```bash
npm install @react-google-maps/api
```

### 5. CategoryBadge Component
**Location**: `frontend/src/components/events/CategoryBadge.tsx`

**Props**:
```typescript
interface CategoryBadgeProps {
  category: string;
  onClick?: () => void;
  active?: boolean;
}
```

**Styling**:
```typescript
// Pill-shaped with category-specific colors
const categoryColors = {
  musique: 'bg-purple-100 text-purple-700',
  sport: 'bg-green-100 text-green-700',
  conference: 'bg-blue-100 text-blue-700',
  festival: 'bg-pink-100 text-pink-700',
  // ...
}
```


### 6. StatCard Component
**Location**: `frontend/src/components/dashboard/StatCard.tsx`

**Props**:
```typescript
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple';
}
```

**Features**:
- Icon on left with colored background
- Large value display
- Small label text
- Trend indicator (arrow + percentage)
- Different background colors per card

## Page Implementations

### HomePage (`frontend/src/pages/index.tsx`)

**Sections**:
1. Hero Section
   - Gradient background (primary to accent)
   - Large title and subtitle
   - Search bar prominent
   - CTA button "Découvrir les événements"

2. Location Bar
   - City selector
   - "Près de moi" button
   - Current location display

3. Category Filters
   - Horizontal scrollable badges
   - All categories clickable

4. Events Grid
   - 3 columns desktop, 2 tablet, 1 mobile
   - EventCard components
   - Distance badges visible
   - Load more button

5. Footer
   - Links, social media, copyright

**State Management**:
```typescript
const [selectedCity, setSelectedCity] = useState<City | null>(null);
const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [events, setEvents] = useState<Event[]>([]);
const [loading, setLoading] = useState(false);
```


### EventsListPage (`frontend/src/pages/events/index.tsx`)

**Layout**:
- Sticky filter bar at top
- Results counter
- View toggle (grid/map)
- Events grid or map view
- Pagination

**Filters**:
```typescript
interface EventFilters {
  category?: string;
  dateRange?: 'today' | 'week' | 'month' | 'custom';
  priceType?: 'free' | 'paid' | 'all';
  sortBy?: 'date' | 'distance' | 'popularity' | 'price';
  radius?: number;
}
```

**Features**:
- Real-time filter updates
- URL query params for filters
- Debounced search
- Infinite scroll or pagination
- Toggle between grid and map view

### EventDetailsPage (`frontend/src/pages/events/[slug].tsx`)

**Layout**: 2 columns (70% / 30%)

**Left Column (70%)**:
1. Hero Banner
   - Full-width image
   - Gradient overlay
   - Title, organizer, category badge
   - Back button, share, favorite buttons

2. Description Section
   - Full description
   - "Read more/less" if long

3. Details Section
   - Date/time with icon
   - Location with icon
   - Interactive map
   - "Get directions" button

4. Program/Agenda Section
   - Vertical timeline
   - Time slots with descriptions

5. Organizer Section
   - Avatar, name, bio
   - Stats (events created, rating)
   - "Follow" button

**Right Column (30%)**:
1. Booking Card (Sticky)
   - Price highlighted
   - Tickets available
   - Quantity selector
   - Ticket types dropdown
   - "Book now" CTA button
   - Booking deadline

2. Similar Events
   - 3-4 mini cards
   - "See more" link


### DashboardPage (`frontend/src/pages/app/dashboard.tsx`)

**Layout**:
1. Stats Cards Row
   - 4 cards: Events Created, Upcoming, Participants, Revenue
   - Each with icon, value, label, trend

2. Tabs Navigation
   - All Events, Active, Past, Drafts

3. Events Table/List
   - Columns: Thumbnail, Name, Date, Status, Participants, Actions
   - Actions menu: Edit, Duplicate, Delete, Stats
   - Toggle list/grid view

4. Charts Section (Optional)
   - Participants over time
   - Revenue over time

### CreateEventPage (`frontend/src/pages/app/events/create.tsx`)

**Stepper**: 4 steps

**Step 1: Basic Info**
- Image upload (drag & drop)
- Title input
- Category dropdown
- Tags input with suggestions
- Start/end date pickers
- Start/end time pickers

**Step 2: Details**
- Rich text editor for description
- Location search with autocomplete
- Interactive map display
- "Online event" toggle with URL input
- Program/agenda builder

**Step 3: Tickets**
- Free/Paid toggle
- Ticket types list
- Add ticket type form:
  - Name, Price, Quantity, Description
  - Sale deadline
- "Add ticket type" button

**Step 4: Settings**
- Visibility (Public/Private)
- Max capacity
- Manual approval toggle
- Notification preferences
- "Save as draft" button
- "Publish event" button (primary)

## Services and Hooks

### locationService
**Location**: `frontend/src/services/locationService.ts`

```typescript
export const locationService = {
  async getCurrentPosition(): Promise<Coordinates>,
  calculateDistance(from: Coordinates, to: Coordinates): number,
  async searchCities(query: string): Promise<City[]>,
  async getNearbyEvents(coords: Coordinates, radius: number): Promise<Event[]>,
}
```


### useLocation Hook
**Location**: `frontend/src/hooks/useLocation.ts`

```typescript
interface UseLocationReturn {
  currentPosition: Coordinates | null;
  selectedCity: City | null;
  radius: number;
  loading: boolean;
  error: string | null;
  detectPosition: () => Promise<void>;
  selectCity: (city: City) => void;
  setRadius: (radius: number) => void;
  clearLocation: () => void;
}

export const useLocation = (): UseLocationReturn
```

**Features**:
- Manages geolocation state
- Persists to localStorage
- Handles permission errors
- Calculates distances

### useEventFilters Hook
**Location**: `frontend/src/hooks/useEventFilters.ts`

```typescript
interface UseEventFiltersReturn {
  filters: EventFilters;
  updateFilter: (key: keyof EventFilters, value: any) => void;
  clearFilters: () => void;
  applyFilters: (events: Event[]) => Event[];
}

export const useEventFilters = (): UseEventFiltersReturn
```

**Features**:
- Manages filter state
- Syncs with URL query params
- Applies filters to event list
- Handles sorting

## Responsive Design

### Breakpoints
```typescript
// tailwind.config.ts
screens: {
  'sm': '640px',  // Mobile large
  'md': '768px',  // Tablet
  'lg': '1024px', // Desktop
  'xl': '1280px', // Large desktop
}
```

### Mobile Adaptations
- Header: Burger menu instead of full navigation
- Sidebar: Bottom navigation bar
- Events grid: 1 column
- Filters: Overlay modal instead of horizontal bar
- Event details: Single column layout
- Sticky header shrinks on scroll


## Animations

### Hover Effects
```typescript
// Card hover
className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1"

// Image zoom
className="transition-transform duration-300 group-hover:scale-105"

// Button hover
className="transition-colors duration-200 hover:bg-primary-hover"
```

### Loading States
```typescript
// Skeleton loader
<div className="animate-pulse bg-gray-200 rounded h-4 w-3/4" />

// Spinner
<Loader2 className="h-6 w-6 animate-spin text-primary" />

// Stagger animation for cards
{events.map((event, index) => (
  <EventCard 
    key={event.id} 
    event={event}
    style={{ animationDelay: `${index * 50}ms` }}
    className="animate-fadeIn"
  />
))}
```

## Accessibility

### Focus Management
```typescript
// Visible focus ring
className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"

// Skip to main content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### ARIA Labels
```typescript
// Icon buttons
<button aria-label="Add to favorites">
  <Heart className="h-5 w-5" />
</button>

// Form inputs
<label htmlFor="event-title" className="sr-only">Event Title</label>
<input id="event-title" aria-describedby="title-help" />
<p id="title-help" className="text-sm text-gray-500">Enter a descriptive title</p>
```

### Keyboard Navigation
- All interactive elements focusable
- Tab order logical
- Enter/Space activate buttons
- Escape closes modals
- Arrow keys navigate lists


## Performance Optimizations

### Image Optimization
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src={event.coverImage}
  alt={event.title}
  width={800}
  height={450}
  className="object-cover"
  loading="lazy"
  placeholder="blur"
/>
```

### Code Splitting
```typescript
// Lazy load heavy components
const InteractiveMap = dynamic(
  () => import('@/components/location/InteractiveMap'),
  { 
    loading: () => <MapSkeleton />,
    ssr: false 
  }
);
```

### Debouncing
```typescript
// Search input
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchEvents(query);
  }, 300),
  []
);
```

## Testing Strategy

### Unit Tests
- Component rendering
- Props validation
- Event handlers
- Utility functions

### Integration Tests
- User flows (search, filter, book)
- Form submissions
- API interactions

### E2E Tests (Cypress)
- Critical paths
- Mobile responsive
- Accessibility

## Correctness Properties

### Property 1: Distance Calculation Accuracy
**Validates**: Requirements 6.5, 6.6, 6.7

**Property**: For any two valid coordinates, the calculated distance must be:
- Non-negative
- Symmetric (distance A→B = distance B→A)
- Within 1% of Haversine formula result

**Test Strategy**:
```typescript
fc.assert(
  fc.property(
    fc.record({
      lat1: fc.double({ min: -90, max: 90 }),
      lng1: fc.double({ min: -180, max: 180 }),
      lat2: fc.double({ min: -90, max: 90 }),
      lng2: fc.double({ min: -180, max: 180 }),
    }),
    (coords) => {
      const distance1 = calculateDistance(
        { latitude: coords.lat1, longitude: coords.lng1 },
        { latitude: coords.lat2, longitude: coords.lng2 }
      );
      const distance2 = calculateDistance(
        { latitude: coords.lat2, longitude: coords.lng2 },
        { latitude: coords.lat1, longitude: coords.lng1 }
      );
      
      return distance1 >= 0 && 
             Math.abs(distance1 - distance2) < 0.01;
    }
  )
);
```


### Property 2: Filter Consistency
**Validates**: Requirements 2.1-2.7

**Property**: Applying filters must always produce a subset of the original event list, and applying the same filters twice must produce identical results.

**Test Strategy**:
```typescript
fc.assert(
  fc.property(
    fc.array(eventArbitrary),
    fc.record({
      category: fc.option(fc.constantFrom('musique', 'sport', 'conference')),
      priceType: fc.option(fc.constantFrom('free', 'paid', 'all')),
      radius: fc.option(fc.integer({ min: 5, max: 100 })),
    }),
    (events, filters) => {
      const filtered1 = applyFilters(events, filters);
      const filtered2 = applyFilters(events, filters);
      
      // Subset property
      const isSubset = filtered1.every(e => events.includes(e));
      
      // Idempotence property
      const isIdempotent = JSON.stringify(filtered1) === JSON.stringify(filtered2);
      
      return isSubset && isIdempotent;
    }
  )
);
```

### Property 3: Responsive Layout Integrity
**Validates**: Requirements 1.4, 2.1, 3.2

**Property**: At any viewport width, all content must be visible and interactive elements must be at least 44x44px (WCAG touch target size).

**Test Strategy**:
```typescript
// Cypress visual regression test
describe('Responsive Layout', () => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' },
  ];

  viewports.forEach(({ width, height, name }) => {
    it(`maintains layout integrity on ${name}`, () => {
      cy.viewport(width, height);
      cy.visit('/events');
      
      // All interactive elements visible
      cy.get('button, a, input').should('be.visible');
      
      // Touch targets adequate size
      cy.get('button, a').each(($el) => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.width).to.be.at.least(44);
        expect(rect.height).to.be.at.least(44);
      });
    });
  });
});
```


### Property 4: Accessibility Compliance
**Validates**: Requirements 7.8, Accessibility section

**Property**: All pages must maintain WCAG 2.1 AA compliance with:
- Minimum contrast ratio 4.5:1 for normal text
- Minimum contrast ratio 3:1 for large text
- All images have alt text
- All form inputs have labels

**Test Strategy**:
```typescript
// Automated accessibility testing with axe-core
describe('Accessibility', () => {
  it('passes axe accessibility tests', () => {
    cy.visit('/');
    cy.injectAxe();
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
        'label': { enabled: true },
        'image-alt': { enabled: true },
      }
    });
  });
});
```

## Implementation Phases

### Phase 1: Core Components (Week 1, Days 1-2)
- EventCard
- CategoryBadge
- LocationSelector
- DistanceFilter
- StatCard

### Phase 2: Pages (Week 1, Days 3-4)
- HomePage refactor
- EventsListPage improvements
- EventDetailsPage optimization
- DashboardPage
- CreateEventPage

### Phase 3: Location System (Week 2)
- locationService implementation
- useLocation hook
- InteractiveMap component
- Google Maps integration
- Distance calculations

### Phase 4: Polish & Testing (Week 2, Day 5)
- Animations refinement
- Accessibility audit
- Performance optimization
- Property-based tests
- E2E tests

## Dependencies to Install

```bash
# Google Maps
npm install @react-google-maps/api

# Fast-check for property-based testing
npm install --save-dev @fast-check/jest

# Axe for accessibility testing
npm install --save-dev @axe-core/react cypress-axe
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
NEXT_PUBLIC_API_URL=https://api-rvnxjp7idq-bq.a.run.app
```

## Success Criteria

- [ ] All 7 user stories implemented
- [ ] Design system applied consistently
- [ ] All components responsive
- [ ] Accessibility score A (axe-core)
- [ ] Performance Lighthouse > 90
- [ ] All property-based tests passing
- [ ] E2E tests covering critical paths
- [ ] Documentation complete
