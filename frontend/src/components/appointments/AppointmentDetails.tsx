import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import type { AppointmentWithDetails } from '../../services/appointmentService';
import { 
  formatAppointmentDate, 
  formatAppointmentTime, 
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
  getAvailableActions
} from '../../utils/appointmentUtils';

interface AppointmentDetailsProps {
  appointment: AppointmentWithDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  onAction?: (action: string, data?: any) => void;
  actionLoading?: boolean;
  showActions?: boolean;
}

export const AppointmentDetails: React.FC<AppointmentDetailsProps> = ({
  appointment,
  onEdit,
  onDelete,
  onAction,
  actionLoading = false,
  showActions = true
}) => {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const availableActions = getAvailableActions(appointment);

  const handleAction = async (action: string, data?: any) => {
    if (onAction) {
      await onAction(action, data);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      setDeleteLoading(true);
      try {
        await onDelete();
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Détails du rendez-vous
          </h2>
          <p className="text-gray-600">
            #{appointment.id?.slice(-6)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            style={{ 
              backgroundColor: getAppointmentStatusColor(appointment.status),
              color: 'white'
            }}
          >
            {getAppointmentStatusLabel(appointment.status)}
          </Badge>
          {showActions && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Main Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Informations client
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nom complet</p>
              <p className="font-medium text-gray-900">
                {appointment.client.firstName} {appointment.client.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <a 
                  href={`mailto:${appointment.client.email}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {appointment.client.email}
                </a>
              </div>
            </div>
            {appointment.client.phone && (
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <a 
                    href={`tel:${appointment.client.phone}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {appointment.client.phone}
                  </a>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Appointment Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Détails du rendez-vous
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium text-gray-900">
                {formatAppointmentDate(appointment.date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Heure</p>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <p className="font-medium text-gray-900">
                  {formatAppointmentTime(appointment.startTime, appointment.duration)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-medium text-gray-900">
                {appointment.service.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Praticien</p>
              <p className="font-medium text-gray-900">
                {appointment.practitioner.displayName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Durée</p>
              <p className="font-medium text-gray-900">
                {appointment.duration} minutes
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Notes */}
      {appointment.notes && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Notes
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {appointment.notes}
          </p>
        </Card>
      )}

      {/* Actions */}
      {showActions && availableActions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actions disponibles
          </h3>
          <div className="flex flex-wrap gap-3">
            {availableActions.includes('confirm') && (
              <Button
                onClick={() => handleAction('confirm')}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirmer
              </Button>
            )}
            
            {availableActions.includes('complete') && (
              <Button
                onClick={() => handleAction('complete')}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Terminer
              </Button>
            )}
            
            {availableActions.includes('no-show') && (
              <Button
                onClick={() => handleAction('no-show')}
                disabled={actionLoading}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                Marquer absent
              </Button>
            )}
            
            {availableActions.includes('cancel') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annuler le rendez-vous</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action ne peut pas être annulée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleAction('cancel')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirmer l'annulation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Card>
      )}

      {/* Delete Action */}
      {showActions && onDelete && (
        <Card className="p-6 border-red-200">
          <h3 className="text-lg font-semibold text-red-900 mb-4">
            Zone de danger
          </h3>
          <p className="text-red-700 mb-4">
            Supprimer définitivement ce rendez-vous. Cette action ne peut pas être annulée.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer le rendez-vous
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le rendez-vous</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ? 
                  Cette action ne peut pas être annulée et toutes les données associées seront perdues.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      )}
    </div>
  );
};