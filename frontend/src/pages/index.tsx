/**
 * Page d'accueil - Design Solstice Inspired
 * Style moderne et coloré avec animations fluides
 */

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { plansService, Plan } from '@/services/plansService';
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Clock, 
  Shield, 
  Zap,
  Check,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Activity,
  Star,
  Globe,
  Rocket,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { t } = useTranslation('home');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await plansService.getPublicPlans();
        setPlans(response.plans);
      } catch (err) {
        console.error('Error loading plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const features = [
    {
      icon: Calendar,
      title: t('features.attendance.title'),
      description: t('features.attendance.description'),
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Users,
      title: t('features.team.title'),
      description: t('features.team.description'),
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: Clock,
      title: t('features.timesheet.title'),
      description: t('features.timesheet.description'),
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50',
      iconColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      icon: Shield,
      title: t('features.security.title'),
      description: t('features.security.description'),
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      icon: Zap,
      title: t('features.automation.title'),
      description: t('features.automation.description'),
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/50 dark:to-orange-950/50',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    }
  ];

  const stats = [
    { value: '10K+', label: t('stats.users'), icon: Users, gradient: 'from-blue-500 to-cyan-500' },
    { value: '50K+', label: t('stats.events'), icon: Calendar, gradient: 'from-purple-500 to-pink-500' },
    { value: '99.9%', label: t('stats.uptime'), icon: Activity, gradient: 'from-emerald-500 to-teal-500' },
    { value: '24/7', label: t('stats.support'), icon: Shield, gradient: 'from-orange-500 to-amber-500' }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Event Manager',
      company: 'TechConf',
      avatar: '👩‍💼',
      rating: 5,
      text: 'AttendanceX a transformé notre façon de gérer les événements. Interface intuitive et fonctionnalités puissantes.'
    },
    {
      name: 'Michael Chen',
      role: 'HR Director',
      company: 'StartupHub',
      avatar: '👨‍💼',
      rating: 5,
      text: 'La meilleure solution de gestion de présence que nous ayons utilisée. Support client exceptionnel.'
    },
    {
      name: 'Emma Williams',
      role: 'Operations Lead',
      company: 'GlobalEvents',
      avatar: '👩‍💻',
      rating: 5,
      text: 'Automatisation intelligente et analytics détaillés. Un gain de temps considérable pour notre équipe.'
    }
  ];

  return (
    <>
      <Head>
        <title>AttendanceX — {t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
      </Head>

      <PublicLayout>
        {/* Hero Section - Solstice Inspired */}
        <section className="relative overflow-hidden py-20 sm:py-32 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-2000" />
          </div>

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* Animated Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 text-sm font-medium mb-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent font-semibold">
                  {t('hero.badge')}
                </span>
              </div>

              {/* Hero Title with Gradient */}
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="block text-slate-900 dark:text-slate-100 mb-2 animate-fade-in">
                  {t('hero.title_line1')}
                </span>
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent animate-fade-in delay-100">
                  {t('hero.title_line2')}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in delay-200">
                {t('hero.subtitle')}
              </p>

              {/* CTA Buttons with Gradient */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in delay-300">
                <Button
                  size="lg"
                  className="group h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  onClick={() => window.location.href = '/auth/register'}
                >
                  {t('hero.cta_primary')}
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 border-2 border-slate-300 dark:border-slate-700 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:border-blue-500 dark:hover:border-blue-500"
                  onClick={() => window.location.href = '/events'}
                >
                  {t('hero.cta_secondary')}
                </Button>
              </div>

              {/* Trust Indicators with Icons */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400 animate-fade-in delay-400">
                {[
                  { icon: Check, text: t('hero.trust.free_trial') },
                  { icon: Shield, text: t('hero.trust.no_credit_card') },
                  { icon: Zap, text: t('hero.trust.cancel_anytime') }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
                      <item.icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Preview - Modern Dashboard Mockup */}
            <div className="mt-20 relative animate-fade-in delay-500">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent h-32 bottom-0 z-10" />
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl opacity-20 blur-xl animate-float" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl opacity-20 blur-xl animate-float delay-1000" />
              
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
                <div className="aspect-video bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50/30 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
                  {/* Dashboard Preview */}
                  <div className="w-full max-w-5xl space-y-6">
                    {/* Stat Cards with Gradients */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { icon: Users, value: '2,543', label: 'Users', gradient: 'from-blue-500 to-cyan-500' },
                        { icon: Calendar, value: '1,234', label: 'Events', gradient: 'from-purple-500 to-pink-500' },
                        { icon: TrendingUp, value: '+23%', label: 'Growth', gradient: 'from-emerald-500 to-teal-500' }
                      ].map((stat, idx) => (
                        <div key={idx} className="group bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              <stat.icon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</span>
                          </div>
                          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Chart with Gradient Bars */}
                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center justify-between mb-6">
                        <div className="h-5 w-40 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg" />
                        <div className="h-5 w-24 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg" />
                      </div>
                      <div className="space-y-4">
                        {[
                          { width: 60, gradient: 'from-blue-500 to-cyan-500' },
                          { width: 80, gradient: 'from-purple-500 to-pink-500' },
                          { width: 45, gradient: 'from-emerald-500 to-teal-500' },
                          { width: 90, gradient: 'from-orange-500 to-amber-500' },
                          { width: 70, gradient: 'from-red-500 to-rose-500' }
                        ].map((bar, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div 
                              className={`h-3 bg-gradient-to-r ${bar.gradient} rounded-full shadow-lg transition-all duration-500 hover:scale-105`}
                              style={{ width: `${bar.width}%` }} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section - Colorful Gradient Cards */}
        <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="group text-center">
                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section - Colorful Cards with Gradients */}
        <section className="py-20 sm:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 text-sm font-semibold mb-6">
                <Rocket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Fonctionnalités Puissantes
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  {t('features.title')}
                </span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="group relative p-8 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
                  >
                    {/* Gradient Background on Hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    {/* Icon with Gradient Background */}
                    <div className={`relative inline-flex p-4 rounded-2xl ${feature.bgColor} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-8 w-8 ${feature.iconColor}`} />
                    </div>
                    
                    <h3 className="relative text-xl font-bold mb-3 text-slate-900 dark:text-slate-100 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}>
                      {feature.title}
                    </h3>
                    
                    <p className="relative text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Decorative Corner Element */}
                    <div className={`absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br ${feature.color} rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-300`} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Section - New */}
        <section className="py-20 sm:py-32 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/50 text-sm font-semibold mb-6">
                <Star className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                  Témoignages Clients
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Ce que disent nos clients
                </span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Rejoignez des milliers d'organisations qui font confiance à AttendanceX
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="group relative p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800/50 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  {/* Rating Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Testimonial Text */}
                  <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed italic">
                    "{testimonial.text}"
                  </p>

                  {/* Author Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl shadow-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {testimonial.role} • {testimonial.company}
                      </div>
                    </div>
                  </div>

                  {/* Decorative Quote Mark */}
                  <div className="absolute top-6 right-6 text-6xl text-slate-200 dark:text-slate-700 opacity-50 font-serif">
                    "
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section - Modern Gradient Cards */}
        <section className="py-20 sm:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-200/50 dark:border-purple-800/50 text-sm font-semibold mb-6">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Tarifs Transparents
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  {t('pricing.title')}
                </span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
                {t('pricing.subtitle')}
              </p>

              {/* Billing Toggle - Enhanced */}
              <div className="inline-flex items-center gap-1 p-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    billingCycle === 'monthly'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {t('pricing.monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-300 relative ${
                    billingCycle === 'yearly'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {t('pricing.yearly')}
                  <span className="absolute -top-2 -right-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg animate-pulse">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-purple-600 border-b-transparent border-l-transparent animate-spin" />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Chargement des plans...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan, index) => {
                  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                  const isPopular = plan.name === 'Professional';
                  const gradients = [
                    'from-blue-500 to-cyan-500',
                    'from-purple-500 to-pink-500',
                    'from-emerald-500 to-teal-500'
                  ];

                  return (
                    <div
                      key={plan.id}
                      className={`relative p-8 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-2 ${
                        isPopular
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 shadow-2xl scale-105'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg">
                            ⭐ {t('pricing.most_popular')}
                          </div>
                        </div>
                      )}

                      {/* Plan Icon */}
                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradients[index]} mb-6 shadow-lg`}>
                        <Target className="h-6 w-6 text-white" />
                      </div>

                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{plan.name}</h3>
                        <div className="flex items-baseline">
                          <span className="text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                            ${price}
                          </span>
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 ml-2">
                            /{billingCycle === 'monthly' ? t('pricing.month') : t('pricing.year')}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br ${gradients[index]} flex-shrink-0 mt-0.5 shadow-sm`}>
                              <Check className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
                          isPopular
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                            : 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-900 dark:text-slate-100'
                        }`}
                        onClick={() => window.location.href = '/auth/register'}
                      >
                        {t('pricing.get_started')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section - Modern Gradient with Pattern */}
        <section className="py-20 sm:py-32 bg-white dark:bg-slate-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative p-12 sm:p-16 rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden shadow-2xl">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
              
              {/* Floating Orbs */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float delay-1000" />
              
              <div className="relative z-10 text-center">
                {/* Icon */}
                <div className="inline-flex p-4 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 shadow-xl">
                  <Rocket className="h-10 w-10 text-white" />
                </div>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                  {t('cta.title')}
                </h2>
                
                <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                  {t('cta.subtitle')}
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    className="group h-14 px-10 bg-white text-purple-600 hover:bg-blue-50 shadow-2xl rounded-xl font-bold transition-all duration-300 hover:scale-105"
                    onClick={() => window.location.href = '/auth/register'}
                  >
                    {t('cta.button')}
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-10 border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-xl font-bold transition-all duration-300 hover:scale-105"
                    onClick={() => window.location.href = '/events'}
                  >
                    <Globe className="h-5 w-5 mr-2" />
                    Découvrir les événements
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/80 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Essai gratuit 14 jours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Données sécurisées</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <span className="font-medium">Configuration en 5 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PublicLayout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'home'])),
    },
  };
};
