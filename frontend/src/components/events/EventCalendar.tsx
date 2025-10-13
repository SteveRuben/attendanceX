import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users
} from 'lucide-react';
import type { Event, EventStatus } from '../../shared';

interface EventCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onDateSelect?: (date: Date) => void;
  view?: 'month' | 'week' | 'day';
}

export const EventCalendar: React.FC<EventCalendarProps> = ({
  events,
  onEventClick,
  onDateSelect,
  view = 'month'
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDateTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const getStatusColor = (status: EventStatus) => {
    const colors = {
      draft: 'bg-gray-200 text-gray-700',
      published: 'bg-blue-200 text-blue-700',
      ongoing: 'bg-green-200 text-green-700',
      completed: 'bg-gray-300 text-gray-600',
      cancelled: 'bg-red-200 text-red-700'
    };
    return colors[status] || 'bg-gray-200 text-gray-700';
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const renderMonthView = () => {
    const days = [];
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - startingDayOfWeek + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const date = isValidDay ? new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber) : null;
      const dayEvents = date ? getEventsForDate(date) : [];
      const isToday = date && 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();
      const isSelected = date && selectedDate &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

      days.push(
        <div
          key={i}
          className={`min-h-[100px] border border-gray-200 p-2 ${
            !isValidDay ? 'bg-gray-50' : 'bg-white hover:bg-gray-50 cursor-pointer'
          } ${isToday ? 'ring-2 ring-blue-500' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
          onClick={() => date && handleDateClick(date)}
        >
          {isValidDay && (
            <>
              <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {dayNumber}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs p-1 rounded truncate ${getStatusColor(event.status)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{dayEvents.length - 3} plus
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    return days;
  };

  const renderSelectedDateEvents = () => {
    if (!selectedDate) return null;

    const dayEvents = getEventsForDate(selectedDate);
    
    if (dayEvents.length === 0) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2" />
            Événements du {selectedDate.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">{event.title}</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-2" />
                        {new Date(event.startDateTime).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                        {' - '}
                        {new Date(event.endDateTime).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-2" />
                          {event.location.type === 'physical' ? event.location.room || event.location.building : 
                           event.location.type === 'virtual' ? event.location.virtualPlatform || 'En ligne' : 
                           'Hybride'}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-2" />
                        {event.participants?.length || 0} participants
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(event.status)}>
                    {event.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="capitalize">{monthName}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentDate(new Date())}
              >
                Aujourd'hui
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0 mb-2">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0 border-t border-l">
            {renderMonthView()}
          </div>
        </CardContent>
      </Card>

      {renderSelectedDateEvents()}
    </div>
  );
};

