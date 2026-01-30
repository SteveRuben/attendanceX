import React from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'icon-only'
  className?: string
}

export function LanguageSelector({ variant = 'default', className = '' }: LanguageSelectorProps) {
  const { getCurrentLanguage, getAvailableLanguages, changeLanguage } = useTranslation()
  
  const currentLanguage = getCurrentLanguage()
  const availableLanguages = getAvailableLanguages()
  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage)

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode)
  }

  if (variant === 'icon-only') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-9 w-9 p-0 ${className}`}>
            <Globe className="h-4 w-4" />
            <span className="sr-only">Select language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableLanguages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center gap-2 ${
                currentLanguage === language.code ? 'bg-accent' : ''
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span>{language.name}</span>
              {currentLanguage === language.code && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-8 gap-1 ${className}`}>
            <span className="text-sm">{currentLang?.flag}</span>
            <span className="text-xs font-medium">{currentLang?.code.toUpperCase()}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {availableLanguages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center gap-2 ${
                currentLanguage === language.code ? 'bg-accent' : ''
              }`}
            >
              <span>{language.flag}</span>
              <span className="text-sm">{language.code.toUpperCase()}</span>
              {currentLanguage === language.code && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`gap-2 ${className}`}>
          <Globe className="h-4 w-4" />
          <span className="flex items-center gap-1">
            <span>{currentLang?.flag}</span>
            <span>{currentLang?.name}</span>
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`flex items-center gap-3 ${
              currentLanguage === language.code ? 'bg-accent' : ''
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <div className="flex flex-col">
              <span className="font-medium">{language.name}</span>
              <span className="text-xs text-muted-foreground">{language.code}</span>
            </div>
            {currentLanguage === language.code && (
              <span className="ml-auto text-sm text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Composant simple pour afficher la langue actuelle
export function CurrentLanguageDisplay({ className = '' }: { className?: string }) {
  const { getCurrentLanguage, getAvailableLanguages } = useTranslation()
  
  const currentLanguage = getCurrentLanguage()
  const currentLang = getAvailableLanguages().find(lang => lang.code === currentLanguage)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {currentLang?.flag} {currentLang?.name}
      </span>
    </div>
  )
}