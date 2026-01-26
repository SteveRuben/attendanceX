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
  Star,
  Sparkles
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
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Users,
      title: t('features.team.title'),
      description: t('features.team.description'),
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: Clock,
      title: t('features.timesheet.title'),
      description: t('features.timesheet.description'),
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Shield,
      title: t('features.security.title'),
      description: t('features.security.description'),
      gradient: 'from-indigo-500 to-blue-500'
    },
    {
      icon: Zap,
      title: t('features.automation.title'),
      description: t('features.automation.description'),
      gradient: 'from-yellow-500 to-orange-500'
    }
  ];

  const stats = [
    { value: '10K+', label: t('stats.users') },
    { value: '50K+', label: t('stats.events') },
    { value: '99.9%', label: t('stats.uptime') },
    { value: '24/7', label: t('stats.support') }
  ];

  return (
    <>
      <Head>
        <title>AttendanceX — {t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
      </Head>

      <PublicLayout>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          {/* Background Gradients */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-8">
                <Sparkles className="h-4 w-4" />
                <span>{t('hero.badge')}</span>
              </div>

              {/* Title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="block">{t('hero.title_line1')}</span>
                <span className="block bg-gradient-to-r from-green-600 via-emerald-600 to-orange-600 bg-clip-text text-transparent">
                  {t('hero.title_line2')}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-10">
                {t('hero.subtitle')}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 text-white shadow-xl shadow-green-500/30 px-8"
                  onClick={() => window.location.href = '/auth/register'}
                >
                  {t('hero.cta_primary')}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2"
                  onClick={() => window.location.href = '/events'}
                >
                  {t('hero.cta_secondary')}
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center space-x-6 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-1">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{t('hero.trust.free_trial')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{t('hero.trust.no_credit_card')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{t('hero.trust.cancel_anytime')}</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Preview */}
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent h-32 bottom-0 z-10" />
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="aspect-video bg-gradient-to-br from-green-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="h-24 w-24 text-green-600 dark:text-green-400 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">{t('hero.preview_placeholder')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 to-orange-600 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                {t('features.title')}
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="group relative p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
                  >
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 sm:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                {t('pricing.title')}
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
                {t('pricing.subtitle')}
              </p>

              {/* Billing Toggle */}
              <div className="inline-flex items-center space-x-3 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('pricing.monthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('pricing.yearly')}
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                    {t('pricing.save_20')}
                  </span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {plans.map((plan, index) => {
                  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                  const isPopular = plan.name === 'Professional';

                  return (
                    <div
                      key={plan.id}
                      className={`relative p-8 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1 ${
                        isPopular
                          ? 'border-blue-500 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 shadow-xl'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <div className="px-4 py-1 rounded-full bg-gradient-to-r from-green-600 to-orange-600 text-white text-sm font-medium">
                            {t('pricing.most_popular')}
                          </div>
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-bold">${price}</span>
                          <span className="text-slate-600 dark:text-slate-400 ml-2">
                            /{billingCycle === 'monthly' ? t('pricing.month') : t('pricing.year')}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start space-x-3">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full ${
                          isPopular
                            ? 'bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 text-white shadow-lg'
                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
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

        {/* CTA Section */}
        <section className="py-20 sm:py-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative p-12 rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-orange-600 overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/10" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  {t('cta.title')}
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                  {t('cta.subtitle')}
                </p>
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl px-8"
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
