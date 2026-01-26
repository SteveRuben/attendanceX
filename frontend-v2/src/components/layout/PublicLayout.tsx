import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Globe, 
  Menu, 
  X,
  ChevronRight 
} from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
  showHero?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  showHero = false,
  heroTitle,
  heroSubtitle,
  heroImage
}) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: t('nav.events'), href: '/events', icon: Calendar },
    { name: t('nav.pricing'), href: '/pricing', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-orange-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-orange-600 bg-clip-text text-transparent">
                AttendanceX
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/auth/login')}
                className="text-slate-600 dark:text-slate-300"
              >
                {t('auth.login')}
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/auth/register')}
                className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 text-white shadow-lg shadow-green-500/30"
              >
                {t('auth.getStarted')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <div className="pt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    router.push('/auth/login');
                    setMobileMenuOpen(false);
                  }}
                >
                  {t('auth.login')}
                </Button>
                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 text-white"
                  onClick={() => {
                    router.push('/auth/register');
                    setMobileMenuOpen(false);
                  }}
                >
                  {t('auth.getStarted')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section (optional) */}
      {showHero && (
        <div className="pt-16 pb-20 sm:pt-24 sm:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="block bg-gradient-to-r from-green-600 via-emerald-600 to-orange-600 bg-clip-text text-transparent">
                  {heroTitle || t('hero.title')}
                </span>
              </h1>
              {heroSubtitle && (
                <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
                  {heroSubtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={showHero ? '' : 'pt-16'}>
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-orange-600 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-orange-600 bg-clip-text text-transparent">
                  AttendanceX
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                {t('footer.description')}
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                {t('footer.product')}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/events" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t('nav.events')}
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t('nav.pricing')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                {t('footer.legal')}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t('footer.terms')}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t('footer.privacy')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-center text-slate-600 dark:text-slate-400">
              © {new Date().getFullYear()} AttendanceX. {t('footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
