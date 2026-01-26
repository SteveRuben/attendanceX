/**
 * Page de profil public d'un organisateur
 * Accessible sans authentification
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, MapPin, Globe, Facebook, Twitter, Linkedin, 
  Instagram, Star, Calendar, Users, Loader2, ExternalLink,
  Mail, CheckCircle
} from 'lucide-react';
import { publicEventsService, PublicOrganizer, PublicEvent } from '@/services/publicEventsService';
import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function OrganizerProfilePage() {
  const router = useRouter();
  const { slug } = router.query;

  const [organizer, setOrganizer] = useState<PublicOrganizer | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<PublicEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      loadOrganizerProfile(slug);
    }
  }, [slug]);

  const loadOrganizerProfile = async (organizerSlug: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await publicEventsService.getPublicOrganizerBySlug(organizerSlug);
      
      setOrganizer(response.organizer);
      setUpcomingEvents(response.upcomingEvents);
      setPastEvents(response.pastEvents);
    } catch (err: any) {
      console.error('Error loading organizer:', err);
      setError('Organisateur introuvable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Chargement du profil...</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !organizer) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center py-20">
          <Card className="max-w-md border-2 border-slate-200 dark:border-slate-700 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-red-100 dark:bg-red-900/30 mb-6">
                <Users className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Organisateur introuvable</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Cet organisateur n&apos;existe pas ou n&apos;est plus disponible.
              </p>
              <Button 
                onClick={() => router.push('/events')}
                className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux événements
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{organizer.name} - Organisateur | AttendanceX</title>
        <meta name="description" content={organizer.bio} />
        <meta property="og:title" content={`${organizer.name} - Organisateur`} />
        <meta property="og:description" content={organizer.bio} />
        <meta property="og:image" content={organizer.coverImage || organizer.avatar} />
        <meta property="og:type" content="profile" />
      </Head>

      <PublicLayout>
        {/* Cover Image with Gradient Overlay */}
        <div className="relative w-full h-80 -mt-16">
          {organizer.coverImage ? (
            <Image
              src={organizer.coverImage}
              alt={organizer.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="-mt-24 relative pb-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar */}
              <Avatar className="h-40 w-40 border-4 border-white dark:border-slate-800 shadow-2xl ring-4 ring-blue-500/20">
                <AvatarImage src={organizer.avatar} />
                <AvatarFallback className="text-5xl bg-gradient-to-br from-green-500 to-orange-500 text-white">
                  {organizer.name[0]}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                        {organizer.name}
                      </h1>
                      {organizer.verified && (
                        <Badge className="bg-gradient-to-r from-green-600 to-orange-600 text-white border-0">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Vérifié
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium">{organizer.location.city}, {organizer.location.country}</span>
                      </div>
                      {organizer.stats.rating > 0 && (
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{organizer.stats.rating.toFixed(1)}</span>
                          <span>({organizer.stats.reviewCount} avis)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                    <Mail className="h-4 w-4 mr-2" />
                    Contacter
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-green-900/30 dark:to-blue-800/30 border border-green-200 dark:border-green-800">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {organizer.stats.totalEvents}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Événements
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-800">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {organizer.stats.upcomingEvents}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      À venir
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-800">
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {organizer.stats.totalAttendees.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Participants
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {organizer.stats.rating.toFixed(1)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Note moyenne
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">À propos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed text-lg">
                    {organizer.bio}
                  </p>
                </CardContent>
              </Card>

              {/* Events Tabs */}
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <CardContent className="p-6">
                  <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-12">
                      <TabsTrigger value="upcoming" className="flex items-center gap-2 text-base">
                        <Calendar className="h-5 w-5" />
                        À venir ({upcomingEvents.length})
                      </TabsTrigger>
                      <TabsTrigger value="past" className="flex items-center gap-2 text-base">
                        <Users className="h-5 w-5" />
                        Passés ({pastEvents.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming" className="mt-8">
                      {upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {upcomingEvents.map((event) => (
                            <EventCard key={event.id} event={event} showOrganizer={false} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                            <Calendar className="h-16 w-16 text-slate-400" />
                          </div>
                          <p className="text-lg text-slate-600 dark:text-slate-400">
                            Aucun événement à venir
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="past" className="mt-8">
                      {pastEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {pastEvents.map((event) => (
                            <EventCard key={event.id} event={event} showOrganizer={false} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                            <Users className="h-16 w-16 text-slate-400" />
                          </div>
                          <p className="text-lg text-slate-600 dark:text-slate-400">
                            Aucun événement passé
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Contact & Réseaux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {organizer.website && (
                    <a
                      href={organizer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">Site web</p>
                        <p className="text-xs text-slate-500">Visiter le site</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  )}

                  {organizer.social.facebook && (
                    <a
                      href={organizer.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <Facebook className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">Facebook</p>
                        <p className="text-xs text-slate-500">Suivre sur Facebook</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  )}

                  {organizer.social.twitter && (
                    <a
                      href={organizer.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30 group-hover:bg-sky-200 dark:group-hover:bg-sky-900/50 transition-colors">
                        <Twitter className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">Twitter</p>
                        <p className="text-xs text-slate-500">Suivre sur Twitter</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  )}

                  {organizer.social.linkedin && (
                    <a
                      href={organizer.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <Linkedin className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">LinkedIn</p>
                        <p className="text-xs text-slate-500">Voir le profil</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  )}

                  {organizer.social.instagram && (
                    <a
                      href={organizer.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-200 dark:group-hover:bg-pink-900/50 transition-colors">
                        <Instagram className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">Instagram</p>
                        <p className="text-xs text-slate-500">Suivre sur Instagram</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  )}

                  {!organizer.website && !organizer.social.facebook && !organizer.social.twitter && 
                   !organizer.social.linkedin && !organizer.social.instagram && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                      Aucune information de contact disponible
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Member Since */}
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Informations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Membre depuis</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {new Date(organizer.createdAt).toLocaleDateString('fr-FR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-green-900/20 dark:to-indigo-900/20">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-green-500 to-orange-500 mb-4">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Vous organisez des événements ?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Créez votre profil et commencez à organiser des événements incroyables
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-green-600 to-orange-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg" 
                    onClick={() => router.push('/auth/register')}
                  >
                    Créer un compte
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}
