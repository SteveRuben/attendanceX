/**
 * Interface de gestion des horaires de travail
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Calendar,
  Progress,
  Checkbox,
  Label,
  Switch,
  Separator
} from '@/components/ui';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  Filter,
  Search,
  Download,
  Upload,
  RotateCcw,
  Zap,
  Target,
  BookOpen,
  UserCheck,
  Building
} from 'lucide-react';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useAuth } from '@/hooks/useAuth';
import { WorkSchedule, ScheduleTemplate, ScheduleConflict, Employee } from '@attendance-x/shared';
import { formatTime, formatDate, getDayName } from '@/utils/dateUtils';

export const ScheduleManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    schedules,
    templates,
    conflicts,
    employees,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    createTemplate,
    applyTemplate,
    resolveConflict,
    bulkUpdateSchedules,
    refresh
  } = useWorkSchedules();

  const [activeTab, setActiveTab] = useState('schedules');
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [conflictDialog, setConflictDialog] = useState(false);
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Filtrer les horaires
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = !searchTerm || 
      schedule.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      schedule.employee?.department === departmentFilter;
    
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Obtenir les départements uniques
  const departments = Array.from(new Set(
    employees.map(emp => emp.department).filter(Boolean)
  ));

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactif</Badge>;
      case 'pending':
        return <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Créer un nouvel horaire
  const handleCreateSchedule = () => {
    setSelectedSchedule(null);
    setEditDialog(true);
  };

  // Éditer un horaire
  const handleEditSchedule = (schedule: WorkSchedule) => {
    setSelectedSchedule(schedule);
    setEditDialog(true);
  };

  // Dupliquer un horaire
  const handleDuplicateSchedule = async (schedule: WorkSchedule) => {
    try {
      const duplicated = {
        ...schedule,
        id: undefined,
        name: `${schedule.name} (Copie)`,
        employeeId: undefined
      };
      await createSchedule(duplicated);
      refresh();
    } catch (err) {
      console.error('Failed to duplicate schedule:', err);
    }
  };

  // Supprimer un horaire
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet horaire ?')) return;
    
    try {
      await deleteSchedule(scheduleId);
      refresh();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des horaires</h1>
          <p className="text-muted-foreground">
            Gérez les horaires de travail de votre équipe
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setBulkEditDialog(true)}
            disabled={selectedEmployees.length === 0}
          >
            <Edit className="h-4 w-4 mr-2" />
            Modification groupée ({selectedEmployees.length})
          </Button>
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button onClick={handleCreateSchedule}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel horaire
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Horaires actifs</p>
                <p className="text-2xl font-bold text-green-600">
                  {schedules.filter(s => s.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conflits détectés</p>
                <p className="text-2xl font-bold text-red-600">
                  {conflicts.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Modèles</p>
                <p className="text-2xl font-bold text-blue-600">
                  {templates.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Employés</p>
                <p className="text-2xl font-bold text-purple-600">
                  {employees.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedules" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Horaires ({schedules.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Modèles ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflits ({conflicts.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendrier
          </TabsTrigger>
        </TabsList>

        {/* Gestion des horaires */}
        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Horaires de travail</span>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Rechercher un employé..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Département" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SchedulesList
                schedules={filteredSchedules}
                selectedEmployees={selectedEmployees}
                onSelectEmployee={(employeeId, selected) => {
                  if (selected) {
                    setSelectedEmployees(prev => [...prev, employeeId]);
                  } else {
                    setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
                  }
                }}
                onEditSchedule={handleEditSchedule}
                onDuplicateSchedule={handleDuplicateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modèles d'horaires */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Modèles d'horaires</span>
                <Button onClick={() => setTemplateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau modèle
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatesList
                templates={templates}
                onApplyTemplate={(template, employeeIds) => {
                  // Appliquer le modèle aux employés sélectionnés
                  applyTemplate(template.id!, employeeIds);
                }}
                onEditTemplate={(template) => {
                  setSelectedTemplate(template);
                  setTemplateDialog(true);
                }}
                onDeleteTemplate={(templateId) => {
                  // Supprimer le modèle
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des conflits */}
        <TabsContent value="conflicts" className="space-y-6">
          <ConflictsList
            conflicts={conflicts}
            onResolveConflict={(conflictId, resolution) => {
              resolveConflict(conflictId, resolution);
            }}
          />
        </TabsContent>

        {/* Vue calendrier */}
        <TabsContent value="calendar" className="space-y-6">
          <ScheduleCalendarView
            schedules={schedules}
            employees={employees}
            onScheduleClick={handleEditSchedule}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog d'édition d'horaire */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSchedule ? 'Modifier l\'horaire' : 'Créer un nouvel horaire'}
            </DialogTitle>
          </DialogHeader>
          <ScheduleEditor
            schedule={selectedSchedule}
            employees={employees}
            onSave={async (scheduleData) => {
              try {
                if (selectedSchedule) {
                  await updateSchedule(selectedSchedule.id!, scheduleData);
                } else {
                  await createSchedule(scheduleData);
                }
                setEditDialog(false);
                refresh();
              } catch (err) {
                console.error('Failed to save schedule:', err);
              }
            }}
            onCancel={() => setEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de modèle */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Modifier le modèle' : 'Créer un nouveau modèle'}
            </DialogTitle>
          </DialogHeader>
          <TemplateEditor
            template={selectedTemplate}
            onSave={async (templateData) => {
              try {
                await createTemplate(templateData);
                setTemplateDialog(false);
                setSelectedTemplate(null);
                refresh();
              } catch (err) {
                console.error('Failed to save template:', err);
              }
            }}
            onCancel={() => {
              setTemplateDialog(false);
              setSelectedTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de modification groupée */}
      <Dialog open={bulkEditDialog} onOpenChange={setBulkEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modification groupée</DialogTitle>
            <DialogDescription>
              Appliquer des modifications à {selectedEmployees.length} employé(s) sélectionné(s)
            </DialogDescription>
          </DialogHeader>
          <BulkEditForm
            selectedEmployees={selectedEmployees}
            templates={templates}
            onApply={async (changes) => {
              try {
                await bulkUpdateSchedules(selectedEmployees, changes);
                setBulkEditDialog(false);
                setSelectedEmployees([]);
                refresh();
              } catch (err) {
                console.error('Failed to apply bulk changes:', err);
              }
            }}
            onCancel={() => setBulkEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Composant de liste des horaires
interface SchedulesListProps {
  schedules: WorkSchedule[];
  selectedEmployees: string[];
  onSelectEmployee: (employeeId: string, selected: boolean) => void;
  onEditSchedule: (schedule: WorkSchedule) => void;
  onDuplicateSchedule: (schedule: WorkSchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const SchedulesList: React.FC<SchedulesListProps> = ({
  schedules,
  selectedEmployees,
  onSelectEmployee,
  onEditSchedule,
  onDuplicateSchedule,
  onDeleteSchedule
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactif</Badge>;
      case 'pending':
        return <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedEmployees.length === schedules.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  schedules.forEach(s => {
                    if (s.employeeId && !selectedEmployees.includes(s.employeeId)) {
                      onSelectEmployee(s.employeeId, true);
                    }
                  });
                } else {
                  schedules.forEach(s => {
                    if (s.employeeId) {
                      onSelectEmployee(s.employeeId, false);
                    }
                  });
                }
              }}
            />
          </TableHead>
          <TableHead>Employé</TableHead>
          <TableHead>Horaire</TableHead>
          <TableHead>Heures/semaine</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Dernière modification</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((schedule) => (
          <TableRow key={schedule.id}>
            <TableCell>
              {schedule.employeeId && (
                <Checkbox
                  checked={selectedEmployees.includes(schedule.employeeId)}
                  onCheckedChange={(checked) => 
                    onSelectEmployee(schedule.employeeId!, checked as boolean)
                  }
                />
              )}
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{schedule.employee?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {schedule.employee?.employeeId} • {schedule.employee?.department}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <div className="font-medium">{schedule.name}</div>
                <div className="text-muted-foreground">
                  {schedule.workDays?.map(day => getDayName(day).slice(0, 3)).join(', ')}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="font-medium">
                {schedule.weeklyHours || 0}h
              </div>
            </TableCell>
            <TableCell>
              {getStatusBadge(schedule.status)}
            </TableCell>
            <TableCell>
              <div className="text-sm text-muted-foreground">
                {formatDate(new Date(schedule.updatedAt || schedule.createdAt))}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditSchedule(schedule)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicateSchedule(schedule)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteSchedule(schedule.id!)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Composants placeholder pour les autres fonctionnalités
const TemplatesList: React.FC<any> = () => <div>Templates List Component</div>;
const ConflictsList: React.FC<any> = () => <div>Conflicts List Component</div>;
const ScheduleCalendarView: React.FC<any> = () => <div>Schedule Calendar Component</div>;
const ScheduleEditor: React.FC<any> = () => <div>Schedule Editor Component</div>;
const TemplateEditor: React.FC<any> = () => <div>Template Editor Component</div>;
const BulkEditForm: React.FC<any> = () => <div>Bulk Edit Form Component</div>;