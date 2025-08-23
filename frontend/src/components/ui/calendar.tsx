/**
 * Composant Calendar
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export interface CalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | { from?: Date; to?: Date };
  onSelect?: (date: Date | { from?: Date; to?: Date } | undefined) => void;
  defaultMonth?: Date;
  numberOfMonths?: number;
  className?: string;
  initialFocus?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected,
  onSelect,
  defaultMonth = new Date(),
  numberOfMonths = 1,
  className,
  initialFocus
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(defaultMonth);
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (mode === 'single') {
      onSelect?.(clickedDate);
    } else if (mode === 'range') {
      const currentRange = selected as { from?: Date; to?: Date } | undefined;
      
      if (!currentRange?.from || (currentRange.from && currentRange.to)) {
        // Start new range
        onSelect?.({ from: clickedDate, to: undefined });
      } else {
        // Complete range
        if (clickedDate < currentRange.from) {
          onSelect?.({ from: clickedDate, to: currentRange.from });
        } else {
          onSelect?.({ from: currentRange.from, to: clickedDate });
        }
      }
    }
  };
  
  const isDateSelected = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (mode === 'single') {
      const selectedDate = selected as Date | undefined;
      return selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
    } else if (mode === 'range') {
      const range = selected as { from?: Date; to?: Date } | undefined;
      if (!range?.from) return false;
      
      if (range.to) {
        return date >= range.from && date <= range.to;
      } else {
        return date.getTime() === range.from.getTime();
      }
    }
    
    return false;
  };
  
  const renderCalendar = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = isDateSelected(day);
      
      days.push(
        <button
          key={day}
          className={cn(
            "p-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => handleDateClick(day)}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };
  
  const renderMonth = (monthOffset: number = 0) => {
    const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
    const monthDaysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const monthFirstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    
    const monthDays = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < monthFirstDay; i++) {
      monthDays.push(<div key={`empty-${monthOffset}-${i}`} className="p-2" />);
    }
    
    // Days of the month
    for (let day = 1; day <= monthDaysInMonth; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      let isSelected = false;
      
      if (mode === 'single') {
        const selectedDate = selected as Date | undefined;
        isSelected = selectedDate && 
          date.getDate() === selectedDate.getDate() &&
          date.getMonth() === selectedDate.getMonth() &&
          date.getFullYear() === selectedDate.getFullYear();
      } else if (mode === 'range') {
        const range = selected as { from?: Date; to?: Date } | undefined;
        if (range?.from) {
          if (range.to) {
            isSelected = date >= range.from && date <= range.to;
          } else {
            isSelected = date.getTime() === range.from.getTime();
          }
        }
      }
      
      monthDays.push(
        <button
          key={`${monthOffset}-${day}`}
          className={cn(
            "p-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={() => {
            if (mode === 'single') {
              onSelect?.(date);
            } else if (mode === 'range') {
              const currentRange = selected as { from?: Date; to?: Date } | undefined;
              
              if (!currentRange?.from || (currentRange.from && currentRange.to)) {
                onSelect?.({ from: date, to: undefined });
              } else {
                if (date < currentRange.from) {
                  onSelect?.({ from: date, to: currentRange.from });
                } else {
                  onSelect?.({ from: currentRange.from, to: date });
                }
              }
            }
          }}
        >
          {day}
        </button>
      );
    }
    
    return (
      <div key={monthOffset} className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {monthOffset === 0 && (
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <h2 className="text-sm font-semibold">
            {monthNames[month.getMonth()]} {month.getFullYear()}
          </h2>
          
          {monthOffset === numberOfMonths - 1 && (
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          
          {monthOffset !== 0 && monthOffset !== numberOfMonths - 1 && (
            <div className="w-8" /> // Spacer
          )}
        </div>
        
        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-xs font-medium text-muted-foreground text-center">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays}
        </div>
      </div>
    );
  };
  
  if (numberOfMonths === 1) {
    return (
      <div className={cn("p-3", className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-sm font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-xs font-medium text-muted-foreground text-center">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
      </div>
    );
  }
  
  // Multiple months
  return (
    <div className={cn("flex", className)}>
      {Array.from({ length: numberOfMonths }, (_, i) => renderMonth(i))}
    </div>
  );
};

export { Calendar };