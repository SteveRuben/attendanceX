import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Search, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'next-i18next';

/**
 * City interface
 */
export interface City {
  id: string;
  name: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * LocationSelector Props
 */
export interface LocationSelectorProps {
  onCitySelect: (city: City) => void;
  onNearMeClick: () => void;
  currentCity?: City;
  isDetecting?: boolean;
  popularCities?: City[];
  className?: string;
}

/**
 * Default popular cities
 */
const defaultPopularCities: City[] = [
  { id: '1', name: 'Paris', country: 'France', coordinates: { latitude: 48.8566, longitude: 2.3522 } },
  { id: '2', name: 'Lyon', country: 'France', coordinates: { latitude: 45.7640, longitude: 4.8357 } },
  { id: '3', name: 'Marseille', country: 'France', coordinates: { latitude: 43.2965, longitude: 5.3698 } },
  { id: '4', name: 'Toulouse', country: 'France', coordinates: { latitude: 43.6047, longitude: 1.4442 } },
  { id: '5', name: 'Nice', country: 'France', coordinates: { latitude: 43.7102, longitude: 7.2620 } },
];

/**
 * LocationSelector Component
 * 
 * Allows users to select a city or use geolocation to find nearby events.
 * 
 * Features:
 * - Dropdown with search functionality
 * - "Près de moi" button with GPS icon
 * - Popular cities suggestions
 * - Current city display with location icon
 * - Loading state (spinner)
 * - Error handling (geolocation denied)
 * - Accessibility (combobox pattern)
 * - Dark mode support
 * 
 * @example
 * <LocationSelector
 *   onCitySelect={(city) => setSelectedCity(city)}
 *   onNearMeClick={() => detectUserLocation()}
 *   currentCity={selectedCity}
 *   isDetecting={isDetectingLocation}
 * />
 */
export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onCitySelect,
  onNearMeClick,
  currentCity,
  isDetecting = false,
  popularCities = defaultPopularCities,
  className = '',
}) => {
  const { t } = useTranslation(['location', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter cities based on search query
  const filteredCities = popularCities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.country.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle city selection
  const handleCitySelect = (city: City) => {
    onCitySelect(city);
    setIsOpen(false);
    setSearchQuery('');
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };
  
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`} ref={dropdownRef}>
      {/* City Selector Dropdown */}
      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className="
            w-full h-12 px-4 
            flex items-center justify-between gap-2
            bg-white dark:bg-slate-800 
            border-2 border-slate-300 dark:border-slate-700
            rounded-lg
            text-slate-900 dark:text-slate-100
            hover:border-blue-500 dark:hover:border-blue-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors duration-200
          "
          aria-label={t('location:selector.label')}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="h-5 w-5 text-slate-400 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">
              {currentCity ? currentCity.name : t('location:selector.placeholder')}
            </span>
          </div>
          <ChevronDown 
            className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>
        
        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            className="
              absolute top-full left-0 right-0 mt-2 z-[100]
              bg-white dark:bg-slate-800
              border-2 border-slate-200 dark:border-slate-700
              rounded-lg shadow-2xl
              max-h-96 overflow-hidden
            "
            role="listbox"
            aria-label={t('location:selector.cities')}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" 
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('location:selector.search')}
                  className="pl-10 h-10 border-slate-300 dark:border-slate-700"
                  aria-label={t('location:selector.searchLabel')}
                />
              </div>
            </div>
            
            {/* Cities List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredCities.length > 0 ? (
                <ul className="py-2">
                  {filteredCities.map((city) => (
                    <li key={city.id}>
                      <button
                        type="button"
                        onClick={() => handleCitySelect(city)}
                        className="
                          w-full px-4 py-3 text-left
                          flex items-center gap-3
                          hover:bg-slate-100 dark:hover:bg-slate-700
                          focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700
                          transition-colors duration-150
                        "
                        role="option"
                        aria-selected={currentCity?.id === city.id}
                      >
                        <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {city.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {city.country}
                          </div>
                        </div>
                        {currentCity?.id === city.id && (
                          <div className="w-2 h-2 rounded-full bg-blue-600" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('location:selector.noResults')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* "Near Me" Button */}
      <Button
        onClick={onNearMeClick}
        disabled={isDetecting}
        className="
          h-12 px-6
          bg-blue-600 hover:bg-blue-700 active:bg-blue-800
          text-white font-medium rounded-lg
          flex items-center gap-2
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        aria-label={t('location:nearMe.label')}
      >
        {isDetecting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="hidden sm:inline">{t('location:nearMe.detecting')}</span>
          </>
        ) : (
          <>
            <Navigation className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('location:nearMe.button')}</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default LocationSelector;
