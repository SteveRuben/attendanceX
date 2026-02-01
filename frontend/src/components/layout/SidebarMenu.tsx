/**
 * Snon idebar Menu - Evelya-inspired Design
 * Menu latéral gauche fixe avec calendrier intégré
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { 
  Home,
  Calendar,
  Search,
  Heart,
  User,
  Settings,
  LogIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarMenuProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  selectedDate = new Date(),
  onDateSelect
}) => {
  const router = useRouter();
  const translation = useTranslation('common');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Safe translation function
  const t = (key: string, fallback: string = '') => {
    try {
      return translation?.t ? translation.t(key) : fallback;
    } catch {
      return fallback;
    }
  };

  // Navigation items
  const menuItems = [
    { name: t('nav.home', 'Home'), href: '/', icon: Home },
    { name: t('nav.events', 'Events'), href: '/events', icon: Calendar },
    { name: t('nav.search', 'Search'), href: '/search', icon: Search },
    { name: t('nav.favorites', 'Favorites'), href: '/favorites', icon: Heart },
  ];

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (onDateSelect) {
      onDateSelect(newDate);
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            AttendanceX
          </span>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                }
              `}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Calendar Widget */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePreviousMonth}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
            
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-slate-500 dark:text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const today = isToday(day);
              const selected = isSelected(day);

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square flex items-center justify-center text-xs rounded-lg
                    transition-all duration-200 font-medium
                    ${selected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : today
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }
                  `}
                  aria-label={`${day} ${monthNames[currentMonth.getMonth()]}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <Link
          href="/profile"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200"
        >
          <User className="h-5 w-5 flex-shrink-0" />
          <span>{t('nav.profile', 'Profile')}</span>
        </Link>

        <Link
          href="/settings"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200"
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span>{t('nav.settings', 'Settings')}</span>
        </Link>

        <Button
          onClick={() => router.push('/auth/login')}
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <LogIn className="h-4 w-4 mr-2" />
          {t('auth.login', 'Login')}
        </Button>
      </div>
    </aside>
  );
};
