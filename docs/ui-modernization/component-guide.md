# Modern UI Components Guide - AttendanceX

## Overview

This guide covers the new modern UI components designed to enhance AttendanceX's user experience, inspired by contemporary platforms like Evelya.co. These components provide a cohesive, animated, and engaging interface while maintaining accessibility and performance.

## Design System

### Design Tokens

All components use a centralized design token system located in `src/styles/design-tokens.ts`:

```typescript
import { designTokens } from '@/styles/design-tokens'

// Access colors
const primaryColor = designTokens.colors.brand.primary[500]

// Access spacing
const spacing = designTokens.spacing[4]

// Access animations
const easing = designTokens.animation.easing.easeOut
```

### Key Features

- **Consistent Design Language**: All components follow the same design principles
- **Dark Mode Support**: Built-in dark mode compatibility
- **Animation System**: Smooth, performant animations with reduced motion support
- **Accessibility**: WCAG 2.1 AA compliant
- **Mobile-First**: Responsive design optimized for all devices

## Core Components

### ModernButton

Enhanced button component with animations and multiple variants.

```typescript
import { ModernButton } from '@/components/ui/modern-button'
import { Plus } from 'lucide-react'

// Basic usage
<ModernButton variant="primary" size="md">
  Click me
</ModernButton>

// With icon and animation
<ModernButton 
  variant="primary" 
  size="lg"
  icon={<Plus className="h-4 w-4" />}
  animation="scale"
  loading={isLoading}
>
  Create Event
</ModernButton>

// Full width with custom animation
<ModernButton 
  variant="secondary"
  fullWidth
  animation="pulse"
  onClick={handleClick}
>
  Subscribe
</ModernButton>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean - Shows spinner and disables button
- `icon`: ReactNode - Icon to display
- `iconPosition`: 'left' | 'right'
- `animation`: 'pulse' | 'bounce' | 'slide' | 'scale'
- `fullWidth`: boolean

### ModernCard

Flexible card component with elevation, hover effects, and status indicators.

```typescript
import { 
  ModernCard, 
  ModernCardHeader, 
  ModernCardTitle, 
  ModernCardContent 
} from '@/components/ui/modern-card'

// Basic card
<ModernCard hover elevation="md">
  <ModernCardHeader>
    <ModernCardTitle>Event Statistics</ModernCardTitle>
  </ModernCardHeader>
  <ModernCardContent>
    <p>Your content here</p>
  </ModernCardContent>
</ModernCard>

// Status card with gradient
<ModernCard 
  status="success" 
  gradient 
  animation="lift"
  clickable
  onClick={handleCardClick}
>
  <ModernCardContent>
    <p>Success message</p>
  </ModernCardContent>
</ModernCard>

// Glass morphism effect
<ModernCard glass elevation="xl">
  <ModernCardContent>
    <p>Glass effect card</p>
  </ModernCardContent>
</ModernCard>
```

**Props:**
- `hover`: boolean - Enable hover effects
- `clickable`: boolean - Add cursor pointer and click styles
- `elevation`: 'none' | 'sm' | 'md' | 'lg' | 'xl'
- `animation`: 'none' | 'fade' | 'slide' | 'scale' | 'lift'
- `status`: 'default' | 'success' | 'warning' | 'error' | 'info'
- `gradient`: boolean - Apply gradient background
- `glass`: boolean - Glass morphism effect

### Notification System

Real-time notification system with multiple types and animations.

```typescript
import { 
  NotificationProvider, 
  useNotify, 
  NotificationBadge 
} from '@/components/ui/notification-system'

// Wrap your app with NotificationProvider
<NotificationProvider>
  <YourApp />
</NotificationProvider>

// Use notifications in components
const MyComponent = () => {
  const notify = useNotify()

  const handleSuccess = () => {
    notify.success('Success!', 'Your action was completed successfully.')
  }

  const handleError = () => {
    notify.error('Error', 'Something went wrong.', { duration: 0 }) // Persistent
  }

  const handleRealTime = () => {
    notify.realTime('New Message', 'You have a new message from John', 'info')
  }

  return (
    <div>
      <ModernButton onClick={handleSuccess}>Success</ModernButton>
      <ModernButton onClick={handleError}>Error</ModernButton>
      <ModernButton onClick={handleRealTime}>Real-time</ModernButton>
    </div>
  )
}

// Notification badge for counters
<div className="relative">
  <Bell className="h-6 w-6" />
  <NotificationBadge count={5} max={99} />
</div>
```

**Notification Types:**
- `success`: Green theme for successful actions
- `error`: Red theme for errors (persistent by default)
- `warning`: Yellow theme for warnings
- `info`: Blue theme for information
- `realTime`: Special styling for real-time updates

### Loading Skeletons

Skeleton loading components for better perceived performance.

```typescript
import { 
  Skeleton, 
  TextSkeleton, 
  AvatarSkeleton, 
  CardSkeleton,
  DashboardSkeleton,
  LoadingOverlay
} from '@/components/ui/loading-skeleton'

// Basic skeleton
<Skeleton variant="rectangular" width={200} height={100} />

// Text skeleton
<TextSkeleton lines={3} />

// Avatar skeleton
<AvatarSkeleton size={48} />

// Pre-built card skeleton
<CardSkeleton />

// Dashboard skeleton
<DashboardSkeleton />

// Loading overlay
<LoadingOverlay loading={isLoading}>
  <YourContent />
</LoadingOverlay>
```

**Skeleton Variants:**
- `text`: For text content
- `circular`: For avatars and circular elements
- `rectangular`: For images and blocks
- `rounded`: For buttons and rounded elements

## Engagement Components

### Real-time Engagement Dashboard

Components for live event engagement and participant tracking.

```typescript
import { 
  LiveParticipantCounter,
  EngagementMetrics,
  RealTimeActivityFeed,
  EngagementDashboard
} from '@/components/engagement/real-time-engagement'

// Individual components
<LiveParticipantCounter 
  stats={{
    total: 250,
    checkedIn: 187,
    active: 142,
    engagement: 78
  }}
/>

<EngagementMetrics 
  metrics={{
    likes: 324,
    shares: 89,
    comments: 156,
    rating: 4.7,
    feedback: 67
  }}
  onAction={(action) => console.log('Action:', action)}
/>

<RealTimeActivityFeed 
  events={[
    {
      id: '1',
      type: 'check_in',
      participant: 'John Doe',
      timestamp: new Date()
    }
  ]}
/>

// Complete dashboard
<EngagementDashboard
  participantStats={participantStats}
  engagementMetrics={engagementMetrics}
  realtimeEvents={realtimeEvents}
  onEngagementAction={handleAction}
/>
```

## Animation System

### CSS Animations

Import the animation stylesheet in your main CSS file:

```css
@import '@/styles/animations.css';
```

### Available Animations

```typescript
// Entrance animations
<div className="animate-fadeIn">Fade in</div>
<div className="animate-slideInUp">Slide up</div>
<div className="animate-scaleIn">Scale in</div>

// Hover animations
<div className="hover-lift">Lift on hover</div>
<div className="hover-scale">Scale on hover</div>
<div className="hover-glow">Glow on hover</div>

// Loading animations
<div className="animate-pulse">Pulse</div>
<div className="animate-spin">Spin</div>
<div className="animate-bounce">Bounce</div>

// Stagger animations for lists
<div className="stagger-children">
  <div>Item 1</div> <!-- Animates with 0.1s delay -->
  <div>Item 2</div> <!-- Animates with 0.2s delay -->
  <div>Item 3</div> <!-- Animates with 0.3s delay -->
</div>
```

### Animation Delays and Durations

```typescript
// Delay classes
<div className="animate-fadeIn animate-delay-200">Delayed fade in</div>

// Duration classes
<div className="animate-pulse animate-duration-500">Slower pulse</div>
```

### Reduced Motion Support

All animations automatically respect the user's `prefers-reduced-motion` setting:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are automatically disabled or reduced */
}
```

## Best Practices

### Performance

1. **Use CSS transforms** for animations instead of changing layout properties
2. **Limit concurrent animations** to maintain 60fps
3. **Use `will-change`** sparingly and remove after animation
4. **Prefer opacity and transform** for smooth animations

```typescript
// Good: Uses transform
<div className="transition-transform hover:scale-105">Content</div>

// Avoid: Changes layout properties
<div className="transition-all hover:w-full">Content</div>
```

### Accessibility

1. **Respect reduced motion** preferences
2. **Provide focus indicators** for interactive elements
3. **Use semantic HTML** with proper ARIA labels
4. **Ensure sufficient color contrast**

```typescript
// Good: Accessible button
<ModernButton 
  aria-label="Create new event"
  className="focus-ring"
>
  <Plus className="h-4 w-4" />
</ModernButton>
```

### Consistency

1. **Use design tokens** instead of hardcoded values
2. **Follow naming conventions** for components and props
3. **Maintain visual hierarchy** with consistent spacing
4. **Use the same animation timings** across similar interactions

```typescript
// Good: Uses design tokens
<div style={{ 
  padding: designTokens.spacing[4],
  borderRadius: designTokens.borderRadius.lg 
}}>
  Content
</div>

// Avoid: Hardcoded values
<div style={{ padding: '16px', borderRadius: '8px' }}>
  Content
</div>
```

## Mobile Optimization

### Touch Targets

Ensure all interactive elements meet minimum touch target sizes:

```typescript
// Minimum 44px touch targets
<ModernButton size="sm" className="min-h-[44px] min-w-[44px]">
  <Icon className="h-4 w-4" />
</ModernButton>
```

### Responsive Design

Use responsive utilities and breakpoints:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Responsive grid */}
</div>

<ModernButton 
  size="sm" 
  className="md:size-md lg:size-lg"
>
  Responsive button
</ModernButton>
```

### Gesture Support

Add gesture-friendly interactions:

```typescript
// Swipe gestures for mobile
<div className="touch-pan-x overflow-x-auto">
  {/* Horizontally scrollable content */}
</div>
```

## Testing

### Visual Regression Testing

Test components across different states and themes:

```typescript
// Storybook stories for visual testing
export const Default = () => <ModernButton>Default</ModernButton>
export const Loading = () => <ModernButton loading>Loading</ModernButton>
export const DarkMode = () => <ModernButton>Dark Mode</ModernButton>
```

### Accessibility Testing

Use automated tools and manual testing:

```bash
# Run accessibility tests
npm run test:a11y

# Test with screen readers
# Test keyboard navigation
# Verify color contrast
```

### Performance Testing

Monitor animation performance:

```typescript
// Performance monitoring
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'measure') {
      console.log(`${entry.name}: ${entry.duration}ms`)
    }
  }
})

observer.observe({ entryTypes: ['measure'] })
```

## Migration Guide

### From Old Components

Replace existing components gradually:

```typescript
// Old
import { Button } from '@/components/ui/button'
<Button variant="primary">Click me</Button>

// New
import { ModernButton } from '@/components/ui/modern-button'
<ModernButton variant="primary" animation="scale">Click me</ModernButton>
```

### Styling Updates

Update custom styles to use design tokens:

```typescript
// Old
const styles = {
  backgroundColor: '#3b82f6',
  padding: '16px',
  borderRadius: '8px'
}

// New
const styles = {
  backgroundColor: designTokens.colors.brand.primary[500],
  padding: designTokens.spacing[4],
  borderRadius: designTokens.borderRadius.lg
}
```

This modern UI system provides a solid foundation for creating engaging, accessible, and performant user interfaces that rival contemporary platforms while maintaining AttendanceX's unique multi-industry focus.