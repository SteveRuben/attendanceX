/**
 * Page de détail d'un événement public
 * Accessible sans authentification
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Calendar, MapPin, Users, Star, Share2, Bookmark, 
  Clock, Euro, Globe, Loader2, ArrowLeft, ExternalLink,
  Minus, Plus
} from 'lucide-react';
import { publicEventsService, PublicEvent, PublicOrganizer } from '@/services/publicEventsService';
import { EventCard } from '@/components/events/EventCard';
import { Timeline } from '@/components/events/Timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PublicLayout } from '@/components/layout/PublicLayout';

// Lazy load InteractiveMap for performance
const InteractiveMap = dynamic(
  () => import('@/components/location/InteractiveMap').then(mod => mod.InteractiveMap),
  { 
    loading: () => (
      <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    ),
    ssr: false 
  }
);

export default function EventDetailPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [organizer, setOrganizer] = useState<PublicOrganizer | null>(null);
  const [similarEvents, setSimilarEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);

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

  const handleQuantityChange = (delta: number) => {
    const newQuantity = ticketQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= Math.min(10, event?.capacity.available || 1)) {
      setTicketQuantity(newQuantity);
    }
  };

  // Mock program data - in real app, this would come from event.program
  const mockProgram = event ? [
    {
      time: '09:00',
      title: 'Registration & Welcome Coffee',
      description: 'Check-in and networking with other attendees'
    },
    {
      time: '10:00',
      title: 'Opening Keynote',
      description: 'Introduction to the event and key themes',
      speaker: 'John Doe, CEO'
    },
    {
      time: '11:30',
      title: 'Workshop Session',
      description: 'Hands-on activities and group discussions'
    },
    {
      time: '13:00',
      title: 'Lunch Break',
      description: 'Networking lunch with catering'
    },
    {
      time: '14:30',
      title: 'Panel Discussion',
      description: 'Expert panel on industry trends',
      speaker: 'Various industry leaders'
    },
    {
      time: '16:00',
      title: 'Closing Remarks',
      description: 'Summary and next steps'
    }
  ] : [];

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Chargement de l'événement...</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !event) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center py-20">
          <Card className="max-w-md border-2 border-slate-200 dark:border-slate-700 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-red-100 dark:bg-red-900/30 mb-6">
                <Calendar className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Événement introuvable</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Cet événement n&apos;existe pas ou n&apos;est plus disponible.
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

      <PublicLayout>
        {/* Hero Section with Cover Image */}
        <div className="relative w-full h-[500px] -mt-16">
          <Image
            src={event.coverImage || '/placeholder-event.jpg'}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Back Button */}
          <div className="absolute top-20 left-4 sm:left-8 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
              <div className="max-w-4xl">
                {event.featured && (
                  <Badge className="mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm px-4 py-1.5 border-0">
                    ⭐ Featured Event
                  </Badge>
                )}
                <Badge className="mb-4 bg-white/20 backdrop-blur-sm text-white border-white/30">
                  {event.category}
                </Badge>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
                  {event.title}
                </h1>
                
                {/* Organizer in Hero */}
                {organizer && (
                  <Link href={`/organizers/${organizer.slug}`}>
                    <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md hover:bg-white/20 p-3 rounded-xl transition-all duration-200 cursor-pointer border border-white/20">
                      <Avatar className="h-10 w-10 border-2 border-white/50">
                        <AvatarImage src={organizer.avatar} />
                        <AvatarFallback>{organizer.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-white/80">Organisé par</p>
                        <p className="font-semibold text-white flex items-center gap-1">
                          {organizer.name}
                          {organizer.verified && (
                            <Badge className="ml-1 text-xs bg-green-500 border-0 px-1.5 py-0">✓</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description Card */}
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    À propos de cet événement
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {event.description}
                  </p>
                  
                  {event.tags.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-2">
                      {event.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-sm px-3 py-1">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location & Map Card */}
              {event.location.type !== 'online' && (
                <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      Lieu de l&apos;événement
                    </CardTitle>
                    <CardDescription className="text-base">
                      {event.location.venue}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <p>{event.location.address}</p>
                      <p>{event.location.city}, {event.location.country}</p>
                    </div>
                    
                    {/* Interactive Map */}
                    <div className="rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                      <InteractiveMap
                        events={[event]}
                        center={{
                          latitude: event.location.coordinates?.latitude || 0,
                          longitude: event.location.coordinates?.longitude || 0
                        }}
                        zoom={15}
                        className="h-64"
                      />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-2"
                      onClick={() => {
                        const { latitude, longitude } = event.location.coordinates || {};
                        if (latitude && longitude) {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Obtenir l&apos;itinéraire
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Program/Agenda Card */}
              {mockProgram.length > 0 && (
                <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      Programme de l&apos;événement
                    </CardTitle>
                    <CardDescription className="text-base">
                      Déroulement de la journée
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Timeline items={mockProgram} />
                  </CardContent>
                </Card>
              )}

              {/* Similar Events */}
              {similarEvents.length > 0 && (
                <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl">Événements similaires</CardTitle>
                    <CardDescription className="text-base">
                      Vous pourriez aussi aimer ces événements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Card className="sticky top-24 border-2 border-blue-200 dark:border-blue-800 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/20">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
                      <Euro className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {event.pricing.type === 'free' ? 'Gratuit' : `${event.pricing.amount}€`}
                    </p>
                    {event.pricing.type === 'paid' && event.pricing.earlyBird && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Tarif early bird : {event.pricing.earlyBird.amount}€
                      </p>
                    )}
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      Nombre de billets
                    </label>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={ticketQuantity <= 1}
                        className="h-10 w-10 p-0 border-2"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 w-12 text-center">
                        {ticketQuantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(1)}
                        disabled={ticketQuantity >= Math.min(10, event.capacity.available)}
                        className="h-10 w-10 p-0 border-2"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-2">
                      Maximum {Math.min(10, event.capacity.available)} billets par commande
                    </p>
                  </div>

                  {/* Total Price */}
                  {event.pricing.type === 'paid' && (
                    <div className="mb-6 p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Total
                        </span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {(event.pricing.amount * ticketQuantity).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full mb-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 h-12 text-lg" 
                    size="lg" 
                    onClick={() => router.push('/auth/register')}
                  >
                    S&apos;inscrire à l&apos;événement
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 border-2" onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Partager
                    </Button>
                    <Button variant="outline" className="flex-1 border-2">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>

                  {isAlmostFull && (
                    <div className="mt-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 text-center">
                        ⚠️ Places limitées ! Seulement {event.capacity.available} places restantes
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Info */}
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Organisateur</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/organizers/${organizer.slug}`}>
                      <div className="flex items-center gap-4 mb-4 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-green-500">
                        <Avatar className="h-16 w-16 border-2 border-slate-200 dark:border-slate-700">
                          <AvatarImage src={organizer.avatar} />
                          <AvatarFallback className="text-xl">{organizer.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            {organizer.name}
                            {organizer.verified && (
                              <Badge className="bg-green-600 text-xs">✓</Badge>
                            )}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {organizer.stats.totalEvents} événements
                          </p>
                          {organizer.stats.rating > 0 && (
                            <div className="flex items-center gap-1 text-sm mt-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{organizer.stats.rating.toFixed(1)}</span>
                              <span className="text-slate-500">({organizer.stats.reviewCount})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                      {organizer.bio}
                    </p>

                    <Button variant="outline" className="w-full border-2" asChild>
                      <Link href={`/organizers/${organizer.slug}`}>
                        Voir le profil complet
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}
