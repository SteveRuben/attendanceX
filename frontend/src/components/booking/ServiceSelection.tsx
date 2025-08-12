import React from 'react';
import { Clock, DollarSign, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { Service } from '@attendance-x/shared';

interface ServiceSelectionProps {
  services: Service[];
  selectedService?: Service;
  onServiceSelect: (service: Service) => void;
}

export const ServiceSelection: React.FC<ServiceSelectionProps> = ({
  services,
  selectedService,
  onServiceSelect
}) => {
  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun service disponible
        </h3>
        <p className="text-gray-600">
          Aucun service n'est actuellement disponible pour la réservation en ligne.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choisissez votre service
        </h2>
        <p className="text-gray-600">
          Sélectionnez le service que vous souhaitez réserver
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card
            key={service.id}
            className={`
              p-6 cursor-pointer transition-all hover:shadow-md
              ${selectedService?.id === service.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
              }
            `}
            onClick={() => onServiceSelect(service)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {service.name}
                </h3>
                
                {service.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {service.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} min</span>
                  </div>
                  
                  {service.price && service.price > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{service.price}€</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedService?.id === service.id && (
                <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
              )}
            </div>

            <div className="mt-4">
              <Button
                className="w-full"
                variant={selectedService?.id === service.id ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onServiceSelect(service);
                }}
              >
                {selectedService?.id === service.id ? 'Service sélectionné' : 'Sélectionner'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedService && (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Service sélectionné : <strong>{selectedService.name}</strong>
          </p>
        </div>
      )}
    </div>
  );
};