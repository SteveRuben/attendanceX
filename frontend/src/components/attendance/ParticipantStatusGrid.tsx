// src/components/attendance/ParticipantStatusGrid.tsx - Grille des statuts participants

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Mail,
  Phone
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'pending';
  checkInTime?: Date;
  method?: string;
  notes?: string;
}

interface ParticipantStatusGridProps {
  participants: Participant[];
  onParticipantClick?: (participant: Participant) => void;
  onStatusChange?: (participantId: string, newStatus: string) => void;
  showActions?: boolean;
}

const ParticipantStatusGrid = ({
  participants,
  onParticipantClick,
  onStatusChange,
  showActions = false
}: ParticipantStatusGridProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>(participants);

  useEffect(() => {
    let filtered = participants;

    // Filtrer par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrer par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter]);

  const getStatusConfig = (status: string) => {
    const configs = {
      present: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: UserCheck,
        label: 'Présent'
      },
      late: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'En retard'
      },
      absent: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: UserX,
        label: 'Absent'
      },
      excused: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: AlertCircle,
        label: 'Excusé'
      },
      pending: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Clock,
        label: 'En attente'
      }
    };

    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getStatusCounts = () => {
    return {
      total: participants.length,
      present: participants.filter(p => p.status === 'present').length,
      late: participants.filter(p => p.status === 'late').length,
      absent: participants.filter(p => p.status === 'absent').length,
      excused: participants.filter(p => p.status === 'excused').length,
      pending: participants.filter(p => p.status === 'pending').length
    };
  };

  const counts = getStatusCounts();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2" />
            Participants ({filteredParticipants.length}/{participants.length})
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous ({counts.total})</SelectItem>
                <SelectItem value="present">Présents ({counts.present})</SelectItem>
                <SelectItem value="late">En retard ({counts.late})</SelectItem>
                <SelectItem value="absent">Absents ({counts.absent})</SelectItem>
                <SelectItem value="excused">Excusés ({counts.excused})</SelectItem>
                <SelectItem value="pending">En attente ({counts.pending})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredParticipants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredParticipants.map((participant) => {
              const statusConfig = getStatusConfig(participant.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={participant.id}
                  className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${statusConfig.color}`}
                  onClick={() => onParticipantClick?.(participant)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-xs">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex items-center space-x-1">
                      <StatusIcon className="w-4 h-4" />
                      {showActions && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm leading-tight">{participant.name}</h4>
                    <p className="text-xs opacity-75 flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {participant.email}
                    </p>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {statusConfig.label}
                    </Badge>
                    
                    {participant.checkInTime && (
                      <span className="text-xs opacity-75">
                        {participant.checkInTime.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  
                  {participant.method && (
                    <div className="mt-2">
                      <span className="text-xs opacity-75">
                        via {participant.method}
                      </span>
                    </div>
                  )}
                  
                  {participant.notes && (
                    <div className="mt-2">
                      <p className="text-xs opacity-75 italic line-clamp-2">
                        {participant.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Aucun participant trouvé
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Aucun participant ne correspond aux critères de recherche.'
                : 'Aucun participant inscrit à cet événement.'
              }
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="mt-4"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParticipantStatusGrid;