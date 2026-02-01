# Quick Reference: PublicLayout Components

## Overview
This document provides a quick reference for the PublicLayout and its associated components.

## Main Components

### 1. PublicLayout
**Location**: `frontend/src/components/layout/PublicLayout.tsx`

**Purpose**: Main layout wrapper for public-facing pages

**Props**:
```typescript
interface PublicLayoutProps {
  children: React.ReactNode;
  showHero?: boolean;        // Show hero section
  heroTitle?: string;         // Hero title text
  heroSubtitle?: string;      // Hero subtitle text
}
```

**Usage**:
```tsx
<PublicLayout showHero heroTitle="Welcome" heroSubtitle="Discover events">
  {/* Page content */}
</PublicLayout>
```

**Features**:
- Floating bottom navigation menu
- Language selector (FR, EN, ES, DE)
- Authentication buttons (Login, Register)
- Comprehensive footer with 5 sections
- Responsive design
- Dark mode support

### 2. CalendarWidget
**Location**: `frontend/src/components/ui/calendar-widget.tsx`

**Purpose**: Standalone calendar component for date selection

**Props**: None (self-contained)

**Usage**:
```tsx
import { CalendarWidget } from '@/components/ui/calendar-widget';

<CalendarWidget />
```

**Features**:
- Month navigation (previous/next)
- Date selection
- Today highlighting
- Selected date highlighting
- Responsive design
- Fixed width: 14rem (224px)

**CSS Classes**:
```css
flex flex-col border rounded-[20px] bg-white p-[1.25rem] w-[14rem]
```

### 3. CategoryCard
**Location**: `frontend/src/components/events/CategoryCard.tsx`

**Purpose**: Display event category with image and count

**Props**:
```typescript
interface CategoryCardProps {
  name: string;              // Category name
  icon: LucideIcon;          // Icon component
  count: number;             // Number of events
  href: string;              // Link destination
  image: string;             // Image URL
  color?: string;            // Color theme (optional)
}
```

**Usage**:
```tsx
import { CategoryCard } from '@/components/events/CategoryCard';
import { Music } from 'lucide-react';

<CategoryCard
  name="Musique"
  icon={Music}
  count={145}
  href="/events/music"
  image="https://images.unsplash.com/photo-..."
  color="purple"
/>
```

**Features**:
- 16:9 aspect ratio image
- Gradient overlay on image
- Icon with gradient background
- Event count badge
- Hover animations (scale 110%)
- Link navigation
- Fixed width: 14rem (224px)

**CSS Classes**:
```css
flex flex-col border rounded-[20px] bg-background p-[1.25rem] w-[14rem]
```

## Layout Structure

### Floating Bottom Menu
**Position**: Fixed at bottom, centered
**Z-index**: 5000
**Width**: 
- Mobile: 90%
- Tablet: 75%
- Desktop: 50rem (800px)

**Sections**:
1. **Left**: Logo icon (Calendar in gradient blue square)
2. **Center**: Navigation links (Events, Institutions, Companies)
3. **Right**: Language selector + Auth buttons

**CSS**:
```css
flex fixed bottom-[1.1rem] left-1/2 -translate-x-1/2 items-center gap-4 
px-2 md:px-4 py-2 bg-white rounded-[20px] shadow-lg 
w-[90%] md:w-3/4 lg:w-[50rem] justify-between z-[5000] 
text-[14px] font-medium
```

### Footer Structure
**Sections** (5 columns on desktop):

1. **Brand**
   - Logo + site name
   - Description

2. **Événements**
   - All events
   - Upcoming
   - Popular
   - Create event

3. **Institutions & Organisateurs**
   - Institutions
   - Companies
   - Become organizer
   - Dashboard

4. **Aide**
   - Help center
   - FAQ
   - Contact
   - Terms
   - Privacy

5. **Restez informé**
   - Newsletter form
   - Social media links

**Bottom Bar**:
- Copyright
- Sitemap
- Accessibility
- Cookies

## Page Examples

### Events Page
**Location**: `frontend/src/pages/events.tsx`

**Layout**:
```
Hero Section (gradient background)
├── Title
└── Subtitle

Content Section
├── Calendar Widget (left, fixed width)
└── Category Grid (right, responsive)
    └── Category Cards (1-4 columns)

Featured Events Section
└── Event Cards Grid (1-3 columns)
```

### Institutions Page
**Location**: `frontend/src/pages/institutions.tsx`

**Layout**:
```
Hero Section (gradient background)
├── Title
└── Subtitle

Content Section (placeholder)
```

### Companies Page
**Location**: `frontend/src/pages/companies.tsx`

**Layout**:
```
Hero Section (gradient background)
├── Title
└── Subtitle

Content Section (placeholder)
```

## Responsive Breakpoints

### Mobile (< 640px)
- Bottom menu: Compact icons only
- Calendar: Full width
- Categories: 1 column
- Footer: 1 column (stacked)

### Tablet (640px - 1024px)
- Bottom menu: Compact icons
- Calendar: Fixed width (14rem)
- Categories: 2 columns
- Footer: 2 columns

### Desktop (> 1024px)
- Bottom menu: Full with text labels
- Calendar: Fixed width (14rem)
- Categories: 3-4 columns
- Footer: 5 columns

## Color Palette

### Primary Colors
- Blue: `blue-600` (#2563eb)
- Purple: `purple-600` (#9333ea)
- Gradient: `from-blue-600 to-purple-600`

### Neutral Colors
- Slate 50: `#f8fafc` (background)
- Slate 100: `#f1f5f9`
- Slate 600: `#475569` (text secondary)
- Slate 900: `#0f172a` (text primary)

### Semantic Colors
- Success: `green-600`
- Warning: `yellow-600`
- Error: `red-600`
- Info: `blue-600`

## Icons

### Library
**Lucide React** - https://lucide.dev/

### Common Icons Used
```tsx
import { 
  Calendar,      // Logo, events
  Building2,     // Institutions
  Briefcase,     // Companies, business
  Globe,         // Language selector
  UserPlus,      // Register
  LogIn,         // Login
  Music,         // Music category
  GraduationCap, // Education
  Heart,         // Health
  Palette,       // Art
  Utensils,      // Food
  Dumbbell,      // Sports
  Gamepad2       // Gaming
} from 'lucide-react';
```

### Icon Sizes
- Small: `h-4 w-4` (16px)
- Medium: `h-5 w-5` (20px)
- Large: `h-6 w-6` (24px)
- Extra Large: `h-8 w-8` (32px)

## Translations

### Usage
```tsx
import { useTranslation } from '@/hooks/useTranslation';

const { t } = useTranslation('common');

<h1>{t('nav.events')}</h1>
```

### Common Keys
- `nav.events` - "Événements"
- `nav.institutions` - "Institutions"
- `nav.companies` - "Entreprises"
- `auth.login` - "Se connecter"
- `auth.register` - "S'inscrire"
- `footer.description` - Footer description
- `footer.terms` - "Conditions d'utilisation"
- `footer.privacy` - "Politique de confidentialité"

### Supported Languages
- French (fr) - Default
- English (en)
- Spanish (es)
- German (de)

## Best Practices

### Component Usage
1. Always wrap pages with `<PublicLayout>`
2. Use `CalendarWidget` for date selection
3. Use `CategoryCard` for event categories
4. Follow responsive grid patterns
5. Use proper semantic HTML

### Styling
1. Use Tailwind CSS classes
2. Follow spacing scale (4px increments)
3. Use rounded-[20px] for cards
4. Include dark mode variants
5. Add hover effects on interactive elements

### Accessibility
1. Add ARIA labels for icons
2. Use semantic HTML elements
3. Ensure keyboard navigation
4. Maintain color contrast (WCAG AA)
5. Include focus states

### Performance
1. Use Next.js Image for images
2. Lazy load heavy components
3. Optimize images (Unsplash with params)
4. Minimize JavaScript
5. Use CSS animations

## Common Patterns

### Hero Section
```tsx
<div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold mb-4">
        {title}
      </h1>
      <p className="text-xl text-blue-100 max-w-2xl mx-auto">
        {subtitle}
      </p>
    </div>
  </div>
</div>
```

### Content Container
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
  {/* Content */}
</div>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {/* Items */}
</div>
```

### Card Component
```tsx
<div className="flex flex-col border rounded-[20px] bg-white dark:bg-slate-900 p-[1.25rem] w-[14rem]">
  {/* Card content */}
</div>
```

## Troubleshooting

### Menu Not Showing
- Check z-index (should be 5000)
- Verify fixed positioning
- Check bottom spacing (pb-24 on main content)

### Calendar Not Rendering
- Verify import path
- Check component is self-contained
- Ensure proper width (w-[14rem])

### Categories Not Displaying
- Verify image URLs are valid
- Check icon imports from lucide-react
- Ensure proper grid layout

### Footer Links Not Working
- Verify href paths
- Check Next.js Link component
- Ensure pages exist

### Dark Mode Issues
- Add dark: variants to all color classes
- Check bg-white has dark:bg-slate-900
- Verify text colors have dark variants

## Quick Commands

### Development
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run linter
npm run type-check       # Check TypeScript
```

### Testing
```bash
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## File Locations Quick Reference

```
frontend/src/
├── components/
│   ├── layout/
│   │   └── PublicLayout.tsx          # Main layout
│   ├── ui/
│   │   └── calendar-widget.tsx       # Calendar component
│   └── events/
│       └── CategoryCard.tsx          # Category card
├── pages/
│   ├── events.tsx                    # Events page
│   ├── institutions.tsx              # Institutions page
│   └── companies.tsx                 # Companies page
└── hooks/
    └── useTranslation.ts             # Translation hook

frontend/public/locales/
├── fr/common.json                    # French translations
├── en/common.json                    # English translations
├── es/common.json                    # Spanish translations
└── de/common.json                    # German translations
```

## Support

For issues or questions:
1. Check this quick reference
2. Review component source code
3. Check TypeScript types
4. Verify translations exist
5. Test in different screen sizes

---

**Last Updated**: January 31, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
