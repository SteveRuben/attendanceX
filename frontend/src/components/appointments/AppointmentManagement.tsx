import React, { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { AppointmentList } from './AppointmentList';
import { AppointmentForm } from './AppointmentForm';
import { AppointmentDetails } from './AppointmentDetails';
import { appointmentService } from '../../services';
import type { AppointmentWithDetails } from '../../services/appointmentService';

interface AppointmentManagementProps {
  organizationId: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'details';

export const AppointmentManagement: React.FC<AppointmentManagementProps> = ({
  organizationId
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
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
    setRefreshKey(prev => prev + 1); // Trigger refresh of the list
  };

  const handleFormCancel = () => {
    setSelectedAppointment(null);
    setViewMode('list');
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
      // You might want to show a toast notification here
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment?.id) return;

    try {
      await appointmentService.deleteAppointment(organizationId, selectedAppointment.id);
      setSelectedAppointment(null);
      setViewMode('list');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      // You might want to show a toast notification here
    }
  };

  const handleBackToList = () => {
    setSelectedAppointment(null);
    setViewMode('list');
  };

  const renderHeader = () => {
    switch (viewMode) {
      case 'create':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Nouveau rendez-vous</h1>
          </div>
        );
      case 'edit':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Modifier le rendez-vous</h1>
          </div>
        );
      case 'details':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Button>
          </div>
        );
      default:
        return null;
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
      default:
        return (
          <AppointmentList
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