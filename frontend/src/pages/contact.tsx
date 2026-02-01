/**
 * Page Contact - Formulaire de contact
 */

import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Calendar, Mail, Phone, MapPin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function ContactPage() {
  const { t } = useTranslation(['common']);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Head>
        <title>Nous contacter - AttendanceX</title>
        <meta name="description" content="Contactez l'équipe AttendanceX pour toute question ou demande" />
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
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Nous contacter
            </h1>
            <p className="text-xl text-slate-600">
              Une question ? Une suggestion ? Notre équipe est là pour vous aider
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-8">
                Envoyez-nous un message
              </h2>

              {submitted && (
                <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-green-800 font-medium">
                    ✓ Message envoyé avec succès ! Nous vous répondrons bientôt.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700 mb-2 block">
                    Nom complet
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="h-12 rounded-lg border-2 border-slate-200 focus:border-yellow-400"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 mb-2 block">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="h-12 rounded-lg border-2 border-slate-200 focus:border-yellow-400"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="subject" className="text-sm font-medium text-slate-700 mb-2 block">
                    Sujet
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="h-12 rounded-lg border-2 border-slate-200 focus:border-yellow-400"
                    placeholder="De quoi souhaitez-vous parler ?"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-sm font-medium text-slate-700 mb-2 block">
                    Message
                  </Label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 transition-colors"
                    placeholder="Votre message..."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-full bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Envoyer le message
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-8">
                  Informations de contact
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                      <a href="mailto:contact@attendancex.com" className="text-slate-600 hover:text-yellow-600 transition-colors">
                        contact@attendancex.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Téléphone</h3>
                      <a href="tel:+15141234567" className="text-slate-600 hover:text-purple-600 transition-colors">
                        +1 (514) 123-4567
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Adresse</h3>
                      <p className="text-slate-600">
                        123 Rue Sainte-Catherine<br />
                        Montréal, QC H3B 1A1<br />
                        Canada
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Quick Links */}
              <div className="bg-slate-50 rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  Questions fréquentes
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/help" className="text-slate-600 hover:text-yellow-600 transition-colors">
                      → Comment créer un événement ?
                    </Link>
                  </li>
                  <li>
                    <Link href="/help" className="text-slate-600 hover:text-yellow-600 transition-colors">
                      → Comment devenir organisateur ?
                    </Link>
                  </li>
                  <li>
                    <Link href="/help" className="text-slate-600 hover:text-yellow-600 transition-colors">
                      → Politique de remboursement
                    </Link>
                  </li>
                  <li>
                    <Link href="/help" className="text-slate-600 hover:text-yellow-600 transition-colors">
                      → Support technique
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
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
