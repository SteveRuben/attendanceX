import React from 'react';
import { User, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { PublicPractitioner } from '../../services/publicBookingService';

interface PractitionerSelectionProps {
  practitioners: PublicPractitioner[];
  selectedPractitioner?: PublicPractitioner;
  onPractitionerSelect: (practitioner: PublicPractitioner) => void;
  onBack: () => void;
}

export const PractitionerSelection: React.FC<PractitionerSelectionProps> = ({
  practitioners,
  selectedPractitioner,
  onPractitionerSelect,
  onBack
}) => {
  if (practitioners.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun praticien disponible
        </h3>
        <p className="text-gray-600 mb-4">
          Aucun praticien n'est disponible pour ce service.
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux services
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Choisissez votre praticien
          </h2>
          <p className="text-gray-600">
            Sélectionnez le praticien avec qui vous souhaitez prendre rendez-vous
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="ml-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {practitioners.map((practitioner) => (
          <Card
            key={practitioner.id}
            className={`
              p-6 cursor-pointer transition-all hover:shadow-md
              ${selectedPractitioner?.id === practitioner.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
              }
            `}
            onClick={() => onPractitionerSelect(practitioner)}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {practitioner.avatar ? (
                  <img
                    src={practitioner.avatar}
                    alt={practitioner.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {practitioner.displayName}
                    </h3>
                    
                    {practitioner.specialties && practitioner.specialties.length > 0 && (
                      <div className="mt-1">
                        {practitioner.specialties.map((specialty, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedPractitioner?.id === practitioner.id && (
                    <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  )}
                </div>

                {practitioner.bio && (
                  <p className="text-gray-600 text-sm mt-2 line-clamp-3">
                    {practitioner.bio}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button
                className="w-full"
                variant={selectedPractitioner?.id === practitioner.id ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onPractitionerSelect(practitioner);
                }}
              >
                {selectedPractitioner?.id === practitioner.id ? 'Praticien sélectionné' : 'Sélectionner'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedPractitioner && (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Praticien sélectionné : <strong>{selectedPractitioner.displayName}</strong>
          </p>
        </div>
      )}
    </div>
  );
};