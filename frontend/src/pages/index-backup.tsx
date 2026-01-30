import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { plansService, Plan } from '@/services/plansService'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { t } = useTranslation('home')
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
        setError(t('pricing.error'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [t])

  return (
    <>
      <Head>
        <title>AttendanceX — Modern Attendance & Time Tracking</title>
        <meta name="description" content="Smarter attendance, time tracking, and workforce insights for modern teams." />
      </Head>

      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white">
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 dark:bg-neutral-950/70 border-b border-neutral-100 dark:border-neutral-800">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
              <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400">{t('footer.features')}</a>
              <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400">How it works</a>
              <Link href="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400">{t('footer.pricing')}</Link>
            </nav>
            <div className="flex items-center gap-3">
              <LanguageSelector variant="compact" />
              <Link href="/auth/login" className="px-3 py-2 rounded-md text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400">Sign in</Link>
              <Link href="/auth/register" className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Get started</Link>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
              <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
            </div>

            <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 lg:pt-24 lg:pb-14">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
                    {t('hero.title')}
                  </h1>
                  <p className="mt-5 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl">
                    {t('hero.description')}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/auth/register" className="px-5 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
                      {t('hero.cta_primary')}
                    </Link>
                    <Link href="/auth/login" className="px-5 py-3 rounded-md border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-sm font-medium">
                      I already have an account
                    </Link>
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">No credit card required</p>
                </div>

                <div className="relative">
                  <HeroPreview />
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold">{t('features.title')}</h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-300">{t('features.subtitle')}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Feature
                title={t('features.realtime_tracking.title')}
                desc={t('features.realtime_tracking.description')}
              />
              <Feature
                title={t('features.shifts_scheduling.title')}
                desc={t('features.shifts_scheduling.description')}
              />
              <Feature
                title={t('features.approvals_workflow.title')}
                desc={t('features.approvals_workflow.description')}
              />
              <Feature
                title={t('features.payroll_export.title')}
                desc={t('features.payroll_export.description')}
              />
              <Feature
                title={t('features.analytics_insights.title')}
                desc={t('features.analytics_insights.description')}
              />
              <Feature
                title={t('features.integrations.title')}
                desc={t('features.integrations.description')}
              />
            </div>
          </section>

          {/* How it Works Section */}
          <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold">{t('how_it_works.title')}</h2>
            </div>
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-10 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
              <div className="grid lg:grid-cols-4 gap-6">
                <Step n={1} title={t('how_it_works.step1.title')} desc={t('how_it_works.step1.description')} />
                <Step n={2} title={t('how_it_works.step2.title')} desc={t('how_it_works.step2.description')} />
                <Step n={3} title={t('how_it_works.step3.title')} desc={t('how_it_works.step3.description')} />
                <Step n={4} title={t('how_it_works.step4.title')} desc={t('how_it_works.step4.description')} />
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="pricing" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-semibold">{t('pricing.title')}</h2>
                <p className="mt-2 text-neutral-600 dark:text-neutral-300">{t('pricing.subtitle')}</p>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-800 p-1">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      billingCycle === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {t('pricing.monthly')}
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      billingCycle === 'yearly'
                        ? 'bg-blue-600 text-white'
                        : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {t('pricing.yearly')} <span className="text-xs ml-1">{t('pricing.save', { percent: 20 })}</span>
                  </button>
                </div>
              </div>

              {/* Plans */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-neutral-600 dark:text-neutral-300">{t('pricing.loading')}</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
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
            </div>
          </section>

          {/* CTA Section */}
          <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl font-semibold">{t('cta.title')}</h2>
              <p className="mt-3 text-blue-100 max-w-2xl mx-auto">{t('cta.description')}</p>
              <Link
                href="/auth/register"
                className="mt-6 inline-block px-6 py-3 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 transition-colors"
              >
                {t('cta.button')}
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-16">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
                  <span className="text-lg font-semibold">AttendanceX</span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t('hero.description')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-3">{t('footer.product')}</h3>
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <li><a href="#features" className="hover:text-blue-600">{t('footer.features')}</a></li>
                  <li><a href="#pricing" className="hover:text-blue-600">{t('footer.pricing')}</a></li>
                  <li><a href="#" className="hover:text-blue-600">{t('footer.integrations')}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">{t('footer.company')}</h3>
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <li><a href="#" className="hover:text-blue-600">{t('footer.about')}</a></li>
                  <li><a href="#" className="hover:text-blue-600">{t('footer.blog')}</a></li>
                  <li><a href="#" className="hover:text-blue-600">{t('footer.careers')}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">{t('footer.legal')}</h3>
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <li><Link href="/privacy" className="hover:text-blue-600">{t('footer.privacy')}</Link></li>
                  <li><Link href="/terms" className="hover:text-blue-600">{t('footer.terms')}</Link></li>
                  <li><a href="#" className="hover:text-blue-600">{t('footer.security')}</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center text-sm text-neutral-600 dark:text-neutral-400">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

function HeroPreview() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
        <div className="h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded" />
          <div className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded" />
        </div>
      </div>
    </div>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold mb-3">
        {n}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
    </div>
  )
}

function PlanCard({ plan, billingCycle, t }: { plan: Plan; billingCycle: 'monthly' | 'yearly'; t: any }) {
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly
  const priceLabel = price === 0 ? t('pricing.start_free') : `€${price}`
  const period = billingCycle === 'monthly' ? t('pricing.per_month') : t('pricing.per_year')

  return (
    <div className={`rounded-xl p-6 border ${
      plan.popular
        ? 'border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20'
        : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      {plan.popular && (
        <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-full mb-3">
          Popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <div className="mt-3 flex items-baseline">
        <span className="text-3xl font-semibold">{priceLabel}</span>
        {price > 0 && <span className="text-sm text-neutral-500 ml-1">{period}</span>}
      </div>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{plan.description}</p>
      
      {plan.limits.users && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {t('pricing.up_to')} {plan.limits.users === 999999 ? t('pricing.unlimited') : plan.limits.users} {t('pricing.team_members')}
        </p>
      )}

      <Link
        href="/auth/register"
        className={`mt-6 block w-full text-center px-4 py-2 rounded-md font-medium transition-colors ${
          plan.popular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600'
        }`}
      >
        {price === 0 ? t('pricing.start_free') : t('pricing.choose_plan', { plan: plan.name })}
      </Link>

      <ul className="mt-6 space-y-2">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start text-sm">
            <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-neutral-600 dark:text-neutral-400">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'home'])),
    },
  }
}
