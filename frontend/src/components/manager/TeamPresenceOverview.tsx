/**
 * Vue d'ensemble de la présence de l'équipe
 */

import React, { useState, useEffect } from 'react';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Users,
  Coffee,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  MessageSquare,
  Mail,
  Download,
  RefreshCw
} from 'lucide-react';
import { presenceApi } from '../services/api/presence.api';
import { formatTime } from '../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';

interface TeamPresenceOverviewProps {
  organizationId?: string;
  selectedDate: string;
  selectedDepartment: string;
  className?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  avatar?: string;
  todayEntry?: any;
  status: 'present' | 'absent' | 'on_break' | 'late' | 'early_departure';
  workingHours: number;
  efficiency: number;
  lastActivity?: Date;
}

export const TeamPresenceOverview: React.FC<TeamPresenceOverviewProps> = ({
  organizationId,
  selectedDate,
  selectedDepartment,
  className = ''
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Charger les données de l'équipe
  const loadTeamData = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      // Charger les employés actuellement présents
      const presentResponse = await presenceApi.getCurrentlyPresentEmployees(organizationId);
      
      // Charger toutes les entrées de présence du jour
      const entriesResponse = await presenceApi.listPresenceEntries({
        organizationId,
        startDate: selectedDate,
        endDate: selectedDate,
        limit: 100
      });

      if (presentResponse.success && entriesResponse.success) {
        // Combiner les données
        const allEmployees = new Map<string, TeamMember>();

        // Ajouter les employés présents
        presentResponse.data.forEach((emp: any) => {
          allEmployees.set(emp.id, {
            id: emp.id,
            name: emp.name || emp.email,
            email: emp.email,
            employeeId: emp.employeeId,
            department: emp.department || 'Non assigné',
            position: emp.position || 'Non défini',
            avatar: emp.avatar,
            todayEntry: emp.todayEntry,
            status: getEmployeeStatus(emp.todayEntry),
            workingHours: emp.todayEntry?.totalHours || 0,
            efficiency: calculateEfficiency(emp.todayEntry),
            lastActivity: emp.todayEntry?.updatedAt ? new Date(emp.todayEntry.updatedAt) : undefined
          });
        });

        // Ajouter les employés avec des entrées mais pas forcément présents
        entriesResponse.data.forEach((entry: any) => {
          if (!allEmployees.has(entry.employeeId)) {
            allEmployees.set(entry.employeeId, {
              id: entry.employeeId,
              name: entry.employee?.name || entry.employee?.email || 'Employé inconnu',
              email: entry.employee?.email || '',
              employeeId: entry.employee?.employeeId || entry.employeeId,
              department: entry.employee?.department || 'Non assigné',
              position: entry.employee?.position || 'Non défini',
              avatar: entry.employee?.avatar,
              todayEntry: entry,
              status: getEmployeeStatus(entry),
              workingHours: entry.totalHours || 0,
              efficiency: calculateEfficiency(entry),
              lastActivity: entry.updatedAt ? new Date(entry.updatedAt) : undefined
            });
          }
        });

        setTeamMembers(Array.from(allEmployees.values()));
      } else {
        setError('Erreur lors du chargement des données de l\'équipe');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Déterminer le statut d'un employé
  const getEmployeeStatus = (entry: any): TeamMember['status'] => {
    if (!entry || !entry.clockInTime) return 'absent';
    
    if (entry.clockOutTime) {
      // Vérifier si c'est un départ anticipé
      const clockOutTime = new Date(entry.clockOutTime);
      const expectedEndTime = new Date(clockOutTime);
      expectedEndTime.setHours(17, 0, 0, 0); // Supposons 17h comme heure de fin standard
      
      if (clockOutTime < expectedEndTime) {
        return 'early_departure';
      }
      return 'present'; // Journée terminée normalement
    }
    
    // Vérifier si en pause
    const activeBreak = entry.breakEntries?.find((b: any) => !b.endTime);
    if (activeBreak) return 'on_break';
    
    // Vérifier si en retard
    const clockInTime = new Date(entry.clockInTime);
    const expectedStartTime = new Date(clockInTime);
    expectedStartTime.setHours(9, 0, 0, 0); // Supposons 9h comme heure de début standard
    
    if (clockInTime > expectedStartTime) return 'late';
    
    return 'present';
  };

  // Calculer l'efficacité
  const calculateEfficiency = (entry: any): number => {
    if (!entry || !entry.totalHours) return 0;
    
    const expectedHours = 8; // Journée standard de 8h
    let efficiency = Math.min((entry.totalHours / expectedHours) * 100, 100);
    
    // Pénaliser les retards et départs anticipés
    if (entry.clockInTime) {
      const clockInTime = new Date(entry.clockInTime);
      const expectedStartTime = new Date(clockInTime);
      expectedStartTime.setHours(9, 0, 0, 0);
      
      if (clockInTime > expectedStartTime) {
        const lateMinutes = (clockInTime.getTime() - expectedStartTime.getTime()) / (1000 * 60);
        efficiency -= Math.min(lateMinutes / 2, 10); // Pénalité max de 10%
      }
    }
    
    return Math.max(efficiency, 0);
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: TeamMember['status']) => {
    switch (status) {
      case 'present':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Présent</Badge>;
      case 'absent':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Absent</Badge>;
      case 'on_break':
        return <Badge variant="outline"><Coffee className="h-3 w-3 mr-1" />En pause</Badge>;
      case 'late':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />En retard</Badge>;
      case 'early_departure':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Parti tôt</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  // Filtrer et trier les membres
  useEffect(() => {
    let filtered = teamMembers.filter(member => {
      const matchesSearch = !searchTerm || 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = selectedDepartment === 'all' || 
        member.department.toLowerCase() === selectedDepartment.toLowerCase();
      
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });

    // Trier
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof TeamMember];
      let bValue: any = b[sortBy as keyof TeamMember];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredMembers(filtered);
  }, [teamMembers, searchTerm, selectedDepartment, statusFilter, sortBy, sortOrder]);

  // Charger les données au montage et quand les paramètres changent
  useEffect(() => {
    loadTeamData();
  }, [organizationId, selectedDate]);

  // Calculer les statistiques de l'équipe
  const getTeamStats = () => {
    const total = filteredMembers.length;
    const present = filteredMembers.filter(m => m.status === 'present' || m.status === 'on_break' || m.status === 'late').length;
    const absent = filteredMembers.filter(m => m.status === 'absent').length;
    const onBreak = filteredMembers.filter(m => m.status === 'on_break').length;
    const late = filteredMembers.filter(m => m.status === 'late').length;
    const averageEfficiency = total > 0 ? filteredMembers.reduce((sum, m) => sum + m.efficiency, 0) / total : 0;
    const totalHours = filteredMembers.reduce((sum, m) => sum + m.workingHours, 0);

    return { total, present, absent, onBreak, late, averageEfficiency, totalHours };
  };

  const stats = getTeamStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistiques de l'équipe */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total équipe</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <div className="text-sm text-muted-foreground">Présents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.onBreak}</div>
            <div className="text-sm text-muted-foreground">En pause</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.late}</div>
            <div className="text-sm text-muted-foreground">En retard</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.averageEfficiency.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Efficacité moy.</div>
          </CardContent>
        </Card>
      </div>

      {/* Contrôles et filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Équipe ({filteredMembers.length})
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadTeamData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="present">Présents</SelectItem>
                <SelectItem value="absent">Absents</SelectItem>
                <SelectItem value="on_break">En pause</SelectItem>
                <SelectItem value="late">En retard</SelectItem>
                <SelectItem value="early_departure">Partis tôt</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="status">Statut</SelectItem>
                <SelectItem value="workingHours">Heures</SelectItem>
                <SelectItem value="efficiency">Efficacité</SelectItem>
                <SelectItem value="department">Département</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Horaires</TableHead>
                <TableHead>Efficacité</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.employeeId} • {member.department}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(member.status)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {member.todayEntry?.clockInTime ? (
                          <>
                            <span className="text-muted-foreground">Arrivée:</span>{' '}
                            {formatTime(new Date(member.todayEntry.clockInTime))}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Pas encore pointé</span>
                        )}
                      </div>
                      <div className="text-sm">
                        {member.todayEntry?.clockOutTime ? (
                          <>
                            <span className="text-muted-foreground">Sortie:</span>{' '}
                            {formatTime(new Date(member.todayEntry.clockOutTime))}
                          </>
                        ) : (
                          <span className="text-muted-foreground">En cours</span>
                        )}
                      </div>
                      <div className="text-sm font-medium">
                        {member.workingHours.toFixed(1)}h travaillées
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{member.efficiency.toFixed(0)}%</span>
                        <div className="flex items-center">
                          {member.efficiency >= 90 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : member.efficiency >= 75 ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <Progress value={member.efficiency} className="h-1" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {member.lastActivity ? (
                        formatTime(member.lastActivity)
                      ) : (
                        'Aucune activité'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredMembers.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p>Aucun employé trouvé</p>
              <p className="text-sm">Ajustez vos filtres pour voir plus de résultats</p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};