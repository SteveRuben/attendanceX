/**
 * Tableau de bord de présence pour les managers
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import {
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Download,
  RefreshCw,
  MapPin,
  Coffee,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { usePresenceDashboard } from '@/hooks/usePresenceDashboard';
import { useAuth } from '@/hooks/useAuth';
import { PresenceEntry, Employee } from '@attendance-x/shared';
import { formatTime, formatDuration, formatDate } from '@/utils/dateUtils';

interface PresenceDashboardProps {
  organizationId?: string;
  className?: string;
}

export const PresenceDashboard: React.FC<PresenceDashboardProps> = ({
  organizationId,
  className = ''
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const {
    currentlyPresent,
    teamSummary,
    presenceEntries,
    anomalies,
    stats,
    loading,
    error,
    refreshData,
    exportData
  } = usePresenceDashboard(organizationId || user?.organizationId, selectedDate);

  // Filtrer les données selon les critères
  const filteredEntries = presenceEntries?.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    const matchesDepartment = departmentFilter === 'all' || 
      entry.employee?.departmentId === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  }) || [];

  // Obtenir le statut avec couleur
  const getStatusBadge = (entry: PresenceEntry) => {
    if (entry.clockOutTime) {
      return <Badge variant="success">Terminé</Badge>;
    }
    
    const activeBreak = entry.breakEntries?.find(b => !b.endTime);
    if (activeBreak) {
      return <Badge variant="warning">En pause</Badge>;
    }
    
    if (entry.clockInTime) {
      return <Badge variant="info">Présent</Badge>;
    }
    
    return <Badge variant="secondary">Absent</Badge>;
  };

  // Obtenir les anomalies pour une entrée
  const getEntryAnomalies = (entryId: string) => {
    return anomalies?.filter(a => a.entryId === entryId) || [];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Présents</p>
                <p className="text-2xl font-bold text-green-600">
                  {currentlyPresent?.length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total employés</p>
                <p className="text-2xl font-bold">
                  {stats?.totalEmployees || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heures moyennes</p>
                <p className="text-2xl font-bold">
                  {stats?.averageHours?.toFixed(1) || '0.0'}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Anomalies</p>
                <p className="text-2xl font-bold text-orange-600">
                  {anomalies?.length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contrôles et filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gestion de présence</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData('excel')}
              >
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="present">Présents</SelectItem>
                <SelectItem value="absent">Absents</SelectItem>
                <SelectItem value="on_break">En pause</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Département" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les départements</SelectItem>
                <SelectItem value="dev">Développement</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="sales">Ventes</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <Tabs defaultValue="entries" className="w-full">
            <TabsList>
              <TabsTrigger value="entries">Entrées de présence</TabsTrigger>
              <TabsTrigger value="currently-present">Actuellement présents</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            </TabsList>

            <TabsContent value="entries" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Arrivée</TableHead>
                    <TableHead>Sortie</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Pauses</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    const entryAnomalies = getEntryAnomalies(entry.id!);
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {entry.employee?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entry.employee?.employeeId}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.clockInTime ? formatTime(new Date(entry.clockInTime)) : '--:--'}
                        </TableCell>
                        <TableCell>
                          {entry.clockOutTime ? formatTime(new Date(entry.clockOutTime)) : '--:--'}
                        </TableCell>
                        <TableCell>
                          {entry.totalHours ? `${entry.totalHours.toFixed(2)}h` : '--'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Coffee className="h-4 w-4 mr-1" />
                            {entry.breakEntries?.length || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(entry)}
                            {entryAnomalies.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {entryAnomalies.length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {entry.clockInTime && entry.clockInLocation && (
                              <Button variant="ghost" size="sm">
                                <MapPin className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune entrée de présence trouvée
                </div>
              )}
            </TabsContent>

            <TabsContent value="currently-present" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentlyPresent?.map((employee) => (
                  <Card key={employee.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {employee.employeeId}
                          </div>
                        </div>
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Présent
                        </Badge>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Arrivée:</span>
                          <span>{employee.todayEntry?.clockInTime ? 
                            formatTime(new Date(employee.todayEntry.clockInTime)) : '--:--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Durée:</span>
                          <span>{employee.todayEntry?.totalHours?.toFixed(2) || '0.0'}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pauses:</span>
                          <span>{employee.todayEntry?.breakEntries?.length || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {(!currentlyPresent || currentlyPresent.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun employé actuellement présent
                </div>
              )}
            </TabsContent>

            <TabsContent value="anomalies" className="mt-4">
              <div className="space-y-4">
                {anomalies?.map((anomaly) => (
                  <Alert key={`${anomaly.entryId}-${anomaly.types.join('-')}`} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {anomaly.employeeName} - {formatDate(new Date(anomaly.date))}
                          </div>
                          <div className="text-sm">
                            Types: {anomaly.types.join(', ')}
                          </div>
                          {anomaly.details && (
                            <div className="text-xs mt-1">
                              {JSON.stringify(anomaly.details)}
                            </div>
                          )}
                        </div>
                        <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'warning'}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>

              {(!anomalies || anomalies.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  Aucune anomalie détectée
                </div>
              )}
            </TabsContent>
          </Tabs>
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