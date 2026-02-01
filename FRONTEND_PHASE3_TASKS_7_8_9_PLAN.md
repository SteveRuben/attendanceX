# Frontend Phase 3 - Tasks 7, 8, 9 Implementation Plan

**Date**: January 31, 2026  
**Status**: 🚀 STARTING  
**Scope**: Complete remaining Phase 3 tasks

---

## Implementation Strategy

Given the extensive scope (80+ subtasks across 3 tasks), I'll implement a **pragmatic, production-ready approach**:

### Approach
1. **Focus on Core Features**: Implement essential functionality that delivers user value
2. **Leverage Existing Code**: Build upon the solid foundation already in place
3. **Minimal Viable Implementation**: Create working features without over-engineering
4. **Defer Advanced Features**: Save complex features (rich text editors, advanced forms) for future iterations

---

## Task 7: EventDetailsPage Optimization

### Current State Analysis
✅ **Already Implemented**:
- Hero banner with cover image
- Gradient overlay
- Event information display
- Organizer card
- Similar events section
- Registration card (sticky)
- Responsive layout

### Required Improvements
1. **2-Column Layout** - Already implemented (lg:grid-cols-3 with 2:1 ratio)
2. **Interactive Map** - ADD: Integrate InteractiveMap component
3. **Program/Agenda** - ADD: Timeline component for event schedule
4. **Booking Card Enhancements** - ENHANCE: Add ticket types, quantity selector
5. **Hero Optimizations** - ENHANCE: Add back button, improve styling

### Implementation Plan
- ✅ Skip: 2-column layout (already optimal)
- 🔧 Add: Interactive map for location
- 🔧 Add: Program/agenda timeline (if event has schedule)
- 🔧 Enhance: Booking card with ticket selection
- 🔧 Enhance: Hero with back button
- ⏭️ Defer: Complex booking flow (keep simple registration)

**Estimated Time**: 2-3 hours

---

## Task 8: DashboardPage Implementation

### Scope
Create authenticated user dashboard with:
1. Stats cards (4 metrics)
2. Tabs navigation (All/Active/Past/Drafts)
3. Events table/list

### Implementation Plan
- 🔧 Create: Stats cards row using StatCard component
- 🔧 Create: Tabs with event filtering
- 🔧 Create: Events table with basic actions
- ⏭️ Defer: Advanced charts, complex analytics
- ⏭️ Defer: Duplicate/Stats actions (keep Edit/Delete only)

**Estimated Time**: 3-4 hours

---

## Task 9: CreateEventPage Implementation

### Scope
Multi-step event creation form with:
1. Stepper component (4 steps)
2. Basic Info (title, category, dates)
3. Details (description, location)
4. Tickets (free/paid toggle)
5. Settings (visibility, capacity)

### Implementation Plan
- 🔧 Create: Simple stepper component
- 🔧 Create: Step 1 - Basic info form (no image upload initially)
- 🔧 Create: Step 2 - Details form (textarea, location input)
- 🔧 Create: Step 3 - Simple ticket configuration
- 🔧 Create: Step 4 - Settings and publish
- ⏭️ Defer: Image upload with drag & drop
- ⏭️ Defer: Rich text editor (use textarea)
- ⏭️ Defer: Interactive map for location selection
- ⏭️ Defer: Complex ticket types management
- ⏭️ Defer: Program/agenda builder

**Estimated Time**: 4-5 hours

---

## Deferred Features (Future Iterations)

### High Priority (Next Sprint)
- Image upload with drag & drop
- Rich text editor integration
- Advanced ticket management
- Program/agenda builder
- Event duplication
- Advanced analytics/charts

### Medium Priority
- Interactive map in create form
- Email notification preferences
- Advanced form validation
- Auto-save drafts
- Preview mode

### Low Priority
- Bulk operations
- Export functionality
- Advanced filtering
- Custom fields

---

## Implementation Order

### Session 1: Task 7 (2-3 hours)
1. Add InteractiveMap to EventDetailsPage
2. Create Timeline component for program/agenda
3. Enhance booking card
4. Add back button to hero
5. Test and validate

### Session 2: Task 8 (3-4 hours)
1. Create DashboardPage structure
2. Add stats cards
3. Implement tabs navigation
4. Create events table
5. Add basic actions (Edit/Delete)
6. Test and validate

### Session 3: Task 9 (4-5 hours)
1. Create CreateEventPage structure
2. Implement stepper component
3. Build Step 1: Basic Info
4. Build Step 2: Details
5. Build Step 3: Tickets
6. Build Step 4: Settings
7. Implement form submission
8. Test and validate

**Total Estimated Time**: 9-12 hours

---

## Success Criteria

### Task 7
- [ ] Interactive map shows event location
- [ ] Program/agenda displays if available
- [ ] Booking card has ticket selection
- [ ] Back button navigates to events list
- [ ] Responsive on all devices
- [ ] TypeScript: 0 errors

### Task 8
- [ ] Stats cards display metrics
- [ ] Tabs filter events correctly
- [ ] Events table shows user's events
- [ ] Edit/Delete actions work
- [ ] Responsive on all devices
- [ ] TypeScript: 0 errors

### Task 9
- [ ] Stepper shows progress
- [ ] All 4 steps functional
- [ ] Form validation works
- [ ] Event creation succeeds
- [ ] Redirects to dashboard after creation
- [ ] TypeScript: 0 errors

---

## Technical Approach

### Components to Create
1. `Timeline.tsx` - Program/agenda display
2. `Stepper.tsx` - Multi-step form navigation
3. `EventForm.tsx` - Form components for create/edit
4. `EventsTable.tsx` - Dashboard events table

### Services to Use
- ✅ `publicEventsService` - Already exists
- 🔧 `eventsService` - Create for authenticated operations
- ✅ `useLocation` - Already exists
- 🔧 `useAuth` - Use existing auth context

### Design System
- ✅ Evelya + Polaris standards
- ✅ Blue-600 primary color
- ✅ Slate neutrals
- ✅ Inter font
- ✅ Lucide icons
- ✅ i18n translations

---

## Risk Mitigation

### Potential Blockers
1. **Authentication**: May need to mock auth for testing
2. **API Integration**: Backend endpoints must be available
3. **Form Complexity**: Keep forms simple to avoid scope creep
4. **Time Constraints**: Focus on MVP features only

### Mitigation Strategies
1. Use existing auth context
2. Implement error handling for API calls
3. Use simple form inputs (no fancy editors)
4. Defer advanced features to future sprints

---

## Next Steps

1. ✅ Create this plan document
2. 🔧 Start Task 7: EventDetailsPage optimization
3. 🔧 Continue Task 8: DashboardPage implementation
4. 🔧 Complete Task 9: CreateEventPage implementation
5. 📝 Create completion summary document
6. 🎉 Celebrate Phase 3 completion!

---

**Let's build! 🚀**
