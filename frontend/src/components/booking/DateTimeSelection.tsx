import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { publicBookingService, PublicOrganizationInfo } from '../../services/publicBookingService';
import type { Service, AvailableSlot } from '../../shared';
import type { PublicPractitioner } from '../../services/publicBookingService';

interface DateTimeSelectionProps {
  organizationId: string;
  service: Service;
  practitioner: PublicPractitioner;
  selectedDate?: Date;
  selectedTimeSlot?: AvailableSlot;
  onDateTimeSelect: (date: Date, timeSlot: AvailableSlot) => void;
  onBack: () => void;
  organizationInfo: PublicOrganizationInfo;
}

export const DateTimeSelection: React.FC<DateTimeSelectionProps> = ({
  organizationId,
  service,
  practitioner,
  selectedDate,
  selectedTimeSlot,
  onDateTimeSelect,
  onBack,
  organizationInfo
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDateState, setSelectedDateState] = useState<Date | null>(selectedDate || null);

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDateState) {
      loadAvailableSlots(selectedDateState);
    }
  }, [selectedDateState, service.id, practitioner.id]);

  const loadAvailableSlots = async (date: Date) => {
    try {
      setLoadingSlots(true);
      const slots = await publicBookingService.getAvailableSlots(organizationId, {
        serviceId: service.id!,
        practitionerId: practitioner.id,
        date,
        duration: service.duration
      });
      setAvailableSlots(slots);
    } catch (error: any) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDateState(date);
  };

  const handleTimeSlotSelect = (timeSlot: AvailableSlot) => {
    if (selectedDateState) {
      onDateTimeSelect(selectedDateState, timeSlot);
    }
  };

  const isDateAvailable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if date is in the past
    if (date < today) return false;
    
    // Check advance booking limit
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + organizationInfo.bookingSettings.advanceBookingDays);
    if (date > maxDate) return false;
    
    // Check if day is open
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHours = organizationInfo.workingHours[dayName];
    return workingHours?.isOpen || false;
  };

  const renderCalendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
    
    const days = [];
    const current = new Date(calendarStart);
    
    while (current <= monthEnd || days.length % 7 !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return (
      <div className="bg-white rounded-lg">
        {/* Calendar header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-semibold">
            {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 border-b">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isAvailable = isDateAvailable(day);
            const isSelected = selectedDateState?.toDateString() === day.toDateString();
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <button
                key={index}
                className={`
                  p-3 text-sm border-r border-b hover:bg-gray-50 transition-colors
                  ${!isCurrentMonth ? 'text-gray-300' : ''}
                  ${!isAvailable ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                  ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                  ${isToday && !isSelected ? 'bg-blue-50 text-blue-600 font-semibold' : ''}
                `}
                onClick={() => isAvailable && isCurrentMonth && handleDateSelect(day)}
                disabled={!isAvailable || !isCurrentMonth}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedDateState) {
      return (
        <div className="text-center py-8 text-gray-500">
          Sélectionnez une date pour voir les créneaux disponibles
        </div>
      );
    }

    if (loadingSlots) {
      return (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      );
    }

    if (availableSlots.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Aucun créneau disponible pour cette date
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {availableSlots.map((slot) => (
          <Button
            key={slot.startTime}
            variant={selectedTimeSlot?.startTime === slot.startTime ? 'default' : 'outline'}
            className="h-12"
            onClick={() => handleTimeSlotSelect(slot)}
          >
            <Clock className="h-4 w-4 mr-2" />
            {slot.startTime}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Choisissez votre créneau
          </h2>
          <p className="text-gray-600">
            Sélectionnez la date et l'heure de votre rendez-vous
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="ml-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      {/* Service and practitioner info */}
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">{service.name}</span>
            <span className="text-gray-500 ml-2">({service.duration} min)</span>
          </div>
          <div className="text-gray-600">
            avec {practitioner.displayName}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Sélectionnez une date
          </h3>
          {renderCalendar()}
        </div>

        {/* Time slots */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Créneaux disponibles
          </h3>
          <Card className="p-4">
            {renderTimeSlots()}
          </Card>
        </div>
      </div>

      {/* Selected info */}
      {selectedDateState && selectedTimeSlot && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-center">
            <p className="text-green-800 font-medium">
              Créneau sélectionné : {selectedDateState.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} à {selectedTimeSlot.startTime}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};