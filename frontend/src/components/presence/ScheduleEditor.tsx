/**
 * Éditeur d'horaires de travail
 */

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Alert,
  AlertDescription,
  Badge,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy
} from 'lucide-react';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useAuth } from '@/hooks/useAuth';
import { WorkSchedule, WorkDay } from '@attendance-x/shared';

// Schéma de validation pour un jour de travail
const workDaySchema = z.object({
  isWorkDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  breakDuration: z.number().min(0).max(480).optional(),
  notes: z.string().optional()
}).refine((data) => {
  if (data.isWorkDay) {
    return data.startTime && data.endTime && data.startTime < data.endTime;
  }
  return true;
}, {
  message: "Les heures de début et fin sont requises pour les jours de travail",
  path: ["endTime"]
});

// Schéma de validation pour une exception
const exceptionSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  isWorkDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().min(1, 'Raison requise')
});

// Schéma principal
const scheduleSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  type: z.enum(['fixed', 'flexible']),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  weeklyPattern: z.record(z.string(), workDaySchema),
  lateThresholdMinutes: z.number().min(0).max(120),
  overtimeThresholdMinutes: z.number().min(0).max(240),
  autoBreak: z.boolean(),
  exceptions: z.array(exceptionSchema).optional()
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleEditorProps {
  scheduleId?: string;
  onSave?: (schedule: WorkSchedule) => void;
  onCancel?: () => void;
  className?: string;
}

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  scheduleId,
  onSave,
  onCancel,
  className = ''
}) => {
  const { user } = useAuth();
  const { 
    schedules, 
    createSchedule, 
    updateSchedule, 
    loading, 
    error 
  } = useWorkSchedules(user?.organizationId);

  const [activeTab, setActiveTab] = useState('general');

  // Jours de la semaine
  const weekDays = [
    { key: '1', label: 'Lundi', short: 'Lun' },
    { key: '2', label: 'Mardi', short: 'Mar' },
    { key: '3', label: 'Mercredi', short: 'Mer' },
    { key: '4', label: 'Jeudi', short: 'Jeu' },
    { key: '5', label: 'Vendredi', short: 'Ven' },
    { key: '6', label: 'Samedi', short: 'Sam' },
    { key: '0', label: 'Dimanche', short: 'Dim' }
  ];

  // Trouver l'horaire à éditer
  const existingSchedule = scheduleId ? schedules?.find(s => s.id === scheduleId) : null;

  // Valeurs par défaut
  const getDefaultValues = (): ScheduleFormData => {
    if (existingSchedule) {
      return {
        name: existingSchedule.name,
        description: existingSchedule.description || '',
        type: existingSchedule.type,
        isActive: existingSchedule.isActive,
        isDefault: existingSchedule.isDefault || false,
        weeklyPattern: existingSchedule.weeklyPattern || {},
        lateThresholdMinutes: existingSchedule.lateThresholdMinutes || 15,
        overtimeThresholdMinutes: existingSchedule.overtimeThresholdMinutes || 60,
        autoBreak: existingSchedule.autoBreak || false,
        exceptions: existingSchedule.exceptions || []
      };
    }

    // Horaire par défaut (9h-17h, lundi-vendredi)
    const defaultWeeklyPattern: Record<string, WorkDay> = {};
    weekDays.forEach(day => {
      defaultWeeklyPattern[day.key] = {
        isWorkDay: ['1', '2', '3', '4', '5'].includes(day.key),
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60
      };
    });

    return {
      name: '',
      description: '',
      type: 'fixed',
      isActive: true,
      isDefault: false,
      weeklyPattern: defaultWeeklyPattern,
      lateThresholdMinutes: 15,
      overtimeThresholdMinutes: 60,
      autoBreak: false,
      exceptions: []
    };
  };

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: getDefaultValues()
  });

  const { fields: exceptionFields, append: addException, remove: removeException } = useFieldArray({
    control: form.control,
    name: 'exceptions'
  });

  // Calculer les heures totales par semaine
  const calculateWeeklyHours = (weeklyPattern: Record<string, WorkDay>): number => {
    return Object.values(weeklyPattern).reduce((total, day) => {
      if (day.isWorkDay && day.startTime && day.endTime) {
        const start = parseTime(day.startTime);
        const end = parseTime(day.endTime);
        const breakTime = day.breakDuration || 0;
        return total + (end - start) / 60 - breakTime / 60;
      }
      return total;
    }, 0);
  };

  // Parser une heure au format HH:MM en minutes
  const parseTime = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Copier un jour vers d'autres jours
  const copyDayToOthers = (sourceDay: string, targetDays: string[]) => {
    const sourcePattern = form.getValues(`weeklyPattern.${sourceDay}`);
    targetDays.forEach(targetDay => {
      if (targetDay !== sourceDay) {
        form.setValue(`weeklyPattern.${targetDay}`, { ...sourcePattern });
      }
    });
  };

  // Appliquer un modèle prédéfini
  const applyTemplate = (template: 'standard' | 'partTime' | 'flexible') => {
    const templates = {
      standard: {
        // Lundi-Vendredi 9h-17h
        pattern: weekDays.reduce((acc, day) => {
          acc[day.key] = {
            isWorkDay: ['1', '2', '3', '4', '5'].includes(day.key),
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60
          };
          return acc;
        }, {} as Record<string, WorkDay>)
      },
      partTime: {
        // Lundi-Vendredi 9h-13h
        pattern: weekDays.reduce((acc, day) => {
          acc[day.key] = {
            isWorkDay: ['1', '2', '3', '4', '5'].includes(day.key),
            startTime: '09:00',
            endTime: '13:00',
            breakDuration: 0
          };
          return acc;
        }, {} as Record<string, WorkDay>)
      },
      flexible: {
        // Lundi-Vendredi 8h-16h avec flexibilité
        pattern: weekDays.reduce((acc, day) => {
          acc[day.key] = {
            isWorkDay: ['1', '2', '3', '4', '5'].includes(day.key),
            startTime: '08:00',
            endTime: '16:00',
            breakDuration: 30
          };
          return acc;
        }, {} as Record<string, WorkDay>)
      }
    };

    form.setValue('weeklyPattern', templates[template].pattern);
  };

  // Soumettre le formulaire
  const onSubmit = async (data: ScheduleFormData) => {
    try {
      const scheduleData = {
        ...data,
        organizationId: user?.organizationId!,
        assignedEmployees: existingSchedule?.assignedEmployees || []
      };

      let result;
      if (scheduleId) {
        result = await updateSchedule(scheduleId, scheduleData);
      } else {
        result = await createSchedule(scheduleData);
      }

      if (result.success) {
        onSave?.(result.data);
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
  };

  const weeklyHours = calculateWeeklyHours(form.watch('weeklyPattern') || {});

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          {scheduleId ? 'Modifier l\'horaire' : 'Nouvel horaire'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="schedule">Horaires</TabsTrigger>
                <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                {/* Informations générales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'horaire</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Horaire standard" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">Fixe</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Description de l'horaire..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Actif</FormLabel>
                          <FormDescription>
                            Cet horaire peut être assigné aux employés
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Par défaut</FormLabel>
                          <FormDescription>
                            Horaire assigné automatiquement aux nouveaux employés
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Paramètres */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="lateThresholdMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tolérance retard (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="120"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="overtimeThresholdMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seuil heures sup. (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="240"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoBreak"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Pause auto</FormLabel>
                          <FormDescription className="text-xs">
                            Déduction automatique des pauses
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-6">
                {/* Modèles prédéfinis */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Planning hebdomadaire</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate('standard')}
                    >
                      Standard
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate('partTime')}
                    >
                      Temps partiel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate('flexible')}
                    >
                      Flexible
                    </Button>
                  </div>
                </div>

                {/* Résumé */}
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>Total hebdomadaire:</span>
                      <Badge variant="secondary">
                        {weeklyHours.toFixed(1)} heures
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Jours de la semaine */}
                <div className="space-y-4">
                  {weekDays.map((weekDay) => (
                    <Card key={weekDay.key}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <h4 className="font-medium w-20">{weekDay.label}</h4>
                            <FormField
                              control={form.control}
                              name={`weeklyPattern.${weekDay.key}.isWorkDay`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2">
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm">
                                    Jour de travail
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyDayToOthers(weekDay.key, weekDays.map(d => d.key))}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copier
                          </Button>
                        </div>

                        {form.watch(`weeklyPattern.${weekDay.key}.isWorkDay`) && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField
                              control={form.control}
                              name={`weeklyPattern.${weekDay.key}.startTime`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Début</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`weeklyPattern.${weekDay.key}.endTime`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fin</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`weeklyPattern.${weekDay.key}.breakDuration`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pause (min)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="480"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex items-end">
                              <div className="text-sm text-muted-foreground">
                                {(() => {
                                  const start = form.watch(`weeklyPattern.${weekDay.key}.startTime`);
                                  const end = form.watch(`weeklyPattern.${weekDay.key}.endTime`);
                                  const breakDuration = form.watch(`weeklyPattern.${weekDay.key}.breakDuration`) || 0;
                                  
                                  if (start && end) {
                                    const hours = (parseTime(end) - parseTime(start)) / 60 - breakDuration / 60;
                                    return `${hours.toFixed(1)}h`;
                                  }
                                  return '--';
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="exceptions" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Exceptions</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addException({
                      date: '',
                      isWorkDay: false,
                      reason: ''
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une exception
                  </Button>
                </div>

                <div className="space-y-4">
                  {exceptionFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Exception {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeException(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`exceptions.${index}.date`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`exceptions.${index}.isWorkDay`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Jour de travail</FormLabel>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`exceptions.${index}.reason`}
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Raison</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: Jour férié, Formation, etc."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch(`exceptions.${index}.isWorkDay`) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <FormField
                              control={form.control}
                              name={`exceptions.${index}.startTime`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Heure de début</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`exceptions.${index}.endTime`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Heure de fin</FormLabel>
                                  <FormControl>
                                    <Input type="time" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {exceptionFields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p>Aucune exception configurée</p>
                    <p className="text-sm">
                      Les exceptions permettent de modifier l'horaire pour des dates spécifiques
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {scheduleId ? 'Modifier l\'horaire existant' : 'Créer un nouvel horaire'}
              </div>
              
              <div className="flex items-center space-x-3">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                )}
                
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {scheduleId ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};