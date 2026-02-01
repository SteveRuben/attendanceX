import React from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CalendarWidget } from '@/components/ui/calendar-widget';
import { CategoryCard } from '@/components/events/CategoryCard';
import { OrganizationCard } from '@/components/organization/OrganizationCard';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  Music, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  Palette, 
  Utensils,
  Dumbbell,
  Gamepad2,
  TrendingUp,
  Award
} from 'lucide-react';

export default function EventsPage() {
  const { t } = useTranslation('common');

  // Catégories d'événements avec images
  const categories = [
    {
      name: 'Musique',
      icon: Music,
      count: 145,
      href: '/events/music',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
      color: 'purple'
    },
    {
      name: 'Business',
      icon: Briefcase,
      count: 89,
      href: '/events/business',
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop',
      color: 'blue'
    },
    {
      name: 'Éducation',
      icon: GraduationCap,
      count: 67,
      href: '/events/education',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      color: 'green'
    },
    {
      name: 'Santé & Bien-être',
      icon: Heart,
      count: 54,
      href: '/events/health',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
      color: 'red'
    },
    {
      name: 'Art & Culture',
      icon: Palette,
      count: 92,
      href: '/events/art',
      image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=300&fit=crop',
      color: 'pink'
    },
    {
      name: 'Gastronomie',
      icon: Utensils,
      count: 78,
      href: '/events/food',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      color: 'orange'
    },
    {
      name: 'Sport & Fitness',
      icon: Dumbbell,
      count: 103,
      href: '/events/sports',
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop',
      color: 'cyan'
    },
    {
      name: 'Gaming & Tech',
      icon: Gamepad2,
      count: 61,
      href: '/events/gaming',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
      color: 'indigo'
    },
  ];

  // Organisations en vedette (featured)
  const featuredOrganizations = [
    {
      id: 'org-1',
      name: 'TechHub Montréal',
      description: 'Centre d\'innovation technologique organisant des événements, ateliers et conférences pour la communauté tech.',
      logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 45,
      followersCount: 2340,
      rating: 4.8,
      isFeatured: true
    },
    {
      id: 'org-2',
      name: 'Université McGill',
      description: 'Institution académique de renommée mondiale proposant conférences, séminaires et événements culturels.',
      logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 78,
      followersCount: 5620,
      rating: 4.9,
      isFeatured: true
    },
    {
      id: 'org-3',
      name: 'Centre des Arts',
      description: 'Espace culturel dédié aux arts visuels, spectacles et expositions pour tous les publics.',
      logo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 34,
      followersCount: 1890,
      rating: 4.7,
      isFeatured: true
    }
  ];

  // Organisations les plus actives
  const activeOrganizations = [
    {
      id: 'org-4',
      name: 'Startup Montréal',
      description: 'Communauté d\'entrepreneurs organisant meetups, pitch nights et événements de networking.',
      logo: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=200&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 52,
      followersCount: 3120,
      rating: 4.6
    },
    {
      id: 'org-5',
      name: 'Fitness Plus',
      description: 'Réseau de centres sportifs proposant cours collectifs, ateliers bien-être et challenges fitness.',
      logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 67,
      followersCount: 4250,
      rating: 4.5
    },
    {
      id: 'org-6',
      name: 'Cuisine & Saveurs',
      description: 'École culinaire offrant cours de cuisine, dégustations et événements gastronomiques.',
      logo: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 41,
      followersCount: 2780,
      rating: 4.8
    },
    {
      id: 'org-7',
      name: 'Gaming Arena',
      description: 'Centre e-sport organisant tournois, LAN parties et événements gaming pour tous niveaux.',
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 38,
      followersCount: 3450,
      rating: 4.7
    },
    {
      id: 'org-8',
      name: 'Bibliothèque Centrale',
      description: 'Bibliothèque publique proposant conférences littéraires, clubs de lecture et ateliers éducatifs.',
      logo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 29,
      followersCount: 1560,
      rating: 4.6
    },
    {
      id: 'org-9',
      name: 'Wellness Studio',
      description: 'Studio holistique offrant yoga, méditation, ateliers de développement personnel et bien-être.',
      logo: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=200&h=200&fit=crop&q=80',
      location: 'Montréal, QC',
      eventsCount: 44,
      followersCount: 2190,
      rating: 4.9
    }
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {t('nav.events')}
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Découvrez des événements passionnants près de chez vous
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Section: Calendar */}
            <div className="lg:w-auto">
              <CalendarWidget />
            </div>

            {/* Right Section: Categories */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Catégories d'événements
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.name}
                    name={category.name}
                    icon={category.icon}
                    count={category.count}
                    href={category.href}
                    image={category.image}
                    color={category.color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Featured Events Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Événements à la une
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Placeholder pour les événements */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Événement à venir
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Détails de l'événement...
                </p>
              </div>
            </div>
          </div>

          {/* Featured Organizations Section */}
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <Award className="h-6 w-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Organisations en vedette
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredOrganizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  id={org.id}
                  name={org.name}
                  description={org.description}
                  logo={org.logo}
                  coverImage={org.coverImage}
                  location={org.location}
                  eventsCount={org.eventsCount}
                  followersCount={org.followersCount}
                  rating={org.rating}
                  isFeatured={org.isFeatured}
                />
              ))}
            </div>
          </div>

          {/* Most Active Organizations Section */}
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Organisations les plus actives
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeOrganizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  id={org.id}
                  name={org.name}
                  description={org.description}
                  logo={org.logo}
                  location={org.location}
                  eventsCount={org.eventsCount}
                  followersCount={org.followersCount}
                  rating={org.rating}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
