import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'next-i18next';

/**
 * Category color mapping
 * Each category has a specific color scheme for visual distinction
 */
const categoryColors: Record<string, string> = {
  musique: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  sport: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  conference: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  festival: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  art: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  technologie: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  gastronomie: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  education: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  default: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
};

/**
 * CategoryBadge Props
 */
export interface CategoryBadgeProps {
  category: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

/**
 * CategoryBadge Component
 * 
 * Displays a pill-shaped category badge with category-specific colors.
 * Can be used as a filter button or a simple label.
 * 
 * Features:
 * - Pill-shaped design (rounded-full)
 * - Category-specific colors
 * - Click handler for filtering
 * - Active state styling (border, background)
 * - Hover effects
 * - Accessibility (button role, aria-label)
 * - Dark mode support
 * 
 * @example
 * // As a filter button
 * <CategoryBadge 
 *   category="musique" 
 *   onClick={() => filterByCategory('musique')}
 *   active={selectedCategory === 'musique'}
 * />
 * 
 * // As a label
 * <CategoryBadge category="sport" />
 */
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  onClick,
  active = false,
  className = '',
}) => {
  const { t } = useTranslation('events');
  
  // Get color scheme for category (fallback to default)
  const colorScheme = categoryColors[category.toLowerCase()] || categoryColors.default;
  
  // Determine if badge is interactive
  const isInteractive = !!onClick;
  
  // Base classes for all badges
  const baseClasses = `
    inline-flex items-center justify-center
    px-4 py-2 rounded-full
    text-sm font-semibold
    transition-all duration-200
    ${colorScheme}
  `;
  
  // Interactive classes (when onClick is provided)
  const interactiveClasses = isInteractive ? `
    cursor-pointer
    hover:scale-105 hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    active:scale-95
  ` : '';
  
  // Active state classes
  const activeClasses = active ? `
    ring-2 ring-offset-2
    ${category.toLowerCase() === 'musique' ? 'ring-purple-500' : ''}
    ${category.toLowerCase() === 'sport' ? 'ring-green-500' : ''}
    ${category.toLowerCase() === 'conference' ? 'ring-blue-500' : ''}
    ${category.toLowerCase() === 'festival' ? 'ring-pink-500' : ''}
    ${category.toLowerCase() === 'art' ? 'ring-indigo-500' : ''}
    ${category.toLowerCase() === 'technologie' ? 'ring-cyan-500' : ''}
    ${category.toLowerCase() === 'gastronomie' ? 'ring-orange-500' : ''}
    ${category.toLowerCase() === 'education' ? 'ring-teal-500' : ''}
    ${!categoryColors[category.toLowerCase()] ? 'ring-slate-500' : ''}
    font-bold
  ` : '';
  
  // Render as button if interactive, otherwise as span
  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${interactiveClasses} ${activeClasses} ${className}`}
        aria-label={t('categories.filter', { category })}
        aria-pressed={active}
        role="button"
      >
        {category}
      </button>
    );
  }
  
  return (
    <Badge 
      className={`${baseClasses} ${activeClasses} ${className}`}
      role="status"
      aria-label={t('categories.label', { category })}
    >
      {category}
    </Badge>
  );
};

export default CategoryBadge;
