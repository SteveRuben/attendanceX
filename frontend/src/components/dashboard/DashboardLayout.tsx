/**
 * Layout principal du dashboard avec sidebar
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Toaster } from '../components/ui/toaster';

interface DashboardLayoutProps {
  organizationId: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ organizationId }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar organizationId={organizationId} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  );
};