import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { organizationService } from '../../services/organizationService';
import { toast } from 'react-toastify';

interface UserInvitationProps {
  organizationId: string;
  onInvitationSent: () => void;
}

interface InvitationFormData {
  email: string;
  role: string;
  message?: string;
}

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employé', description: 'Accès de base aux fonctionnalités' },
  { value: 'manager', label: 'Manager', description: 'Gestion d\'équipe et rapports' },
  { value: 'admin', label: 'Administrateur', description: 'Accès complet à l\'organisation' }
];

export const UserInvitation: React.FC<UserInvitationProps> = ({
  organizationId,
  onInvitationSent
}) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm<InvitationFormData>({
    mode: 'onChange',
    defaultValues: {
      role: 'employee'
    }
  });

  const selectedRole = watch('role');
  const selectedRoleInfo = ROLE_OPTIONS.find(role => role.value === selectedRole);

  const onSubmit = async (data: InvitationFormData) => {
    setLoading(true);
    try {
      await organizationService.inviteUser(organizationId, data.email, data.role, data.message);
      toast.success('Invitation envoyée avec succès !');
      reset();
      setShowForm(false);
      onInvitationSent();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'envoi de l\'invitation';
      toast.error(errorMessage);
      console.error('Error sending invitation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Inviter un utilisateur</h3>
        <p className="mt-1 text-sm text-gray-500">
          Invitez de nouveaux membres à rejoindre votre organisation
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nouvelle invitation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Inviter un nouvel utilisateur</h3>
        <p className="mt-1 text-sm text-gray-600">
          Envoyez une invitation par email pour ajouter un membre à votre organisation
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Adresse email *
          </label>
          <div className="mt-1">
            <input
              {...register('email', {
                required: 'L\'adresse email est requise',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Adresse email invalide'
                }
              })}
              type="email"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="utilisateur@exemple.com"
            />
            {errors.email && (
              <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Rôle */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Rôle *
          </label>
          <div className="mt-1">
            <select
              {...register('role', { required: 'Le rôle est requis' })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-2 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>
          {selectedRoleInfo && (
            <p className="mt-2 text-sm text-gray-500">{selectedRoleInfo.description}</p>
          )}
        </div>

        {/* Message personnalisé */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message personnalisé (optionnel)
          </label>
          <div className="mt-1">
            <textarea
              {...register('message', {
                maxLength: {
                  value: 500,
                  message: 'Le message ne peut pas dépasser 500 caractères'
                }
              })}
              rows={3}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ajoutez un message personnel à votre invitation..."
            />
            {errors.message && (
              <p className="mt-2 text-sm text-red-600">{errors.message.message}</p>
            )}
          </div>
        </div>

        {/* Aperçu de l'invitation */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Aperçu de l'invitation</h4>
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>À :</strong> {watch('email') || 'utilisateur@exemple.com'}
            </p>
            <p className="mb-2">
              <strong>Rôle :</strong> {selectedRoleInfo?.label}
            </p>
            <div className="bg-white border border-gray-200 rounded p-3 mt-3">
              <p className="text-sm">
                Vous avez été invité(e) à rejoindre notre organisation en tant que{' '}
                <strong>{selectedRoleInfo?.label.toLowerCase()}</strong>.
              </p>
              {watch('message') && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-sm italic">"{watch('message')}"</p>
                </div>
              )}
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Cliquez ici pour accepter l'invitation
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!isValid || loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi en cours...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Envoyer l'invitation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};