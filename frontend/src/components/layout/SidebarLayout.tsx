/**
 * Sidebar Layout - Evelya-inspired Design
 * Layout avec menu latéral gauche fixe
 */

import React from 'react';
import { SidebarMenu } from './SidebarMenu';

interface SidebarLayoutProps {
  children: React.ReactNode;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  children,
  selectedDate,
  onDateSelect
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Menu */}
      <SidebarMenu selectedDate={selectedDate} onDateSelect={onDateSelect} />

      {/* Main Content */}
      <main className="ml-64">
        {children}
      </main>
    </div>
  );
};
