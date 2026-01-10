# Event Address Form Enhancement

## Modification Completed
Updated the event creation form address section for physical and hybrid events to include detailed address fields with ISO2 country codes as requested by the backend validation.

## Changes Made

### 1. Updated Address Structure
**File**: `frontend-v2/src/pages/app/events/create.tsx`

**Before**: Simple string address field
```typescript
address?: string
```

**After**: Structured address object with ISO2 country codes
```typescript
address?: {
  street: string        // Required
  city: string         // Required  
  country: string      // Required (ISO2 code: FR, US, CA, etc.)
  postalCode: string   // Optional
  province: string     // Optional
}
```

### 2. Enhanced Form Fields
When location type is "Présentiel" (Physical) or "Hybride" (Hybrid), the form now displays:

- **Rue** (Street) - Required field
- **Ville** (City) - Required field  
- **Pays** (Country) - Required dropdown with ISO2 codes (FR, US, CA, etc.)
- **Code postal** (Postal Code) - Optional field
- **Province/État** (Province/State) - Optional field

### 3. Country Selection
- **Dropdown with 249 countries** in French with ISO2 codes
- **Default selection**: France (FR)
- **Backend compatible**: Sends ISO2 codes (FR, US, CA, etc.) instead of full country names
- **User-friendly**: Displays full country names in French

### 4. Event Type Behavior
- **Présentiel**: Shows address fields only
- **Virtuel**: Shows virtual meeting URL only
- **Hybride**: Shows BOTH address fields AND virtual meeting URL

### 5. Form Validation
Added validation for required address fields:
- Street address is required for physical and hybrid events
- City is required for physical and hybrid events
- Country is required for physical and hybrid events (validates ISO2 format)
- Postal code and province are optional

### 6. Updated Interface Compatibility
**File**: `frontend-v2/src/services/eventsService.ts`

Updated `CreateEventPayload` interface to support the new address structure:
```typescript
address?: string | {
  street: string
  city: string
  country: string      // ISO2 code
  postalCode?: string
  province?: string
}
```

### 7. Form Behavior
- **Auto-initialization**: When switching to "Présentiel" or "Hybride", address fields are automatically initialized with default country (FR)
- **Auto-cleanup**: When switching to "Virtuel", address fields are cleared; when switching to "Présentiel", virtual URL is cleared
- **Validation**: Form validates required address fields before submission for physical and hybrid events
- **Focus management**: Automatically scrolls to and focuses on missing required fields
- **Data preparation**: Properly formats address data with ISO2 country codes for backend compatibility

## Backend Compatibility
- **Country codes**: Sends ISO2 format (FR, US, CA, etc.) as required by backend validation
- **Error handling**: Resolves "Code pays sur 2 caractères" validation error
- **Data format**: Compatible with existing backend address validation schema

## User Experience
- Clear field labels in French
- Required fields marked with asterisk (*)
- Optional fields clearly indicated
- Country dropdown with searchable full names
- Responsive grid layout (1 column on mobile, 2 columns on desktop)
- Smooth validation with focus management
- Dynamic form sections based on event type

## Technical Implementation
- TypeScript interfaces properly updated
- Form state management enhanced
- Validation logic integrated for both physical and hybrid events
- Backend compatibility maintained with ISO2 country codes
- No breaking changes to existing functionality
- Proper cleanup when switching between event types
- Complete country list with 249 countries in French

## Files Modified
1. `frontend-v2/src/pages/app/events/create.tsx` - Main form component with country dropdown
2. `frontend-v2/src/services/eventsService.ts` - Interface definitions

## Testing Recommendations
1. Test form validation for physical events
2. Test form validation for hybrid events (both address and virtual URL)
3. Verify country dropdown functionality and ISO2 code submission
4. Test switching between all location types (physical, virtual, hybrid)
5. Verify backend integration with ISO2 country codes
6. Test responsive layout on different screen sizes
7. Test auto-generation of meeting links for hybrid events
8. Verify default country selection (France - FR)

The address form now provides a comprehensive and user-friendly way to collect detailed location information for both physical and hybrid events with proper ISO2 country code support, resolving backend validation requirements while maintaining backward compatibility.