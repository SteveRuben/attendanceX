import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ServiceSelection } from './ServiceSelection';
import { PractitionerSelection } from './PractitionerSelection';
import { DateTimeSelection } from './DateTimeSelection';
import { ClientInfoForm } from './ClientInfoForm';
import { BookingConfirmation } from './BookingConfirmation';
import { publicBookingService, PublicOrganizationInfo } from '../../services/publicBookingService';
import type { Service, PublicBookingRequest, AvailableSlot } from '../../shared';
import type { PublicPractitioner, BookingConfirmation as BookingConfirmationType } from '../../services/publicBookingService';

interface PublicBookingPageProps {
  organizationId: string;
}

type BookingStep = 'service' | 'practitioner' | 'datetime' | 'client-info' | 'confirmation';

interface BookingData {
  service?: Service;
  practitioner?: PublicPractitioner;
  date?: Date;
  timeSlot?: AvailableSlot;
  clientInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    notes?: string;
  };
}

export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({
  organizationId
}) => {
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [bookingData, setBookingData] = useState<BookingData>({});
  const [organizationInfo, setOrganizationInfo] = useState<PublicOrganizationInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [practitioners, setPractitioners] = useState<PublicPractitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmationType | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [organizationId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [orgInfo, availableServices] = await Promise.all([
        publicBookingService.getOrganizationInfo(organizationId),
        publicBookingService.getAvailableServices(organizationId)
      ]);

      setOrganizationInfo(orgInfo);
      setServices(availableServices);

      if (!orgInfo.bookingSettings.allowOnlineBooking) {
        setError('La réservation en ligne n\'est pas disponible pour cette organisation.');
        return;
      }

    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des informations');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = async (service: Service) => {
    setBookingData(prev => ({ ...prev, service }));
    
    // Load practitioners for this service
    try {
      const availablePractitioners = await publicBookingService.getAvailablePractitioners(
        organizationId,
        service.id
      );
      setPractitioners(availablePractitioners);
      
      if (availablePractitioners.length === 1) {
        // Auto-select if only one practitioner
        setBookingData(prev => ({ ...prev, practitioner: availablePractitioners[0] }));
        setCurrentStep('datetime');
      } else {
        setCurrentStep('practitioner');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des praticiens');
    }
  };

  const handlePractitionerSelect = (practitioner: PublicPractitioner) => {
    setBookingData(prev => ({ ...prev, practitioner }));
    setCurrentStep('datetime');
  };

  const handleDateTimeSelect = (date: Date, timeSlot: AvailableSlot) => {
    setBookingData(prev => ({ ...prev, date, timeSlot }));
    setCurrentStep('client-info');
  };

  const handleClientInfoSubmit = (clientInfo: BookingData['clientInfo']) => {
    setBookingData(prev => ({ ...prev, clientInfo }));
    submitBooking({ ...bookingData, clientInfo });
  };

  const submitBooking = async (finalBookingData: BookingData) => {
    if (!finalBookingData.service || !finalBookingData.practitioner || 
        !finalBookingData.date || !finalBookingData.timeSlot || 
        !finalBookingData.clientInfo) {
      setError('Données de réservation incomplètes');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const bookingRequest: PublicBookingRequest = {
        serviceId: finalBookingData.service.id!,
        practitionerId: finalBookingData.practitioner.id,
        date: finalBookingData.date,
        startTime: finalBookingData.timeSlot.startTime,
        duration: finalBookingData.service.duration,
        client: {
          firstName: finalBookingData.clientInfo.firstName,
          lastName: finalBookingData.clientInfo.lastName,
          email: finalBookingData.clientInfo.email,
          phone: finalBookingData.clientInfo.phone,
          preferences: {
            reminderMethod: 'email',
            language: 'fr'
          }
        },
        notes: finalBookingData.clientInfo.notes
      };

      const result = await publicBookingService.createBooking(organizationId, bookingRequest);
      setConfirmation(result);
      setCurrentStep('confirmation');

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'practitioner':
        setCurrentStep('service');
        break;
      case 'datetime':
        setCurrentStep(practitioners.length > 1 ? 'practitioner' : 'service');
        break;
      case 'client-info':
        setCurrentStep('datetime');
        break;
      default:
        break;
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'service', label: 'Service', completed: !!bookingData.service },
      { key: 'practitioner', label: 'Praticien', completed: !!bookingData.practitioner, hidden: practitioners.length <= 1 },
      { key: 'datetime', label: 'Date & Heure', completed: !!bookingData.date && !!bookingData.timeSlot },
      { key: 'client-info', label: 'Vos informations', completed: !!bookingData.clientInfo },
      { key: 'confirmation', label: 'Confirmation', completed: !!confirmation }
    ].filter(step => !step.hidden);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step.completed 
                    ? 'bg-green-600 text-white' 
                    : currentStep === step.key 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {step.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-12 h-0.5 bg-gray-200 mx-4" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-md mx-auto">
            <p className="text-red-800">{error}</p>
            <Button 
              variant="outline" 
              onClick={loadInitialData}
              className="mt-4"
            >
              Réessayer
            </Button>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 'service':
        return (
          <ServiceSelection
            services={services}
            selectedService={bookingData.service}
            onServiceSelect={handleServiceSelect}
          />
        );
      case 'practitioner':
        return (
          <PractitionerSelection
            practitioners={practitioners}
            selectedPractitioner={bookingData.practitioner}
            onPractitionerSelect={handlePractitionerSelect}
            onBack={handleBack}
          />
        );
      case 'datetime':
        return (
          <DateTimeSelection
            organizationId={organizationId}
            service={bookingData.service!}
            practitioner={bookingData.practitioner!}
            selectedDate={bookingData.date}
            selectedTimeSlot={bookingData.timeSlot}
            onDateTimeSelect={handleDateTimeSelect}
            onBack={handleBack}
            organizationInfo={organizationInfo!}
          />
        );
      case 'client-info':
        return (
          <ClientInfoForm
            onSubmit={handleClientInfoSubmit}
            onBack={handleBack}
            loading={submitting}
            organizationInfo={organizationInfo!}
          />
        );
      case 'confirmation':
        return confirmation ? (
          <BookingConfirmation
            confirmation={confirmation}
            organizationInfo={organizationInfo!}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {organizationInfo?.name || 'Réservation en ligne'}
              </h1>
              {organizationInfo?.description && (
                <p className="text-gray-600 mt-1">{organizationInfo.description}</p>
              )}
            </div>
            {organizationInfo && (
              <div className="text-right text-sm text-gray-600">
                {organizationInfo.address && (
                  <div className="flex items-center justify-end gap-1">
                    <MapPin className="h-4 w-4" />
                    {organizationInfo.address}
                  </div>
                )}
                {organizationInfo.phone && (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <Phone className="h-4 w-4" />
                    {organizationInfo.phone}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentStep !== 'confirmation' && renderStepIndicator()}
        
        <Card className="p-6">
          {renderContent()}
        </Card>
      </div>
    </div>
  );
};