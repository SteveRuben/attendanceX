import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, BarChart3, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>AttendanceX - Gestion d'Événements et de Présence</title>
        <meta name="description" content="Plateforme complète de gestion d'événements et de suivi de présence" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">AttendanceX</h1>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/auth/login">
                  <Button variant="outline">Se connecter</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>S'inscrire</Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Gérez vos événements et suivez la présence
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              AttendanceX est une plateforme complète pour organiser des événements, 
              gérer les inscriptions et suivre la présence de vos participants.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg">
                  Commencer gratuitement
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg">
                  Voir la démo
                </Button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <Card>
              <CardHeader>
                <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Gestion d'Événements</CardTitle>
                <CardDescription>
                  Créez et gérez facilement vos événements avec notre interface intuitive
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>Suivi de Présence</CardTitle>
                <CardDescription>
                  Suivez la présence de vos participants en temps réel avec des outils avancés
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Analysez vos données avec des rapports détaillés et des statistiques
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-red-600 mb-2" />
                <CardTitle>Sécurisé</CardTitle>
                <CardDescription>
                  Vos données sont protégées avec les plus hauts standards de sécurité
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-white rounded-2xl p-12 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Prêt à commencer ?
            </h3>
            <p className="text-gray-600 mb-8">
              Rejoignez des milliers d'organisateurs qui font confiance à AttendanceX
            </p>
            <Link href="/auth/register">
              <Button size="lg">
                Créer un compte gratuit
              </Button>
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-600">
              <p>&copy; 2024 AttendanceX. Tous droits réservés.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}