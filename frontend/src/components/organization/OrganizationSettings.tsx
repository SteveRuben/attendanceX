import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { type Organization, OrganizationSector } from '../../shared';
import { organizationService } from '../../services/organizationService';
import { toast } from 'react-toastify';

interface OrganizationSettingsProps {
  organization: Organization;
  onUpdate: (organization: Organization) => void;
}

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
  settings: {
    features: {
      appointments: boolean;
      attendance: boolean;
      sales: boolean;
      clients: boolean;
      products: boolean;
      events: boolean;
    };
    branding: {
      primaryColor: string;
      secondaryColor: string;
    };
    notifications: {
      emailEnabled: boolean;
      smsEnabled: boolean;
    };
    security: {
      twoFactorRequired: boolean;
      passwordPolicy: {
        minLength: number;
        requireSpecialChars: boolean;
        requireNumbers: boolean;
      };
    };
  };
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

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organization,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'features' | 'branding' | 'security'>('general');
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: organization.name,
      description: organization.description,
      sector: organization.sector,
      contactInfo: organization.contactInfo || {},
      address: organization.address || {},
      settings: organization.settings
    }
  });

  const watchedColors = watch(['settings.branding.primaryColor', 'settings.branding.secondaryColor']);

  useEffect(() => {
    reset({
      name: organization.name,
      description: organization.description,
      sector: organization.sector,
      contactInfo: organization.contactInfo || {},
      address: organization.address || {},
      settings: organization.settings
    });
  }, [organization, reset]);

  const onSubmit = async (data: OrganizationFormData) => {
    setLoading(true);
    try {
      const updatedOrganization = await organizationService.updateOrganization(organization.id, data);
      onUpdate(updatedOrganization);
      toast.success('Paramètres mis à jour avec succès');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des paramètres');
      console.error('Error updating organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setLoading(true);
    try {
      const logoUrl = await organizationService.uploadLogo(organization.id, logoFile);
      const updatedOrganization = { ...organization, settings: { ...organization.settings, branding: { ...organization.settings.branding, logo: logoUrl } } };
      onUpdate(updatedOrganization);
      toast.success('Logo mis à jour avec succès');
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error) {
      toast.error('Erreur lors du téléchargement du logo');
      console.error('Error uploading logo:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'Général', icon: '🏢' },
    { id: 'features', name: 'Fonctionnalités', icon: '⚙️' },
    { id: 'branding', name: 'Apparence', icon: '🎨' },
    { id: 'security', name: 'Sécurité', icon: '🔒' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Paramètres de l'organisation</h2>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les paramètres et la configuration de votre organisation
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-6">
            {/* Onglet Général */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nom de l'organisation *
                    </label>
                    <input
                      {...register('name', { required: 'Le nom est requis' })}
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sector" className="block text-sm font-medium text-gray-700">
                      Secteur d'activité *
                    </label>
                    <select
                      {...register('sector', { required: 'Le secteur est requis' })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
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

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Décrivez votre organisation..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contactInfo.email" className="block text-sm font-medium text-gray-700">
                      Email professionnel
                    </label>
                    <input
                      {...register('contactInfo.email')}
                      type="email"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="contactInfo.phone" className="block text-sm font-medium text-gray-700">
                      Téléphone
                    </label>
                    <input
                      {...register('contactInfo.phone')}
                      type="tel"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contactInfo.website" className="block text-sm font-medium text-gray-700">
                    Site web
                  </label>
                  <input
                    {...register('contactInfo.website')}
                    type="url"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Onglet Fonctionnalités */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Fonctionnalités activées</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Choisissez les fonctionnalités disponibles pour votre organisation
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.features.appointments')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Rendez-vous</label>
                      <p className="text-gray-500">Gestion des rendez-vous et réservations</p>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.features.attendance')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Présence</label>
                      <p className="text-gray-500">Suivi de présence et pointage</p>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.features.sales')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Ventes</label>
                      <p className="text-gray-500">Gestion des ventes et facturation</p>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.features.clients')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Clients</label>
                      <p className="text-gray-500">Gestion de la base clients</p>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.features.products')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Produits</label>
                      <p className="text-gray-500">Catalogue et gestion des produits</p>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.features.events')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Événements</label>
                      <p className="text-gray-500">Organisation d'événements</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Notifications</h4>
                  
                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.notifications.emailEnabled')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Notifications par email</label>
                      <p className="text-gray-500">Envoyer des notifications par email</p>
                    </div>
                  </div>

                  <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        {...register('settings.notifications.smsEnabled')}
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700">Notifications par SMS</label>
                      <p className="text-gray-500">Envoyer des notifications par SMS</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Apparence */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Personnalisation de l'apparence</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Personnalisez l'apparence de votre organisation
                  </p>
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Logo</label>
                  <div className="mt-1 flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {logoPreview || organization.settings?.branding?.logo ? (
                        <img
                          className="h-16 w-16 rounded-lg object-cover"
                          src={logoPreview || organization.settings?.branding?.logo}
                          alt="Logo"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Logo</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Choisir un fichier
                      </label>
                      {logoFile && (
                        <button
                          type="button"
                          onClick={handleLogoUpload}
                          className="ml-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Télécharger
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Couleurs */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="settings.branding.primaryColor" className="block text-sm font-medium text-gray-700">
                      Couleur principale
                    </label>
                    <div className="mt-1 flex items-center space-x-3">
                      <input
                        {...register('settings.branding.primaryColor')}
                        type="color"
                        className="h-10 w-16 border border-gray-300 rounded-md"
                      />
                      <input
                        {...register('settings.branding.primaryColor')}
                        type="text"
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="settings.branding.secondaryColor" className="block text-sm font-medium text-gray-700">
                      Couleur secondaire
                    </label>
                    <div className="mt-1 flex items-center space-x-3">
                      <input
                        {...register('settings.branding.secondaryColor')}
                        type="color"
                        className="h-10 w-16 border border-gray-300 rounded-md"
                      />
                      <input
                        {...register('settings.branding.secondaryColor')}
                        type="text"
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="#EF4444"
                      />
                    </div>
                  </div>
                </div>

                {/* Aperçu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Aperçu</label>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: watchedColors[0] || '#3B82F6' }}
                      >
                        {organization.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{organization.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: watchedColors[0] || '#3B82F6' }}
                          ></span>
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: watchedColors[1] || '#EF4444' }}
                          ></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Sécurité */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Paramètres de sécurité</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Configurez les paramètres de sécurité pour votre organisation
                  </p>
                </div>

                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      {...register('settings.security.twoFactorRequired')}
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label className="font-medium text-gray-700">Authentification à deux facteurs obligatoire</label>
                    <p className="text-gray-500">Exiger l'authentification à deux facteurs pour tous les utilisateurs</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Politique de mot de passe</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="settings.security.passwordPolicy.minLength" className="block text-sm font-medium text-gray-700">
                        Longueur minimale
                      </label>
                      <select
                        {...register('settings.security.passwordPolicy.minLength')}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value={6}>6 caractères</option>
                        <option value={8}>8 caractères</option>
                        <option value={10}>10 caractères</option>
                        <option value={12}>12 caractères</option>
                      </select>
                    </div>

                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          {...register('settings.security.passwordPolicy.requireNumbers')}
                          type="checkbox"
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">Exiger des chiffres</label>
                        <p className="text-gray-500">Le mot de passe doit contenir au moins un chiffre</p>
                      </div>
                    </div>

                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          {...register('settings.security.passwordPolicy.requireSpecialChars')}
                          type="checkbox"
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-700">Exiger des caractères spéciaux</label>
                        <p className="text-gray-500">Le mot de passe doit contenir au moins un caractère spécial</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer avec boutons */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isDirty || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};