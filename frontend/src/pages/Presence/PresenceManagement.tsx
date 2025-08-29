import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePresence } from '@/hooks/usePresence';

interface PresenceEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: 'present' | 'absent' | 'late' | 'on_break';
  totalHours?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

const PresenceManagement: React.FC = () => {
  const { user } = useAuth();
  const { 
    presenceEntries, 
    employees, 
    isLoading,
    updatePresenceEntry,
    validatePresenceEntry,
    correctPresenceEntry
  } = usePresence();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<PresenceEntry | null>(null);

  const filteredEntries = presenceEntries?.filter(entry => {
    const matchesSearch = entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = entry.date === selectedDate;
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    return matchesSearch && matchesDate && matchesStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'on_break': return 'bg-yellow-500';
      case 'late': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Présent';
      case 'absent': return 'Absent';
      case 'on_break': return 'En pause';
      case 'late': return 'En retard';
      default: return 'Inconnu';
    }
  };

  const handleValidateEntry = async (entryId: string) => {
    try {
      await validatePresenceEntry(entryId);
      // Refresh data
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
    }
  };

  const handleCorrectEntry = async (entryId: string, corrections: any) => {
    try {
      await correctPresenceEntry(entryId, corrections);
      // Refresh data
    } catch (error) {
      console.error('Erreur lors de la correction:', error);
    }
  };

  const exportData = () => {
    // Logique d'export CSV/Excel
    const csvContent = filteredEntries.map(entry => 
      `${entry.employeeName},${entry.date},${entry.clockInTime || ''},${entry.clockOutTime || ''},${entry.status},${entry.totalHours || 0}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presence-${selectedDate}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Présences</h1>
          <p className="text-muted-foreground">
            Validez et gérez les présences de votre équipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">Tous les statuts</option>
                <option value="present">Présent</option>
                <option value="absent">Absent</option>
                <option value="late">En retard</option>
                <option value="on_break">En pause</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Présents</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredEntries.filter(e => e.status === 'present').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absents</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredEntries.filter(e => e.status === 'absent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Retard</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredEntries.filter(e => e.status === 'late').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des présences */}
      <Card>
        <CardHeader>
          <CardTitle>Présences du {new Date(selectedDate).toLocaleDateString('fr-FR')}</CardTitle>
          <CardDescription>
            {filteredEntries.length} entrée(s) trouvée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(entry.status)}`} />
                  <div>
                    <p className="font-medium">{entry.employeeName}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {entry.clockInTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Arrivée: {new Date(entry.clockInTime).toLocaleTimeString('fr-FR')}
                        </span>
                      )}
                      {entry.clockOutTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Sortie: {new Date(entry.clockOutTime).toLocaleTimeString('fr-FR')}
                        </span>
                      )}
                      {entry.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Localisé
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant="outline">{getStatusText(entry.status)}</Badge>
                    {entry.totalHours && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.totalHours.toFixed(1)}h
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEntry(entry)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Voir
                    </Button>
                    
                    {user?.role === 'manager' || user?.role === 'admin' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleValidateEntry(entry.id)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Valider
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {/* Ouvrir modal de correction */}}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Corriger
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucune entrée de présence trouvée pour les critères sélectionnés.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de détails (à implémenter) */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Détails de Présence</CardTitle>
              <CardDescription>{selectedEntry.employeeName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <p>{new Date(selectedEntry.date).toLocaleDateString('fr-FR')}</p>
                </div>
                
                {selectedEntry.clockInTime && (
                  <div>
                    <label className="text-sm font-medium">Heure d'arrivée</label>
                    <p>{new Date(selectedEntry.clockInTime).toLocaleTimeString('fr-FR')}</p>
                  </div>
                )}
                
                {selectedEntry.clockOutTime && (
                  <div>
                    <label className="text-sm font-medium">Heure de sortie</label>
                    <p>{new Date(selectedEntry.clockOutTime).toLocaleTimeString('fr-FR')}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <p>
                    <Badge variant="outline">{getStatusText(selectedEntry.status)}</Badge>
                  </p>
                </div>
                
                {selectedEntry.totalHours && (
                  <div>
                    <label className="text-sm font-medium">Heures totales</label>
                    <p>{selectedEntry.totalHours.toFixed(1)}h</p>
                  </div>
                )}
                
                {selectedEntry.notes && (
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <p>{selectedEntry.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                  Fermer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PresenceManagement;