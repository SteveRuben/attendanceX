import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  AlertTriangle,
  Loader2,
  Eye,
  Filter
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import TimesheetService from '@/services/timesheetService';
import { Timesheet } from '@/types/timesheet.types';
import { formatDate } from '@/utils/format';

interface ApprovalAction {
  type: 'approve' | 'reject';
  timesheetId: string;
  reason?: string;
}

export default function TimesheetApprovalsPage() {
  const router = useRouter();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'submitted' | 'under_review'>('submitted');

  const clearError = () => setError(null);

  const fetchTimesheets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await TimesheetService.getTimesheets({
        filters: {
          status: filter === 'all' ? undefined : filter
        },
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      // Filter only timesheets that need approval
      const pendingApproval = response.timesheets.filter(
        ts => ts.status === 'submitted' || ts.status === 'under_review'
      );
      
      setTimesheets(pendingApproval);
    } catch (error: any) {
      console.error('Error fetching timesheets:', error);
      setError(error?.message || 'Error loading timesheets for approval');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, [filter]);

  const handleApprove = async (timesheet: Timesheet) => {
    setActionLoading(timesheet.id);
    
    try {
      await TimesheetService.approveTimesheet(timesheet.id);
      
      // Remove from list or update status
      setTimesheets(prev => prev.filter(ts => ts.id !== timesheet.id));
      
      // Show success message (you might want to add a toast notification here)
    } catch (error: any) {
      console.error('Error approving timesheet:', error);
      setError(error?.message || 'Error approving timesheet');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedTimesheet || !rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setActionLoading(selectedTimesheet.id);
    
    try {
      await TimesheetService.rejectTimesheet(selectedTimesheet.id, rejectReason);
      
      // Remove from list or update status
      setTimesheets(prev => prev.filter(ts => ts.id !== selectedTimesheet.id));
      
      setShowRejectDialog(false);
      setSelectedTimesheet(null);
      setRejectReason('');
    } catch (error: any) {
      console.error('Error rejecting timesheet:', error);
      setError(error?.message || 'Error rejecting timesheet');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.submitted}>
        {status === 'submitted' && <Clock className="h-3 w-3 mr-1" />}
        {status === 'under_review' && <Eye className="h-3 w-3 mr-1" />}
        {status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
        {status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AppShell title="Timesheet Approvals">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Timesheet Approvals">
      <PermissionGuard permission="approve_timesheet">
        <div className="h-full overflow-y-auto scroll-smooth">
          <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" /> Timesheet Approvals
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Review and approve or reject submitted timesheets from your team
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

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'submitted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('submitted')}
                  >
                    Submitted
                  </Button>
                  <Button
                    variant={filter === 'under_review' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('under_review')}
                  >
                    Under Review
                  </Button>
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All Pending
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timesheets List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Approvals ({timesheets.length})
                </CardTitle>
                <CardDescription>
                  Timesheets waiting for your approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timesheets.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending approvals</h3>
                    <p className="text-muted-foreground">
                      All timesheets have been reviewed. Great job!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timesheets.map((timesheet) => (
                      <div
                        key={timesheet.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{timesheet.employeeId}</span>
                              </div>
                              {getStatusBadge(timesheet.status)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {formatDate(timesheet.periodStart)} - {formatDate(timesheet.periodEnd)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>Submitted {formatDate(timesheet.createdAt)}</span>
                              </div>
                            </div>

                            {timesheet.description && (
                              <div className="flex items-start gap-2 text-sm">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span className="text-muted-foreground">{timesheet.description}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/app/timesheets/${timesheet.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectClick(timesheet)}
                              disabled={actionLoading === timesheet.id}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              {actionLoading === timesheet.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Reject
                            </Button>
                            
                            <Button
                              size="sm"
                              onClick={() => handleApprove(timesheet)}
                              disabled={actionLoading === timesheet.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {actionLoading === timesheet.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Reject Timesheet
              </DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this timesheet. This will help the employee understand what needs to be corrected.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedTimesheet && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">{selectedTimesheet.employeeId}</div>
                    <div className="text-muted-foreground">
                      {formatDate(selectedTimesheet.periodStart)} - {formatDate(selectedTimesheet.periodEnd)}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Reason for rejection *</Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please explain why this timesheet is being rejected..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={actionLoading === selectedTimesheet?.id}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || actionLoading === selectedTimesheet?.id}
              >
                {actionLoading === selectedTimesheet?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Timesheet
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </AppShell>
  );
}