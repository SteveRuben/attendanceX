/**
 * Dialog pour l'export des rapports avec options avancées
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage,
  Calendar,
  Users,
  BarChart3,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { analyticsService, type ExportOptions } from '@/services/analyticsService';
import { teamService } from '@/services/teamService';
import type { Team } from '../../shared';
import { EventType, EventStatus } from '../../shared';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';

interface ExportReportsDialogProps {
  organizationId: string;
  trigger?: React.ReactNode;
  defaultType?: 'events' | 'attendance' | 'teams' | 'validation';
}

export const ExportReportsDialog: React.FC<ExportReportsDialogProps> = ({
  organizationId,
  trigger,
  defaultType = 'events'
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  
  // Options d'export
  const [reportType, setReportType] = useState<'events' | 'attendance' | 'teams' | 'validation'>(defaultType);
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('excel');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
    to: new Date()
  });
  
  // Filtres
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
  const [selectedEventStatuses, setSelectedEventStatuses] = useState<EventStatus[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const loadTeams = async () => {
    if (teamsLoaded) return;
    
    try {
      const response = await teamService.getTeams(organizationId);
      if (response.data) {
        setTeams(response.data.data);
        setTeamsLoaded(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des équipes:', error);
    }
  };

  const handleExport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une période",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const exportOptions: ExportOptions = {
        format,
        includeCharts: includeCharts && format === 'pdf',
        dateRange: {
          startDate: dateRange.from,
          endDate: dateRange.to
        },
        filters: {
          eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
          statuses: selectedEventStatuses.length > 0 ? selectedEventStatuses : undefined,
          teams: selectedTeams.length > 0 ? selectedTeams : undefined
        }
      };

      const blob = await analyticsService.exportAnalytics(organizationId, reportType, exportOptions);

      // Télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const fileName = `rapport-${reportType}-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: `Le rapport a été téléchargé en ${format.toUpperCase()}`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le rapport",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeToggle = (eventType: EventType, checked: boolean) => {
    if (checked) {
      setSelectedEventTypes([...selectedEventTypes, eventType]);
    } else {
      setSelectedEventTypes(selectedEventTypes.filter(type => type !== eventType));
    }
  };

  const handleEventStatusToggle = (status: EventStatus, checked: boolean) => {
    if (checked) {
      setSelectedEventStatuses([...selectedEventStatuses, status]);
    } else {
      setSelectedEventStatuses(selectedEventStatuses.filter(s => s !== status));
    }
  };

  const handleTeamToggle = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedTeams([...selectedTeams, teamId]);
    } else {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'events': return <Calendar className="h-4 w-4" />;
      case 'attendance': return <CheckCircle className="h-4 w-4" />;
      case 'teams': return <Users className="h-4 w-4" />;
      case 'validation': return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getFormatIcon = (fmt: string) => {
    switch (fmt) {
      case 'csv': return <FileText className="h-4 w-4" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf': return <FileImage className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter les Rapports
          </DialogTitle>
          <DialogDescription>
            Configurez les options d'export pour générer votre rapport personnalisé
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type de rapport */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type de Rapport</Label>
            <RadioGroup value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="events" id="events" />
                <Label htmlFor="events" className="flex items-center gap-2 cursor-pointer">
                  {getReportTypeIcon('events')}
                  Événements et Analytics
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="attendance" id="attendance" />
                <Label htmlFor="attendance" className="flex items-center gap-2 cursor-pointer">
                  {getReportTypeIcon('attendance')}
                  Présences et Participation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="teams" id="teams" />
                <Label htmlFor="teams" className="flex items-center gap-2 cursor-pointer">
                  {getReportTypeIcon('teams')}
                  Performance des Équipes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="validation" id="validation" />
                <Label htmlFor="validation" className="flex items-center gap-2 cursor-pointer">
                  {getReportTypeIcon('validation')}
                  Validation des Présences
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Format d'export */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Format d'Export</Label>
            <RadioGroup value={format} onValueChange={(value: any) => setFormat(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  {getFormatIcon('csv')}
                  CSV (Données brutes)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                  {getFormatIcon('excel')}
                  Excel (Tableaux formatés)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  {getFormatIcon('pdf')}
                  PDF (Rapport complet)
                </Label>
              </div>
            </RadioGroup>

            {format === 'pdf' && (
              <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                  id="includeCharts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                />
                <Label htmlFor="includeCharts" className="text-sm">
                  Inclure les graphiques et visualisations
                </Label>
              </div>
            )}
          </div>

          <Separator />

          {/* Période */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Période</Label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
            />
          </div>

          <Separator />

          {/* Filtres */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Filtres (Optionnels)</Label>
            
            {/* Types d'événements */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Types d'Événements</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(EventType).map((eventType) => (
                  <Badge
                    key={eventType}
                    variant={selectedEventTypes.includes(eventType) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleEventTypeToggle(eventType, !selectedEventTypes.includes(eventType))}
                  >
                    {eventType}
                    {selectedEventTypes.includes(eventType) && (
                      <span className="ml-1">✓</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Statuts d'événements */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Statuts d'Événements</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(EventStatus).map((status) => (
                  <Badge
                    key={status}
                    variant={selectedEventStatuses.includes(status) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleEventStatusToggle(status, !selectedEventStatuses.includes(status))}
                  >
                    {status}
                    {selectedEventStatuses.includes(status) && (
                      <span className="ml-1">✓</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Équipes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Équipes</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTeams}
                disabled={teamsLoaded}
              >
                {teamsLoaded ? 'Équipes chargées' : 'Charger les équipes'}
              </Button>
              
              {teamsLoaded && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {teams.map((team) => (
                    <Badge
                      key={team.id}
                      variant={selectedTeams.includes(team.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleTeamToggle(team.id, !selectedTeams.includes(team.id))}
                    >
                      {team.name}
                      {selectedTeams.includes(team.id) && (
                        <span className="ml-1">✓</span>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};