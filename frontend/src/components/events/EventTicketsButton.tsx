import React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Users, QrCode } from 'lucide-react';
import { useTicketStatistics } from '@/hooks/useTicketStatistics';

interface EventTicketsButtonProps {
  eventId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showStats?: boolean;
  className?: string;
}

export const EventTicketsButton: React.FC<EventTicketsButtonProps> = ({
  eventId,
  variant = 'default',
  size = 'default',
  showStats = false,
  className
}) => {
  const router = useRouter();
  const { statistics, loading } = useTicketStatistics({
    eventId,
    autoFetch: showStats
  });

  const handleClick = () => {
    router.push(`/app/events/${eventId}/tickets`);
  };

  if (showStats && !loading && statistics) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          className="flex items-center gap-2"
        >
          <Ticket className="h-4 w-4" />
          Gérer les billets
        </Button>
        
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {statistics.total}
          </Badge>
          
          {statistics.checkInsCount > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <QrCode className="h-3 w-3" />
              {statistics.checkInsCount}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`flex items-center gap-2 ${className}`}
    >
      <Ticket className="h-4 w-4" />
      Gérer les billets
    </Button>
  );
};