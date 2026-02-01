import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Users, Calendar } from 'lucide-react';

export default function InstitutionsPage() {
  const { t } = useTranslation('common');

  // Données d'exemple pour les institutions
  const institutions = [
    {
      id: 1,
      name: 'Université de Montréal',
      type: 'Université',
      location: 'Montréal, QC',
      members: 45000,
      events: 120,
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'École Polytechnique',
      type: 'École d\'ingénieurs',
      location: 'Paris, France',
      members: 12000,
      events: 85,
      image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Hôpital Général',
      type: 'Établissement de santé',
      location: 'Lyon, France',
      members: 8500,
      events: 45,
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop'
    },
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Building2 className="h-16 w-16 mx-auto mb-6" />
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {t('nav.institutions')}
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Découvrez les institutions qui utilisent AttendanceX pour gérer leurs événements
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">250+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Institutions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">500K+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Membres</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">10K+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Événements</p>
              </CardContent>
            </Card>
          </div>

          {/* Institutions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((institution) => (
              <Card key={institution.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="aspect-video relative overflow-hidden rounded-t-xl">
                  <img
                    src={institution.image}
                    alt={institution.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{institution.name}</CardTitle>
                  <CardDescription>{institution.type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span>{institution.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Users className="h-4 w-4" />
                      <span>{institution.members.toLocaleString()} membres</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      <span>{institution.events} événements</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
