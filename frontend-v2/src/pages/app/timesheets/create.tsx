import { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface TimesheetFormData {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  periodType: 'weekly' | 'bi-weekly' | 'monthly' | 'custom';
  description?: string;
}

export default function CreateTimesheetPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<TimesheetFormData>({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    periodType: 'weekly',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.periodStart || !formData.periodEnd) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/v1/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Feuille de temps créée avec succès');
        router.push('/app/timesheets');
      } else {
        const error = await response.json();
        alert(error.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating timesheet:', error);
      alert('Erreur lors de la création de la feuille de temps');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as TimesheetFormData['periodType'];
    setFormData(prev => ({ ...prev, periodType: value }));
    
    // Auto-calculate period end based on type and start date
    if (formData.periodStart) {
      const start = new Date(formData.periodStart);
      let end = new Date(start);
      
      switch (value) {
        case 'weekly':
          end.setDate(start.getDate() + 6);
          break;
        case 'bi-weekly':
          end.setDate(start.getDate() + 13);
          break;
        case 'monthly':
          end.setMonth(start.getMonth() + 1);
          end.setDate(0); // Last day of the month
          break;
        default:
          // Custom - don't auto-calculate
          return;
      }
      
      setFormData(prev => ({ ...prev, periodEnd: end.toISOString().split('T')[0] }));
    }
  };

  return (
    <PermissionGuard permission="create_timesheet">
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Créer une feuille de temps</h1>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nouvelle feuille de temps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Employee ID */}
              <div className="space-y-2">
                <Label htmlFor="employeeId">
                  ID Employé <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                  placeholder="Entrez l'ID de l'employé"
                  required
                />
              </div>

              {/* Period Type */}
              <div className="space-y-2">
                <Label htmlFor="periodType">
                  Type de période <span className="text-red-500">*</span>
                </Label>
                <select
                  id="periodType"
                  value={formData.periodType}
                  onChange={handlePeriodTypeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="weekly">Hebdomadaire</option>
                  <option value="bi-weekly">Bi-hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                  <option value="custom">Personnalisée</option>
                </select>
              </div>

              {/* Period Start */}
              <div className="space-y-2">
                <Label htmlFor="periodStart">
                  Date de début <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={formData.periodStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, periodStart: e.target.value }))}
                  required
                />
              </div>

              {/* Period End */}
              <div className="space-y-2">
                <Label htmlFor="periodEnd">
                  Date de fin <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={formData.periodEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, periodEnd: e.target.value }))}
                  min={formData.periodStart}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description optionnelle de la feuille de temps"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Créer la feuille de temps
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}