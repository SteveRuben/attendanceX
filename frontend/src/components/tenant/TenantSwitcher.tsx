// Composant de changement de tenant
import React, { useState } from 'react';
import { useMultiTenantAuth, useTenant } from '../../contexts/MultiTenantAuthContext';

interface TenantSwitcherProps {
  className?: string;
  showCreateOption?: boolean;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({
  className = '',
  showCreateOption = true
}) => {
  const { availableTenants, switchTenant, isLoading } = useMultiTenantAuth();
  const { tenant: currentTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    try {
      await switchTenant(tenantId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      // TODO: Afficher une notification d'erreur
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCreateTenant = () => {
    setIsOpen(false);
    // TODO: Ouvrir le modal de création de tenant
    console.log('Open create tenant modal');
  };

  if (!currentTenant) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bouton de sélection du tenant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isSwitching}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {/* Logo du tenant si disponible */}
        {currentTenant.branding?.logoUrl ? (
          <img
            src={currentTenant.branding.logoUrl}
            alt={currentTenant.name}
            className="w-5 h-5 rounded"
          />
        ) : (
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: currentTenant.branding?.primaryColor || '#3b82f6' }}
          >
            {currentTenant.name.charAt(0).toUpperCase()}
          </div>
        )}
        
        <span className="truncate max-w-32">{currentTenant.name}</span>
        
        {/* Icône de dropdown */}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* En-tête */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Switch Organization
            </div>

            {/* Liste des tenants */}
            <div className="max-h-60 overflow-y-auto">
              {availableTenants.map((membership) => {
                const isCurrentTenant = membership.tenantId === currentTenant.id;
                
                return (
                  <button
                    key={membership.tenantId}
                    onClick={() => handleTenantSwitch(membership.tenantId)}
                    disabled={isSwitching || isCurrentTenant}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 ${
                      isCurrentTenant ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Indicateur visuel du tenant */}
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: '#3b82f6' }} // TODO: Récupérer la couleur du tenant
                      >
                        {membership.tenantId.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {/* TODO: Récupérer le nom du tenant */}
                          Organization {membership.tenantId}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {membership.role}
                        </div>
                      </div>
                      
                      {/* Indicateur du tenant actuel */}
                      {isCurrentTenant && (
                        <div className="flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Option de création de tenant */}
            {showCreateOption && (
              <>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleCreateTenant}
                  disabled={isSwitching}
                  className="w-full px-4 py-3 text-left text-blue-600 hover:bg-blue-50 focus:outline-none focus:bg-blue-50 disabled:opacity-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded border-2 border-dashed border-blue-300 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium">Create New Organization</div>
                      <div className="text-sm text-gray-500">Start a new workspace</div>
                    </div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overlay pour fermer le menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Indicateur de chargement */}
      {isSwitching && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-md">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};