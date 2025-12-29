import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { Home, Clock, Users, Shield, ChevronDown, ChevronRight, Building2, Calendar, BarChart3, TrendingUp, Mail, Settings, Bell, Plug, User as UserIcon, FileText, QrCode, CreditCard } from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  href?: string
  icon?: any
  badge?: string | number
  comingSoon?: boolean
  children?: NavItem[]
  permission?: string
  permissions?: string[]
  role?: string | string[]
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/app', icon: Home },
  {
    id: 'timesheets',
    label: 'Timesheets',
    icon: Clock,
    permission: 'view_timesheet',
    children: [
      { id: 'timesheets-list', label: 'My Timesheets', href: '/app/timesheets', permission: 'view_timesheet' },
      { id: 'timesheets-create', label: 'New Timesheet', href: '/app/timesheets/create', permission: 'create_timesheet' },
      { id: 'timesheets-approve', label: 'Approvals', href: '/app/timesheets/approvals', permission: 'approve_timesheet' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Clock,
    permission: 'view_own_attendance',
    children: [
      { id: 'attendance-overview', label: 'Overview', href: '/app/attendance', permission: 'view_own_attendance' },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    permission: 'view_all_events',
    children: [
      { id: 'events-list', label: 'Events', href: '/app/events', permission: 'view_all_events' },
      { id: 'events-create', label: 'Create', href: '/app/events/create', permission: 'create_events' },
    ],
  },
  { id: 'users', label: 'Users', href: '/app/users', icon: Users, role: ['owner', 'admin', 'manager'] },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    role: ['owner', 'admin', 'manager'],
    children: [
      { id: 'org-overview', label: 'Overview', href: '/app/organization', role: ['owner', 'admin', 'manager'] },
      { id: 'org-teams', label: 'Teams', href: '/app/organization/teams', permission: 'view_teams' },
      { id: 'org-members', label: 'Members', href: '/app/users', role: ['owner', 'admin', 'manager'] },
      { id: 'org-invitations', label: 'Invitations', href: '/app/organization/invitations', role: ['owner', 'admin'] },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'view_reports',
    children: [
      { id: 'attendance-reports', label: 'Attendance reports', href: '/app/reports/attendance', permission: 'view_reports' },
      { id: 'event-reports', label: 'Event reports', href: '/app/reports/events', permission: 'view_reports' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    permission: 'view_analytics',
    children: [
      { id: 'ml-dashboard', label: 'ML Dashboard', href: '/app/analytics', permission: 'view_analytics' },
      { id: 'predictions', label: 'Predictions', href: '/app/analytics/predictions', permission: 'view_analytics' },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: Mail,
    permission: 'send_notifications',
    children: [
      { id: 'campaigns-dashboard', label: 'Campaigns', href: '/app/campaigns', permission: 'send_notifications' },
      { id: 'campaigns-reports', label: 'Reports', href: '/app/campaigns/reports', permission: 'view_reports' },
    ],
  },
  {
    id: 'check-in',
    label: 'Check-in',
    icon: QrCode,
    permission: 'record_attendance',
    children: [
      { id: 'qr-check-in', label: 'QR Check-in', href: '/app/check-in', permission: 'record_attendance' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    role: ['owner', 'admin'],
    children: [
      { id: 'admin-dashboard', label: 'Dashboard', href: '/app/admin', role: ['owner', 'admin'] },
      { id: 'timesheet-settings', label: 'Timesheet Settings', href: '/app/admin/timesheet-settings', role: ['owner', 'admin'] },
      { id: 'presence-settings', label: 'Presence settings', href: '/app/admin/presence-settings', permission: 'manage_attendance_policy' },
      { id: 'grace-period', label: 'Grace period', href: '/app/admin/grace-period', role: ['owner', 'admin'] },
      { id: 'promo-codes', label: 'Promo codes', href: '/app/admin/promo-codes', role: ['owner', 'admin'] },
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
      { id: 'billing', label: 'Billing', href: '/app/settings/billing', icon: CreditCard, role: ['owner', 'admin'] },
      { id: 'integrations', label: 'Integrations', href: '/app/settings/integrations', icon: Plug, permission: 'view_integrations' },
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
  const { hasPermission, hasRole } = usePermissions()
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

  const hasAccess = (item: NavItem): boolean => {
    if (item.permission && !hasPermission(item.permission)) return false
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false
    if (item.role && !hasRole(item.role)) return false
    return true
  }

  const render = (item: NavItem, level = 0) => {
    // Check permissions first
    if (!hasAccess(item)) return null

    const Icon = item.icon
    const hasChildren = !!item.children?.length
    const isActive = active.has(item.id)
    const isOpen = open.has(item.id)

    // Filter children based on permissions
    const visibleChildren = hasChildren ? item.children!.filter(hasAccess) : []
    const hasVisibleChildren = visibleChildren.length > 0

    if (hasChildren && hasVisibleChildren) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            onClick={() => toggle(item.id)}
            className={cn(
              'w-full flex items-center gap-2 h-7 px-2 rounded-xl text-xs font-medium transition-all',
              isActive
                ? 'bg-white text-blue-700 shadow-sm shadow-blue-100 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/40'
                : 'hover:bg-white/60 dark:hover:bg-neutral-800/60 text-slate-600 dark:text-slate-300'
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge != null ? (
              <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700">{item.badge}</span>
            ) : item.comingSoon ? (
              <span className="ml-auto text-[10px] rounded px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700">Soon</span>
            ) : null}
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {isOpen && (
            <div className="space-y-1 pl-4 border-l border-blue-50 dark:border-blue-900/30">
              {visibleChildren.map((c) => render(c, level + 1))}
            </div>
          )}
        </div>
      )
    }

    // If it has children but none are visible, don't render
    if (hasChildren && !hasVisibleChildren) {
      return null
    }

    return (
      <Link
        key={item.id}
        href={item.href || '#'}
        className={cn(
          'flex items-center gap-2 h-7 px-2 rounded-xl text-xs font-medium transition-all',
          isActive
            ? 'bg-white text-blue-700 shadow-sm shadow-blue-100 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/40'
            : 'hover:bg-white/60 dark:hover:bg-neutral-800/60 text-slate-600 dark:text-slate-300'
        )}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
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
    <aside className="w-52 shrink-0 border-r border-neutral-100 dark:border-neutral-800 min-h-screen bg-slate-50/40 dark:bg-neutral-950/40">
      <div className="sticky top-0 h-screen flex flex-col">
        <div className="px-4 pt-4 pb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            Purity UI
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 space-y-0.5 pb-6 pt-0.5 custom-scrollbar">
          {NAV.map((it) => render(it))}
        </nav>
      </div>
    </aside>
  )
}

