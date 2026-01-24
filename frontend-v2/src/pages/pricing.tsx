import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { plansService, Plan } from '@/services/plansService'
import { Loader2, Check, X } from 'lucide-react'

export default function PricingPage() {
  const { t } = useTranslation('pricing')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        const response = await plansService.getPublicPlans()
        setPlans(response.plans)
        setError(null)
      } catch (err) {
        console.error('Error loading plans:', err)
        setError(t('plans.error'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [t])

  return (
    <>
      <Head>
        <title>{t('page_title')}</title>
        <meta name="description" content={t('page_description')} />
      </Head>

      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 dark:bg-neutral-950/70 border-b border-neutral-100 dark:border-neutral-800">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
              <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSelector variant="compact" />
              <Link href="/auth/login" className="px-3 py-2 rounded-md text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400">
                Sign in
              </Link>
              <Link href="/auth/register" className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
                Get started
              </Link>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative overflow-hidden py-16 md:py-24">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
              <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
            </div>

            <div className="mx-auto max-w-7xl px-6 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                {t('hero.title')}
              </h1>
              <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
                {t('hero.subtitle')}
              </p>

              {/* Billing Cycle Toggle */}
              <div className="mt-8 flex justify-center">
                <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-800 p-1 bg-neutral-50 dark:bg-neutral-900">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {t('hero.monthly')}
                    <div className="text-xs text-neutral-500 mt-0.5">{t('hero.billed_monthly')}</div>
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-3 rounded-md text-sm font-medium transition-all ${
                      billingCycle === 'yearly'
                        ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {t('hero.yearly')}
                    <div className="text-xs">
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        {t('hero.save', { percent: 20 })}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Plans Section */}
          <section className="mx-auto max-w-7xl px-6 pb-16">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <span className="ml-3 text-lg text-neutral-600 dark:text-neutral-300">{t('plans.loading')}</span>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-lg text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    billingCycle={billingCycle}
                    t={t}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Features Included */}
          <section className="mx-auto max-w-7xl px-6 py-16 border-t border-neutral-200 dark:border-neutral-800">
            <h2 className="text-3xl font-bold text-center mb-12">{t('features.title')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-neutral-700 dark:text-neutral-300">{t(`features.feature_${i}`)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-3xl font-bold text-center mb-12">{t('faq.title')}</h2>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">{t(`faq.q${i}.question`)}</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">{t(`faq.q${i}.answer`)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-12 text-center text-white">
              <h2 className="text-3xl font-bold">{t('cta.title')}</h2>
              <p className="mt-3 text-blue-100 text-lg">{t('cta.subtitle')}</p>
              <Link
                href="/auth/register"
                className="mt-6 inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-lg"
              >
                {t('cta.button')}
              </Link>
              <p className="mt-3 text-sm text-blue-100">{t('cta.no_credit_card')}</p>
            </div>
          </section>

          {/* Trust Section */}
          <section className="mx-auto max-w-7xl px-6 py-16 border-t border-neutral-200 dark:border-neutral-800">
            <h2 className="text-2xl font-bold text-center mb-8">{t('trust.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-blue-600">500+</div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-2">Companies</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600">10,000+</div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-2">Active users</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600">50+</div>
                <div className="text-neutral-600 dark:text-neutral-400 mt-2">Countries</div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-16">
          <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
            <p>© {new Date().getFullYear()} AttendanceX. All rights reserved.</p>
            <div className="mt-4 flex justify-center gap-6">
              <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
              <Link href="/terms" className="hover:text-blue-600">Terms</Link>
              <Link href="/" className="hover:text-blue-600">Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

function PlanCard({ plan, billingCycle, t }: { plan: Plan; billingCycle: 'monthly' | 'yearly'; t: any }) {
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly
  const period = billingCycle === 'monthly' ? t('plans.per_month') : t('plans.per_year')
  const isPopular = plan.popular

  return (
    <div className={`relative rounded-2xl border-2 p-8 ${
      isPopular
        ? 'border-blue-600 shadow-xl scale-105'
        : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-block px-4 py-1 text-sm font-semibold bg-blue-600 text-white rounded-full">
            {t('plans.popular')}
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-2xl font-bold">{plan.name}</h3>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{plan.description}</p>

        <div className="mt-6">
          {price === 0 ? (
            <div className="text-4xl font-bold">{t('plans.start_free')}</div>
          ) : (
            <>
              <div className="text-5xl font-bold">
                €{price}
              </div>
              <div className="text-neutral-600 dark:text-neutral-400 mt-1">{period}</div>
            </>
          )}
        </div>

        {plan.limits.users && (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            {t('plans.up_to')} {plan.limits.users === 999999 ? t('plans.unlimited') : plan.limits.users} {t('plans.team_members')}
          </p>
        )}

        <Link
          href="/auth/register"
          className={`mt-6 block w-full py-3 rounded-lg font-semibold transition-colors ${
            isPopular
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border-2 border-neutral-300 dark:border-neutral-700 hover:border-blue-600 dark:hover:border-blue-600'
          }`}
        >
          {price === 0 ? t('plans.start_free') : t('plans.get_started')}
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'pricing'])),
    },
  }
}
