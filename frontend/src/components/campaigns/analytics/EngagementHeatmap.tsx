import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import {
  Activity,
  Clock,
  Calendar,
  TrendingUp,
  Info
} from 'lucide-react';

interface EngagementHeatmapProps {
  data: Array<{
    timestamp: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  }>;
  timeRange: string;
}

interface HeatmapCell {
  hour: number;
  day: number;
  value: number;
  count: number;
  label: string;
}

export const EngagementHeatmap: React.FC<EngagementHeatmapProps> = ({
  data,
  timeRange
}) => {
  // Générer les données de la heatmap
  const heatmapData = useMemo(() => {
    const cells: HeatmapCell[] = [];
    const hourlyData: { [key: string]: { opens: number; clicks: number; total: number } } = {};
    
    // Traiter les données pour créer une heatmap heure/jour
    data.forEach(item => {
      const date = new Date(item.timestamp);
      const hour = date.getHours();
      const day = date.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
      const key = `${day}-${hour}`;
      
      if (!hourlyData[key]) {
        hourlyData[key] = { opens: 0, clicks: 0, total: 0 };
      }
      
      hourlyData[key].opens += item.opened;
      hourlyData[key].clicks += item.clicked;
      hourlyData[key].total += item.delivered;
    });
    
    // Créer les cellules de la heatmap
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const data = hourlyData[key] || { opens: 0, clicks: 0, total: 0 };
        const engagementRate = data.total > 0 ? ((data.opens + data.clicks) / data.total) * 100 : 0;
        
        cells.push({
          hour,
          day,
          value: engagementRate,
          count: data.opens + data.clicks,
          label: `${getDayName(day)} ${hour}h`
        });
      }
    }
    
    return cells;
  }, [data]);

  // Trouver les valeurs min/max pour la normalisation des couleurs
  const maxValue = Math.max(...heatmapData.map(cell => cell.value));
  const minValue = Math.min(...heatmapData.map(cell => cell.value));

  // Obtenir la couleur d'une cellule basée sur sa valeur
  const getCellColor = (value: number) => {
    if (value === 0) return '#f3f4f6'; // Gris clair pour aucune donnée
    
    const intensity = (value - minValue) / (maxValue - minValue);
    const opacity = Math.max(0.1, intensity);
    
    return `rgba(59, 130, 246, ${opacity})`; // Bleu avec opacité variable
  };

  // Obtenir le nom du jour
  function getDayName(day: number): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[day];
  }

  // Calculer les statistiques d'engagement
  const engagementStats = useMemo(() => {
    const totalEngagement = heatmapData.reduce((sum, cell) => sum + cell.count, 0);
    const avgEngagement = heatmapData.length > 0 
      ? heatmapData.reduce((sum, cell) => sum + cell.value, 0) / heatmapData.length 
      : 0;
    
    // Trouver les créneaux les plus actifs
    const topSlots = heatmapData
      .filter(cell => cell.count > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    
    // Analyser les tendances par jour de la semaine
    const dayStats = Array.from({ length: 7 }, (_, day) => {
      const dayCells = heatmapData.filter(cell => cell.day === day);
      const dayTotal = dayCells.reduce((sum, cell) => sum + cell.count, 0);
      const dayAvg = dayCells.length > 0 
        ? dayCells.reduce((sum, cell) => sum + cell.value, 0) / dayCells.length 
        : 0;
      
      return {
        day,
        name: getDayName(day),
        total: dayTotal,
        average: dayAvg
      };
    });
    
    const bestDay = dayStats.reduce((best, current) => 
      current.average > best.average ? current : best
    );
    
    return {
      totalEngagement,
      avgEngagement,
      topSlots,
      bestDay
    };
  }, [heatmapData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Heatmap d'Engagement
          </CardTitle>
          <Badge variant="outline">
            {timeRange === '24h' ? 'Dernières 24h' : 
             timeRange === '7d' ? '7 jours' : 
             timeRange === '30d' ? '30 jours' : '90 jours'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-900">
              {engagementStats.avgEngagement.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-700">Engagement moyen</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-900">
              {engagementStats.bestDay.name}
            </div>
            <div className="text-sm text-green-700">Meilleur jour</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-900">
              {engagementStats.totalEngagement.toLocaleString()}
            </div>
            <div className="text-sm text-purple-700">Total interactions</div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Engagement par heure et jour de la semaine</span>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* En-têtes des heures */}
              <div className="flex mb-2">
                <div className="w-12"></div> {/* Espace pour les labels des jours */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="flex-1 text-center text-xs text-gray-500 px-1">
                    {hour}h
                  </div>
                ))}
              </div>
              
              {/* Lignes de la heatmap */}
              {Array.from({ length: 7 }, (_, day) => (
                <div key={day} className="flex items-center mb-1">
                  <div className="w-12 text-xs text-gray-600 text-right pr-2">
                    {getDayName(day)}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const cell = heatmapData.find(c => c.day === day && c.hour === hour);
                    const value = cell?.value || 0;
                    const count = cell?.count || 0;
                    
                    return (
                      <div
                        key={hour}
                        className="flex-1 h-6 mx-0.5 rounded cursor-pointer transition-all hover:scale-110 hover:z-10 relative group"
                        style={{ backgroundColor: getCellColor(value) }}
                        title={`${cell?.label}: ${value.toFixed(1)}% engagement (${count} interactions)`}
                      >
                        {/* Tooltip au hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                          {cell?.label}<br/>
                          {value.toFixed(1)}% engagement<br/>
                          {count} interactions
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Légende */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>Faible</span>
              <div className="flex gap-1">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map(opacity => (
                  <div
                    key={opacity}
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
                  />
                ))}
              </div>
              <span>Élevé</span>
            </div>
            <div className="text-gray-400">
              Max: {maxValue.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Créneaux les plus performants */}
        {engagementStats.topSlots.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Créneaux les plus performants
            </h4>
            
            <div className="space-y-2">
              {engagementStats.topSlots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{slot.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {slot.value.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {slot.count} interactions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conseils d'optimisation */}
        <div className="border-t pt-6 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-blue-900 mb-2">
                  Recommandations d'optimisation
                </h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Programmez vos campagnes le {engagementStats.bestDay.name} pour un meilleur engagement</li>
                  {engagementStats.topSlots[0] && (
                    <li>• Le créneau {engagementStats.topSlots[0].label} montre le meilleur taux d'engagement</li>
                  )}
                  <li>• Évitez les créneaux avec peu d'activité (zones grises sur la heatmap)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};