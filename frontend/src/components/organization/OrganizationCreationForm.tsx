import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { OrganizationSector } from '@attendance-x/shared';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

interface OrganizationFormData {
  name: string;
  description?: string;
  sector: OrganizationSector;
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

interface OrganizationCreationFormProps {
  onSubmit: (data: OrganizationFormData) => Promise<void>;
  loading: boolean;
}

const SECTOR_OPTIONS = [
  { value: OrganizationSector.SERVICES, label: 'Services' },
  { value: OrganizationSector.RETAIL, label: 'Commerce de détail' },
  { value: OrganizationSector.HEALTHCARE, label: 'Santé' },
  { value: OrganizationSector.BEAUTY, label: 'Beauté et bien-être' },
  { value: OrganizationSector.EDUCATION, label: 'Éducation' },
  { value: OrganizationSector.CONSULTING, label: 'Conseil' },
  { value: OrganizationSector.ASSOCIATION, label: 'Association' },
  { value: OrganizationSector.OTHER, label: 'Autre' }
];

export const OrganizationCreationForm: React.FC<OrganizationCreationFormProps> = ({
  onSubmit,
  loading
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm<OrganizationFormData>({
    mode: 'onChange',
    defaultValues: {
      contactInfo: {},
      address: {}
    }
  });

  const selectedSector = watch('sector');

  const onFormSubmit = async (data: OrganizationFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Nom de l'organisation */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nom de l'organisation *
        </label>
        <div className="mt-1">
          <input
            {...register('name', {
              required: 'Le nom de l\'organisation est requis',
              minLength: {
                value: 2,
                message: 'Le nom doit contenir au moins 2 caractères'
              },
              maxLength: {
                value: 100,
                message: 'Le nom ne peut pas dépasser 100 caractères'
              }
            })}
            type="text"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Ex: Mon Entreprise"
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
      </div>

      {/* Secteur d'activité */}
      <div>
        <label htmlFor="sector" className="block text-sm font-medium text-gray-700">
          Secteur d'activité *
        </label>
        <div className="mt-1">
          <select
            {...register('sector', {
              required: 'Le secteur d\'activité est requis'
            })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Sélectionnez un secteur</option>
            {SECTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.sector && (
            <p className="mt-2 text-sm text-red-600">{errors.sector.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description (optionnel)
        </label>
        <div className="mt-1">
          <textarea
            {...register('description', {
              maxLength: {
                value: 500,
                message: 'La description ne peut pas dépasser 500 caractères'
              }
            })}
            rows={3}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Décrivez brièvement votre organisation..."
          />
          {errors.description && (
            <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* Informations de contact */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Informations de contact</h3>
          <Button
            type="button"
            variant="action"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Masquer
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Afficher plus
              </>
            )}
          </Button>
        </div>
        
        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor="contactInfo.email" className="block text-sm font-medium text-gray-700">
              Email professionnel
            </label>
            <div className="mt-1">
              <input
                {...register('contactInfo.email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Adresse email invalide'
                  }
                })}
                type="email"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="contact@monentreprise.com"
              />
              {errors.contactInfo?.email && (
                <p className="mt-2 text-sm text-red-600">{errors.contactInfo.email.message}</p>
              )}
            </div>
          </div>

          {showAdvanced && (
            <>
              <div>
                <label htmlFor="contactInfo.phone" className="block text-sm font-medium text-gray-700">
                  Téléphone
                </label>
                <div className="mt-1">
                  <input
                    {...register('contactInfo.phone')}
                    type="tel"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contactInfo.website" className="block text-sm font-medium text-gray-700">
                  Site web
                </label>
                <div className="mt-1">
                  <input
                    {...register('contactInfo.website', {
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: 'URL invalide (doit commencer par http:// ou https://)'
                      }
                    })}
                    type="url"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="https://www.monentreprise.com"
                  />
                  {errors.contactInfo?.website && (
                    <p className="mt-2 text-sm text-red-600">{errors.contactInfo.website.message}</p>
                  )}
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Adresse</h4>
                
                <div>
                  <label htmlFor="address.street" className="block text-sm font-medium text-gray-700">
                    Rue
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('address.street')}
                      type="text"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="123 Rue de la Paix"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="address.city" className="block text-sm font-medium text-gray-700">
                      Ville
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('address.city')}
                        type="text"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Paris"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="address.postalCode" className="block text-sm font-medium text-gray-700">
                      Code postal
                    </label>
                    <div className="mt-1">
                      <input
                        {...register('address.postalCode')}
                        type="text"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="75001"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="address.country" className="block text-sm font-medium text-gray-700">
                    Pays
                  </label>
                  <div className="mt-1">
                    <select
                      {...register('address.country')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Sélectionnez un pays</option>
                      <option value="France">France</option>
                      <option value="Belgique">Belgique</option>
                      <option value="Suisse">Suisse</option>
                      <option value="Canada">Canada</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bouton de soumission */}
      <div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!isValid || loading}
          loading={loading}
          className="w-full"
        >
          {loading ? 'Création en cours...' : 'Continuer'}
        </Button>
      </div>

      {/* Informations sur les données */}
      <div className="text-xs text-gray-500 text-center">
        <p>
          En créant votre organisation, vous acceptez nos{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-500">
            conditions d'utilisation
          </a>{' '}
          et notre{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-500">
            politique de confidentialité
          </a>
          .
        </p>
      </div>
    </form>
  );
};