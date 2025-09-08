import React, { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { ClientList } from './ClientList';
import { ClientForm } from './ClientForm';
import { ClientDetails } from './ClientDetails';
import { clientService } from '../../services/clientService';
import type { Client } from '../../shared';

interface ClientManagementProps {
  organizationId: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'details';

export const ClientManagement: React.FC<ClientManagementProps> = ({
  organizationId
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateClient = () => {
    setSelectedClient(null);
    setViewMode('create');
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setViewMode('edit');
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setViewMode('details');
  };

  const handleFormSubmit = (client: Client) => {
    setSelectedClient(client);
    setViewMode('details');
    setRefreshKey(prev => prev + 1); // Trigger refresh of the list
  };

  const handleFormCancel = () => {
    setSelectedClient(null);
    setViewMode('list');
  };

  const handleDeleteClient = async () => {
    if (!selectedClient?.id) return;

    try {
      await clientService.deleteClient(organizationId, selectedClient.id);
      setSelectedClient(null);
      setViewMode('list');
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error deleting client:', error);
      // You might want to show a toast notification here
    }
  };

  const handleBackToList = () => {
    setSelectedClient(null);
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
            <h1 className="text-2xl font-bold text-gray-900">Nouveau client</h1>
          </div>
        );
      case 'edit':
        return (
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Modifier le client</h1>
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
          <ClientForm
            organizationId={organizationId}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isEditing={false}
          />
        );
      case 'edit':
        return selectedClient ? (
          <ClientForm
            organizationId={organizationId}
            client={selectedClient}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isEditing={true}
          />
        ) : null;
      case 'details':
        return selectedClient ? (
          <ClientDetails
            organizationId={organizationId}
            client={selectedClient}
            onEdit={() => handleEditClient(selectedClient)}
            onDelete={handleDeleteClient}
            showActions={true}
          />
        ) : null;
      default:
        return (
          <ClientList
            key={refreshKey}
            organizationId={organizationId}
            onClientSelect={handleViewClient}
            onCreateClient={handleCreateClient}
            onEditClient={handleEditClient}
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