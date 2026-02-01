import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, MapPin, Users, Calendar, TrendingUp } from 'lucide-react';

export default function CompaniesPage() {
  const { t } = useTranslation('common');

  // Données d'exemple pour les entreprises
  const companies = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      industry: 'Technologie',
      location: 'San Francisco, CA',
      employees: 2500,
      events: 45,
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      name: 'Innovation Labs',
      industry: 'Recherche & Développement',
      location: 'Boston, MA',
      employees: 850,
      events: 32,
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Global Finance Group',
      industry: 'Finance',
      location: 'New York, NY',
      employees: 5000,
      events: 68,
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop'
    },
    {
      id: 4,
      name: 'Creative Studio',
      industry: 'Design & Marketing',
      location: 'Los Angeles, CA',
      employees: 320,
      events: 28,
      image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop'
    },
    {
      id: 5,
      name: 'Healthcare Plus',
      industry: 'Santé',
      location: 'Chicago, IL',
      employees: 1200,
      events: 41,
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'
    },
    {
      id: 6,
      name: 'EcoEnergy Corp',
      industry: 'Énergie renouvelable',
      location: 'Seattle, WA',
      employees: 680,
      events: 25,
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop'
    },
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Briefcase className="h-16 w-16 mx-auto mb-6" />
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {t('nav.companies')}
              </h1>
              <p className="text-xl text-purple-100 max-w-2xl mx-auto">
                Découvrez les entreprises qui font confiance à AttendanceX pour leurs événements professionnels
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <Briefcase className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">500+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Entreprises</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">250K+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Employés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">15K+</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Événements</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">98%</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Satisfaction</p>
              </CardContent>
            </Card>
          </div>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="aspect-video relative overflow-hidden rounded-t-xl">
                  <img
                    src={company.image}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <CardDescription>{company.industry}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span>{company.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Users className="h-4 w-4" />
                      <span>{company.employees.toLocaleString()} employés</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      <span>{company.events} événements</span>
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
