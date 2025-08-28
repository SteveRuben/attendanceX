/**
 * Composant de visualisation des horaires de travail
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import {
  Calendar,
  Clock,
  User,
  Users,
  AlertCircle,
  CheckCircle,
  Edit,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useAuth } from '@/hooks/useAuth';
import { WorkSchedule, WorkDay } from '@attendance-x/shared';
import { formatTime } from '@/utils/dateUtils';

interface ScheduleViewerProps {
  employeeId?: string;
  organizationId?: string;
  editable?: boolean;
  className?: string;
}

export const ScheduleViewer: React.FC<ScheduleViewerProps> = ({
  employeeId,
  organizationId,
  editable = false,
  className = ''
}) => {
  const { user } = useAuth();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  
  const {
    schedules,
    employeeSchedule,
    loading,
    error,
    refreshSchedules
  } = useWorkSchedules(organizationId || user?.organizationId);

  // Jours de la semaine
  const weekDays = [
    { key: 0, label: 'Dimanche', short: 'Dim' },
    { key: 1, label: 'Lundi', short: 'Lun' },
    { key: 2, label: 'Mardi', short: 'Mar' },
    { key: 3, label: 'Mercredi', short: 'Mer' },
    { key: 4, label: 'Jeudi', short: 'Jeu' },
    { key: 5, label: 'Vendredi', short: 'Ven' },
    { key: 6, label: 'Samedi', short: 'Sam' }
  ];

  // Obtenir l'horaire à afficher
  const getDisplaySchedule = (): WorkSchedule | null => {
    if (employeeId && employeeSchedule) {
      return employeeSchedule;
    }
    
    if (selectedScheduleId) {
      return schedules?.find(s => s.id === selectedScheduleId) || null;
    }
    
    return schedules?.[0] || null;
  };

  const displaySchedule = getDisplaySchedule();

  // Calculer les heures totales par semaine
  const calculateWeeklyHours = (schedule: WorkSchedule): number => {
    if (!schedule.weeklyPattern) return 0;
    
    return Object.values(schedule.weeklyPattern).reduce((total, day) => {
      if (day.isWorkDay && day.startTime && day.endTime) {
        const start = parseTime(day.startTime);
        const end = parseTime(day.endTime);
        const breakTime = day.breakDuration || 0;
        return total + (end - start) / 60 - breakTime;
      }
      return total;
    }, 0);
  };

  // Parser une heure au format HH:MM en minutes
  const parseTime = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Obtenir le statut d'un jour
  const getDayStatus = (day: WorkDay) => {
    if (!day.isWorkDay) {
      return { label: 'Repos', variant: 'secondary' as const };
    }
    
    if (!day.startTime || !day.endTime) {
      return { label: 'Non configuré', variant: 'destructive' as const };
    }
    
    return { label: 'Travail', variant: 'default' as const };
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin mr-2" />
          <span>Chargement des horaires...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sélection d'horaire */}
      {!employeeId && schedules && schedules.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Horaires disponibles</span>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshSchedules}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className={`cursor-pointer transition-colors ${
                    selectedScheduleId === schedule.id
                      ? 'ring-2 ring-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedScheduleId(schedule.id!)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{schedule.name}</h3>
                      {schedule.isDefault && (
                        <Badge variant="secondary">Par défaut</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {calculateWeeklyHours(schedule).toFixed(1)}h/semaine
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affichage de l'horaire */}
      {displaySchedule ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                {employeeId ? 'Mon horaire' : displaySchedule.name}
              </div>
              <div className="flex items-center space-x-2">
                {displaySchedule.isActive ? (
                  <Badge variant="success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Actif
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactif</Badge>
                )}
                {editable && (
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="weekly" className="w-full">
              <TabsList>
                <TabsTrigger value="weekly">Vue hebdomadaire</TabsTrigger>
                <TabsTrigger value="details">Détails</TabsTrigger>
              </TabsList>

              <TabsContent value="weekly" className="mt-6">
                <div className="space-y-4">
                  {/* Résumé */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">
                          {calculateWeeklyHours(displaySchedule).toFixed(1)}h
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Heures/semaine
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <Calendar className="h-6 w-6 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">
                          {Object.values(displaySchedule.weeklyPattern || {})
                            .filter(day => day.isWorkDay).length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Jours/semaine
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold">
                          {displaySchedule.assignedEmployees?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Employés assignés
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Planning hebdomadaire */}
                  <div className="space-y-2">
                    {weekDays.map((weekDay) => {
                      const day = displaySchedule.weeklyPattern?.[weekDay.key];
                      const status = day ? getDayStatus(day) : { label: 'Non défini', variant: 'secondary' as const };

                      return (
                        <div
                          key={weekDay.key}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-20 font-medium">
                              {weekDay.label}
                            </div>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm">
                            {day?.isWorkDay && day.startTime && day.endTime ? (
                              <>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatTime(day.startTime)} - {formatTime(day.endTime)}
                                </div>
                                {day.breakDuration && (
                                  <div className="text-muted-foreground">
                                    Pause: {day.breakDuration}min
                                  </div>
                                )}
                                <div className="font-medium">
                                  {((parseTime(day.endTime) - parseTime(day.startTime)) / 60 - (day.breakDuration || 0) / 60).toFixed(1)}h
                                </div>
                              </>
                            ) : (
                              <div className="text-muted-foreground">
                                {day?.isWorkDay ? 'Horaires non définis' : 'Jour de repos'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-6">
                <div className="space-y-6">
                  {/* Informations générales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-3">Informations générales</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Nom:</span>
                          <span className="font-medium">{displaySchedule.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Description:</span>
                          <span className="font-medium">
                            {displaySchedule.description || 'Aucune description'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span className="font-medium">
                            {displaySchedule.type === 'fixed' ? 'Fixe' : 'Flexible'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Statut:</span>
                          <Badge variant={displaySchedule.isActive ? 'success' : 'secondary'}>
                            {displaySchedule.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3">Paramètres</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Tolérance retard:</span>
                          <span className="font-medium">
                            {displaySchedule.lateThresholdMinutes || 0} min
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Heures supplémentaires:</span>
                          <span className="font-medium">
                            {displaySchedule.overtimeThresholdMinutes || 0} min
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pause automatique:</span>
                          <Badge variant={displaySchedule.autoBreak ? 'success' : 'secondary'}>
                            {displaySchedule.autoBreak ? 'Oui' : 'Non'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exceptions */}
                  {displaySchedule.exceptions && displaySchedule.exceptions.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Exceptions</h3>
                      <div className="space-y-2">
                        {displaySchedule.exceptions.map((exception, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {new Date(exception.date).toLocaleDateString('fr-FR')}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {exception.reason}
                                </div>
                              </div>
                              <Badge variant={exception.isWorkDay ? 'default' : 'secondary'}>
                                {exception.isWorkDay ? 'Jour de travail' : 'Jour de repos'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {employeeId 
              ? "Aucun horaire n'est assigné à cet employé"
              : "Aucun horaire de travail configuré"
            }
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};