/**
 * Page principale de facturation
 * Point d'entrée pour toutes les fonctionnalités de facturation
 */

import React from 'react';
import { BillingDashboard } from '../../components/billing/BillingDashboard';

export const BillingPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <BillingDashboard />
    </div>
  );
};

export default BillingPage;