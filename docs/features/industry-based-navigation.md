# Industry-Based Navigation System

## Overview

The industry-based navigation system automatically customizes the sidebar navigation menu based on the organization's industry profile. This ensures that users see the most relevant features first while hiding less relevant functionality.

## How It Works

### 1. Industry Configuration
During onboarding, organizations select their industry from a predefined list:
- Education
- Healthcare  
- Corporate
- Government
- Non-Profit
- Technology
- Finance
- Retail
- Manufacturing
- Hospitality
- Consulting
- Other

### 2. Navigation Prioritization
Each industry has a specific navigation configuration that categorizes menu items into:

- **Core Items**: Essential features always visible and shown first
- **Priority Items**: Important features for the industry, prominently displayed
- **Secondary Items**: Useful features shown after core and priority items
- **Hidden Items**: Features not relevant to the industry, completely hidden

### 3. Dynamic Menu Rendering
The sidebar component automatically:
- Filters out hidden items
- Sorts items by priority (core → priority → secondary)
- Applies visual emphasis to core and priority items
- Maintains permission-based access control

## Industry Configurations

### Education
- **Focus**: Events, attendance tracking, student management
- **Core**: Dashboard, Events, Attendance, Users
- **Priority**: Events, Attendance, Reports, Campaigns
- **Hidden**: Timesheets (not relevant for educational institutions)

### Healthcare
- **Focus**: Staff attendance, compliance reporting
- **Core**: Dashboard, Attendance, Users, Reports
- **Priority**: Attendance, Timesheets, Reports, Organization
- **Hidden**: Check-in (security concerns in medical facilities)

### Corporate
- **Focus**: Employee time tracking, productivity analytics
- **Core**: Dashboard, Timesheets, Attendance, Users
- **Priority**: Timesheets, Attendance, Reports, Analytics
- **Hidden**: None (corporate environments need full functionality)

### Technology
- **Focus**: Project time tracking, team analytics
- **Core**: Dashboard, Timesheets, Users, Analytics
- **Priority**: Timesheets, Analytics, Reports, Attendance
- **Hidden**: None (tech companies value comprehensive data)

### Non-Profit
- **Focus**: Event management, volunteer coordination
- **Core**: Dashboard, Events, Users, Campaigns
- **Priority**: Events, Campaigns, Attendance, Organization
- **Hidden**: None (diverse needs require flexibility)

## Implementation Details

### Files Structure
```
frontend-v2/src/
├── types/industry-config.ts           # Industry types and configurations
├── hooks/useIndustryNavigation.ts     # Navigation logic hook
├── components/navigation/
│   ├── Sidebar.tsx                    # Updated sidebar with industry filtering
│   └── IndustryNavigationInfo.tsx     # Admin info component
└── pages/app/settings/navigation/
    └── index.tsx                      # Navigation settings page
```

### Key Components

#### `useIndustryNavigation` Hook
- Reads industry from tenant context
- Provides filtering and prioritization functions
- Returns navigation configuration for current industry

#### Updated Sidebar Component
- Uses industry hook to filter navigation items
- Applies visual emphasis to priority items
- Maintains existing permission system
- Shows industry indicator in development mode

#### Navigation Settings Page
- Allows admins to change industry configuration
- Shows current navigation layout
- Provides help documentation
- Restricted to owner/admin roles

### Data Flow
1. Industry selected during onboarding → saved to tenant settings
2. Tenant context provides industry to navigation hook
3. Hook filters and sorts navigation items
4. Sidebar renders customized menu
5. Settings page allows industry changes

## Usage Examples

### For Developers
```typescript
// Get current industry navigation configuration
const { industry, filterNavItems, getNavItemPriority } = useIndustryNavigation()

// Filter navigation items
const customNav = filterNavItems(originalNavItems)

// Check item priority
const priority = getNavItemPriority('timesheets') // 'core' | 'priority' | 'secondary' | 'hidden'
```

### For Administrators
1. Go to Settings → Navigation
2. Select appropriate industry
3. Review navigation layout
4. Save changes
5. Navigation updates immediately

## Benefits

### For Users
- **Focused Experience**: See only relevant features
- **Improved Productivity**: Important features are easily accessible
- **Reduced Complexity**: Less cognitive load from irrelevant options

### For Organizations
- **Industry-Specific Workflows**: Navigation matches business processes
- **Faster Onboarding**: New users find relevant features quickly
- **Better Adoption**: Users engage more with tailored interfaces

### For Administrators
- **Easy Configuration**: Simple industry selection
- **Flexible Management**: Can change industry as organization evolves
- **Clear Overview**: Visual representation of navigation structure

## Customization

### Adding New Industries
1. Add industry to `Industry` type in `industry-config.ts`
2. Add configuration to `INDUSTRY_NAV_CONFIG`
3. Add display info to `INDUSTRY_INFO`
4. Update onboarding industry list

### Modifying Industry Configurations
Edit the configuration in `INDUSTRY_NAV_CONFIG`:
```typescript
education: {
  core: ['dashboard', 'events', 'attendance', 'users'],
  priority: ['events', 'attendance', 'reports'],
  secondary: ['organization', 'analytics'],
  hidden: ['timesheets']
}
```

### Adding New Navigation Items
1. Add item to main `NAV` array in `Sidebar.tsx`
2. Update relevant industry configurations
3. Test with different industry settings

## Future Enhancements

### Planned Features
- **Custom Navigation**: Allow organizations to create custom navigation layouts
- **Role-Based Variations**: Different navigation for different user roles within same industry
- **Usage Analytics**: Track which features are used most by industry
- **Smart Recommendations**: Suggest navigation changes based on usage patterns

### Technical Improvements
- **Caching**: Cache navigation configurations for better performance
- **A/B Testing**: Test different navigation layouts for optimization
- **Accessibility**: Enhanced keyboard navigation and screen reader support
- **Mobile Optimization**: Industry-specific mobile navigation patterns

## Troubleshooting

### Common Issues

**Navigation not updating after industry change**
- Refresh the page or check tenant context refresh
- Verify industry is saved in tenant settings

**Items still showing when they should be hidden**
- Check permission system - permissions override industry settings
- Verify item ID matches configuration exactly

**Settings page not accessible**
- Ensure user has owner or admin role
- Check navigation item permissions

### Development Tips
- Use development mode industry indicator to debug
- Check browser console for navigation filtering logs
- Test with different industry configurations
- Verify tenant context provides correct industry data

## Migration Guide

### Existing Organizations
Organizations created before this feature will:
1. Default to 'other' industry configuration
2. See all navigation items (backward compatibility)
3. Can set industry in navigation settings
4. Experience immediate navigation changes after setting industry

### Database Updates
No database migration required - industry field added to tenant settings schema with optional typing.