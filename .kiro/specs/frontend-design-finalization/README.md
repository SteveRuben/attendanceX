# Frontend Design Finalization Spec

## Overview
This spec defines the complete modernization of the AttendanceX frontend according to the Kiro instructions for event management applications. It includes a comprehensive design system, location-based features, and an optimized user experience.

## Documents

### 1. [requirements.md](./requirements.md)
Defines all user stories and acceptance criteria for the frontend redesign:
- 7 major user stories covering all pages and features
- Design system requirements (colors, typography, spacing)
- Technical requirements and constraints
- Success metrics and quality standards

### 2. [design.md](./design.md)
Technical design document with:
- Component architecture and hierarchy
- Detailed component specifications
- Service and hook implementations
- Page layouts and structures
- Correctness properties for property-based testing
- Performance optimization strategies

### 3. [tasks.md](./tasks.md)
Complete implementation task list organized in 7 phases:
- Phase 1: Setup and Core Components
- Phase 2: Services and Hooks
- Phase 3: Page Implementations
- Phase 4: Google Maps Integration
- Phase 5: Responsive Design and Animations
- Phase 6: Testing and Quality Assurance
- Phase 7: Documentation and Deployment

**Total**: 18 major tasks, ~200 subtasks

## Key Features

### Design System
- **Colors**: Indigo primary (#4F46E5), Orange accent (#F59E0B)
- **Typography**: Inter/Poppins, clear hierarchy
- **Spacing**: Consistent 4px-based scale
- **Animations**: Smooth transitions, micro-interactions

### Location Features
- Automatic geolocation detection
- City selector with search
- Distance badges on event cards
- Radius filtering (5km to 100km+)
- Interactive Google Maps
- Sort by distance

### Core Components
1. **EventCard** - Event display with distance, category, favorite
2. **LocationSelector** - City selection and geolocation
3. **DistanceFilter** - Radius selection with presets
4. **InteractiveMap** - Google Maps with markers and clusters
5. **CategoryBadge** - Pill-shaped category indicators
6. **StatCard** - Dashboard statistics with trends

### Pages
1. **HomePage** - Hero, location bar, events grid
2. **EventsListPage** - Filters, sorting, grid/map toggle
3. **EventDetailsPage** - 2-column layout, map, booking card
4. **DashboardPage** - Stats, tabs, events table
5. **CreateEventPage** - 4-step stepper form

## Implementation Timeline

### Week 1: Core Components and Pages
- Days 1-2: Setup + Core components
- Days 3-4: Services and hooks
- Day 5: Page implementations start

### Week 2: Location System
- Days 1-2: Location service and hooks
- Days 3-4: Google Maps integration
- Day 5: Testing and refinement

### Week 3: Polish and Testing
- Days 1-2: Responsive design
- Days 3-4: Animations and interactions
- Day 5: Property-based testing

### Week 4: Quality and Deployment
- Days 1-2: Accessibility testing
- Days 3-4: E2E tests and performance
- Day 5: Documentation and deployment

## Success Criteria

### Performance
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] Lighthouse Best Practices > 90
- [ ] Lighthouse SEO > 90

### Quality
- [ ] All property-based tests passing
- [ ] All E2E tests passing
- [ ] 0 accessibility violations (axe-core)
- [ ] Design system 100% applied

### Functionality
- [ ] All 7 user stories implemented
- [ ] All acceptance criteria met
- [ ] Responsive on mobile, tablet, desktop
- [ ] Location features fully functional

## Dependencies

### Required Packages
```bash
npm install @react-google-maps/api
npm install --save-dev @fast-check/jest cypress-axe
```

### Environment Variables
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
NEXT_PUBLIC_API_URL=https://api-rvnxjp7idq-bq.a.run.app
```

## Testing Strategy

### Property-Based Testing
- Distance calculation accuracy
- Filter consistency and idempotence
- Responsive layout integrity

### E2E Testing (Cypress)
- Critical user flows
- Location features
- Error scenarios

### Accessibility Testing
- Automated (axe-core)
- Manual keyboard navigation
- Screen reader compatibility

## References

- **Steering File**: `.kiro/steering/instructions_kiro_gestion_evenements.md`
- **Current Status**: `STATUS_PROJET_2026-01-30.md`
- **Implementation Roadmap**: `ROADMAP_IMPLEMENTATION.md`
- **Backend Specs**: `BACKEND_SPECIFICATIONS.md`

## Getting Started

1. Read all three spec documents (requirements, design, tasks)
2. Review the steering file for design guidelines
3. Install dependencies
4. Start with Phase 1, Task 1 (Project Setup)
5. Follow tasks sequentially within each phase
6. Test continuously as you implement
7. Document components as you create them

## Notes

- Follow the design system strictly
- Test on real devices (mobile, tablet, desktop)
- Maintain WCAG 2.1 AA accessibility throughout
- Commit frequently with clear messages
- Update this README as the spec evolves

---

**Created**: 2026-01-30  
**Status**: Ready for implementation  
**Estimated Duration**: 4 weeks
