// src/components/optimized/VirtualizedAppointmentList.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Search } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointmentCache';
import { optimizedEventHandlers } from '@/utils/performanceOptimization';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  practitionerName: string;
  dateTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  duration: number;
  notes?: string;
}

interface AppointmentItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    appointments: Appointment[];
    onEdit: (appointment: Appointment) => void;
    onCancel: (appointmentId: string) => void;
  };
}

const AppointmentItem: React.FC<AppointmentItemProps> = React.memo(({ 
  index, 
  style, 
  data 
}) => {
  const { appointments, onEdit, onCancel } = data;
  const appointment = appointments[index];

  if (!appointment) {
    return <div style={style} />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      case 'no_show':
        return 'Absent';
      default:
        return status;
    }
  };

  return (
    <div style={style} className="px-4 py-2">
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div>
                <h4 className="font-medium text-gray-900">{appointment.clientName}</h4>
                <p className="text-sm text-gray-600">{appointment.serviceName}</p>
              </div>
            </div>
            <Badge className={getStatusColor(appointment.status)}>
              {getStatusText(appointment.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(appointment.dateTime), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>
                {format(new Date(appointment.dateTime), 'HH:mm')} ({appointment.duration} min)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>{appointment.practitionerName}</span>
            </div>
          </div>

          {appointment.notes && (
            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
              {appointment.notes}
            </p>
          )}

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(appointment)}
            >
              Modifier
            </Button>
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(appointment.id)}
                className="text-red-600 hover:text-red-700"
              >
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

AppointmentItem.displayName = 'AppointmentItem';

interface VirtualizedAppointmentListProps {
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointmentId: string) => void;
  filters?: {
    status?: string;
    practitionerId?: string;
    dateRange?: { start: string; end: string };
  };
}

const VirtualizedAppointmentList: React.FC<VirtualizedAppointmentListProps> = ({
  onEdit,
  onCancel,
  filters
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localFilters, setLocalFilters] = useState(filters || {});
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch appointments with caching
  const { data: appointments = [], loading, error, refresh } = useAppointments(localFilters);

  // Optimized search handler
  const handleSearch = useMemo(
    () => optimizedEventHandlers.search((query: string) => {
      setSearchQuery(query);
    }),
    []
  );

  // Filter appointments based on search query
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;

    const query = searchQuery.toLowerCase();
    return appointments.filter((appointment: Appointment) =>
      appointment.clientName.toLowerCase().includes(query) ||
      appointment.serviceName.toLowerCase().includes(query) ||
      appointment.practitionerName.toLowerCase().includes(query) ||
      appointment.notes?.toLowerCase().includes(query)
    );
  }, [appointments, searchQuery]);

  // Memoized item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    appointments: filteredAppointments,
    onEdit,
    onCancel
  }), [filteredAppointments, onEdit, onCancel]);

  // Handle container resize
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const handleResize = optimizedEventHandlers.resize(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100; // 100px buffer
        setContainerHeight(Math.max(400, Math.min(800, availableHeight)));
      }
    });

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Scroll to top when filters change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [localFilters, searchQuery]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Erreur lors du chargement des rendez-vous</p>
        <Button onClick={handleRefresh} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Rechercher des rendez-vous..."
            className="pl-10"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={loading}>
          {loading ? 'Chargement...' : 'Actualiser'}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredAppointments.length}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredAppointments.filter((a: Appointment) => a.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredAppointments.filter((a: Appointment) => a.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {filteredAppointments.filter((a: Appointment) => a.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Terminés</div>
          </CardContent>
        </Card>
      </div>

      {/* Virtualized List */}
      <div ref={containerRef} className="border rounded-lg">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {loading ? 'Chargement des rendez-vous...' : 'Aucun rendez-vous trouvé'}
            </p>
          </div>
        ) : (
          <List
            ref={listRef}
            height={containerHeight}
            itemCount={filteredAppointments.length}
            itemSize={180} // Height of each appointment item
            itemData={itemData}
            overscanCount={5} // Render 5 extra items for smooth scrolling
          >
            {AppointmentItem}
          </List>
        )}
      </div>

      {/* Load More Button (if needed for pagination) */}
      {filteredAppointments.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            Affichage de {filteredAppointments.length} rendez-vous
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(VirtualizedAppointmentList);