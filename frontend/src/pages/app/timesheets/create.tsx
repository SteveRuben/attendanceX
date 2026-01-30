import { useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Plus, 
  Calendar, 
  User, 
  FileText, 
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Save
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import TimesheetService from '@/services/timesheetService';

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
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TimesheetFormData>({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    periodType: 'weekly',
    description: ''
  });

  const clearError = () => setError(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.employeeId || !formData.periodStart || !formData.periodEnd) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    
    try {
      await TimesheetService.createTimesheet({
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd
      });
      
      router.push('/app/timesheets');
    } catch (error: any) {
      console.error('Error creating timesheet:', error);
      setError(error?.message || 'Error creating timesheet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodTypeChange = (value: string) => {
    const periodType = value as TimesheetFormData['periodType'];
    setFormData(prev => ({ ...prev, periodType }));
    
    // Auto-calculate period end based on type and start date
    if (formData.periodStart) {
      const start = new Date(formData.periodStart);
      let end = new Date(start);
      
      switch (periodType) {
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
    <AppShell title="Create Timesheet">
      <PermissionGuard permission="create_timesheet">
        <div className="h-full overflow-y-auto scroll-smooth">
          <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
              <div className="flex items-center gap-4 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Clock className="h-6 w-6" /> Create Timesheet
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new timesheet for tracking work hours and activities
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={clearError}>
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Main Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Timesheet Details
                </CardTitle>
                <CardDescription>
                  Enter the basic information for the new timesheet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Employee ID */}
                    <div className="space-y-2">
                      <Label htmlFor="employeeId" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Employee ID <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="employeeId"
                        value={formData.employeeId}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                        placeholder="Enter employee ID"
                        required
                      />
                    </div>

                    {/* Period Type */}
                    <div className="space-y-2">
                      <Label htmlFor="periodType" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Period Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.periodType}
                        onChange={(e) => handlePeriodTypeChange(e.target.value)}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom</option>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Period Start */}
                    <div className="space-y-2">
                      <Label htmlFor="periodStart" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Start Date <span className="text-destructive">*</span>
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
                      <Label htmlFor="periodEnd" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        End Date <span className="text-destructive">*</span>
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
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description for this timesheet"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add any additional notes or context for this timesheet period
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-6 border-t">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Create Timesheet</div>
                        <div className="text-xs text-muted-foreground">
                          This will create a new timesheet for the specified period
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Create Timesheet
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    </AppShell>
  );
}