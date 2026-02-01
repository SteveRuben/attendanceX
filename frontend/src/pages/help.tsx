/**
 * Page Aide - Centre d'aide et FAQ
 */

import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Calendar, Search, HelpCircle, Book, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function HelpPage() {
  const { t } = useTranslation(['common']);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      id: 'getting-started',
      title: 'Premiers pas',
      icon: Book,
      color: 'yellow',
      articles: [
        { title: 'Comment créer un compte ?', href: '/help/create-account' },
        { title: 'Découvrir les événements', href: '/help/discover-events' },
        { title: 'S\'inscrire à un événement', href: '/help/register-event' },
      ]
    },
    {
      id: 'organizers',
      title: 'Pour les organisateurs',
      icon: Users,
      color: 'purple',
      articles: [
        { title: 'Créer votre premier événement', href: '/help/create-first-event' },
        { title: 'Gérer les inscriptions', href: '/help/manage-registrations' },
        { title: 'Promouvoir votre événement', href: '/help/promote-event' },
      ]
    },
    {
      id: 'account',
      title: 'Compte et paramètres',
      icon: Settings,
      color: 'blue',
      articles: [
        { title: 'Modifier votre profil', href: '/help/edit-profile' },
        { title: 'Gérer vos notifications', href: '/help/manage-notifications' },
        { title: 'Sécurité du compte', href: '/help/account-security' },
      ]
    },
  ];

  const faq = [
    {
      question: 'Comment créer un événement ?',
      answer: 'Pour créer un événement, connectez-vous à votre compte, cliquez sur "Créer un événement" dans le menu principal, puis remplissez le formulaire avec les détails de votre événement.'
    },
    {
      question: 'Les événements sont-ils gratuits ?',
      answer: 'AttendanceX propose des événements gratuits et payants. Vous pouvez filtrer par prix lors de votre recherche.'
    },
    {
      question: 'Comment devenir organisateur vérifié ?',
      answer: 'Contactez notre équipe via le formulaire de contact avec vos informations et votre historique d\'organisation d\'événements.'
    },
    {
      question: 'Puis-je annuler mon inscription à un événement ?',
      answer: 'Oui, vous pouvez annuler votre inscription depuis votre tableau de bord jusqu\'à 24h avant le début de l\'événement.'
    },
  ];

  return (
    <>
      <Head>
        <title>Centre d'aide - AttendanceX</title>
        <meta name="description" content="Trouvez des réponses à vos questions sur AttendanceX" />
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
              <Link href="/organizers" className="text-sm font-medium text-slate-900 hover:text-yellow-500 transition-colors">
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
            <HelpCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Centre d'aide
            </h1>
            <p className="text-xl text-slate-600">
              Trouvez rapidement des réponses à vos questions
            </p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher dans l'aide..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-xl border-2 border-slate-200 focus:border-yellow-400 bg-white text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Parcourir par catégorie
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {categories.map((category) => {
              const Icon = category.icon;
              const colorClasses = {
                yellow: 'bg-yellow-100 text-yellow-600',
                purple: 'bg-purple-100 text-purple-600',
                blue: 'bg-blue-100 text-blue-600',
              }[category.color];

              return (
                <div key={category.id} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all">
                  <div className={`w-12 h-12 rounded-full ${colorClasses} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">
                    {category.title}
                  </h3>

                  <ul className="space-y-3">
                    {category.articles.map((article, idx) => (
                      <li key={idx}>
                        <Link href={article.href} className="text-slate-600 hover:text-yellow-600 transition-colors text-sm">
                          → {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Questions fréquentes
          </h2>

          <div className="space-y-4">
            {faq.map((item, idx) => (
              <details key={idx} className="bg-white rounded-xl p-6 border border-slate-200 group">
                <summary className="font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                  {item.question}
                  <span className="text-yellow-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Vous ne trouvez pas ce que vous cherchez ?
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Notre équipe est là pour vous aider
          </p>
          <Link href="/contact">
            <Button className="h-12 px-8 rounded-full bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-semibold shadow-lg">
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
