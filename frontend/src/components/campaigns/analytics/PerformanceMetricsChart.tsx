import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Mail,
  Eye,
  MousePointer,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface PerformanceMetricsChartProps {
  data: Array<{
    timestamp: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  }>;
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
}

export const PerformanceMetricsChart: React.FC<PerformanceMetricsChartProps> = ({
  data,
  selectedMetric,
  onMetricChange
}) => {
  const metrics = [
    {
      key: 'delivered',
      label: 'Livrés',
      color: '#10B981',
      icon: Mail,
      description: 'Emails livrés avec succès'
    },
    {
      key: 'opened',
      label: 'Ouverts',
      color: '#8B5CF6',
      icon: Eye,
      description: 'Emails ouverts par les destinataires'
    },
    {
      key: 'clicked',
      label: 'Cliqués',
      color: '#F59E0B',
      icon: MousePointer,
      description: 'Clics sur les liens dans l\'email'
    },
    {
      key: 'bounced',
      label: 'Rebonds',
      color: '#EF4444',
      icon: AlertTriangle,
      description: 'Emails non livrés (rebonds)'
    }
  ];

  // Préparer les données pour le graphique
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    }),
    deliveryRate: item.sent > 0 ? (item.delivered / item.sent) * 100 : 0,
    openRate: item.delivered > 0 ? (item.opened / item.delivered) * 100 : 0,
    clickRate: item.opened > 0 ? (item.clicked / item.opened) * 100 : 0,
    bounceRate: item.sent > 0 ? (item.bounced / item.sent) * 100 : 0
  }));

  // Calculer les totaux et tendances
  const totals = data.reduce((acc, item) => ({
    sent: acc.sent + item.sent,
    delivered: acc.delivered + item.delivered,
    opened: acc.opened + item.opened,
    clicked: acc.clicked + item.clicked,
    bounced: acc.bounced + item.bounced
  }), { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });

  const selectedMetricData = metrics.find(m => m.key === selectedMetric);

  // Composant de tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Métriques de Performance
          </CardTitle>
          <Badge variant="outline">
            {data.length} points de données
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Sélecteur de métriques */}
        <div className="flex flex-wrap gap-2 mb-6">
          {metrics.map(metric => {
            const Icon = metric.icon;
            const isSelected = selectedMetric === metric.key;
            const total = totals[metric.key as keyof typeof totals];
            
            return (
              <Button
                key={metric.key}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onMetricChange(metric.key)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{metric.label}</span>
                <Badge 
                  variant="secondary" 
                  className="ml-1 text-xs"
                  style={{ 
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : undefined,
                    color: isSelected ? 'white' : undefined
                  }}
                >
                  {total.toLocaleString()}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Graphique principal */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {selectedMetric === 'all' ? (
                // Afficher toutes les métriques
                metrics.map(metric => (
                  <Area
                    key={metric.key}
                    type="monotone"
                    dataKey={metric.key}
                    stackId="1"
                    stroke={metric.color}
                    fill={metric.color}
                    fillOpacity={0.6}
                    name={metric.label}
                  />
                ))
              ) : (
                // Afficher la métrique sélectionnée
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={selectedMetricData?.color}
                  fill={selectedMetricData?.color}
                  fillOpacity={0.6}
                  name={selectedMetricData?.label}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Graphique des taux */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Évolution des taux de performance
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                
                <Line
                  type="monotone"
                  dataKey="deliveryRate"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Taux de livraison"
                />
                <Line
                  type="monotone"
                  dataKey="openRate"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Taux d'ouverture"
                />
                <Line
                  type="monotone"
                  dataKey="clickRate"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Taux de clic"
                />
                <Line
                  type="monotone"
                  dataKey="bounceRate"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Taux de rebond"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Résumé des performances */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Résumé de la période
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map(metric => {
              const Icon = metric.icon;
              const total = totals[metric.key as keyof typeof totals];
              const rate = metric.key === 'delivered' 
                ? (total / totals.sent) * 100
                : metric.key === 'opened'
                ? (total / totals.delivered) * 100
                : metric.key === 'clicked'
                ? (total / totals.opened) * 100
                : (total / totals.sent) * 100;
              
              return (
                <div key={metric.key} className="text-center p-3 bg-gray-50 rounded-lg">
                  <Icon 
                    className="h-6 w-6 mx-auto mb-2" 
                    style={{ color: metric.color }}
                  />
                  <div className="text-lg font-bold text-gray-900">
                    {total.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {metric.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {rate.toFixed(1)}% du total
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};