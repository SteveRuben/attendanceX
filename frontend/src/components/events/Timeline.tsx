/**
 * Timeline Component - Event Program/Agenda Display
 * Shows event schedule in a vertical timeline format
 * Design: Evelya + Polaris standards
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TimelineItem {
  time: string;
  title: string;
  description?: string;
  speaker?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className = '' }: TimelineProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="relative flex gap-4">
          {/* Timeline Line */}
          {index < items.length - 1 && (
            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
          )}

          {/* Time Badge */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-600 dark:border-blue-400">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Content */}
          <Card className="flex-1 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h4>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                  {item.time}
                </span>
              </div>
              
              {item.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {item.description}
                </p>
              )}
              
              {item.speaker && (
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  <span className="font-medium">Speaker:</span> {item.speaker}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
