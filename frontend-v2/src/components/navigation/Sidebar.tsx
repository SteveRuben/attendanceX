import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { FeaturePermission } from '@/types/permission.types'
import { PermissionsDebug } from '@/components/debug/PermissionsDebug'
import { 
  Home, 
  Clock, 
  Users, 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Mail, 
  Settings, 
  Bell, 
  Plug, 
  User as UserIcon, 
  FileText, 
  QrCode, 
  CreditCard, 
  Briefcase,
  Plus,
  List,
  UserPlus,
  Eye,
  CheckCircle,
  Send,
  PieChart,
  Target,
  Brain,
  Gift,
  Timer,
  UserCheck,
  Sliders,
  Ticket
} from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  href?: string
  icon?: any
  badge?: string | number
  comingSoon?: boolean
  children?: NavItem[]
  permission?: FeaturePermission
  permissions?: FeaturePermission[]
  role?: string | string[]
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/app', icon: Home },
  {
    id: 'projects',
    label: 'Projets',
    icon: Briefcase,
    permission: FeaturePermission.VIEW_ALL_EVENTS,
    children: [
      { id: 'projects-list', label: 'Tous les projets', href: '/app/projects', icon: List, permission: FeaturePermission.VIEW_ALL_EVENTS },
      { id: 'projects-create', label: 'Nouveau projet', href: '/app/projects/create', icon: Plus, permission: FeaturePermission.CREATE_EVENTS },
      {
        id: 'events',
        label: 'Événements',
        icon: Calendar,
        permission: FeaturePermission.VIEW_ALL_EVENTS,
        children: [
          { id: 'events-list', label: 'Liste', href: '/app/events', icon: List, permission: FeaturePermission.VIEW_ALL_EVENTS },
          { id: 'events-create', label: 'Créer', href: '/app/events/create', icon: Plus, permission: FeaturePermission.CREATE_EVENTS },
        ],
      },
      {
        id: 'tickets',
        label: 'Billets',
        icon: Ticket,
        permission: FeaturePermission.VIEW_ALL_EVENTS,
        children: [
          { id: 'tickets-all', label: 'Tous les billets', href: '/app/tickets', icon: List, permission: FeaturePermission.VIEW_ALL_EVENTS },
          { id: 'tickets-validate', label: 'Validation', href: '/app/tickets/validate', icon: QrCode, permission: FeaturePermission.RECORD_ATTENDANCE },
        ],
      },
      { id: 'users', label: 'Participants', href: '/app/users', icon: Users, role: ['owner', 'admin', 'manager'] },
      {
        id: 'check-in',
        label: 'Check-in',
        icon: QrCode,
        permission: FeaturePermission.RECORD_ATTENDANCE,
        children: [
          { id: 'qr-check-in', label: 'QR Check-in', href: '/app/check-in', icon: QrCode, permission: FeaturePermission.RECORD_ATTENDANCE },
        ],
      },
      {
        id: 'campaigns',
        label: 'Campagnes',
        icon: Mail,
        permission: FeaturePermission.SEND_NOTIFICATIONS,
        children: [
          { id: 'campaigns-dashboard', label: 'Campagnes', href: '/app/campaigns', icon: Send, permission: FeaturePermission.SEND_NOTIFICATIONS },
          { id: 'campaigns-reports', label: 'Rapports', href: '/app/campaigns/reports', icon: PieChart, permission: FeaturePermission.VIEW_REPORTS },
        ],
      },
      {
        id: 'timesheets',
        label: 'Feuilles de temps',
        icon: Clock,
        permission: FeaturePermission.VIEW_TIMESHEET,
        children: [
          { id: 'timesheets-list', label: 'Mes feuilles', href: '/app/timesheets', icon: List, permission: FeaturePermission.VIEW_TIMESHEET },
          { id: 'timesheets-create', label: 'Nouvelle feuille', href: '/app/timesheets/create', icon: Plus, permission: FeaturePermission.CREATE_TIMESHEET },
          { id: 'timesheets-approve', label: 'Approbations', href: '/app/timesheets/approvals', icon: CheckCircle, permission: FeaturePermission.APPROVE_TIMESHEET },
        ],
      },
      {
        id: 'attendance',
        label: 'Présences',
        icon: UserCheck,
        permission: FeaturePermission.VIEW_OWN_ATTENDANCE,
        children: [
          { id: 'attendance-overview', label: 'Vue d\'ensemble', href: '/app/attendance', icon: Eye, permission: FeaturePermission.VIEW_OWN_ATTENDANCE },
        ],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    role: ['owner', 'admin', 'manager'],
    children: [
      { id: 'org-overview', label: 'Overview', href: '/app/organization', icon: Eye, role: ['owner', 'admin', 'manager'] },
      { id: 'org-teams', label: 'Teams', href: '/app/organization/teams', icon: Users, permission: FeaturePermission.VIEW_TEAMS },
      { id: 'org-members', label: 'Volunteers', href: '/app/volunteers', icon: UserIcon, role: ['owner', 'admin', 'manager'] },
      { id: 'org-invitations', label: 'Invitations', href: '/app/organization/invitations', icon: UserPlus, role: ['owner', 'admin'] },
      { id: 'org-settings', label: 'Settings', href: '/app/organization/settings-simple', icon: Settings, role: ['owner', 'admin'] },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    permission: FeaturePermission.VIEW_REPORTS,
    children: [
      { id: 'attendance-reports', label: 'Attendance reports', href: '/app/reports/attendance', icon: UserCheck, permission: FeaturePermission.VIEW_REPORTS },
      { id: 'event-reports', label: 'Event reports', href: '/app/reports/events', icon: Calendar, permission: FeaturePermission.VIEW_REPORTS },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
    permission: FeaturePermission.VIEW_ANALYTICS,
    children: [
      { id: 'ml-dashboard', label: 'ML Dashboard', href: '/app/analytics', icon: Brain, permission: FeaturePermission.VIEW_ANALYTICS },
      { id: 'predictions', label: 'Predictions', href: '/app/analytics/predictions', icon: Target, permission: FeaturePermission.VIEW_ANALYTICS },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    role: ['owner', 'admin'],
    children: [
      { id: 'billing-overview', label: 'Overview', href: '/app/billing', icon: CreditCard, role: ['owner', 'admin'] },
      { id: 'promo-codes', label: 'Promo codes', href: '/app/billing/promo-codes', icon: Gift, role: ['owner', 'admin'] },
    ],
  },
  {
    id: 'my-account',
    label: 'My Account',
    icon: UserIcon,
    children: [
      { id: 'profile', label: 'Profile', href: '/app/my-account/profile', icon: UserIcon },
      { id: 'preferences', label: 'Preferences', href: '/app/my-account/preferences', icon: Sliders },
      { id: 'notifications', label: 'Notifications', href: '/app/my-account/notifications', icon: Bell },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    children: [
      { id: 'permissions', label: 'Permissions', href: '/app/permissions', icon: Shield, role: ['owner', 'admin'] },
      { id: 'navigation', label: 'Navigation', href: '/app/settings/navigation', icon: Settings, role: ['owner', 'admin'] },
      { id: 'grace-period', label: 'Grace period', href: '/app/settings/grace-period', icon: Timer, role: ['owner', 'admin'] },
      { id: 'integrations', label: 'Integrations', href: '/app/settings/integrations', icon: Plug, permission: FeaturePermission.VIEW_INTEGRATIONS },
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
  const { data: session, status } = useSession()
  const active = useActive(pathname)
  const initiallyOpen = useMemo(() => new Set(Array.from(active)), [pathname])
  const [open, setOpen] = useState<Set<string>>(initiallyOpen)
  useEffect(() => setOpen(initiallyOpen), [pathname])

  // Get user from session - the data is directly in session, not in session.user
  const user = session || {}
  const userRole = user?.userRole || 'member'
  const userId = user?.userId
  
  // Debug logging
  console.log('Sidebar Debug Fixed:', {
    session,
    user,
    status,
    userRole,
    userId,
    sessionUserRole: session?.userRole,
    sessionUserId: session?.userId
  })

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 min-h-screen py-4">
        <nav className="px-3 space-y-1">
          <div className="animate-pulse space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md" />
            ))}
          </div>
        </nav>
      </aside>
    )
  }

  // Show login message if not authenticated
  if (status !== 'authenticated' || !session) {
    return (
      <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 min-h-screen py-4">
        <nav className="px-3 space-y-1">
          <div className="text-center text-gray-500 py-8">
            Please log in to see navigation
          </div>
        </nav>
      </aside>
    )
  }

  const toggle = (id: string) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
  }

  const hasAccess = (item: NavItem): boolean => {
    // Always show items without permission/role requirements
    if (!item.permission && !item.permissions && !item.role) {
      return true
    }
    
    // For now, show all items to owner/admin users
    if (['owner', 'admin'].includes(userRole)) {
      console.log(`Access granted for ${item.label} - user is ${userRole}`)
      return true
    }

    // Check roles for other users
    if (item.role) {
      if (Array.isArray(item.role)) {
        const hasRole = item.role.includes(userRole)
        console.log(`Role check for ${item.label}: required=${item.role}, user=${userRole}, granted=${hasRole}`)
        return hasRole
      }
      const hasRole = item.role === userRole
      console.log(`Role check for ${item.label}: required=${item.role}, user=${userRole}, granted=${hasRole}`)
      return hasRole
    }
    
    // For permissions, show all for now (until permissions system is fully implemented)
    console.log(`Permission check for ${item.label}: showing all for now`)
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
      <PermissionsDebug />
    </aside>
  )
}