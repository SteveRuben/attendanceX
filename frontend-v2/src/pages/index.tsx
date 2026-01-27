/**
 * Page d'accueil - Design Evelya + Shopify Polaris CSS Guidelines
 * Style moderne avec couleurs bleu/slate et patterns Polaris
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
  Activity
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
    },
    {
      icon: Users,
      title: t('features.team.title'),
      description: t('features.team.description'),
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
    },
    {
      icon: Clock,
      title: t('features.timesheet.title'),
      description: t('features.timesheet.description'),
    },
    {
      icon: Shield,
      title: t('features.security.title'),
      description: t('features.security.description'),
    },
    {
      icon: Zap,
      title: t('features.automation.title'),
      description: t('features.automation.description'),
    }
  ];

  const stats = [
    { value: '10K+', label: t('stats.users'), icon: Users },
    { value: '50K+', label: t('stats.events'), icon: Calendar },
    { value: '99.9%', label: t('stats.uptime'), icon: Activity },
    { value: '24/7', label: t('stats.support'), icon: Shield }
  ];

  return (
    <>
      <Head>
        <title>AttendanceX — {t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
      </Head>

      <PublicLayout>
        {/* Hero Section - Polaris Pattern */}
        <section className="relative overflow-hidden py-20 sm:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          {/* Background Decorations */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* Badge - Polaris Pattern */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8 border border-blue-200 dark:border-blue-800 shadow-sm">
                <Sparkles className="h-4 w-4" />
                <span>{t('hero.badge')}</span>
              </div>

              {/* Title - Polaris Display Scale */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <span className="block text-slate-900 dark:text-slate-100 mb-2">{t('hero.title_line1')}</span>
                <span className="block text-blue-600 dark:text-blue-400">
                  {t('hero.title_line2')}
                </span>
              </h1>

              {/* Subtitle - Polaris Body Large */}
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
                {t('hero.subtitle')}
              </p>

              {/* CTA Buttons - Polaris Button Patterns */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Button
                  size="lg"
                  className="h-12 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium shadow-sm transition-colors duration-200"
                  onClick={() => window.location.href = '/auth/register'}
                >
                  {t('hero.cta_primary')}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors duration-200"
                  onClick={() => window.location.href = '/events'}
                >
                  {t('hero.cta_secondary')}
                </Button>
              </div>

              {/* Trust Indicators - Polaris Pattern */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>{t('hero.trust.free_trial')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>{t('hero.trust.no_credit_card')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>{t('hero.trust.cancel_anytime')}</span>
                </div>
              </div>
            </div>

            {/* Hero Preview - Polaris Card Pattern */}
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent h-32 bottom-0 z-10" />
              <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="aspect-video bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-8">
                  {/* Dashboard Preview Mockup - Polaris Layout */}
                  <div className="w-full max-w-4xl space-y-6">
                    {/* Stat Cards - Polaris Card Pattern */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { icon: Users, value: '2,543', label: 'Users' },
                        { icon: Calendar, value: '1,234', label: 'Events' },
                        { icon: TrendingUp, value: '+23%', label: 'Growth' }
                      ].map((stat, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                              <stat.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</span>
                          </div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Chart Placeholder - Polaris Pattern */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                      <div className="space-y-3">
                        {[60, 80, 45, 90, 70].map((width, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <div 
                              className="h-2 bg-blue-600 dark:bg-blue-500 rounded transition-all duration-300" 
                              style={{ width: `${width}%` }} 
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

        {/* Stats Section - Polaris Pattern */}
        <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="inline-flex p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 mb-3 shadow-sm">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section - Polaris Card Pattern */}
        <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                {t('features.title')}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="group relative p-6 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div className="inline-flex p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 mb-4 shadow-sm">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section - Polaris Pattern */}
        <section className="py-20 sm:py-32 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                {t('pricing.title')}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
                {t('pricing.subtitle')}
              </p>

              {/* Billing Toggle - Polaris Segmented Control */}
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg shadow-sm">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    billingCycle === 'monthly'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {t('pricing.monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    billingCycle === 'yearly'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {t('pricing.yearly')}
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {t('pricing.save_20')}
                  </span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Chargement des plans...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {plans.map((plan, index) => {
                  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                  const isPopular = plan.name === 'Professional';

                  return (
                    <div
                      key={plan.id}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                        isPopular
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium shadow-sm">
                            {t('pricing.most_popular')}
                          </div>
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{plan.name}</h3>
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">${price}</span>
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-2">
                            /{billingCycle === 'monthly' ? t('pricing.month') : t('pricing.year')}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0 mt-0.5">
                              <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full h-12 rounded-lg font-medium transition-all duration-200 ${
                          isPopular
                            ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100'
                        }`}
                        onClick={() => window.location.href = '/auth/register'}
                      >
                        {t('pricing.get_started')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section - Polaris Pattern */}
        <section className="py-20 sm:py-32 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative p-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-grid-white/10" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  {t('cta.title')}
                </h2>
                <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
                  {t('cta.subtitle')}
                </p>
                <Button
                  size="lg"
                  className="h-12 px-8 bg-white text-blue-600 hover:bg-blue-50 active:bg-blue-100 shadow-xl rounded-lg font-medium transition-colors duration-200"
                  onClick={() => window.location.href = '/auth/register'}
                >
                  {t('cta.button')}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
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
