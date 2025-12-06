import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Home, Clock, Users, Shield, ChevronDown, ChevronRight, Building2, Calendar, BarChart3, TrendingUp, Mail, Settings, Bell, Plug, User as UserIcon, FileText, QrCode } from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  href?: string
  icon?: any
  badge?: string | number
  comingSoon?: boolean
  children?: NavItem[]
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/app', icon: Home },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Clock,
    children: [
      { id: 'attendance-overview', label: 'Overview', href: '/app/attendance' },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    children: [
      { id: 'events-list', label: 'Events', href: '/app/events' },
      { id: 'events-create', label: 'Create', href: '/app/events/create' },
    ],
  },
  { id: 'users', label: 'Users', href: '/app/users', icon: Users },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    children: [
      { id: 'org-overview', label: 'Overview', href: '/app/organization' },
      { id: 'org-teams', label: 'Teams', href: '/app/organization/teams' },
      { id: 'org-members', label: 'Members', href: '/app/users' },
      { id: 'org-invitations', label: 'Invitations', href: '/app/organization/invitations' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    children: [
      { id: 'attendance-reports', label: 'Attendance reports', href: '/app/reports/attendance' },
      { id: 'event-reports', label: 'Event reports', href: '/app/reports/events' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    children: [
      { id: 'ml-dashboard', label: 'ML Dashboard', href: '/app/coming-soon?feature=ML%20Dashboard', comingSoon: true },
      { id: 'predictions', label: 'Predictions', href: '/app/coming-soon?feature=Predictions', comingSoon: true },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: Mail,
    children: [
      { id: 'campaigns-dashboard', label: 'Campaigns', href: '/app/campaigns' },
      { id: 'campaigns-reports', label: 'Reports', href: '/app/campaigns/reports' },
    ],
  },
  {
    id: 'check-in',
    label: 'Check-in',
    icon: QrCode,
    children: [
      { id: 'qr-check-in', label: 'QR Check-in', href: '/app/check-in' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    children: [
      { id: 'admin-dashboard', label: 'Dashboard', href: '/app/admin' },
      { id: 'presence-settings', label: 'Presence settings', href: '/app/admin/presence-settings' },
      { id: 'grace-period', label: 'Grace period', href: '/app/admin/grace-period' },
      { id: 'promo-codes', label: 'Promo codes', href: '/app/admin/promo-codes' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    children: [
      { id: 'profile', label: 'Profile', href: '/app/settings/profile', icon: UserIcon },
      { id: 'preferences', label: 'Preferences', href: '/app/settings/preferences' },
      { id: 'notifications', label: 'Notifications', href: '/app/settings/notifications', icon: Bell },
      { id: 'integrations', label: 'Integrations', href: '/app/settings/integrations', icon: Plug },
      { id: 'docs', label: 'API docs', href: '/app/settings/api-docs', icon: FileText },
    ],
  },
]

function useActive(pathname: string) {
  const strip = (p: string) => p.split('?')[0]?.split('#')[0] || p
  const path = pathname.startsWith('/app/coming-soon') ? pathname.split('#')[0] : strip(pathname)
  let best: { score: number; chain: string[] } = { score: -1, chain: [] }

  const visit = (items: NavItem[], ancestors: string[]) => {
    for (const it of items) {
      const chain = [...ancestors, it.id]
      if (it.href) {
        const hrefPath = it.href.startsWith('/app/coming-soon') ? it.href.split('#')[0] : strip(it.href)
        if (path === hrefPath || path.startsWith(hrefPath + '/')) {
          const score = hrefPath.length
          if (score > best.score) best = { score, chain }
        }
      }
      if (it.children?.length) visit(it.children, chain)
    }
  }

  visit(NAV, [])
  return new Set(best.chain)
}

export function Sidebar() {
  const router = useRouter()
  const pathname = router.asPath
  const active = useActive(pathname)
  const initiallyOpen = useMemo(() => new Set(Array.from(active)), [pathname])
  const [open, setOpen] = useState<Set<string>>(initiallyOpen)
  useEffect(() => setOpen(initiallyOpen), [pathname])

  const toggle = (id: string) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
  }

  const render = (item: NavItem, level = 0) => {
    const Icon = item.icon
    const hasChildren = !!item.children?.length
    const isActive = active.has(item.id)
    const isOpen = open.has(item.id)

    if (hasChildren) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            onClick={() => toggle(item.id)}
            className={cn(
              'w-full flex items-center gap-3 h-9 px-3 rounded-md text-sm',
              isActive ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 dark:from-blue-950/40 dark:to-indigo-950/40 dark:text-blue-200 ring-1 ring-blue-200/60 dark:ring-blue-900/40' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge != null ? (
              <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700">{item.badge}</span>
            ) : item.comingSoon ? (
              <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700">Soon</span>
            ) : null}
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {isOpen && (
            <div className="space-y-1 pl-4">
              {item.children!.map((c) => render(c, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.id}
        href={item.href || '#'}
        className={cn(
          'flex items-center gap-3 h-9 px-3 rounded-md text-sm',
          isActive ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 dark:from-blue-950/40 dark:to-indigo-950/40 dark:text-blue-200 ring-1 ring-blue-200/60 dark:ring-blue-900/40' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
        )}
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span className="truncate flex-1">{item.label}</span>
        {item.badge != null ? (
          <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700">{item.badge}</span>
        ) : item.comingSoon ? (
          <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700">Soon</span>
        ) : null}
      </Link>
    )
  }

  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 min-h-screen py-4">
      <nav className="px-3 space-y-1">
        {NAV.map((it) => render(it))}
      </nav>
    </aside>
  )
}

