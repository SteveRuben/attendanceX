import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Trend direction type
 */
export type TrendDirection = 'up' | 'down';

/**
 * Color variant type
 */
export type StatCardColor = 'blue' | 'green' | 'orange' | 'purple';

/**
 * Trend interface
 */
export interface Trend {
  direction: TrendDirection;
  percentage: number;
}

/**
 * StatCard Props
 */
export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: Trend;
  color?: StatCardColor;
  className?: string;
}

/**
 * Color scheme mapping
 */
const colorSchemes: Record<StatCardColor, {
  background: string;
  iconBg: string;
  iconText: string;
  trendUp: string;
  trendDown: string;
}> = {
  blue: {
    background: 'bg-blue-50 dark:bg-blue-950/30',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconText: 'text-white',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  green: {
    background: 'bg-green-50 dark:bg-green-950/30',
    iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
    iconText: 'text-white',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  orange: {
    background: 'bg-orange-50 dark:bg-orange-950/30',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    iconText: 'text-white',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
  purple: {
    background: 'bg-purple-50 dark:bg-purple-950/30',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconText: 'text-white',
    trendUp: 'text-green-600 dark:text-green-400',
    trendDown: 'text-red-600 dark:text-red-400',
  },
};

/**
 * StatCard Component
 * 
 * Displays a statistic card with icon, value, label, and optional trend indicator.
 * Used in dashboard to show key metrics.
 * 
 * Features:
 * - Icon with colored gradient background
 * - Large value display (text-3xl, font-bold)
 * - Label text (text-sm, text-muted-foreground)
 * - Trend indicator (arrow up/down + percentage)
 * - Color variants (blue, green, orange, purple)
 * - Responsive design
 * - Dark mode support
 * - Accessibility compliant
 * 
 * @example
 * <StatCard
 *   icon={Calendar}
 *   label="Events Created"
 *   value={42}
 *   trend={{ direction: 'up', percentage: 12.5 }}
 *   color="blue"
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  trend,
  color = 'blue',
  className = '',
}) => {
  const scheme = colorSchemes[color];
  
  // Format value if it's a number
  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString() 
    : value;
  
  // Format trend percentage
  const formattedTrend = trend 
    ? `${trend.direction === 'up' ? '+' : '-'}${Math.abs(trend.percentage).toFixed(1)}%`
    : null;
  
  return (
    <Card 
      className={`
        ${scheme.background}
        border-2 border-slate-200 dark:border-slate-700
        rounded-2xl shadow-sm
        hover:shadow-md transition-shadow duration-200
        ${className}
      `}
      role="article"
      aria-label={`${label}: ${formattedValue}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Left: Value and Label */}
          <div className="flex-1 min-w-0">
            {/* Value */}
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {formattedValue}
            </div>
            
            {/* Label */}
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {label}
            </div>
            
            {/* Trend Indicator */}
            {trend && (
              <div 
                className={`
                  flex items-center gap-1 mt-2 text-sm font-semibold
                  ${trend.direction === 'up' ? scheme.trendUp : scheme.trendDown}
                `}
                aria-label={`Trend: ${formattedTrend}`}
              >
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{formattedTrend}</span>
              </div>
            )}
          </div>
          
          {/* Right: Icon */}
          <div 
            className={`
              flex items-center justify-center
              w-16 h-16 rounded-2xl
              ${scheme.iconBg}
              shadow-lg
              transition-transform duration-200
              hover:scale-105
            `}
            aria-hidden="true"
          >
            <Icon className={`h-8 w-8 ${scheme.iconText}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
