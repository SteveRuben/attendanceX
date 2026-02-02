'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Calendar, Users, Building2, HelpCircle, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '../ui/LanguageSelector';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

/**
 * MobileMenu Component
 * 
 * Slide-in mobile navigation menu with full-screen overlay.
 * Includes navigation links, language selector, and auth buttons.
 * Implements focus trap and keyboard navigation.
 * 
 * **Validates**: Requirements 10.4, 10.5, 10.8
 */
export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
}) => {
  const { t } = useTranslation(['common']);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLAnchorElement>(null);

  const navItems = [
    {
      href: '/events',
      label: t('common:nav.events'),
      icon: Calendar,
      ariaLabel: t('common:nav.eventsAria'),
    },
    {
      href: '/organizers',
      label: t('common:nav.organizers'),
      icon: Users,
      ariaLabel: t('common:nav.organizersAria'),
    },
    {
      href: '/institutions',
      label: t('common:nav.institutions'),
      icon: Building2,
      ariaLabel: t('common:nav.institutionsAria'),
    },
    {
      href: '/help',
      label: t('common:nav.help'),
      icon: HelpCircle,
      ariaLabel: t('common:nav.helpAria'),
    },
  ];

  const isActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  // Focus trap
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={t('common:header.mobileMenu')}
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div
        ref={menuRef}
        id="mobile-menu"
        className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 shadow-xl transform transition-transform duration-300 ease-out overflow-y-auto"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('common:header.menu')}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={t('common:header.closeMenu')}
            >
              <span className="sr-only">{t('common:header.closeMenu')}</span>
              <svg
                className="h-6 w-6 text-slate-700 dark:text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2" role="navigation">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={index === 0 ? firstFocusableRef : undefined}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-base
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                  onClick={onClose}
                  aria-label={item.ariaLabel}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Language Selector */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="mb-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('common:header.language')}
              </span>
            </div>
            <LanguageSelector />
          </div>

          {/* Auth Buttons */}
          <div className="p-4 space-y-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => {
                onLogin();
                onClose();
              }}
              className="w-full h-12 flex items-center justify-center gap-2 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
              aria-label={t('common:header.login')}
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              <span>{t('common:header.login')}</span>
            </Button>
            <Button
              onClick={() => {
                onRegister();
                onClose();
              }}
              className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
              aria-label={t('common:header.register')}
            >
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              <span>{t('common:header.register')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
