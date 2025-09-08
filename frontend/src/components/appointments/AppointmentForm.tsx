import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { appointmentService } from '../../services';
import type {
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentStatus,
  Client,
  Service
} from '../../shared';
import type { AppointmentWithDetails, Practitioner } from '../../services/appointmentService';

interface AppointmentFormProps {
  organizationId: string;
  appointment?: AppointmentWithDetails;
  onSubmit: (appointment: AppointmentWithDetails) => void;
  onCancel: () => void;
  isEditing?: boolean;
  initialDate?: Date;
  initialTime?: string;
}

interface FormData {
  clientId: string;
  serviceId: string;
  practitionerId: string;
  date: string;
  startTime: string;
  duration: number;
  notes?: string;
  status: AppointmentStatus;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  organizationId,
  appointment,
  onSubmit,
  onCancel,
  isEditing = false,
  initialDate,
  initialTime
}) => {
  const [formData, setFormData] = useState<FormData>({
    clientId: appointment?.clientId || '',
    serviceId: appointment?.serviceId || '',
    practitionerId: appointment?.practitionerId || '',
    date: appointment?.date 
      ? new Date(appointment.date).toISOString().split('T')[0] 
      : initialDate 
        ? initialDate.toISOString().split('T')[0] 
        : '',
    startTime: appointment?.startTime || initialTime || '',
    duration: appointment?.duration || 60,
    notes: appointment?.notes || '',
    status: appointment?.status || 'scheduled'
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadFormData();
  }, [organizationId]);

  // Check for conflicts when date/time changes
  useEffect(() => {
    if (formData.date && formData.startTime && formData.practitionerId) {
      checkConflicts();
    }
  }, [formData.date, formData.startTime, formData.practitionerId, formData.duration]);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      
      // Load clients, services, and practitioners
      // Note: You'll need to implement these methods in your services
      // For now, we'll use placeholder data
      
      setClients([]);
      setServices([]);
      setPractitioners([]);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  };

  const checkConflicts = async () => {
    try {
      if (!formData.date || !formData.startTime || !formData.practitionerId) return;

      const appointmentDate = new Date(`${formData.date}T${formData.startTime}`);
      
      // Check for conflicts (you'll need to implement this in your service)
      // const conflicts = await appointmentService.checkConflicts(organizationId, {
      //   practitionerId: formData.practitionerId,
      //   date: appointmentDate,
      //   duration: formData.duration,
      //   excludeAppointmentId: appointment?.id
      // });
      
      setConflicts([]);
    } catch (err: any) {
      console.error('Error checking conflicts:', err);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (conflicts.length > 0) {
      setError('Please resolve conflicts before saving');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const appointmentData = {
        ...formData,
        date: new Date(formData.date),
        organizationId
      };

      let result: AppointmentWithDetails;

      if (isEditing && appointment?.id) {
        const updateData: UpdateAppointmentRequest = appointmentData;
        result = await appointmentService.updateAppointment(
          organizationId, 
          appointment.id, 
          updateData
        );
      } else {
        const createData: CreateAppointmentRequest = appointmentData;
        result = await appointmentService.createAppointment(organizationId, createData);
      }

      onSubmit(result);
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} appointment`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
        </h2>
        <p className="text-gray-600">
          {isEditing ? 'Modifiez les détails du rendez-vous' : 'Créez un nouveau rendez-vous'}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <p className="text-yellow-800 font-medium">Conflits détectés</p>
          </div>
          <ul className="text-yellow-700 text-sm">
            {conflicts.map((conflict, index) => (
              <li key={index}>• {conflict}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline h-4 w-4 mr-1" />
            Client
          </label>
          <Select 
            value={formData.clientId} 
            onValueChange={(value) => handleInputChange('clientId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id!}>
                  {client.firstName} {client.lastName} - {client.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service
          </label>
          <Select 
            value={formData.serviceId} 
            onValueChange={(value) => handleInputChange('serviceId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id!}>
                  {service.name} ({service.duration} min)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Practitioner Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Praticien
          </label>
          <Select 
            value={formData.practitionerId} 
            onValueChange={(value) => handleInputChange('practitionerId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un praticien" />
            </SelectTrigger>
            <SelectContent>
              {practitioners.map((practitioner) => (
                <SelectItem key={practitioner.id} value={practitioner.id}>
                  {practitioner.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Heure
            </label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durée (minutes)
          </label>
          <Input
            type="number"
            min="15"
            max="480"
            step="15"
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
            required
          />
        </div>

        {/* Status (only for editing) */}
        {isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <Select 
              value={formData.status} 
              onValueChange={(value: AppointmentStatus) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Programmé</SelectItem>
                <SelectItem value="confirmed">Confirmé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
                <SelectItem value="no-show">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Notes (optionnel)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Notes additionnelles..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading || conflicts.length > 0}
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : null}
            {isEditing ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
};