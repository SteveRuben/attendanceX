# Requirements: Onboarding Optimization & Style Update

## 1. Overview

**Feature Name**: Onboarding Optimization & Style Update  
**Priority**: High  
**Status**: Draft  
**Created**: 2026-02-01

### Problem Statement

The onboarding setup page (`frontend/src/pages/onboarding/setup.tsx`) has two critical issues:

1. **Repetitive API Calls**: The `useEffect` hook creates an infinite loop by including `fetchOnboardingStatus` in its dependency array, causing the API to be called repeatedly
2. **Non-compliant Styling**: The page doesn't follow the Evelya design system with Polaris CSS standards and Solstice gradients

### Goals

- Fix the infinite API call loop in the onboarding flow
- Update the styling to match Evelya/Polaris/Solstice design standards
- Improve performance and user experience
- Maintain all existing functionality

## 2. User Stories

### US-1: As a new user, I want the onboarding page to load efficiently without making repetitive API calls

**Acceptance Criteria**:
- AC-1.1: The onboarding status API should be called only once when the page loads
- AC-1.2: The API should be called again only when explicitly needed (after completing a step)
- AC-1.3: No infinite loops or unnecessary re-renders should occur
- AC-1.4: Browser network tab should show minimal API calls (1 initial call + 1 per step completion)

### US-2: As a new user, I want the onboarding page to have a modern, professional design

**Acceptance Criteria**:
- AC-2.1: The page should use the Evelya color palette (blue-600 primary, slate neutrals)
- AC-2.2: Cards should follow Polaris patterns with proper spacing and borders
- AC-2.3: Buttons should use Polaris button styles with proper states
- AC-2.4: Progress indicators should use Solstice gradient effects
- AC-2.5: All text should use Inter font with proper hierarchy
- AC-2.6: Dark mode should be fully supported with proper color variants

### US-3: As a developer, I want the code to follow React best practices

**Acceptance Criteria**:
- AC-3.1: `useEffect` dependencies should be properly managed
- AC-3.2: Functions should be memoized with `useCallback` when needed
- AC-3.3: State updates should not trigger unnecessary re-renders
- AC-3.4: API calls should be properly cached or debounced

## 3. Functional Requirements

### FR-1: Fix API Call Loop

**Description**: Resolve the infinite loop caused by improper `useEffect` dependencies

**Requirements**:
- FR-1.1: Remove `fetchOnboardingStatus` from `useEffect` dependency array
- FR-1.2: Wrap `fetchOnboardingStatus` in `useCallback` with proper dependencies
- FR-1.3: Ensure `fetchTenantData` is also properly memoized
- FR-1.4: Add loading states to prevent multiple simultaneous calls

### FR-2: Update Design System

**Description**: Apply Evelya/Polaris/Solstice design standards throughout the page

**Requirements**:
- FR-2.1: Update color scheme to use blue-600/slate palette
- FR-2.2: Apply Polaris card patterns with proper borders and shadows
- FR-2.3: Update button styles to match Polaris standards
- FR-2.4: Add Solstice gradient effects to progress indicators
- FR-2.5: Ensure proper spacing using Polaris spacing scale (4px increments)
- FR-2.6: Add proper dark mode support with `dark:` variants

### FR-3: Improve Performance

**Description**: Optimize the component for better performance

**Requirements**:
- FR-3.1: Implement proper memoization for expensive computations
- FR-3.2: Avoid unnecessary re-renders
- FR-3.3: Cache API responses when appropriate
- FR-3.4: Add proper loading and error states

## 4. Non-Functional Requirements

### NFR-1: Performance

- Page should load in < 2 seconds
- API calls should be < 500ms
- No more than 2 API calls on initial load (onboarding status + tenant data)
- Smooth transitions between steps (< 300ms)

### NFR-2: Accessibility

- WCAG 2.1 AA compliance
- Proper focus management between steps
- Keyboard navigation support
- Screen reader friendly labels

### NFR-3: Browser Compatibility

- Support latest 2 versions of Chrome, Firefox, Safari, Edge
- Responsive design for mobile, tablet, desktop
- Dark mode support

## 5. Technical Constraints

- Must use existing API endpoints
- Must maintain backward compatibility with existing onboarding flow
- Must use Next.js and React best practices
- Must follow TypeScript strict mode
- Must use existing UI components from `@/components/ui`

## 6. Dependencies

- Existing API endpoints:
  - `GET /tenants/:tenantId/onboarding-status`
  - `GET /tenants/:tenantId`
  - `POST /tenants/:tenantId/onboarding/steps/:stepId/complete`
  - `PUT /tenants/:tenantId/settings`
  - `PUT /tenants/:tenantId/settings/attendance`
  - `POST /user-invitations/bulk-invite`

## 7. Out of Scope

- Changing the onboarding flow or steps
- Modifying backend API endpoints
- Adding new onboarding steps
- Changing the data structure of onboarding status

## 8. Success Metrics

- API calls reduced by 90% (from ~20+ to 2-3 per page load)
- Page load time improved by 50%
- Zero console errors or warnings
- 100% design system compliance
- User satisfaction score > 4.5/5

## 9. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing functionality | High | Low | Thorough testing of all onboarding steps |
| Performance regression | Medium | Low | Performance monitoring and testing |
| Design inconsistencies | Low | Medium | Follow design system checklist |

## 10. Acceptance Criteria Summary

✅ **Must Have**:
- Fix infinite API call loop
- Update to Evelya/Polaris/Solstice design
- Maintain all existing functionality
- Support dark mode
- Pass accessibility standards

⚠️ **Should Have**:
- Improved loading states
- Better error handling
- Smooth animations

💡 **Nice to Have**:
- Progress persistence in localStorage
- Auto-save draft data
- Keyboard shortcuts

## 11. Validation Plan

### Testing Checklist

- [ ] API calls are minimal (network tab verification)
- [ ] All 6 onboarding steps work correctly
- [ ] Data is properly saved at each step
- [ ] Navigation between steps works
- [ ] Skip optional steps works
- [ ] Dark mode works correctly
- [ ] Responsive design works on all screen sizes
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] No console errors or warnings

### Design Validation

- [ ] Colors match Evelya palette
- [ ] Spacing follows Polaris scale
- [ ] Typography uses Inter font
- [ ] Buttons match Polaris patterns
- [ ] Cards match Polaris patterns
- [ ] Gradients use Solstice effects
- [ ] Dark mode colors are correct
- [ ] Accessibility contrast ratios pass

## 12. Documentation Updates

- Update `docs/features/onboarding-optimization.md` with new optimizations
- Add performance metrics to documentation
- Document design system usage
- Update component usage examples

---

**Next Steps**: Create design document with technical implementation details
