import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
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
              <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400">Features</a>
              <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400">How it works</a>
              <a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400">Pricing</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="px-3 py-2 rounded-md text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400">Sign in</Link>
              <Link href="/auth/register" className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Get started</Link>
            </div>
          </div>
        </header>

        <main>
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
              <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
            </div>

            <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 lg:pt-24 lg:pb-14">
              <div className="grid lg:grid-cols-2 gap-10 items-center">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
                    Smarter attendance and time tracking for modern teams
                  </h1>
                  <p className="mt-5 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl">
                    Automate attendance, handle shifts, approvals, and payroll-ready timesheets—all in one place. Real-time insights that keep your team in sync.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/auth/register" className="px-5 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
                      Get started — it’s free
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

          <section id="features" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="grid md:grid-cols-3 gap-6">
              <Feature
                title="One-tap attendance"
                desc="Fast check-in/out with device, kiosk, or mobile—GPS and geofencing ready."
              />
              <Feature
                title="Shifts & scheduling"
                desc="Plan rosters, handle swaps, and notify changes instantly."
              />
              <Feature
                title="Approvals & policies"
                desc="Custom workflows for overtime, leave, and exceptions."
              />
              <Feature
                title="Timesheets & payroll"
                desc="Accurate timesheets you can export to payroll in a click."
              />
              <Feature
                title="Analytics & insights"
                desc="Live dashboards for attendance trends and compliance."
              />
              <Feature
                title="Integrations"
                desc="Plug into HRIS, payroll, and chat tools with ease."
              />
            </div>
          </section>

          <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-10 bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
              <div className="grid lg:grid-cols-3 gap-6">
                <Step n={1} title="Create your workspace" desc="Set locations, teams, and policies in minutes." />
                <Step n={2} title="Invite your team" desc="Enable check-in from kiosk, mobile, or web." />
                <Step n={3} title="Track & export" desc="Monitor attendance and export payroll-ready timesheets." />
              </div>
              <div className="mt-8 flex gap-3">
                <Link href="/auth/register" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">Get started</Link>
                <Link href="/auth/login" className="px-4 py-2 rounded-md border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-sm font-medium">Sign in</Link>
              </div>
            </div>
          </section>

          <section id="pricing" className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 md:p-10">
              <h2 className="text-2xl font-semibold">Simple pricing</h2>
              <p className="mt-2 text-neutral-600 dark:text-neutral-300">Start free. Upgrade when you’re ready.</p>
              <div className="mt-6 grid md:grid-cols-3 gap-6">
                <Plan name="Starter" price="$0" note="Up to 10 team members" cta="Start free" highlight />
                <Plan name="Growth" price="$49" note="Up to 50 team members" cta="Choose Growth" />
                <Plan name="Scale" price="Custom" note="Unlimited team members" cta="Contact Sales" />
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6 pb-24">
            <div className="rounded-2xl p-8 md:p-12 bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-semibold">Ready to streamline attendance?</h3>
                <p className="mt-1 text-white/90">Join teams using AttendanceX for reliable, real-time attendance.</p>
              </div>
              <div className="flex gap-3">
                <Link href="/auth/register" className="px-5 py-3 rounded-md bg-white text-blue-700 hover:bg-white/90 text-sm font-medium">Get started</Link>
                <Link href="/auth/login" className="px-5 py-3 rounded-md ring-1 ring-inset ring-white/40 hover:bg-white/10 text-sm font-medium">Sign in</Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-neutral-100 dark:border-neutral-800 py-8">
          <div className="mx-auto max-w-7xl px-6 text-sm text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} AttendanceX</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Privacy</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Terms</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Status</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 bg-white/70 dark:bg-neutral-900/70">
      <div className="h-9 w-9 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 mb-3" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{desc}</p>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-100 dark:border-blue-900 text-sm font-semibold">
        {n}
      </div>
      <div>
        <h4 className="text-base font-semibold">{title}</h4>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{desc}</p>
      </div>
    </div>
  )
}

function Plan({ name, price, note, cta, highlight }: { name: string; price: string; note: string; cta: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-6 border ${highlight ? 'border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20' : 'border-neutral-200 dark:border-neutral-800'}`}>
      <h3 className="text-base font-semibold">{name}</h3>
      <div className="mt-2 text-3xl font-semibold">{price}
        <span className="align-top text-xs font-normal text-neutral-500 ml-1">/mo</span>
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{note}</p>
      <Link href="/auth/register" className={`mt-5 inline-flex px-4 py-2 rounded-md text-sm font-medium ${highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}>{cta}</Link>
    </div>
  )
}


function HeroPreview() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur shadow-xl p-4 md:p-6">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-neutral-700 dark:text-neutral-200">Attendance overview</span>
        <span className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-500">Last 7 days</span>
      </div>
      <div className="mt-3 grid sm:grid-cols-5 gap-3">
        <div className="sm:col-span-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Attendance rate</span>
            <span className="text-green-600">+4.2%</span>
          </div>
          <div className="mt-2 h-36">
            <ChartLine />
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1"><Dot /> Real-time</span>
            <span className="inline-flex items-center gap-1"><Dot /> Multi-site</span>
            <span className="inline-flex items-center gap-1"><Dot /> Payroll-ready</span>
          </div>
        </div>
        <div className="sm:col-span-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-3">
          <div className="text-xs font-medium">Today</div>
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Avatar name="A" /><span>Alex</span></div>
              <StatusChip label="Present" tone="green" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Avatar name="M" /><span>Mila</span></div>
              <StatusChip label="Late" tone="yellow" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Avatar name="J" /><span>Jules</span></div>
              <StatusChip label="Absent" tone="red" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Avatar name="R" /><span>Riya</span></div>
              <StatusChip label="Present" tone="green" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs font-semibold">
      {name}
    </div>
  )
}

function StatusChip({ label, tone }: { label: string; tone: 'green' | 'yellow' | 'red' }) {
  const cls = tone === 'green'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900'
    : tone === 'yellow'
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-900'
    : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-100 dark:border-rose-900'
  return (
    <span className={`px-2 py-[2px] rounded text-[11px] border ${cls}`}>{label}</span>
  )
}

function ChartLine() {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M5 95 L25 85 L45 88 L65 70 L85 76 L105 60 L125 64 L145 50 L165 58 L185 42" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 95 L25 85 L45 88 L65 70 L85 76 L105 60 L125 64 L145 50 L165 58 L185 42 L185 120 L5 120 Z" fill="url(#g)" />
    </svg>
  )
}

function Dot() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-blue-600">
      <circle cx="5" cy="5" r="5" />
    </svg>
  )
}
