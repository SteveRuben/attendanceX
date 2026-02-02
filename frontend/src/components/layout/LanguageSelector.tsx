'use client';

import React from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

/**
 * LanguageSelector Component for Header
 * 
 * Compact language selector with flag icons for FR/EN switching.
 * Persists language preference and updates route locale.
 * 
 * **Validates**: Requirements 10.5, 15.1, 15.2, 15.3
 */
export const LanguageSelector: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation(['common']);

  const languages = [
    {
      code: 'fr',
      name: 'Français',
      flag: '🇫🇷',
      ariaLabel: t('common:header.languageFrench'),
    },
    {
      code: 'en',
      name: 'English',
      flag: '🇬🇧',
      ariaLabel: t('common:header.languageEnglish'),
    },
  ];

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode: string) => {
    const { pathname, asPath, query } = router;
    
    // Change language in i18n
    await i18n.changeLanguage(languageCode);
    
    // Update route with new locale
    router.push({ pathname, query }, asPath, { locale: languageCode });
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', languageCode);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 gap-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={t('common:header.selectLanguage')}
        >
          <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" aria-hidden="true" />
          <span className="text-sm font-medium">{currentLanguage.flag}</span>
          <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300">
            {currentLanguage.code.toUpperCase()}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-600 dark:text-slate-400" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg"
      >
        {languages.map((language) => {
          const isActive = currentLanguage.code === language.code;

          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`
                flex items-center gap-3 px-3 py-2 cursor-pointer
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }
              `}
              aria-label={language.ariaLabel}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="text-lg" aria-hidden="true">{language.flag}</span>
              <div className="flex flex-col flex-1">
                <span className="font-medium text-sm">{language.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {language.code.toUpperCase()}
                </span>
              </div>
              {isActive && (
                <span className="text-sm" aria-label={t('common:header.currentLanguage')}>
                  ✓
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
