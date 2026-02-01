/**
 * Page Organisateurs - Liste des organisateurs d'événements
 */

import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Users, Star, Calendar, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function OrganizersPage() {
  const { t } = useTranslation(['common']);
  const [searchQuery, setSearchQuery] = useState('');

  const organizers = [
    {
      id: 1,
      name: 'Sarah Martin',
      role: 'Organisatrice événements',
      bio: 'Passionnée par la création d\'expériences mémorables pour la communauté étudiante.',
      avatar: '/images/avatars/sarah.jpg',
      events: 24,
      rating: 4.9,
      followers: 1250,
      location: 'Montréal, QC',
      verified: true,
      href: '/organizers/sarah-martin'
    },
    {
      id: 2,
      name: 'Thomas Dubois',
      role: 'Coordinateur culturel',
      bio: 'Spécialisé dans les événements culturels et artistiques sur campus.',
      avatar: '/images/avatars/thomas.jpg',
      events: 18,
      rating: 4.8,
      followers: 890,
      location: 'Québec, QC',
      verified: true,
      href: '/organizers/thomas-dubois'
    },
    {
      id: 3,
      name: 'Marie Lefebvre',
      role: 'Event Manager',
      bio: 'Experte en organisation d\'événements sportifs et compétitions.',
      avatar: '/images/avatars/marie.jpg',
      events: 31,
      rating: 5.0,
      followers: 2100,
      location: 'Montréal, QC',
      verified: true,
      href: '/organizers/marie-lefebvre'
    },
    {
      id: 4,
      name: 'Alex Chen',
      role: 'Organisateur tech',
      bio: 'Hackathons, conférences tech et événements innovation.',
      avatar: '/images/avatars/alex.jpg',
      events: 15,
      rating: 4.7,
      followers: 750,
      location: 'Montréal, QC',
      verified: false,
      href: '/organizers/alex-chen'
    },
    {
      id: 5,
      name: 'Sophie Tremblay',
      role: 'Coordinatrice sociale',
      bio: 'Spécialiste des soirées étudiantes et événements networking.',
      avatar: '/images/avatars/sophie.jpg',
      events: 28,
      rating: 4.9,
      followers: 1680,
      location: 'Laval, QC',
      verified: true,
      href: '/organizers/sophie-tremblay'
    },
    {
      id: 6,
      name: 'David Rousseau',
      role: 'Organisateur musical',
      bio: 'Concerts, festivals et événements musicaux pour étudiants.',
      avatar: '/images/avatars/david.jpg',
      events: 22,
      rating: 4.8,
      followers: 1420,
      location: 'Montréal, QC',
      verified: true,
      href: '/organizers/david-rousseau'
    },
  ];

  const filteredOrganizers = organizers.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Organisateurs d'événements - AttendanceX</title>
        <meta name="description" content="Découvrez les meilleurs organisateurs d'événements étudiants" />
      </Head>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-slate-900" />
              </div>
              <span className="text-xl font-bold text-slate-900">AttendanceX</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="/events" className="text-sm font-medium text-slate-900 hover:text-yellow-500 transition-colors">
                Événements
              </Link>
              <Link href="/institutions" className="text-sm font-medium text-slate-900 hover:text-yellow-500 transition-colors">
                Institutions
              </Link>
              <Link href="/organizers" className="text-sm font-medium text-yellow-500">
                Organisateurs
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="outline" className="h-9 px-5 rounded-full border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-semibold">
                  Connexion
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-yellow-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Organisateurs d'événements
            </h1>
            <p className="text-xl text-slate-600">
              Découvrez les créateurs d'expériences qui animent votre communauté étudiante
            </p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un organisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-yellow-400 bg-white text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Organizers Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredOrganizers.map((organizer) => (
              <Link key={organizer.id} href={organizer.href}>
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-all hover:-translate-y-2 cursor-pointer">
                  <div className="relative inline-block mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-purple-400 p-1">
                      <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center">
                        <Users className="w-12 h-12 text-slate-600" />
                      </div>
                    </div>
                    {organizer.verified && (
                      <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-slate-900 mb-1">
                    {organizer.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">{organizer.role}</p>
                  
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {organizer.bio}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{organizer.location}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{organizer.events} événements</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{organizer.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{organizer.followers} abonnés</span>
                    <Button size="sm" variant="outline" className="rounded-full">
                      Suivre
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredOrganizers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">Aucun organisateur trouvé</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-yellow-400 to-yellow-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Devenir organisateur
          </h2>
          <p className="text-xl text-slate-800 mb-8">
            Rejoignez notre communauté d'organisateurs et créez des événements mémorables
          </p>
          <Link href="/contact">
            <Button className="h-14 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 text-lg font-semibold shadow-lg">
              Nous contacter
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
