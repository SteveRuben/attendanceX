# Fix: Events Page Uncontrolled API Calls

## Problem
The events page at `http://localhost:3000/app/events` was making uncontrolled/repeated API calls to the backend endpoint `http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/events?page=1&limit=10`.

## Root Cause
The issue was in the `useNotify` hook in the notification system. The hook was returning a new object on every render, which caused:

1. **useEffect dependency issue**: The `notify` object was being recreated on every render
2. **Infinite re-renders**: This caused the useEffect in the events page to run repeatedly
3. **Multiple API calls**: Each useEffect run triggered a new API call

## Solution

### 1. Fixed useNotify Hook Memoization
**File**: `frontend-v2/src/components/ui/notification-system.tsx`

```typescript
// Before (causing re-renders)
export const useNotify = () => {
  const { addNotification } = useNotifications()
  return {
    success: (title, message, options) => addNotification({...}),
    error: (title, message, options) => addNotification({...}),
    // ... other methods
  }
}

// After (properly memoized)
export const useNotify = () => {
  const { addNotification } = useNotifications()
  return React.useMemo(() => ({
    success: (title, message, options) => addNotification({...}),
    error: (title, message, options) => addNotification({...}),
    // ... other methods
  }), [addNotification])
}
```

### 2. Simplified Events Page
**File**: `frontend-v2/src/pages/app/events/index.tsx`

- Removed unnecessary memoized notification wrapper functions
- Simplified useEffect dependencies to `[page, limit, notify]`
- Now that `notify` is properly memoized, it won't cause re-renders

### 3. Cleaned Up Debug Logs
**File**: `frontend-v2/src/services/eventsService.ts`

- Removed console.log statements that were cluttering the output
- Cleaned up the `getEvents` function

## Technical Details

### Why This Happened
1. **Object Identity**: JavaScript objects are compared by reference, not value
2. **useEffect Dependencies**: When a dependency changes (new object reference), useEffect runs again
3. **Render Cycle**: Each render created a new `notify` object → useEffect runs → API call → state update → re-render → cycle repeats

### The Fix
- **React.useMemo**: Ensures the notify object maintains the same reference between renders
- **Dependency Array**: `[addNotification]` ensures the memoized object only changes when the underlying function changes
- **Stable References**: All event handlers now have stable references, preventing unnecessary re-renders

## Result
- ✅ Events page now makes only one API call on mount and when page/limit changes
- ✅ No more uncontrolled/repeated API calls
- ✅ Better performance and user experience
- ✅ Clean console output without debug logs

## Testing
1. Navigate to `http://localhost:3000/app/events`
2. Check browser Network tab - should see only one API call
3. Change pages - should see one API call per page change
4. No repeated calls on component re-renders

## Files Modified
- `frontend-v2/src/components/ui/notification-system.tsx` - Fixed useNotify memoization
- `frontend-v2/src/pages/app/events/index.tsx` - Simplified event handlers and dependencies
- `frontend-v2/src/services/eventsService.ts` - Removed debug console.log statements