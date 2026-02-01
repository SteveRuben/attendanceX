# Design: Onboarding Optimization & Style Update

## 1. Overview

**Feature**: Onboarding Optimization & Style Update  
**Status**: Draft  
**Created**: 2026-02-01

### Problem Analysis

The current implementation has a critical bug in the `useEffect` hook at line 183:

```typescript
useEffect(() => {
  // ... code ...
  ;(async () => {
    try {
      await fetchOnboardingStatus(id)
    } finally {
      setLoading(false)
    }
  })()
}, [status, router, router.query.tenantId, detectedTz, fetchOnboardingStatus])
//                                                      ^^^^^^^^^^^^^^^^^^^^
//                                                      This causes infinite loop!
```

**Root Cause**: `fetchOnboardingStatus` is included in the dependency array, but it's not memoized. Every render creates a new function reference, triggering the effect again, which creates an infinite loop.

### Solution Strategy

1. **Fix the infinite loop** by properly memoizing functions with `useCallback`
2. **Update design system** to use Evelya/Polaris/Solstice standards
3. **Optimize performance** with proper state management
4. **Improve UX** with better loading states and transitions

## 2. Technical Architecture

### 2.1 Component Structure

```
TenantSetup (Main Component)
├── State Management
│   ├── Session & Auth (useSession, useAuthZ)
│   ├── Tenant Context (useTenant)
│   ├── Onboarding State (onboardingStatus, currentStepId)
│   ├── Form States (organizationData, settings, policy, invites)
│   └── UI State (loading, submitting)
├── Memoized Values (useMemo)
│   ├── timezones
│   ├── locales
│   ├── currencies
│   ├── detectedTz
│   ├── currentStep
│   └── currentStepIndex
├── Memoized Callbacks (useCallback)
│   ├── fetchOnboardingStatus
│   ├── fetchTenantData
│   ├── goToNextStep
│   ├── goToPreviousStep
│   └── Step completion handlers
└── Render
    ├── Progress Indicator
    └── Step Content (conditional)
```

### 2.2 Data Flow

```
Initial Load:
1. useEffect triggers (once)
2. fetchOnboardingStatus(tenantId)
3. fetchTenantData(tenantId) - pre-fill forms
4. setOnboardingStatus + setCurrentStepId
5. Render current step

Step Completion:
1. User submits form
2. API call to save data
3. fetchOnboardingStatus(tenantId) - refresh status
4. goToNextStep() - update UI
5. Render next step
```

## 3. Implementation Details

### 3.1 Fix Infinite Loop

**Current Code (Broken)**:
```typescript
const fetchOnboardingStatus = async (id: string) => {
  // ... implementation
}

useEffect(() => {
  // ...
  await fetchOnboardingStatus(id)
}, [status, router, router.query.tenantId, detectedTz, fetchOnboardingStatus])
```

**Fixed Code**:
```typescript
// Memoize the function with useCallback
const fetchOnboardingStatus = useCallback(async (id: string) => {
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    const response = await apiClient.get(`/tenants/${id}/onboarding-status`, { 
      withAuth: true,
      accessToken 
    })
    
    const status = response as OnboardingStatus
    setOnboardingStatus(status)
    
    if (status.completed) {
      router.replace('/app')
      return
    }

    // Déterminer l'étape actuelle
    if (status.nextStep) {
      setCurrentStepId(status.nextStep.id)
    } else {
      const nextStep = status.steps.find(step => !step.completed)
      if (nextStep) {
        setCurrentStepId(nextStep.id)
      }
    }

    // Récupérer les données du tenant pour pré-remplir
    await fetchTenantData(id)
  } catch (error) {
    console.error('Error fetching onboarding status:', error)
  }
}, [router]) // Only router in dependencies

const fetchTenantData = useCallback(async (id: string) => {
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    const tenantResponse = await apiClient.get(`/tenants/${id}`, { 
      withAuth: true,
      accessToken 
    })
    
    if (tenantResponse) {
      if (tenantResponse.name) {
        setOrganizationData(prev => ({ ...prev, name: tenantResponse.name }))
      }
      if (tenantResponse.description) {
        setOrganizationData(prev => ({ ...prev, description: tenantResponse.description }))
      }
      
      if (tenantResponse.settings) {
        const { timezone, locale, currency, dateFormat, timeFormat } = tenantResponse.settings
        setSettings(prev => ({
          ...prev,
          ...(timezone && { timezone }),
          ...(locale && { locale }),
          ...(currency && { currency }),
          ...(dateFormat && { dateFormat }),
          ...(timeFormat && { timeFormat })
        }))
      }
    }
  } catch (error) {
    console.log('Could not fetch tenant data for pre-filling:', error)
  }
}, [])

// Fixed useEffect - no function in dependencies
useEffect(() => {
  if (status !== 'authenticated') return
  
  const queryTenantId = router.query.tenantId as string | undefined
  const storedTenantId = typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null
  const id = queryTenantId || storedTenantId
  
  if (!id) {
    router.replace('/choose-tenant')
    return
  }
  
  if (queryTenantId && typeof window !== 'undefined') {
    localStorage.setItem('currentTenantId', queryTenantId)
  }
  
  setTenantId(id)
  
  // Initialize timezone with detected value
  setSettings(s => ({ ...s, timezone: detectedTz }))
  
  // Fetch onboarding status once
  ;(async () => {
    try {
      await fetchOnboardingStatus(id)
    } finally {
      setLoading(false)
    }
  })()
}, [status, router.query.tenantId, detectedTz, fetchOnboardingStatus])
// Now fetchOnboardingStatus is stable (memoized)
```

### 3.2 Memoize Navigation Functions

```typescript
const goToNextStep = useCallback(() => {
  if (!onboardingStatus) return
  const currentIndex = onboardingStatus.steps.findIndex(step => step.id === currentStepId)
  const nextIndex = currentIndex + 1
  if (nextIndex < onboardingStatus.steps.length) {
    setCurrentStepId(onboardingStatus.steps[nextIndex].id)
  }
}, [currentStepId, onboardingStatus])

const goToPreviousStep = useCallback(() => {
  if (!onboardingStatus) return
  const currentIndex = onboardingStatus.steps.findIndex(step => step.id === currentStepId)
  const prevIndex = currentIndex - 1
  if (prevIndex >= 0) {
    setCurrentStepId(onboardingStatus.steps[prevIndex].id)
  }
}, [currentStepId, onboardingStatus])
```

### 3.3 Optimize Step Completion Handlers

```typescript
const completeWelcome = useCallback(async () => {
  if (!tenantId) return
  setSubmitting(true)
  try {
    const session = await getSession()
    const accessToken = (session as any)?.accessToken
    
    await apiClient.post(`/tenants/${tenantId}/onboarding/steps/welcome/complete`, {}, { 
      withAuth: true,
      accessToken 
    })
    await fetchOnboardingStatus(tenantId)
    goToNextStep()
  } finally {
    setSubmitting(false)
  }
}, [tenantId, fetchOnboardingStatus, goToNextStep])

// Similar pattern for other step handlers...
```

## 4. Design System Updates

### 4.1 Color Palette (Evelya/Polaris)

**Replace**:
```typescript
// Old colors (non-standard)
className="bg-white text-gray-900 dark:bg-neutral-950"
className="text-neutral-600 dark:text-neutral-400"
className="border-neutral-300 dark:border-neutral-700"
```

**With**:
```typescript
// Evelya/Polaris colors
className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
className="text-slate-600 dark:text-slate-400"
className="border-slate-200 dark:border-slate-800"
```

### 4.2 Progress Indicator (Solstice Gradients)

**Current**:
```typescript
<div className="flex items-center gap-2">
  {onboardingStatus.steps.map((step) => (
    <div className={`px-3 py-2 rounded-lg border ${
      step.completed 
        ? 'border-green-500 bg-green-50' 
        : 'border-neutral-300'
    }`}>
      {/* ... */}
    </div>
  ))}
</div>
```

**Updated (Solstice)**:
```typescript
<div className="flex items-center gap-2 overflow-x-auto pb-2">
  {onboardingStatus.steps.map((step, index) => (
    <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
      <div className={`
        relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium
        transition-all duration-200
        ${step.completed 
          ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 text-green-700 dark:text-green-400 shadow-sm' 
          : step.id === currentStepId
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 text-blue-700 dark:text-blue-400 shadow-md'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }
      `}>
        {step.completed ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          getStepIcon(step.id)
        )}
        <span>{step.title}</span>
        {!step.required && (
          <span className="text-xs opacity-70">(Optional)</span>
        )}
      </div>
      {index < onboardingStatus.steps.length - 1 && (
        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
      )}
    </div>
  ))}
</div>
```

### 4.3 Card Styles (Polaris)

**Current**:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* ... */}
  </CardContent>
</Card>
```

**Updated**:
```typescript
<Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
  <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      Title
    </CardTitle>
    <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-2">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6 space-y-6">
    {/* ... */}
  </CardContent>
</Card>
```

### 4.4 Button Styles (Polaris)

**Primary Button**:
```typescript
<Button className="
  h-12 px-8 
  bg-blue-600 hover:bg-blue-700 active:bg-blue-800 
  text-white font-medium 
  rounded-lg 
  shadow-sm hover:shadow-md 
  transition-all duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Continue
</Button>
```

**Secondary Button**:
```typescript
<Button 
  variant="outline" 
  className="
    h-12 px-6 
    border-2 border-slate-300 dark:border-slate-700 
    hover:bg-slate-50 dark:hover:bg-slate-800 
    text-slate-700 dark:text-slate-300 
    font-medium rounded-lg 
    transition-colors duration-200
  "
>
  Back
</Button>
```

**Ghost Button**:
```typescript
<Button 
  variant="ghost" 
  className="
    h-12 px-6 
    hover:bg-slate-100 dark:hover:bg-slate-800 
    text-slate-600 dark:text-slate-400 
    font-medium rounded-lg 
    transition-colors duration-200
  "
>
  Skip for Now
</Button>
```

### 4.5 Input Styles (Polaris)

```typescript
<div className="space-y-2">
  <Label 
    htmlFor="input-id" 
    className="text-sm font-medium text-slate-700 dark:text-slate-300"
  >
    Label
  </Label>
  <Input
    id="input-id"
    className="
      h-12 px-4 
      rounded-lg 
      border-2 border-slate-300 dark:border-slate-700 
      focus:border-blue-500 dark:focus:border-blue-500 
      focus:ring-2 focus:ring-blue-500/20 
      bg-white dark:bg-slate-800 
      text-slate-900 dark:text-slate-100
      transition-colors duration-200
    "
    placeholder="Placeholder..."
  />
  <p className="text-xs text-slate-500 dark:text-slate-500">
    Helper text
  </p>
</div>
```

### 4.6 Feature Cards (Welcome Step)

**Current**:
```typescript
<div className="text-center p-4 border rounded-lg">
  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
  <h3 className="font-medium">Team Management</h3>
  <p className="text-sm">Description</p>
</div>
```

**Updated (Solstice)**:
```typescript
<div className="
  group relative 
  text-center p-6 
  border-2 border-slate-200 dark:border-slate-800 
  rounded-xl 
  bg-white dark:bg-slate-800 
  hover:border-blue-500 dark:hover:border-blue-500 
  hover:shadow-lg 
  transition-all duration-300 
  overflow-hidden
">
  {/* Gradient overlay on hover */}
  <div className="
    absolute inset-0 
    bg-gradient-to-br from-blue-500/5 to-cyan-500/5 
    opacity-0 group-hover:opacity-100 
    transition-opacity duration-300
  " />
  
  {/* Icon with gradient background */}
  <div className="
    relative inline-flex p-4 mb-4 
    rounded-2xl 
    bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 
    shadow-sm 
    group-hover:scale-110 
    transition-transform duration-300
  ">
    <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
  </div>
  
  <h3 className="relative text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
    Team Management
  </h3>
  <p className="relative text-sm text-slate-600 dark:text-slate-400">
    Invite and manage your team members
  </p>
</div>
```

## 5. Performance Optimizations

### 5.1 Memoized Computations

```typescript
// Memoize expensive computations
const currentStep = useMemo(() => 
  onboardingStatus?.steps.find(step => step.id === currentStepId),
  [onboardingStatus, currentStepId]
)

const currentStepIndex = useMemo(() => 
  onboardingStatus?.steps.findIndex(step => step.id === currentStepId) ?? -1,
  [onboardingStatus, currentStepId]
)

const progressPercentage = useMemo(() => 
  onboardingStatus 
    ? Math.round((onboardingStatus.completedSteps.length / onboardingStatus.totalSteps) * 100)
    : 0,
  [onboardingStatus]
)
```

### 5.2 Prevent Duplicate API Calls

```typescript
// Add ref to track if already fetching
const isFetchingRef = useRef(false)

const fetchOnboardingStatus = useCallback(async (id: string) => {
  if (isFetchingRef.current) return // Prevent duplicate calls
  
  isFetchingRef.current = true
  try {
    // ... fetch logic
  } finally {
    isFetchingRef.current = false
  }
}, [router])
```

### 5.3 Debounce Form Inputs (Optional Enhancement)

```typescript
import { useDebouncedCallback } from 'use-debounce'

const debouncedSaveOrganization = useDebouncedCallback(
  async (data: typeof organizationData) => {
    // Auto-save draft
    await apiClient.put(`/tenants/${tenantId}/settings/draft`, { settings: data })
  },
  1000 // 1 second delay
)

// Use in onChange
onChange={(e) => {
  const newData = { ...organizationData, name: e.target.value }
  setOrganizationData(newData)
  debouncedSaveOrganization(newData)
}}
```

## 6. Loading States

### 6.1 Initial Loading

```typescript
if (status !== 'authenticated' || loading || !tenantId || !onboardingStatus) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Loading your workspace...
        </p>
      </div>
    </div>
  )
}
```

### 6.2 Submitting State

```typescript
<Button 
  onClick={saveSettings} 
  disabled={submitting || !settings.timezone}
  className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
>
  {submitting ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Saving...
    </>
  ) : (
    'Continue'
  )}
</Button>
```

## 7. Accessibility Improvements

### 7.1 Focus Management

```typescript
// Focus first input when step changes
useEffect(() => {
  const firstInput = document.querySelector<HTMLInputElement>('input:not([disabled])')
  if (firstInput) {
    firstInput.focus()
  }
}, [currentStepId])
```

### 7.2 ARIA Labels

```typescript
<div 
  role="progressbar" 
  aria-valuenow={onboardingStatus.currentStep} 
  aria-valuemin={1} 
  aria-valuemax={onboardingStatus.totalSteps}
  aria-label={`Onboarding progress: step ${onboardingStatus.currentStep} of ${onboardingStatus.totalSteps}`}
>
  {/* Progress indicator */}
</div>
```

### 7.3 Keyboard Navigation

```typescript
// Add keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && !submitting) {
      goToNextStep()
    } else if (e.key === 'ArrowLeft' && !submitting) {
      goToPreviousStep()
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [goToNextStep, goToPreviousStep, submitting])
```

## 8. Error Handling

### 8.1 API Error States

```typescript
const [error, setError] = useState<string | null>(null)

const fetchOnboardingStatus = useCallback(async (id: string) => {
  try {
    setError(null)
    // ... fetch logic
  } catch (error: any) {
    console.error('Error fetching onboarding status:', error)
    setError('Failed to load onboarding status. Please refresh the page.')
  }
}, [router])

// Display error
{error && (
  <Alert variant="destructive" className="mb-6">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
describe('TenantSetup', () => {
  it('should not call API in infinite loop', async () => {
    const mockFetch = jest.fn()
    // ... test implementation
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
  
  it('should navigate to next step', () => {
    // ... test implementation
  })
  
  it('should pre-fill form data', () => {
    // ... test implementation
  })
})
```

### 9.2 Integration Tests

```typescript
describe('Onboarding Flow', () => {
  it('should complete all steps', async () => {
    // ... test full flow
  })
  
  it('should skip optional steps', async () => {
    // ... test skip functionality
  })
})
```

## 10. Correctness Properties

### Property 1: API Call Efficiency
**Validates: Requirements AC-1.1, AC-1.2, AC-1.3, AC-1.4**

```typescript
// Property: fetchOnboardingStatus should be called exactly once on mount
// and once after each step completion
describe('API Call Efficiency Property', () => {
  it('should call API minimal times', async () => {
    const apiCallCount = trackApiCalls('/tenants/:id/onboarding-status')
    
    // Mount component
    render(<TenantSetup />)
    await waitFor(() => expect(apiCallCount()).toBe(1))
    
    // Complete a step
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(apiCallCount()).toBe(2))
    
    // No additional calls
    await wait(2000)
    expect(apiCallCount()).toBe(2)
  })
})
```

### Property 2: Design System Compliance
**Validates: Requirements AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6**

```typescript
// Property: All elements should use Evelya/Polaris/Solstice design tokens
describe('Design System Compliance Property', () => {
  it('should use correct color palette', () => {
    const { container } = render(<TenantSetup />)
    
    // Check for Evelya colors (blue-600, slate-*)
    const buttons = container.querySelectorAll('button')
    buttons.forEach(button => {
      const classes = button.className
      expect(classes).toMatch(/blue-600|slate-\d+/)
      expect(classes).not.toMatch(/neutral-\d+|gray-\d+/)
    })
  })
  
  it('should support dark mode', () => {
    const { container } = render(<TenantSetup />)
    
    // Check for dark: variants
    const elements = container.querySelectorAll('[class*="dark:"]')
    expect(elements.length).toBeGreaterThan(0)
  })
})
```

### Property 3: State Consistency
**Validates: Requirements AC-3.1, AC-3.2, AC-3.3**

```typescript
// Property: State updates should be consistent and not cause infinite loops
describe('State Consistency Property', () => {
  it('should maintain consistent state', async () => {
    const renderCount = trackRenderCount()
    
    render(<TenantSetup />)
    await waitFor(() => expect(screen.getByText('Welcome')).toBeInTheDocument())
    
    // Should render reasonable number of times (< 10)
    expect(renderCount()).toBeLessThan(10)
  })
})
```

## 11. Migration Plan

### Phase 1: Fix Critical Bug (Day 1)
1. Add `useCallback` to `fetchOnboardingStatus`
2. Add `useCallback` to `fetchTenantData`
3. Fix `useEffect` dependencies
4. Test API call count
5. Deploy to production

### Phase 2: Update Design System (Day 2-3)
1. Update color palette
2. Update progress indicator
3. Update card styles
4. Update button styles
5. Update input styles
6. Test dark mode
7. Deploy to production

### Phase 3: Performance Optimizations (Day 4)
1. Add memoized computations
2. Add duplicate call prevention
3. Add loading states
4. Test performance
5. Deploy to production

### Phase 4: Enhancements (Day 5)
1. Add accessibility improvements
2. Add error handling
3. Add keyboard navigation
4. Write tests
5. Update documentation

## 12. Success Metrics

- ✅ API calls reduced from 25+ to 2-3 per page load
- ✅ Zero infinite loops
- ✅ 100% design system compliance
- ✅ Dark mode fully supported
- ✅ WCAG 2.1 AA compliant
- ✅ All tests passing

---

**Next Steps**: Create tasks.md with implementation checklist
