# Modern Design System - AttendanceX (Inspired by Evelya)

## Design Philosophy

### Core Principles
1. **Minimalist Elegance** - Clean interfaces with ample white space
2. **Smooth Interactions** - Subtle animations and fluid transitions
3. **Visual Hierarchy** - Strategic use of typography and color
4. **User-Centric** - Prioritize user experience and accessibility
5. **Systematic Consistency** - Reusable components and consistent patterns

## Color Palette

### Primary Colors
```css
/* Blue Gradient (Primary) */
--primary-50: #eff6ff
--primary-100: #dbeafe
--primary-500: #3b82f6  /* Main blue */
--primary-600: #2563eb  /* Hover state */
--primary-700: #1d4ed8  /* Active state */

/* Indigo Gradient (Secondary) */
--indigo-500: #6366f1
--indigo-600: #4f46e5
--indigo-700: #4338ca

/* Neutral Grays */
--slate-50: #f8fafc
--slate-100: #f1f5f9
--slate-200: #e2e8f0
--slate-600: #475569
--slate-700: #334155
--slate-900: #0f172a

/* Semantic Colors */
--success: #10b981
--warning: #f59e0b
--error: #ef4444
```

### Gradients
```css
/* Primary Gradient */
background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);

/* Hero Gradient */
background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%);

/* Background Gradient */
background: linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #e0e7ff 100%);
```

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale
```css
/* Headings */
h1: text-5xl sm:text-6xl lg:text-7xl font-bold (48-72px)
h2: text-3xl sm:text-4xl lg:text-5xl font-bold (36-48px)
h3: text-2xl sm:text-3xl font-semibold (24-30px)
h4: text-xl sm:text-2xl font-semibold (20-24px)

/* Body */
body-lg: text-xl (20px)
body: text-base (16px)
body-sm: text-sm (14px)
caption: text-xs (12px)
```

## Components

### Buttons

#### Primary Button
```tsx
<Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/30 px-8 py-3 rounded-lg font-medium transition-all duration-200">
  Get Started
</Button>
```

#### Secondary Button
```tsx
<Button className="border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-800 px-8 py-3 rounded-lg font-medium transition-all duration-200">
  Learn More
</Button>
```

### Cards

#### Feature Card
```tsx
<div className="group relative p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
  <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
    <Icon className="h-6 w-6 text-white" />
  </div>
  <h3 className="text-xl font-semibold mb-2">Title</h3>
  <p className="text-slate-600 dark:text-slate-400">Description</p>
</div>
```

#### Event Card
```tsx
<div className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
  <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800" />
  <div className="p-6">
    <h3 className="text-xl font-semibold mb-2">Event Title</h3>
    <p className="text-slate-600 dark:text-slate-400 mb-4">Description</p>
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">Date</span>
      <Button size="sm">View Details</Button>
    </div>
  </div>
</div>
```

### Inputs

#### Search Input
```tsx
<div className="relative">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
  <Input 
    className="pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-800 transition-colors"
    placeholder="Search events..."
  />
</div>
```

### Badges

#### Status Badge
```tsx
<Badge className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
  Featured
</Badge>
```

#### Category Badge
```tsx
<Badge className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
  Technology
</Badge>
```

## Layouts

### Hero Section
```tsx
<section className="relative overflow-hidden py-20 sm:py-32">
  {/* Background Gradients */}
  <div className="absolute inset-0 -z-10">
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
  </div>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
        <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Your Title Here
        </span>
      </h1>
      <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
        Your subtitle here
      </p>
    </div>
  </div>
</section>
```

### Content Section
```tsx
<section className="py-20 sm:py-32">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
        Section Title
      </h2>
      <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
        Section subtitle
      </p>
    </div>
    
    {/* Content Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Cards here */}
    </div>
  </div>
</section>
```

## Animations

### Hover Effects
```css
/* Card Hover */
.card-hover {
  @apply transition-all duration-300 hover:shadow-xl hover:-translate-y-1;
}

/* Button Hover */
.button-hover {
  @apply transition-all duration-200 hover:scale-105;
}

/* Gradient Hover */
.gradient-hover {
  @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700;
}
```

### Loading States
```tsx
/* Spinner */
<div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />

/* Pulse */
<div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-32" />

/* Fade In */
<div className="animate-fadeIn opacity-0" />
```

## Spacing System

### Container Widths
```css
max-w-7xl: 1280px  /* Main content */
max-w-5xl: 1024px  /* Pricing, forms */
max-w-3xl: 768px   /* Text content */
max-w-2xl: 672px   /* Narrow content */
```

### Padding/Margin Scale
```css
p-4: 16px   /* Small */
p-6: 24px   /* Medium */
p-8: 32px   /* Large */
p-12: 48px  /* XL */
p-16: 64px  /* 2XL */
p-20: 80px  /* 3XL */
```

### Section Spacing
```css
py-12: 48px   /* Small sections */
py-16: 64px   /* Medium sections */
py-20: 80px   /* Large sections */
py-32: 128px  /* Hero sections */
```

## Responsive Breakpoints

```css
sm: 640px   /* Mobile large */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

## Dark Mode

### Background Colors
```css
/* Light Mode */
bg-white
bg-slate-50
bg-slate-100

/* Dark Mode */
dark:bg-slate-900
dark:bg-slate-800
dark:bg-slate-700
```

### Text Colors
```css
/* Light Mode */
text-slate-900  /* Primary */
text-slate-600  /* Secondary */
text-slate-500  /* Tertiary */

/* Dark Mode */
dark:text-slate-100  /* Primary */
dark:text-slate-300  /* Secondary */
dark:text-slate-400  /* Tertiary */
```

### Border Colors
```css
/* Light Mode */
border-slate-200
border-slate-300

/* Dark Mode */
dark:border-slate-700
dark:border-slate-600
```

## Accessibility

### Focus States
```css
focus:outline-none 
focus:ring-2 
focus:ring-blue-500 
focus:ring-offset-2
```

### Contrast Ratios
- Text: Minimum 4.5:1
- Large text: Minimum 3:1
- UI components: Minimum 3:1

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators required
- Logical tab order

## Implementation Checklist

### For Each Page
- [ ] Use PublicLayout component
- [ ] Implement gradient backgrounds
- [ ] Add smooth hover effects
- [ ] Include proper spacing
- [ ] Support dark mode
- [ ] Ensure accessibility
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Optimize for mobile
- [ ] Test keyboard navigation

### For Each Component
- [ ] Follow design system colors
- [ ] Use consistent spacing
- [ ] Add hover/focus states
- [ ] Support dark mode
- [ ] Include proper typography
- [ ] Add smooth transitions
- [ ] Ensure accessibility
- [ ] Test responsiveness

## Resources

- **Figma Design System:** [Link to Figma]
- **Component Library:** Shadcn/ui + Radix UI
- **Icons:** Lucide React
- **Animations:** Tailwind CSS + CSS transitions
- **Inspiration:** Evelya.co, Linear.app, Vercel.com

---

**Version:** 1.0.0  
**Last Updated:** January 26, 2026  
**Status:** Active - Use for all new pages and components
