import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Edit,
  Clock,
  Send,
  CheckCircle,
  Pause,
  X,
  AlertCircle
} from 'lucide-react';
import { Campaign } from './CampaignDashboard';

interface CampaignStatusBadgeProps {
  status: Campaign['status'];
  size?: 'sm' | 'md';
}

export const CampaignStatusBadge: React.FC<CampaignStatusBadgeProps> = ({ 
  status, 
  size = 'md' 
}) => {
  const statusConfig = {
    draft: {
      variant: 'secondary' as const,
      label: 'Brouillon',
      icon: Edit,
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    scheduled: {
      variant: 'default' as const,
      label: 'Programmé',
      icon: Clock,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    sending: {
      variant: 'default' as const,
      label: 'En cours d\'envoi',
      icon: Send,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    sent: {
      variant: 'default' as const,
      label: 'Envoyé',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    paused: {
      variant: 'default' as const,
      label: 'En pause',
      icon: Pause,
      className: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    cancelled: {
      variant: 'secondary' as const,
      label: 'Annulé',
      icon: X,
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    failed: {
      variant: 'destructive' as const,
      label: 'Échec',
      icon: AlertCircle,
      className: 'bg-red-100 text-red-700 border-red-200'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 ${config.className} ${
        size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'
      }`}
    >
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );
};