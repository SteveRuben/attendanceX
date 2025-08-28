import React, { useState } from 'react';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Copy,
  Download,
  Edit,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { publicBookingService, PublicOrganizationInfo } from '../../services/publicBookingService';
import type { BookingConfirmation as BookingConfirmationType } from '../../services/publicBookingService';

interface BookingConfirmationProps {
  confirmation: BookingConfirmationType;
  organizationInfo: PublicOrganizationInfo;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  confirmation,
  organizationInfo
}) => {
  const [copied, setCopied] = useState(false);
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const appointment = confirmation.appointment;

  const handleCopyConfirmationCode = async () => {
    try {
      await navigator.clipboard.writeText(confirmation.confirmationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownloadConfirmation = () => {
    // Create a simple text file with appointment details
    const appointmentDetails = `
CONFIRMATION DE RENDEZ-VOUS

Organisation: ${organizationInfo.name}
Code de confirmation: ${confirmation.confirmationCode}

DÉTAILS DU RENDEZ-VOUS:
Date: ${new Date(appointment.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}
Heure: ${appointment.startTime}
Durée: ${appointment.duration} minutes
Service: ${appointment.service?.name || 'N/A'}
Praticien: ${appointment.practitioner?.displayName || 'N/A'}

CLIENT:
Nom: ${appointment.client?.firstName} ${appointment.client?.lastName}
Email: ${appointment.client?.email}
Téléphone: ${appointment.client?.phone}

${appointment.notes ? `Notes: ${appointment.notes}` : ''}

CONTACT:
${organizationInfo.address ? `Adresse: ${organizationInfo.address}` : ''}
${organizationInfo.phone ? `Téléphone: ${organizationInfo.phone}` : ''}
${organizationInfo.email ? `Email: ${organizationInfo.email}` : ''}

Gardez ce code de confirmation pour toute modification ou annulation.
    `.trim();

    const blob = new Blob([appointmentDetails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confirmation-${confirmation.confirmationCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCancelBooking = async (reason?: string) => {
    try {
      setActionLoading(true);
      await publicBookingService.cancelBooking(
        organizationInfo.id,
        confirmation.confirmationCode,
        reason
      );
      // Refresh page or show success message
      window.location.reload();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      alert('Erreur lors de l\'annulation: ' + error.message);
    } finally {
      setActionLoading(false);
      setShowCancelForm(false);
    }
  };

  const canModifyOrCancel = () => {
    const appointmentDate = new Date(appointment.date);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilAppointment > organizationInfo.bookingSettings.cancellationDeadlineHours;
  };

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Réservation confirmée !
        </h2>
        <p className="text-gray-600">
          {confirmation.message}
        </p>
      </div>

      {/* Confirmation code */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="text-center">
          <p className="text-sm text-green-700 mb-2">Code de confirmation</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-bold text-green-800">
              {confirmation.confirmationCode}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyConfirmationCode}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-green-600 mt-2">
            Conservez ce code pour toute modification ou annulation
          </p>
        </div>
      </Card>

      {/* Appointment details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Détails du rendez-vous
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {new Date(appointment.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {appointment.startTime} ({appointment.duration} minutes)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {appointment.service?.name}
                </p>
                <p className="text-sm text-gray-600">
                  avec {appointment.practitioner?.displayName}
                </p>
              </div>
            </div>

            {appointment.notes && (
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600">
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Organization info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informations pratiques
          </h3>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">{organizationInfo.name}</p>
              {organizationInfo.description && (
                <p className="text-sm text-gray-600">{organizationInfo.description}</p>
              )}
            </div>
            
            {organizationInfo.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <p className="text-gray-700">{organizationInfo.address}</p>
              </div>
            )}
            
            {organizationInfo.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <a 
                  href={`tel:${organizationInfo.phone}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {organizationInfo.phone}
                </a>
              </div>
            )}
            
            {organizationInfo.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <a 
                  href={`mailto:${organizationInfo.email}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {organizationInfo.email}
                </a>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          variant="outline"
          onClick={handleDownloadConfirmation}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Télécharger la confirmation
        </Button>

        {canModifyOrCancel() && (
          <>
            <Button
              variant="outline"
              onClick={() => setShowModifyForm(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Modifier le rendez-vous
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowCancelForm(true)}
              className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Annuler le rendez-vous
            </Button>
          </>
        )}
      </div>

      {/* Cancel form */}
      {showCancelForm && (
        <Card className="p-6 border-red-200">
          <h3 className="text-lg font-semibold text-red-900 mb-4">
            Annuler le rendez-vous
          </h3>
          <p className="text-red-700 mb-4">
            Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action ne peut pas être annulée.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setShowCancelForm(false)}
              disabled={actionLoading}
            >
              Garder le rendez-vous
            </Button>
            <Button
              onClick={() => handleCancelBooking()}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Annulation...
                </>
              ) : (
                'Confirmer l\'annulation'
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Important notes */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          Informations importantes
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            • Vous recevrez un email de confirmation à l'adresse {appointment.client?.email}
          </p>
          <p>
            • Un rappel vous sera envoyé 24h avant votre rendez-vous
          </p>
          {canModifyOrCancel() ? (
            <p>
              • Vous pouvez modifier ou annuler votre rendez-vous jusqu'à {organizationInfo.bookingSettings.cancellationDeadlineHours}h avant
            </p>
          ) : (
            <p className="text-orange-700">
              • Le délai de modification/annulation est dépassé. Contactez directement l'organisation pour tout changement.
            </p>
          )}
          <p>
            • En cas de problème, contactez-nous avec votre code de confirmation : {confirmation.confirmationCode}
          </p>
        </div>
      </Card>
    </div>
  );
};