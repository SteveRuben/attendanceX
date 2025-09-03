/**
 * Tableau de bord de présence pour les managers
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Coffee,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  RefreshCw,
  Clock,
  MapPin
} from 'lucide-react';
import { usePresenceDashboard } from '@/hooks/usePresenceDashboard';
import { useAuth } from '@/hooks/use-auth';

import { formatTime } from '@/utils/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
    currentStatus,
    todayStats,
    weekStats,
    recentEntries,
    alerts,
    isLoading,
    refresh
  } = usePresenceDashboard(organizationId || user?.organizationId, selectedDate);

  // Filtrer les données selon les critères
  const filteredEntries = recentEntries?.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    // Note: Department filtering not available in current data structure
    const matchesDepartment = departmentFilter === 'all';
    
    return matchesSearch && matchesStatus && matchesDepartment;
  }) || [];

  // Obtenir le statut avec couleur
  const getStatusBadge = (entry: any) => {
    if (entry.clockOutTime) {
      return <Badge variant="default">Terminé</Badge>;
    }
    
    if (entry.clockInTime) {
      return <Badge variant="outline">Présent</Badge>;
    }
    
    return <Badge variant="secondary">Absent</Badge>;
  };

  // Obtenir les alertes pour une entrée (simplified)
  const getEntryAlerts = (entryId: string) => {
    return alerts?.filter(a => a.id === entryId) || [];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Statut actuel</p>
                <p className="text-2xl font-bold text-green-600">
                  {currentStatus?.status === 'present' ? 'Présent' : 
                   currentStatus?.status === 'on_break' ? 'En pause' : 'Absent'}
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
                <p className="text-sm text-muted-foreground">Heures aujourd'hui</p>
                <p className="text-2xl font-bold">
                  {todayStats?.totalHours?.toFixed(1) || '0.0'}h
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
                <p className="text-sm text-muted-foreground">Heures semaine</p>
                <p className="text-2xl font-bold">
                  {weekStats?.totalHours?.toFixed(1) || '0.0'}h
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
                <p className="text-sm text-muted-foreground">Alertes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {alerts?.length || 0}
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
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log('Export functionality to be implemented')}
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
                    const entryAlerts = getEntryAlerts(entry.id);
                    
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">Employé</div>
                            <div className="text-sm text-muted-foreground">
                              {entry.id}
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
                            0
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(entry)}
                            {entryAlerts.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {entryAlerts.length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MapPin className="h-4 w-4" />
                            </Button>
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
              {currentStatus && currentStatus.status === 'present' ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">Vous</div>
                        <div className="text-sm text-muted-foreground">
                          Statut actuel
                        </div>
                      </div>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Présent
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Arrivée:</span>
                        <span>{currentStatus.clockInTime ? 
                          formatTime(new Date(currentStatus.clockInTime)) : '--:--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Durée:</span>
                        <span>{currentStatus.totalHours?.toFixed(2) || '0.0'}h</span>
                      </div>
                      {currentStatus.currentBreak && (
                        <div className="flex justify-between">
                          <span>Pause en cours:</span>
                          <span>{currentStatus.currentBreak.type}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Vous n'êtes pas actuellement présent
                </div>
              )}
            </TabsContent>

            <TabsContent value="anomalies" className="mt-4">
              <div className="space-y-4">
                {alerts?.map((alert) => (
                  <Alert key={alert.id} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {alert.title}
                          </div>
                          <div className="text-sm">
                            {alert.message}
                          </div>
                          <div className="text-xs mt-1 text-muted-foreground">
                            Type: {alert.type}
                          </div>
                        </div>
                        <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                          {alert.severity}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>

              {(!alerts || alerts.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  Aucune alerte détectée
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-4">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Chargement des données...</p>
        </div>
      )}
    </div>
  );
};