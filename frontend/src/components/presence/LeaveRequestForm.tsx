/**
 * Formulaire de demande de congé
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
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
  Alert,
  AlertDescription,
  Badge,
  Separator
} from '@/components/ui';
import {
  Calendar,
  Clock,
  FileText,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/hooks/useAuth';
import { LeaveRequest, LeaveType } from '@attendance-x/shared';
import { formatDate, calculateWorkingDays } from '@/utils/dateUtils';

// Schéma de validation
const leaveRequestSchema = z.object({
  type: z.enum(['vacation', 'sick', 'personal', 'maternity', 'paternity', 'other']),
  startDate: z.string().min(1, 'Date de début requise'),
  endDate: z.string().min(1, 'Date de fin requise'),
  reason: z.string().min(10, 'Veuillez fournir une raison détaillée (minimum 10 caractères)'),
  isHalfDay: z.boolean().default(false),
  halfDayPeriod: z.enum(['morning', 'afternoon']).optional(),
  attachments: z.array(z.string()).optional()
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return startDate <= endDate;
}, {
  message: "La date de fin doit être postérieure ou égale à la date de début",
  path: ["endDate"]
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

interface LeaveRequestFormProps {
  onSuccess?: (request: LeaveRequest) => void;
  onCancel?: () => void;
  className?: string;
}

export const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({
  onSuccess,
  onCancel,
  className = ''
}) => {
  const { user } = useAuth();
  const { createLeaveRequest, loading, error } = useLeaveRequests();
  const [calculatedDays, setCalculatedDays] = useState<number>(0);

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      type: 'vacation',
      startDate: '',
      endDate: '',
      reason: '',
      isHalfDay: false,
      attachments: []
    }
  });

  const watchedStartDate = form.watch('startDate');
  const watchedEndDate = form.watch('endDate');
  const watchedIsHalfDay = form.watch('isHalfDay');

  // Calculer le nombre de jours ouvrés
  React.useEffect(() => {
    if (watchedStartDate && watchedEndDate) {
      const startDate = new Date(watchedStartDate);
      const endDate = new Date(watchedEndDate);
      
      if (startDate <= endDate) {
        const days = watchedIsHalfDay ? 0.5 : calculateWorkingDays(startDate, endDate);
        setCalculatedDays(days);
      }
    }
  }, [watchedStartDate, watchedEndDate, watchedIsHalfDay]);

  // Soumettre la demande
  const onSubmit = async (data: LeaveRequestFormData) => {
    try {
      const leaveRequest = await createLeaveRequest({
        ...data,
        employeeId: user?.employeeId!,
        organizationId: user?.organizationId!,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        daysRequested: calculatedDays,
        status: 'pending'
      });

      if (leaveRequest.success) {
        onSuccess?.(leaveRequest.data);
        form.reset();
      }
    } catch (err) {
      console.error('Failed to create leave request:', err);
    }
  };

  // Types de congé avec descriptions
  const leaveTypes = [
    { value: 'vacation', label: 'Congés payés', description: 'Vacances et repos' },
    { value: 'sick', label: 'Congé maladie', description: 'Arrêt maladie' },
    { value: 'personal', label: 'Congé personnel', description: 'Raisons personnelles' },
    { value: 'maternity', label: 'Congé maternité', description: 'Congé maternité' },
    { value: 'paternity', label: 'Congé paternité', description: 'Congé paternité' },
    { value: 'other', label: 'Autre', description: 'Autre type de congé' }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Nouvelle demande de congé
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Type de congé */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de congé</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le type de congé" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Demi-journée */}
            <FormField
              control={form.control}
              name="isHalfDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Demi-journée</FormLabel>
                    <FormDescription>
                      Cette demande concerne une demi-journée seulement
                    </FormDescription>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Période pour demi-journée */}
            {watchedIsHalfDay && (
              <FormField
                control={form.control}
                name="halfDayPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Période</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez la période" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="morning">Matin</SelectItem>
                        <SelectItem value="afternoon">Après-midi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        min={watchedStartDate || new Date().toISOString().split('T')[0]}
                        disabled={watchedIsHalfDay}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Calcul des jours */}
            {calculatedDays > 0 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Durée calculée:</span>
                    <Badge variant="secondary">
                      {calculatedDays} {calculatedDays === 1 ? 'jour' : 'jours'}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Raison */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motif de la demande</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Veuillez expliquer le motif de votre demande de congé..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Fournissez une explication détaillée pour faciliter le traitement de votre demande
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pièces jointes (placeholder) */}
            <div className="space-y-2">
              <FormLabel>Pièces jointes (optionnel)</FormLabel>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formats acceptés: PDF, JPG, PNG (max 5MB)
                </p>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Votre demande sera envoyée à votre manager pour approbation
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
                  disabled={loading || calculatedDays === 0}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer la demande
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