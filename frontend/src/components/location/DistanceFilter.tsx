import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'next-i18next';

/**
 * DistanceFilter Props
 */
export interface DistanceFilterProps {
  value: number; // Current radius in km
  onChange: (radius: number) => void;
  presets?: number[]; // Preset radius values
  className?: string;
}

/**
 * Default preset radius values (in km)
 */
const defaultPresets = [5, 10, 25, 50, 100];

/**
 * DistanceFilter Component
 * 
 * Allows users to filter events by distance radius.
 * 
 * Features:
 * - Slider for custom radius (5-100km)
 * - Preset badges (5km, 10km, 25km, 50km, 100km+)
 * - Active badge highlighting
 * - Real-time update on change
 * - Accessibility (slider with aria attributes)
 * - Dark mode support
 * 
 * @example
 * <DistanceFilter
 *   value={radius}
 *   onChange={(newRadius) => setRadius(newRadius)}
 *   presets={[5, 10, 25, 50, 100]}
 * />
 */
export const DistanceFilter: React.FC<DistanceFilterProps> = ({
  value,
  onChange,
  presets = defaultPresets,
  className = '',
}) => {
  const { t } = useTranslation('location');
  
  // Handle preset badge click
  const handlePresetClick = (preset: number) => {
    onChange(preset);
  };
  
  // Handle slider change
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value, 10);
    onChange(newValue);
  };
  
  // Format distance label
  const formatDistance = (km: number): string => {
    if (km >= 100) {
      return t('distance.unlimited');
    }
    return t('distance.km', { distance: km });
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Title and Current Value */}
      <div className="flex items-center justify-between">
        <label 
          htmlFor="distance-slider" 
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {t('distance.label')}
        </label>
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {formatDistance(value)}
        </span>
      </div>
      
      {/* Preset Badges */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = value === preset;
          
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`
                inline-flex items-center justify-center
                px-4 py-2 rounded-full
                text-sm font-semibold
                transition-all duration-200
                cursor-pointer
                hover:scale-105 hover:shadow-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                active:scale-95
                ${isActive
                  ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 font-bold shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700'
                }
              `}
              aria-label={t('distance.preset', { distance: preset })}
              aria-pressed={isActive}
              role="button"
            >
              {formatDistance(preset)}
            </button>
          );
        })}
      </div>
      
      {/* Custom Slider */}
      <div className="space-y-2">
        <label 
          htmlFor="distance-slider" 
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {t('distance.custom')}
        </label>
        
        <div className="relative">
          {/* Slider Track Background */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
          
          {/* Slider Track Fill */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-2 bg-blue-600 rounded-full transition-all duration-200"
            style={{ width: `${(value / 100) * 100}%` }}
          />
          
          {/* Slider Input */}
          <input
            id="distance-slider"
            type="range"
            min="5"
            max="100"
            step="5"
            value={value}
            onChange={handleSliderChange}
            className="
              relative w-full h-2 appearance-none bg-transparent cursor-pointer
              focus:outline-none
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-blue-600
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-webkit-slider-thumb]:active:scale-95
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-blue-600
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:transition-transform
              [&::-moz-range-thumb]:hover:scale-110
              [&::-moz-range-thumb]:active:scale-95
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900
            "
            aria-label={t('distance.sliderLabel')}
            aria-valuemin={5}
            aria-valuemax={100}
            aria-valuenow={value}
            aria-valuetext={formatDistance(value)}
          />
        </div>
        
        {/* Slider Labels */}
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>5 km</span>
          <span>100+ km</span>
        </div>
      </div>
    </div>
  );
};

export default DistanceFilter;
