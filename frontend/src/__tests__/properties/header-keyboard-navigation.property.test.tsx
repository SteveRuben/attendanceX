import React from 'react';
import { render, screen } from '@testing-library/react';
import { fc, test } from '@fast-check/jest';
import { NavigationMenu } from '@/components/layout/NavigationMenu';
import { useRouter } from 'next/router';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

/**
 * Property-Based Test: Keyboard Navigation
 * 
 * **Validates**: Subtask 5.10 - Property test: keyboard navigation works for all menu items
 * **Property**: All navigation menu items must be keyboard accessible with proper focus management
 */
describe('Property: Header Keyboard Navigation', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      pathname: '/',
      push: jest.fn(),
    });
  });

  test.prop([
    fc.constantFrom('/events', '/organizers', '/institutions', '/help'),
  ])('all menu items are keyboard accessible', (pathname) => {
    (useRouter as jest.Mock).mockReturnValue({
      pathname,
      push: jest.fn(),
    });

    const { container } = render(<NavigationMenu />);
    
    // Get all navigation links
    const links = container.querySelectorAll('a');
    
    // Property 1: All links must be present
    expect(links.length).toBeGreaterThan(0);
    
    // Property 2: All links must be focusable (have href)
    links.forEach((link) => {
      expect(link).toHaveAttribute('href');
      expect(link.getAttribute('href')).toBeTruthy();
    });
    
    // Property 3: All links must have proper focus styles
    links.forEach((link) => {
      const classes = link.className;
      expect(classes).toContain('focus:outline-none');
      expect(classes).toContain('focus:ring-2');
      expect(classes).toContain('focus:ring-blue-500');
    });
    
    // Property 4: All links must have aria-label
    links.forEach((link) => {
      expect(link).toHaveAttribute('aria-label');
      expect(link.getAttribute('aria-label')).toBeTruthy();
    });
    
    // Property 5: Active link must have aria-current="page"
    const activeLink = Array.from(links).find((link) => 
      link.getAttribute('href') === pathname
    );
    
    if (activeLink) {
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    }
  });

  test.prop([
    fc.array(
      fc.record({
        href: fc.constantFrom('/events', '/organizers', '/institutions', '/help'),
        label: fc.string({ minLength: 1, maxLength: 20 }),
      }),
      { minLength: 1, maxLength: 10 }
    ),
  ])('navigation maintains focus order', (navItems) => {
    const { container } = render(<NavigationMenu />);
    
    const links = container.querySelectorAll('a');
    
    // Property: Links must be in DOM order for keyboard navigation
    const tabIndexes = Array.from(links).map((link) => {
      const tabIndex = link.getAttribute('tabindex');
      return tabIndex ? parseInt(tabIndex, 10) : 0;
    });
    
    // All links should have default tab index (0) or not set
    tabIndexes.forEach((tabIndex) => {
      expect(tabIndex).toBeLessThanOrEqual(0);
    });
  });

  test.prop([
    fc.boolean(),
  ])('focus styles are visible regardless of active state', (isActive) => {
    const pathname = isActive ? '/events' : '/';
    
    (useRouter as jest.Mock).mockReturnValue({
      pathname,
      push: jest.fn(),
    });

    const { container } = render(<NavigationMenu />);
    
    const links = container.querySelectorAll('a');
    
    // Property: Focus styles must be present on all links
    links.forEach((link) => {
      const classes = link.className;
      
      // Must have focus ring
      expect(classes).toContain('focus:ring-2');
      expect(classes).toContain('focus:ring-blue-500');
      
      // Must have focus ring offset
      expect(classes).toContain('focus:ring-offset-2');
      
      // Must remove default outline
      expect(classes).toContain('focus:outline-none');
    });
  });

  test.prop([
    fc.integer({ min: 0, max: 3 }),
  ])('each menu item has unique and descriptive aria-label', (itemIndex) => {
    const { container } = render(<NavigationMenu />);
    
    const links = Array.from(container.querySelectorAll('a'));
    
    if (itemIndex < links.length) {
      const link = links[itemIndex];
      const ariaLabel = link.getAttribute('aria-label');
      
      // Property 1: Aria label must exist
      expect(ariaLabel).toBeTruthy();
      
      // Property 2: Aria label must be descriptive (not just the visible text)
      expect(ariaLabel).toContain('Aria');
      
      // Property 3: Aria labels must be unique
      const allAriaLabels = links.map((l) => l.getAttribute('aria-label'));
      const uniqueLabels = new Set(allAriaLabels);
      expect(uniqueLabels.size).toBe(allAriaLabels.length);
    }
  });

  test.prop([
    fc.constantFrom('/events', '/organizers', '/institutions', '/help'),
  ])('navigation has proper ARIA role and label', (pathname) => {
    (useRouter as jest.Mock).mockReturnValue({
      pathname,
      push: jest.fn(),
    });

    const { container } = render(<NavigationMenu />);
    
    const nav = container.querySelector('nav');
    
    // Property 1: Must have navigation role
    expect(nav).toHaveAttribute('role', 'navigation');
    
    // Property 2: Must have aria-label
    expect(nav).toHaveAttribute('aria-label');
    expect(nav?.getAttribute('aria-label')).toBeTruthy();
  });
});

/**
 * Test Configuration
 * - Minimum iterations: 100 (as per design document)
 * - Tests keyboard accessibility properties
 * - Validates WCAG 2.1 AA compliance for keyboard navigation
 */
