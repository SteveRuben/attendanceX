import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  HardDrive, 
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { UsageStats } from '@/types/billing.types';

interface UsageOverviewProps {
  usage: UsageStats;
  detailed?: boolean;
}

export function UsageOverview({ usage, detailed = false }: UsageOverviewProps) {
  const usageItems = [
    {
      key: 'users',
      label: 'Users',
      icon: Users,
      data: usage.users,
      color: 'blue'
    },
    {
      key: 'events',
      label: 'Events',
      icon: Calendar,
      data: usage.events,
      color: 'green'
    },
    {
      key: 'storage',
      label: 'Storage',
      icon: HardDrive,
      data: usage.storage,
      color: 'purple',
      unit: usage.storage.unit
    },
    {
      key: 'apiCalls',
      label: 'API Calls',
      icon: Zap,
      data: usage.apiCalls,
      color: 'orange'
    }
  ];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 100) return { label: 'Over Limit', variant: 'destructive' as const };
    if (percentage >= 90) return { label: 'Critical', variant: 'destructive' as const };
    if (percentage >= 75) return { label: 'Warning', variant: 'secondary' as const };
    return { label: 'Normal', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Overview
          </CardTitle>
          <CardDescription>
            Current usage across all plan limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {usageItems.map((item) => {
              const Icon = item.icon;
              const status = getUsageStatus(item.data.percentage);
              
              return (
                <div key={item.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {item.data.current.toLocaleString()}
                        {item.unit && ` ${item.unit}`}
                      </span>
                      <span className="text-muted-foreground">
                        {item.data.limit === -1 ? 'Unlimited' : (
                          <>
                            {item.data.limit.toLocaleString()}
                            {item.unit && ` ${item.unit}`}
                          </>
                        )}
                      </span>
                    </div>
                    
                    {item.data.limit !== -1 && (
                      <Progress 
                        value={Math.min(item.data.percentage, 100)} 
                        className="h-2"
                      />
                    )}
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.data.percentage.toFixed(1)}% used</span>
                      {item.data.percentage > 100 && (
                        <span className="text-red-600 font-medium">
                          Over limit by {(item.data.percentage - 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {detailed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {usageItems.map((item) => {
            const Icon = item.icon;
            const isOverLimit = item.data.percentage > 100;
            
            return (
              <Card key={`${item.key}-detailed`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5" />
                    {item.label} Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          {item.data.current.toLocaleString()}
                          {item.unit && (
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {item.unit}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          of {item.data.limit === -1 ? 'unlimited' : (
                            <>
                              {item.data.limit.toLocaleString()}
                              {item.unit && ` ${item.unit}`}
                            </>
                          )}
                        </p>
                      </div>
                      
                      {isOverLimit && (
                        <div className="text-right">
                          <AlertTriangle className="h-5 w-5 text-red-500 mb-1" />
                          <p className="text-xs text-red-600 font-medium">
                            Over Limit
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {item.data.limit !== -1 && (
                      <div className="space-y-2">
                        <Progress 
                          value={Math.min(item.data.percentage, 100)} 
                          className="h-3"
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.data.percentage.toFixed(1)}% used
                          </span>
                          {isOverLimit && (
                            <span className="text-red-600 font-medium">
                              +{(item.data.current - item.data.limit).toLocaleString()} over limit
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}