import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import { FixedHeader } from '@/components/layout/FixedHeader';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock next-i18next
jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock child components
jest.mock('@/components/layout/NavigationMenu', () => ({
  NavigationMenu: () => <div data-testid="navigation-menu">Navigation Menu</div>,
}));

jest.mock('@/components/layout/MobileMenu', () => ({
  MobileMenu: ({ isOpen, onClose }: any) => (
    isOpen ? <div data-testid="mobile-menu" onClick={onClose}>Mobile Menu</div> : null
  ),
}));

jest.mock('@/components/layout/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="language-selector">Language Selector</div>,
}));

describe('FixedHeader', () => {
  const mockPush = jest.fn();
  const mockRouterEvents = {
    on: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/',
      events: mockRouterEvents,
    });
    mockPush.mockClear();
    mockRouterEvents.on.mockClear();
    mockRouterEvents.off.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the header with logo', () => {
      render(<FixedHeader />);
      
      const logo = screen.getByText('AttendanceX');
      expect(logo).toBeInTheDocument();
    });

    it('should render navigation menu on desktop', () => {
      render(<FixedHeader />);
      
      const navMenu = screen.getByTestId('navigation-menu');
      expect(navMenu).toBeInTheDocument();
    });

    it('should render language selector', () => {
      render(<FixedHeader />);
      
      const languageSelector = screen.getByTestId('language-selector');
      expect(languageSelector).toBeInTheDocument();
    });

    it('should render auth buttons', () => {
      render(<FixedHeader />);
      
      const loginButton = screen.getByLabelText('common:header.login');
      const registerButton = screen.getByLabelText('common:header.register');
      
      expect(loginButton).toBeInTheDocument();
      expect(registerButton).toBeInTheDocument();
    });

    it('should render mobile menu button', () => {
      render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      expect(menuButton).toBeInTheDocument();
    });

    it('should render spacer div', () => {
      const { container } = render(<FixedHeader />);
      
      const spacer = container.querySelector('[aria-hidden="true"]');
      expect(spacer).toBeInTheDocument();
    });
  });

  describe('Scroll Detection', () => {
    it('should not have shadow class initially', () => {
      render(<FixedHeader />);
      
      const header = screen.getByRole('banner');
      expect(header).not.toHaveClass('shadow-md');
    });

    it('should add shadow class when scrolled', async () => {
      render(<FixedHeader />);
      
      const header = screen.getByRole('banner');
      
      // Simulate scroll
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
      fireEvent.scroll(window);
      
      await waitFor(() => {
        expect(header).toHaveClass('shadow-md');
      });
    });

    it('should remove shadow class when scrolled back to top', async () => {
      render(<FixedHeader />);
      
      const header = screen.getByRole('banner');
      
      // Scroll down
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true });
      fireEvent.scroll(window);
      
      await waitFor(() => {
        expect(header).toHaveClass('shadow-md');
      });
      
      // Scroll back to top
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
      fireEvent.scroll(window);
      
      await waitFor(() => {
        expect(header).not.toHaveClass('shadow-md');
      });
    });
  });

  describe('Mobile Menu Toggle', () => {
    it('should open mobile menu when button is clicked', () => {
      render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      fireEvent.click(menuButton);
      
      const mobileMenu = screen.getByTestId('mobile-menu');
      expect(mobileMenu).toBeInTheDocument();
    });

    it('should close mobile menu when close button is clicked', () => {
      render(<FixedHeader />);
      
      // Open menu
      const menuButton = screen.getByLabelText('common:header.openMenu');
      fireEvent.click(menuButton);
      
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      
      // Close menu
      const closeButton = screen.getByLabelText('common:header.closeMenu');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
    });

    it('should toggle menu icon when menu is opened/closed', () => {
      render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      
      // Initially shows Menu icon
      expect(menuButton).toBeInTheDocument();
      
      // Click to open
      fireEvent.click(menuButton);
      
      // Now shows X icon
      const closeButton = screen.getByLabelText('common:header.closeMenu');
      expect(closeButton).toBeInTheDocument();
    });

    it('should prevent body scroll when mobile menu is open', () => {
      render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      fireEvent.click(menuButton);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when mobile menu is closed', () => {
      render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      fireEvent.click(menuButton);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      const closeButton = screen.getByLabelText('common:header.closeMenu');
      fireEvent.click(closeButton);
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Auth Buttons', () => {
    it('should navigate to login page when login button is clicked', () => {
      render(<FixedHeader />);
      
      const loginButton = screen.getByLabelText('common:header.login');
      fireEvent.click(loginButton);
      
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    it('should navigate to register page when register button is clicked', () => {
      render(<FixedHeader />);
      
      const registerButton = screen.getByLabelText('common:header.register');
      fireEvent.click(registerButton);
      
      expect(mockPush).toHaveBeenCalledWith('/auth/register');
    });
  });

  describe('Logo', () => {
    it('should have correct aria-label', () => {
      render(<FixedHeader />);
      
      const logo = screen.getByLabelText('common:header.logoAria');
      expect(logo).toBeInTheDocument();
    });

    it('should link to homepage', () => {
      render(<FixedHeader />);
      
      const logo = screen.getByLabelText('common:header.logoAria');
      expect(logo).toHaveAttribute('href', '/');
    });
  });

  describe('Accessibility', () => {
    it('should have role="banner" on header', () => {
      render(<FixedHeader />);
      
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    it('should have proper aria-expanded on mobile menu button', () => {
      render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(menuButton);
      
      const closeButton = screen.getByLabelText('common:header.closeMenu');
      expect(closeButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-controls on mobile menu button', () => {
      render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-menu');
    });

    it('should have focus styles on interactive elements', () => {
      render(<FixedHeader />);
      
      const logo = screen.getByLabelText('common:header.logoAria');
      expect(logo).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Route Change Handling', () => {
    it('should register route change listener', () => {
      render(<FixedHeader />);
      
      expect(mockRouterEvents.on).toHaveBeenCalledWith('routeChangeStart', expect.any(Function));
    });

    it('should unregister route change listener on unmount', () => {
      const { unmount } = render(<FixedHeader />);
      
      unmount();
      
      expect(mockRouterEvents.off).toHaveBeenCalledWith('routeChangeStart', expect.any(Function));
    });
  });

  describe('Cleanup', () => {
    it('should remove scroll listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<FixedHeader />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('should restore body overflow on unmount', () => {
      const { unmount } = render(<FixedHeader />);
      
      const menuButton = screen.getByLabelText('common:header.openMenu');
      fireEvent.click(menuButton);
      
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      
      expect(document.body.style.overflow).toBe('');
    });
  });
});
