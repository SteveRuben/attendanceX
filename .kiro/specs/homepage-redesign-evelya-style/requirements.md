# Requirements Document - Homepage Redesign Evelya Style

## Introduction

This document defines the requirements for redesigning the AttendanceX homepage to adopt the vibrant, playful, and engaging design style of Evelya.co. The redesign aims to transform the current homepage from a standard event listing page into a visually compelling, user-friendly experience that encourages exploration and engagement.

## Glossary

- **System**: The AttendanceX web application frontend
- **Homepage**: The main landing page at `/fr` or `/en` routes
- **Hero_Section**: The primary above-the-fold content area with main title and visuals
- **Category_Card**: A visual card representing an event category with icon and label
- **Calendar_Widget**: An interactive monthly calendar component for date selection
- **Location_Selector**: A UI component for choosing city/location with geolocation
- **Carousel**: A horizontally scrollable component displaying multiple items
- **Institution**: An educational or organizational entity hosting events
- **Organizer**: A user or entity that creates and manages events
- **CTA**: Call-to-Action button or section prompting user engagement
- **Footer**: The bottom section of the page containing links, social media, and information
- **Header**: The top navigation bar with logo, menu, and authentication options
- **Geolocation**: Browser API for detecting user's geographic position
- **Responsive_Design**: UI that adapts to different screen sizes (mobile, tablet, desktop)

## Requirements

### Requirement 1: Hero Section with Vibrant Design

**User Story:** As a visitor, I want to see an eye-catching hero section with colorful illustrations, so that I feel engaged and understand the platform's purpose immediately.

#### Acceptance Criteria

1. THE System SHALL display a large, bold title in the hero section using modern typography (minimum 48px on desktop)
2. WHEN the hero section loads, THE System SHALL render colorful doodle-style illustrations around the title
3. THE System SHALL use a white background for the hero section to maximize contrast and vibrancy
4. THE System SHALL include a subtitle or tagline explaining the platform's value proposition
5. THE System SHALL display a primary CTA button in the hero section with vibrant color (yellow #FFD93D or papaya orange)
6. THE System SHALL ensure the hero section occupies at least 70vh on desktop and 60vh on mobile

### Requirement 2: Event Category Grid with Visual Cards

**User Story:** As a visitor, I want to browse event categories through visually distinct cards, so that I can quickly find events that interest me.

#### Acceptance Criteria

1. THE System SHALL display at least 6 event categories: Academic, Party, Sports, Cocktail, Music, Conference
2. WHEN displaying categories, THE System SHALL render each as a card with a unique colorful icon
3. THE System SHALL use vibrant colors for category cards: papaya orange, lilac purple, lemon yellow, bright cyan, coral pink, mint green
4. WHEN a user hovers over a category card, THE System SHALL apply a visual effect (scale, shadow, or color shift)
5. THE System SHALL arrange category cards in a responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile)
6. WHEN a user clicks a category card, THE System SHALL navigate to filtered events for that category

### Requirement 3: Interactive Monthly Calendar Widget

**User Story:** As a visitor, I want to view events on a monthly calendar, so that I can see what's happening on specific dates.

#### Acceptance Criteria

1. THE System SHALL display a monthly calendar widget showing the current month by default
2. WHEN the calendar loads, THE System SHALL highlight the current date with a distinct visual style
3. THE System SHALL provide navigation arrows to move between months (previous/next)
4. WHEN a user clicks a date with events, THE System SHALL display or navigate to events for that date
5. THE System SHALL indicate dates with events using visual markers (dots, badges, or color)
6. THE System SHALL display day names (Mon, Tue, Wed, etc.) as column headers
7. THE System SHALL format the calendar in a clean table layout with proper spacing

### Requirement 4: Location Search with Geolocation

**User Story:** As a visitor, I want to search for events by location and use my current position, so that I can find nearby events easily.

#### Acceptance Criteria

1. THE System SHALL display a location search bar with a text input field
2. WHEN the location selector loads, THE System SHALL include a "Near me" button with a GPS icon
3. WHEN a user clicks "Near me", THE System SHALL request browser geolocation permission
4. IF geolocation permission is granted, THEN THE System SHALL detect the user's city and update the location search field
5. THE System SHALL display the location search bar as a single horizontal line with clean design
6. THE System SHALL provide autocomplete suggestions when users type in the location field
7. WHEN a user selects a location, THE System SHALL filter displayed events by that location

### Requirement 5: Institutions Carousel Display

**User Story:** As a visitor, I want to see featured institutions in a carousel, so that I can discover organizations hosting events.

#### Acceptance Criteria

1. THE System SHALL display a horizontal carousel showing at least 5-6 institution cards simultaneously on desktop
2. WHEN the carousel loads, THE System SHALL render each institution card with logo or representative image
3. THE System SHALL provide left and right navigation arrows for the carousel
4. WHEN a user clicks a navigation arrow, THE System SHALL scroll the carousel smoothly to show more institutions
5. THE System SHALL display institution name and brief description on each card
6. WHEN a user clicks an institution card, THE System SHALL navigate to that institution's profile or events
7. THE System SHALL make the carousel responsive (3 cards on tablet, 1-2 on mobile)

### Requirement 6: Organizers Carousel Display

**User Story:** As a visitor, I want to see active event organizers in a carousel, so that I can discover who creates events on the platform.

#### Acceptance Criteria

1. THE System SHALL display a horizontal carousel showing organizer cards with photos or avatars
2. WHEN the carousel loads, THE System SHALL show at least 5-6 organizer cards simultaneously on desktop
3. THE System SHALL provide left and right navigation arrows for the organizer carousel
4. THE System SHALL display organizer name and role/title on each card
5. WHEN a user hovers over an organizer card, THE System SHALL apply a visual hover effect
6. WHEN a user clicks an organizer card, THE System SHALL navigate to that organizer's profile or events
7. THE System SHALL make the carousel responsive (3 cards on tablet, 1-2 on mobile)

### Requirement 7: Become Organizer CTA Section

**User Story:** As a potential organizer, I want to see a compelling section about becoming an organizer, so that I understand the benefits and can sign up.

#### Acceptance Criteria

1. THE System SHALL display a two-column layout for the "Become Organizer" section (text left, image right on desktop)
2. THE System SHALL include a compelling title for the CTA section (minimum 32px font size)
3. THE System SHALL display a list of benefits or features for organizers
4. THE System SHALL include a prominent CTA button with text like "Start Organizing" or "Become an Organizer"
5. THE System SHALL display founder or team photos with names and titles
6. THE System SHALL use vibrant background color or gradient for the CTA section
7. WHEN a user clicks the CTA button, THE System SHALL navigate to the organizer registration page

### Requirement 8: Rich Footer with Multiple Sections

**User Story:** As a visitor, I want to access additional information and links in the footer, so that I can navigate to other pages and connect on social media.

#### Acceptance Criteria

1. THE System SHALL display the AttendanceX logo in the footer
2. THE System SHALL include an Instagram gallery section showing 3 recent photos
3. THE System SHALL display social media icons (Instagram, Facebook, Twitter, LinkedIn) with links
4. THE System SHALL organize footer links into columns: Events, Categories, Help/Support
5. THE System SHALL include a newsletter signup form with email input and subscribe button
6. THE System SHALL display legal links (Privacy Policy, Terms of Service, Cookie Policy)
7. THE System SHALL show a copyright notice with dynamic current year
8. THE System SHALL use a light background color (white or very light gray) for the footer

### Requirement 9: Vibrant Color Palette Application

**User Story:** As a visitor, I want to experience a vibrant and playful visual design, so that the platform feels modern and engaging.

#### Acceptance Criteria

1. THE System SHALL use bright yellow (#FFD93D) as the primary accent color
2. THE System SHALL incorporate papaya orange, lilac purple, lemon yellow, and bright cyan throughout the design
3. THE System SHALL use white (#FFFFFF) as the primary background color
4. THE System SHALL apply subtle shadows (box-shadow) to cards and elevated elements
5. THE System SHALL avoid using gray tones as primary colors (only for text or subtle borders)
6. THE System SHALL ensure all color combinations meet WCAG AA contrast requirements (4.5:1 for normal text)
7. THE System SHALL use gradients sparingly for special sections (hero, CTA)

### Requirement 10: Fixed Header Navigation

**User Story:** As a visitor, I want to access navigation from anywhere on the page, so that I can easily move between sections without scrolling.

#### Acceptance Criteria

1. THE System SHALL display a fixed header that remains visible when scrolling
2. THE System SHALL include the AttendanceX logo in the top-left of the header
3. THE System SHALL display main navigation links: Events, Institutions, Companies
4. THE System SHALL include a language selector with FR/EN options and flag icons
5. THE System SHALL display Login and Register buttons in the top-right
6. WHEN the viewport width is below 768px, THE System SHALL replace navigation links with a burger menu icon
7. WHEN a user clicks the burger menu, THE System SHALL display a mobile navigation overlay
8. THE System SHALL apply a subtle shadow or border to the header for visual separation

### Requirement 11: Responsive Design Across Devices

**User Story:** As a visitor on any device, I want the homepage to display correctly, so that I can access all features regardless of screen size.

#### Acceptance Criteria

1. THE System SHALL adapt the layout for mobile (< 640px), tablet (640px-1024px), and desktop (> 1024px)
2. WHEN viewed on mobile, THE System SHALL stack sections vertically and adjust font sizes
3. THE System SHALL ensure touch targets are at least 44x44px on mobile devices
4. THE System SHALL make carousels swipeable on touch devices
5. THE System SHALL adjust grid layouts: 1 column on mobile, 2 on tablet, 3+ on desktop
6. THE System SHALL ensure images are responsive and optimized for different screen sizes
7. THE System SHALL maintain readability and usability across all breakpoints

### Requirement 12: Performance and Loading Optimization

**User Story:** As a visitor, I want the homepage to load quickly, so that I can start browsing events without delay.

#### Acceptance Criteria

1. THE System SHALL load the homepage in under 3 seconds on a standard broadband connection
2. THE System SHALL implement lazy loading for images below the fold
3. THE System SHALL optimize all images (WebP format, appropriate dimensions)
4. THE System SHALL minimize JavaScript bundle size (code splitting, tree shaking)
5. THE System SHALL implement skeleton loaders for async content (carousels, calendar)
6. THE System SHALL achieve a Lighthouse performance score of at least 85
7. THE System SHALL implement proper caching strategies for static assets

### Requirement 13: Animations and Micro-interactions

**User Story:** As a visitor, I want to experience smooth animations and interactions, so that the interface feels polished and responsive.

#### Acceptance Criteria

1. THE System SHALL apply smooth transitions to hover states (200-300ms duration)
2. WHEN elements enter the viewport, THE System SHALL animate them with fade-in or slide-up effects
3. THE System SHALL stagger animations for grid items (50-100ms delay between items)
4. THE System SHALL animate carousel transitions smoothly
5. THE System SHALL provide visual feedback for all interactive elements (buttons, cards, links)
6. THE System SHALL use CSS transforms for animations (translate, scale) for better performance
7. THE System SHALL respect user's prefers-reduced-motion setting

### Requirement 14: Accessibility Standards Compliance

**User Story:** As a visitor with accessibility needs, I want to navigate and use the homepage effectively, so that I can access all features regardless of ability.

#### Acceptance Criteria

1. THE System SHALL provide alt text for all images and icons
2. THE System SHALL ensure all interactive elements are keyboard accessible
3. THE System SHALL provide visible focus indicators for keyboard navigation
4. THE System SHALL use semantic HTML elements (header, nav, main, section, footer)
5. THE System SHALL include ARIA labels for icon-only buttons and complex widgets
6. THE System SHALL maintain a logical heading hierarchy (h1, h2, h3)
7. THE System SHALL ensure the calendar widget is screen reader accessible

### Requirement 15: Internationalization Support

**User Story:** As a visitor, I want to view the homepage in my preferred language, so that I can understand all content.

#### Acceptance Criteria

1. THE System SHALL support French (FR) and English (EN) languages
2. WHEN a user selects a language, THE System SHALL translate all text content
3. THE System SHALL persist the language preference in browser storage
4. THE System SHALL display the correct language based on URL path (/fr or /en)
5. THE System SHALL translate dynamic content (event names, categories) when available
6. THE System SHALL format dates and numbers according to the selected locale
7. THE System SHALL provide language-specific content for the newsletter and CTA sections
