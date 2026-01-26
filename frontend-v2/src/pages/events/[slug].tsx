/**
 * Page de détail d'un événement public
 * Accessible sans authentification
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar, MapPin, Users, Star, Share2, Bookmark, 
  Clock, Euro, Globe, Loader2, ArrowLeft, ExternalLink 
} from 'lucide-react';
import { publicEventsService, PublicEvent, PublicOrganizer } from '@/services/publicEventsService';
import { EventCard } from '@/components/events/EventCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function EventDetailPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [organizer, setOrganizer] = useState<PublicOrganizer | null>(null);
  const [similarEvents, setSimilarEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      loadEventDetail(slug);
    }
  }, [slug]);

  const loadEventDetail = async (eventSlug: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await publicEventsService.getPublicEventBySlug(eventSlug);
      
      setEvent(response.event);
      setOrganizer(response.organizer);
      setSimilarEvents(response.similarEvents);
    } catch (err: any) {
      console.error('Error loading event:', err);
      setError('Événement introuvable');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: event.title,
          text: event.shortDescription,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Événement introuvable</h2>
            <p className="text-gray-600 mb-6">
              Cet événement n&apos;existe pas ou n&apos;est plus disponible.
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

  const availabilityPercentage = (event.capacity.available / event.capacity.total) * 100;
  const isAlmostFull = availabilityPercentage < 20;

  return (
    <>
      <Head>
        <title>{event.seo.metaTitle} | AttendanceX</title>
        <meta name="description" content={event.seo.metaDescription} />
        <meta name="keywords" content={event.seo.keywords.join(', ')} />
        
        {/* Open Graph */}
        <meta property="og:title" content={event.seo.metaTitle} />
        <meta property="og:description" content={event.seo.metaDescription} />
        <meta property="og:image" content={event.seo.ogImage} />
        <meta property="og:type" content="event" />
        <meta property="og:url" content={`https://attendance-x.vercel.app/events/${event.slug}`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event.seo.metaTitle} />
        <meta name="twitter:description" content={event.seo.metaDescription} />
        <meta name="twitter:image" content={event.seo.ogImage} />
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

        {/* Hero Section */}
        <div className="relative w-full h-96">
          <Image
            src={event.coverImage || '/placeholder-event.jpg'}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {event.featured && (
            <Badge className="absolute top-4 right-4 bg-yellow-500 text-lg px-4 py-2">
              ⭐ Featured Event
            </Badge>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Category */}
              <div>
                <Badge className="mb-4">{event.category}</Badge>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {event.title}
                </h1>
                
                {/* Organizer */}
                {organizer && (
                  <Link href={`/organizers/${organizer.slug}`}>
                    <div className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer">
                      <Avatar>
                        <AvatarImage src={organizer.avatar} />
                        <AvatarFallback>{organizer.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Organisé par</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {organizer.name}
                          {organizer.verified && <Badge className="ml-2 text-xs">✓ Vérifié</Badge>}
                        </p>
                        {organizer.stats.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {organizer.stats.rating.toFixed(1)} ({organizer.stats.reviewCount} avis)
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>À propos de cet événement</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {event.description}
                  </p>
                  
                  {event.tags.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {event.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Similar Events */}
              {similarEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Événements similaires</CardTitle>
                    <CardDescription>
                      Vous pourriez aussi aimer ces événements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {similarEvents.map((similarEvent) => (
                        <EventCard key={similarEvent.id} event={similarEvent} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Registration Card */}
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {event.pricing.type === 'free' ? 'Gratuit' : `${event.pricing.amount}€`}
                    </p>
                    {event.pricing.type === 'paid' && event.pricing.earlyBird && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tarif early bird : {event.pricing.earlyBird.amount}€
                      </p>
                    )}
                  </div>

                  <Button className="w-full mb-4" size="lg" onClick={() => router.push('/auth/register')}>
                    S&apos;inscrire à l&apos;événement
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Partager
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>

                  {isAlmostFull && (
                    <Badge variant="destructive" className="w-full mt-4 justify-center">
                      ⚠️ Places limitées !
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Event Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(event.startDate)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(event.startDate)} - {formatTime(event.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {event.location.type === 'online' ? 'En ligne' : event.location.venue}
                      </p>
                      {event.location.type !== 'online' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {event.location.address}<br />
                          {event.location.city}, {event.location.country}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {event.capacity.registered} / {event.capacity.total} participants
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.capacity.available} places disponibles
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        Fuseau horaire
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.timezone}
                      </p>
                    </div>
                  </div>

                  {event.rating.count > 0 && (
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-yellow-400 mt-0.5 fill-yellow-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {event.rating.average.toFixed(1)} / 5
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {event.rating.count} avis
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Organizer Card */}
              {organizer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Organisateur</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/organizers/${organizer.slug}`}>
                      <div className="flex items-center gap-3 mb-4 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors cursor-pointer">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={organizer.avatar} />
                          <AvatarFallback>{organizer.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {organizer.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {organizer.stats.totalEvents} événements
                          </p>
                        </div>
                      </div>
                    </Link>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      {organizer.bio}
                    </p>

                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/organizers/${organizer.slug}`}>
                        Voir le profil
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
