/**
 * Page d'accueil - Style Evelya Vibrant
 * Design jeune, coloré et dynamique avec doodles et illustrations
 */

import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { 
  Calendar,
  Users,
  Sparkles,
  Star,
  Music,
  Trophy,
  Coffee,
  Mic,
  BookOpen,
  PartyPopper,
  ArrowRight,
  Instagram,
  Facebook,
  Linkedin,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomeEvelya() {
  const { t } = useTranslation(['common']);

  const categories = [
    {
      id: 'academic',
      name: 'Académique',
      icon: BookOpen,
      color: '#FF6B6B',
      count: 24,
      href: '/events?category=academic'
    },
    {
      id: 'party',
      name: 'Party',
      icon: PartyPopper,
      color: '#FFD93D',
      count: 18,
      href: '/events?category=party'
    },
    {
      id: 'sport',
      name: 'Sportif',
      icon: Trophy,
      color: '#00B894',
      count: 15,
      href: '/events?category=sport'
    },
    {
      id: 'cocktail',
      name: 'Cocktail',
      icon: Coffee,
      color: '#9B85FF',
      count: 12,
      href: '/events?category=cocktail'
    },
    {
      id: 'music',
      name: 'Musique',
      icon: Music,
      color: '#9B85FF',
      count: 20,
      href: '/events?category=music'
    },
    {
      id: 'conference',
      name: 'Conférence',
      icon: Mic,
      color: '#FFE66D',
      count: 16,
      href: '/events?category=conference'
    },
  ];

  const institutions = [
    {
      id: 1,
      name: 'Université McGill',
      logo: '/images/institutions/mcgill.png',
      events: 45,
      verified: true,
      href: '/institutions/mcgill'
    },
    {
      id: 2,
      name: 'Université de Montréal',
      logo: '/images/institutions/udem.png',
      events: 38,
      verified: true,
      href: '/institutions/udem'
    },
    {
      id: 3,
      name: 'Concordia University',
      logo: '/images/institutions/concordia.png',
      events: 32,
      verified: true,
      href: '/institutions/concordia'
    },
  ];

  const organizers = [
    {
      id: 1,
      name: 'Sarah Martin',
      role: 'Organisatrice événements',
      avatar: '/images/avatars/sarah.jpg',
      events: 24,
      rating: 4.9,
      href: '/organizers/sarah-martin'
    },
    {
      id: 2,
      name: 'Thomas Dubois',
      role: 'Coordinateur culturel',
      avatar: '/images/avatars/thomas.jpg',
      events: 18,
      rating: 4.8,
      href: '/organizers/thomas-dubois'
    },
    {
      id: 3,
      name: 'Marie Lefebvre',
      role: 'Event Manager',
      avatar: '/images/avatars/marie.jpg',
      events: 31,
      rating: 5.0,
      href: '/organizers/marie-lefebvre'
    },
  ];

  return (
    <>
      <Head>
        <title>AttendanceX - Tous tes événements étudiants, à un seul endroit</title>
        <meta name="description" content="Découvre, organise et participe aux meilleurs événements étudiants près de chez toi" />
      </Head>

      {/* Header Sticky */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-slate-900" />
              </div>
              <span className="text-xl font-bold text-slate-900">AttendanceX</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/events" className="text-sm font-medium text-slate-900 hover:text-yellow-500 transition-colors">
                Événements
              </Link>
              <Link href="/institutions" className="text-sm font-medium text-slate-900 hover:text-yellow-500 transition-colors">
                Institutions
              </Link>
              <Link href="/organizers" className="text-sm font-medium text-slate-900 hover:text-yellow-500 transition-colors">
                Organisateurs
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <select className="text-sm font-medium text-slate-600 bg-transparent border-none focus:outline-none cursor-pointer">
                <option value="fr">FR</option>
                <option value="en">EN</option>
              </select>
              
              <Link href="/auth/login">
                <Button variant="outline" className="h-9 px-5 rounded-full border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-semibold">
                  Connexion
                </Button>
              </Link>
              
              <Link href="/auth/register">
                <Button className="h-9 px-5 rounded-full bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all">
                  S'inscrire
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-white overflow-hidden">
        {/* Decorative Doodles */}
        <div className="absolute top-20 right-10 w-16 h-16 opacity-20">
          <Star className="w-full h-full text-yellow-400 animate-pulse" />
        </div>
        <div className="absolute bottom-20 left-10 w-12 h-12 opacity-20">
          <Sparkles className="w-full h-full text-purple-400 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-black text-slate-900 leading-tight">
                Tous tes événements{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">étudiants</span>
                  <span className="absolute bottom-2 left-0 right-0 h-3 bg-yellow-400 -rotate-1"></span>
                </span>
                , à un seul endroit.
              </h1>

              <p className="text-xl text-slate-600 leading-relaxed max-w-xl">
                Découvre, organise et participe aux meilleurs événements étudiants près de chez toi. Simple, rapide et gratuit.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/events">
                  <Button className="h-14 px-8 rounded-full bg-yellow-400 text-slate-900 hover:bg-yellow-500 text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                    Découvrir les événements
                  </Button>
                </Link>
                
                <Link href="/create-event">
                  <Button variant="outline" className="h-14 px-8 rounded-full border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white text-lg font-semibold transition-all">
                    Créer un événement
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column - Illustrations */}
            <div className="relative h-96 lg:h-[500px]">
              {/* Floating Doodles */}
              <div className="absolute top-10 left-10 w-20 h-20 animate-float">
                <div className="w-full h-full rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">😊</span>
                </div>
              </div>
              
              <div className="absolute top-20 right-10 w-16 h-16 animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="w-full h-full rounded-full bg-purple-400 flex items-center justify-center shadow-lg">
                  <Music className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <div className="absolute bottom-20 left-20 w-24 h-24 animate-float" style={{ animationDelay: '1s' }}>
                <div className="w-full h-full rounded-full bg-red-400 flex items-center justify-center shadow-lg">
                  <Star className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <div className="absolute bottom-10 right-20 w-14 h-14 animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="w-full h-full rounded-full bg-green-400 flex items-center justify-center shadow-lg">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-12">
            Explore par catégorie
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.id} href={category.href}>
                  <div 
                    className="group relative bg-white rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 shadow-sm hover:shadow-xl border-2 border-transparent hover:border-current"
                    style={{ color: category.color }}
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: `${category.color}20` }}>
                      <Icon className="w-8 h-8" style={{ color: category.color }} />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {category.name}
                    </h3>
                    
                    <p className="text-sm text-slate-600">
                      {category.count} événements
                    </p>

                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}10`, color: category.color }}>
                      Populaire
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Calendar + Institutions Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Mini Calendar */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Janvier 2026</h3>
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center">
                  {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((day) => (
                    <div key={day} className="text-xs font-medium text-slate-500 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      className={`aspect-square flex items-center justify-center text-sm rounded-full hover:bg-slate-100 transition-colors ${
                        day === 31 ? 'bg-yellow-400 text-slate-900 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Institutions Featured */}
            <div className="lg:col-span-3">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Institutions en vedette
              </h3>

              <div className="space-y-4">
                {institutions.map((institution) => (
                  <Link key={institution.id} href={institution.href}>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="w-8 h-8 text-slate-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900">{institution.name}</h4>
                            {institution.verified && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                ✓ Vérifié
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{institution.events} événements actifs</p>
                        </div>

                        <Button variant="outline" size="sm" className="rounded-full">
                          Voir
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organizers Section */}
      <section className="py-20 bg-gradient-to-br from-yellow-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-12">
            Organisateurs actifs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {organizers.map((organizer) => (
              <Link key={organizer.id} href={organizer.href}>
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-lg transition-all hover:-translate-y-2 cursor-pointer">
                  <div className="relative inline-block mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-purple-400 p-1">
                      <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center">
                        <Users className="w-12 h-12 text-slate-600" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {organizer.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-3">{organizer.role}</p>
                  
                  <div className="flex items-center justify-center gap-4 text-sm text-slate-600 mb-4">
                    <span>{organizer.events} événements</span>
                    <span>⭐ {organizer.rating}</span>
                  </div>

                  <Button size="sm" variant="outline" className="rounded-full">
                    Suivre
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-yellow-400 to-yellow-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-32 h-32 text-white opacity-50" />
              </div>
            </div>

            <div className="space-y-6">
              <Star className="w-12 h-12 text-slate-900" />
              
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                Organiser un événement
              </h2>
              
              <p className="text-2xl font-medium text-slate-800">
                Devenir un organisateur
              </p>
              
              <p className="text-lg text-slate-700 leading-relaxed">
                Crée des événements mémorables, connecte avec ta communauté et fais vivre des expériences uniques à tes participants.
              </p>

              <Link href="/contact">
                <Button className="h-14 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  Nous écrire
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-yellow-400 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold">AttendanceX</span>
              </div>
              
              <p className="text-sm text-slate-400 leading-relaxed">
                La plateforme qui connecte les étudiants aux meilleurs événements de leur campus.
              </p>

              <div className="flex gap-4">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-yellow-400 hover:text-slate-900 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-yellow-400 hover:text-slate-900 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-yellow-400 hover:text-slate-900 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Liens</h3>
              <ul className="space-y-3">
                <li><Link href="/events" className="text-slate-400 hover:text-white transition-colors">Événements</Link></li>
                <li><Link href="/institutions" className="text-slate-400 hover:text-white transition-colors">Institutions</Link></li>
                <li><Link href="/organizers" className="text-slate-400 hover:text-white transition-colors">Organisateurs</Link></li>
                <li><Link href="/help" className="text-slate-400 hover:text-white transition-colors">Aide</Link></li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Catégories</h3>
              <ul className="space-y-3">
                {categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link href={cat.href} className="text-slate-400 hover:text-white transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Restez informé</h3>
              <p className="text-sm text-slate-400 mb-4">
                Recevez les derniers événements directement dans votre boîte mail.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Votre email"
                  className="w-full h-12 px-4 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <Button className="w-full h-12 rounded-lg bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-semibold">
                  S'abonner
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-500">
                © 2026 AttendanceX. Tous droits réservés.
              </p>
              <div className="flex gap-6 text-sm">
                <Link href="/privacy" className="text-slate-500 hover:text-white transition-colors">
                  Politique de confidentialité
                </Link>
                <Link href="/terms" className="text-slate-500 hover:text-white transition-colors">
                  Conditions d'utilisation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
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
