import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Calendar, Users, Star } from 'lucide-react';

interface OrganizationCardProps {
  id: string;
  name: string;
  description: string;
  logo?: string;
  location: string;
  eventsCount: number;
  followersCount: number;
  rating?: number;
  isFeatured?: boolean;
  coverImage?: string;
}

export const OrganizationCard: React.FC<OrganizationCardProps> = ({
  id,
  name,
  description,
  logo,
  location,
  eventsCount,
  followersCount,
  rating,
  isFeatured = false,
  coverImage
}) => {
  return (
    <Link href={`/organizations/${id}`}>
      <div className="group relative flex flex-col border rounded-[20px] bg-white dark:bg-slate-900 p-6 hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 cursor-pointer overflow-hidden h-full">
        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-semibold shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              <span>En vedette</span>
            </div>
          </div>
        )}

        {/* Cover Image or Gradient Background */}
        {coverImage ? (
          <div className="relative w-full h-24 -mx-6 -mt-6 mb-4 overflow-hidden">
            <img 
              src={coverImage} 
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-slate-900" />
          </div>
        ) : (
          <div className="relative w-full h-24 -mx-6 -mt-6 mb-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20" />
        )}

        {/* Logo */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform duration-300">
            {logo ? (
              <img 
                src={logo} 
                alt={name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {name}
            </h3>
            
            {/* Rating */}
            {rating && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Stats */}
        <div className="mt-auto space-y-2">
          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {/* Events and Followers */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{eventsCount}</span>
              <span>événements</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Users className="h-4 w-4" />
              <span className="font-medium">{followersCount}</span>
              <span>abonnés</span>
            </div>
          </div>
        </div>

        {/* Hover Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[20px]" />
      </div>
    </Link>
  );
};
