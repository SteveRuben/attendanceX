/**
 * Page d'exemples d'utilisation des permissions
 */

import React from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { PermissionExamples } from '../../../components/examples/PermissionExamples';
import { Button } from '../../../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PermissionExamplesPage() {
  return (
    <AppShell title="Exemples de Permissions">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header avec navigation */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/app/permissions">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour aux Permissions
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold">
              Exemples d'Utilisation des Permissions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Démonstration pratique des composants et hooks de permissions
            </p>
          </div>

          {/* Contenu des exemples */}
          <PermissionExamples />
        </div>
      </div>
    </AppShell>
  );
}