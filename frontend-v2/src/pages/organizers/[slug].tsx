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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !organizer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Organisateur introuvable</h2>
            <p className="text-gray-600 mb-6">
              Cet organisateur n&apos;existe pas ou n&apos;est plus disponible.
            </p>
            <Button onClick={() => router.push('/events')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux événements
            </Button>
          </CardContent>
        </Card>
      </div>
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

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Back Button */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Button variant="ghost" onClick={() => router.push('/events')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux événements
            </Button>
          </div>
        </div>

        {/* Cover Image */}
        {organizer.coverImage && (
          <div className="relative w-full h-64">
            <Image
              src={organizer.coverImage}
              alt={organizer.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className={`${organizer.coverImage ? '-mt-20' : 'pt-8'} relative`}>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <Avatar className="h-32 w-32 border-4 border-white dark:border-gray-800 shadow-lg">
                <AvatarImage src={organizer.avatar} />
                <AvatarFallback className="text-4xl">{organizer.name[0]}</AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {organizer.name}
                      </h1>
                      {organizer.verified && (
                        <Badge className="bg-blue-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Vérifié
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {organizer.location.city}, {organizer.location.country}
                      </div>
                      {organizer.stats.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {organizer.stats.rating.toFixed(1)} ({organizer.stats.reviewCount} avis)
                        </div>
                      )}
                    </div>
                  </div>

                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Contacter
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {organizer.stats.totalEvents}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Événements
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {organizer.stats.upcomingEvents}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        À venir
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {organizer.stats.totalAttendees.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Participants
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {organizer.stats.rating.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Note moyenne
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle>À propos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {organizer.bio}
                  </p>
                </CardContent>
              </Card>

              {/* Events Tabs */}
              <Card>
                <CardContent className="p-6">
                  <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upcoming" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        À venir ({upcomingEvents.length})
                      </TabsTrigger>
                      <TabsTrigger value="past" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Passés ({pastEvents.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming" className="mt-6">
                      {upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {upcomingEvents.map((event) => (
                            <EventCard key={event.id} event={event} showOrganizer={false} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
                            Aucun événement à venir
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="past" className="mt-6">
                      {pastEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pastEvents.map((event) => (
                            <EventCard key={event.id} event={event} showOrganizer={false} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {organizer.website && (
                    <a
                      href={organizer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      Site web
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {organizer.social.facebook && (
                    <a
                      href={organizer.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Facebook className="h-4 w-4" />
                      Facebook
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {organizer.social.twitter && (
                    <a
                      href={organizer.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {organizer.social.linkedin && (
                    <a
                      href={organizer.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {organizer.social.instagram && (
                    <a
                      href={organizer.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Instagram className="h-4 w-4" />
                      Instagram
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {!organizer.website && !organizer.social.facebook && !organizer.social.twitter && 
                   !organizer.social.linkedin && !organizer.social.instagram && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Aucune information de contact disponible
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Member Since */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Membre depuis{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(organizer.createdAt).toLocaleDateString('fr-FR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                </CardContent>
              </Card>

              {/* CTA */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Vous organisez des événements ?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Créez votre profil et commencez à organiser des événements incroyables
                  </p>
                  <Button className="w-full" onClick={() => router.push('/auth/register')}>
                    Créer un compte
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
