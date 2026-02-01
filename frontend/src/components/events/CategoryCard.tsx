import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  name: string;
  icon: LucideIcon;
  count: number;
  href: string;
  image: string;
  color?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  icon: Icon,
  count,
  href,
  image,
  color = 'blue'
}) => {
  return (
    <Link href={href}>
      <div className="flex flex-col border rounded-[20px] bg-background p-[1.25rem] w-[14rem] hover:shadow-lg transition-all duration-200 cursor-pointer group">
        {/* Image */}
        <div className="relative w-full h-32 mb-4 rounded-xl overflow-hidden">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Icon Overlay */}
          <div className={`absolute bottom-2 left-2 p-2 rounded-lg bg-${color}-600/90 backdrop-blur-sm`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {count} événements
          </p>
        </div>
      </div>
    </Link>
  );
};
