import React, { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, ArrowRight } from 'lucide-react';

export default function BillingRedirectPage() {
  useEffect(() => {
    // Redirection automatique vers la section billing
    const timer = setTimeout(() => {
      window.location.href = '/app/billing';
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AppShell title="Facturation">
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Section déplacée</h2>
            <p className="text-muted-foreground mb-4">
              La facturation a été déplacée vers une section dédiée dans le menu principal.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Redirection en cours...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}