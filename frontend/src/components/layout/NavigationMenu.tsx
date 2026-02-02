'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Calendar, Users, Building2, HelpCircle } from 'lucide-react';

/**
 * NavigationMenu Component
 * 
 * Desktop navigation menu with links to main sections.
 * Highlights active route and provides keyboard navigation.
 * 
 * **Validates**: Requirements 10.3, 10.4
 */
export const NavigationMenu: React.FC = () => {
  const { t } = useTranslation(['common']);
  const router = useRouter();

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

  return (
    <nav
      className="flex items-center gap-1"
      role="navigation"
      aria-label={t('common:nav.mainNavigation')}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }
            `}
            aria-label={item.ariaLabel}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
