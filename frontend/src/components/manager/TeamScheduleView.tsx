import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Calendar, Users } from 'lucide-react';

interface TeamScheduleViewProps {
  organizationId?: string;
  selectedDate: string;
  selectedDepartment: string;
}

export const TeamScheduleView: React.FC<TeamScheduleViewProps> = ({
  organizationId,
  selectedDate,
  selectedDepartment
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Planning d'équipe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Planning d'équipe
          </h3>
          <p className="text-gray-600">
            Cette fonctionnalité sera bientôt disponible.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Date sélectionnée: {selectedDate}
            {selectedDepartment !== 'all' && ` • Département: ${selectedDepartment}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};