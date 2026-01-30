import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, 
  Eye, 
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useBilling } from '@/hooks/useBilling';
import { Invoice } from '@/types/billing.types';
import { formatCurrency, formatDate } from '@/utils/format';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function InvoiceHistory() {
  const { 
    invoices, 
    loadingInvoices, 
    fetchInvoices, 
    payInvoice,
    error 
  } = useBilling();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [payingInvoices, setPayingInvoices] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInvoices(currentPage);
  }, [currentPage, fetchInvoices]);

  const handlePayInvoice = async (invoiceId: string) => {
    setPayingInvoices(prev => new Set(prev).add(invoiceId));
    
    try {
      await payInvoice(invoiceId);
      // Refresh invoices after payment
      await fetchInvoices(currentPage);
    } catch (error) {
      console.error('Failed to pay invoice:', error);
    } finally {
      setPayingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loadingInvoices && currentPage === 1) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Invoice History
        </CardTitle>
        <CardDescription>
          View and manage your billing history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices && invoices.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="font-medium">
                        #{invoice.id.slice(-8)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(invoice.createdAt)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-semibold">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1 capitalize">{invoice.status}</span>
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className={`${
                        new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid' 
                          ? 'text-red-600 font-medium' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatDate(invoice.dueDate)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        {invoice.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => handlePayInvoice(invoice.id)}
                            disabled={payingInvoices.has(invoice.id)}
                          >
                            {payingInvoices.has(invoice.id) ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              'Pay Now'
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination could be added here */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </p>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loadingInvoices}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={loadingInvoices}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground">
              Your billing history will appear here once you have invoices.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}