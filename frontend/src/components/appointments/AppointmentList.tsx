import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Calendar, Clock, User, MapPin, MoreVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { appointmentService } from '../../services';
import type {
    AppointmentFilters,
    AppointmentStatus
} from '@attendance-x/shared';
import type { AppointmentWithDetails } from '../../services/appointmentService';
import { 
  formatAppointmentDate, 
  formatAppointmentTime, 
  getAppointmentStatusColor,
  getAppointmentStatusLabel,
  searchAppointments,
  sortAppointmentsByDateTime,
  getAvailableActions
} from '../../utils/appointmentUtils';

interface AppointmentListProps {
  organizationId: string;
  onAppointmentSelect?: (appointment: AppointmentWithDetails) => void;
  onCreateAppointment?: () => void;
  onEditAppointment?: (appointment: AppointmentWithDetails) => void;
  showCreateButton?: boolean;
  compact?: boolean;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  organizationId,
  onAppointmentSelect,
  onCreateAppointment,
  onEditAppointment,
  showCreateButton = true,
  compact = false
}) => {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [practitionerFilter, setPractitionerFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Load appointments
  useEffect(() => {
    loadAppointments();
  }, [organizationId, statusFilter, dateFilter, practitionerFilter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AppointmentFilters = {};

      // Apply status filter
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }

      // Apply date filter
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          filters.startDate = now;
          filters.endDate = now;
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          filters.startDate = weekStart;
          filters.endDate = weekEnd;
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          filters.startDate = monthStart;
          filters.endDate = monthEnd;
          break;
      }

      // Apply practitioner filter
      if (practitionerFilter !== 'all') {
        filters.practitionerId = practitionerFilter;
      }

      const response = await appointmentService.getAppointments(organizationId, filters);
      
      // If the response doesn't have populated details, we need to handle it
      // For now, let's assume the backend should return populated data
      // If not, you'll need to fetch related data separately
      setAppointments(response.appointments);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Apply search
    if (searchQuery.trim()) {
      filtered = searchAppointments(filtered, searchQuery);
    }

    // Sort by date and time
    return sortAppointmentsByDateTime(filtered);
  }, [appointments, searchQuery]);

  // Handle appointment actions
  const handleAppointmentAction = async (
    appointmentId: string, 
    action: string, 
    data?: any
  ) => {
    try {
      setActionLoading(prev => ({ ...prev, [appointmentId]: true }));

      switch (action) {
        case 'confirm':
          await appointmentService.confirmAppointment(organizationId, appointmentId);
          break;
        case 'complete':
          await appointmentService.completeAppointment(organizationId, appointmentId, data?.notes);
          break;
        case 'cancel':
          await appointmentService.cancelAppointment(organizationId, appointmentId, data?.reason);
          break;
        case 'no-show':
          await appointmentService.markAsNoShow(organizationId, appointmentId);
          break;
      }

      // Reload appointments
      await loadAppointments();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} appointment`);
    } finally {
      setActionLoading(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  // Get unique practitioners for filter
  const practitioners = useMemo(() => {
    const unique = new Map();
    appointments.forEach(apt => {
      if (!unique.has(apt.practitionerId)) {
        unique.set(apt.practitionerId, apt.practitioner);
      }
    });
    return Array.from(unique.values());
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rendez-vous</h2>
          <p className="text-gray-600">
            {filteredAppointments.length} rendez-vous trouvé{filteredAppointments.length > 1 ? 's' : ''}
          </p>
        </div>
        {showCreateButton && onCreateAppointment && (
          <Button onClick={onCreateAppointment} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau rendez-vous
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher par client, service, praticien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="scheduled">Programmé</SelectItem>
            <SelectItem value="confirmed">Confirmé</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
            <SelectItem value="no-show">Absent</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>

        {/* Practitioner Filter */}
        {practitioners.length > 0 && (
          <Select value={practitionerFilter} onValueChange={setPractitionerFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Praticien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les praticiens</SelectItem>
              {practitioners.map((practitioner: any) => (
                <SelectItem key={practitioner.id} value={practitioner.id}>
                  {practitioner.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAppointments}
            className="mt-2"
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun rendez-vous</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
                ? 'Aucun rendez-vous ne correspond à vos critères de recherche.'
                : 'Commencez par créer votre premier rendez-vous.'
              }
            </p>
            {showCreateButton && onCreateAppointment && (
              <Button onClick={onCreateAppointment} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer un rendez-vous
              </Button>
            )}
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onSelect={onAppointmentSelect}
              onEdit={onEditAppointment}
              onAction={handleAppointmentAction}
              actionLoading={actionLoading[appointment.id!] || false}
              compact={compact}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Appointment Card Component
interface AppointmentCardProps {
  appointment: AppointmentWithDetails;
  onSelect?: (appointment: AppointmentWithDetails) => void;
  onEdit?: (appointment: AppointmentWithDetails) => void;
  onAction: (appointmentId: string, action: string, data?: any) => void;
  actionLoading: boolean;
  compact?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onSelect,
  onEdit,
  onAction,
  actionLoading,
  compact = false
}) => {
  const availableActions = getAvailableActions(appointment);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(appointment);
    }
  };

  return (
    <Card 
      className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${compact ? 'p-3' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Badge 
              style={{ 
                backgroundColor: getAppointmentStatusColor(appointment.status),
                color: 'white'
              }}
            >
              {getAppointmentStatusLabel(appointment.status)}
            </Badge>
            <span className="text-sm text-gray-500">
              #{appointment.id?.slice(-6)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Client Info */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {appointment.client.firstName} {appointment.client.lastName}
                </p>
                <p className="text-sm text-gray-500">{appointment.client.email}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatAppointmentDate(appointment.date)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatAppointmentTime(appointment.startTime, appointment.duration)}
                </p>
              </div>
            </div>

            {/* Service */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{appointment.service.name}</p>
                <p className="text-sm text-gray-500">
                  {appointment.duration} min - {appointment.practitioner.displayName}
                </p>
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {appointment.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(appointment);
              }}
            >
              Modifier
            </Button>
          )}

          {availableActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableActions.includes('confirm') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(appointment.id!, 'confirm');
                    }}
                  >
                    Confirmer
                  </DropdownMenuItem>
                )}
                {availableActions.includes('complete') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(appointment.id!, 'complete');
                    }}
                  >
                    Terminer
                  </DropdownMenuItem>
                )}
                {availableActions.includes('no-show') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(appointment.id!, 'no-show');
                    }}
                  >
                    Marquer absent
                  </DropdownMenuItem>
                )}
                {availableActions.includes('cancel') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction(appointment.id!, 'cancel');
                      }}
                      className="text-red-600"
                    >
                      Annuler
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </Card>
  );
};