import React, { useState } from 'react';
import { Calendar, List, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { AppointmentManagement } from './AppointmentManagement';
import { CalendarView } from './CalendarView';
import { AppointmentForm } from './AppointmentForm';
import { AppointmentDetails } from './AppointmentDetails';
import { appointmentService } from '../../services';
import type { AppointmentWithDetails } from '../../services/appointmentService';

interface AppointmentCalendarManagerProps {
  organizationId: string;
}

type ViewMode = 'calendar' | 'list' | 'create' | 'edit' | 'details';

export const AppointmentCalendarManager: React.FC<AppointmentCalendarManagerProps> = ({
  organizationId
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [createDate, setCreateDate] = useState<Date | undefined>();
  const [createTime, setCreateTime] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateAppointment = (date?: Date, time?: string) => {
    setSelectedAppointment(null);
    setCreateDate(date);
    setCreateTime(time);
    setViewMode('create');
  };

  const handleEditAppointment = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setViewMode('edit');
  };

  const handleViewAppointment = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setViewMode('details');
  };

  const handleFormSubmit = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment);
    setViewMode('details');
    setRefreshKey(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setSelectedAppointment(null);
    setCreateDate(undefined);
    setCreateTime(undefined);
    setViewMode('calendar');
  };

  const handleAppointmentAction = async (action: string, data?: any) => {
    if (!selectedAppointment?.id) return;

    try {
      switch (action) {
        case 'confirm':
          await appointmentService.confirmAppointment(organizationId, selectedAppointment.id);
          break;
        case 'complete':
          await appointmentService.completeAppointment(organizationId, selectedAppointment.id, data?.notes);
          break;
        case 'cancel':
          await appointmentService.cancelAppointment(organizationId, selectedAppointment.id, data?.reason);
          break;
        case 'no-show':
          await appointmentService.markAsNoShow(organizationId, selectedAppointment.id);
          break;
      }

      // Refresh the appointment details
      const updatedAppointment = await appointmentService.getAppointmentById(
        organizationId, 
        selectedAppointment.id
      );
      setSelectedAppointment(updatedAppointment);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment?.id) return;

    try {
      await appointmentService.deleteAppointment(organizationId, selectedAppointment.id);
      setSelectedAppointment(null);
      setViewMode('calendar');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handleBackToCalendar = () => {
    setSelectedAppointment(null);
    setCreateDate(undefined);
    setCreateTime(undefined);
    setViewMode('calendar');
  };

  const handleBackToList = () => {
    setSelectedAppointment(null);
    setCreateDate(undefined);
    setCreateTime(undefined);
    setViewMode('list');
  };

  const renderHeader = () => {
    switch (viewMode) {
      case 'create':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToCalendar}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au calendrier
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau rendez-vous</h1>
          </div>
        );
      case 'edit':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToCalendar}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au calendrier
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Modifier le rendez-vous</h1>
          </div>
        );
      case 'details':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToCalendar}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au calendrier
            </Button>
          </div>
        );
      case 'list':
        return (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des rendez-vous</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode('calendar')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Vue calendrier
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Calendrier des rendez-vous</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Vue liste
              </Button>
            </div>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <AppointmentForm
            organizationId={organizationId}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isEditing={false}
            // Pass initial date and time if provided
            initialDate={createDate}
            initialTime={createTime}
          />
        );
      case 'edit':
        return selectedAppointment ? (
          <AppointmentForm
            organizationId={organizationId}
            appointment={selectedAppointment}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isEditing={true}
          />
        ) : null;
      case 'details':
        return selectedAppointment ? (
          <AppointmentDetails
            appointment={selectedAppointment}
            onEdit={() => handleEditAppointment(selectedAppointment)}
            onDelete={handleDeleteAppointment}
            onAction={handleAppointmentAction}
            showActions={true}
          />
        ) : null;
      case 'list':
        return (
          <AppointmentManagement
            organizationId={organizationId}
          />
        );
      default:
        return (
          <CalendarView
            key={refreshKey}
            organizationId={organizationId}
            onAppointmentSelect={handleViewAppointment}
            onCreateAppointment={handleCreateAppointment}
            onEditAppointment={handleEditAppointment}
            showCreateButton={true}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderContent()}
    </div>
  );
};