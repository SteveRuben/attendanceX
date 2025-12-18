import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut } from 'next-auth/react'
import { Bell } from 'lucide-react'
import { useAuthZ } from '@/hooks/use-authz'
import { useTenant } from '@/contexts/TenantContext'
import { getNotificationStats } from '@/services/notificationsService'

export function Topbar({ title }: { title?: string }) {
  const router = useRouter()
  const { user } = useAuthZ()
  const { currentTenant, availableTenants } = useTenant()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const name = user?.name || user?.fullName || user?.email || 'Account'
  const initial = (name || 'A').charAt(0).toUpperCase()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    getNotificationStats()
      .then((stats) => setUnreadCount(stats.unread))
      .catch(() => setUnreadCount(0))
  }, [])

  const handleSignOut = async () => {
    setDropdownOpen(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentTenantId')
    }
    await signOut({ redirect: true, callbackUrl: '/auth/login' })
  }

  const handleSwitchWorkspace = () => {
    setDropdownOpen(false)
    router.push('/choose-tenant')
  }

  const handleCreateWorkspace = () => {
    setDropdownOpen(false)
    router.push('/onboarding/create-workspace')
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/app" className="font-semibold truncate text-blue-600 dark:text-blue-400">AttendanceX</Link>
          {title ? <span className="text-neutral-400">/</span> : null}
          {title ? <span className="truncate text-sm text-neutral-600 dark:text-neutral-300">{title}</span> : null}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/notifications"
            className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-medium text-white">
                {initial}
              </div>
              <span className="text-sm text-neutral-700 dark:text-neutral-200 max-w-[12rem] truncate hidden sm:block">{name}</span>
              <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1 z-50">
                <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{name}</p>
                  <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                  {currentTenant && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">{currentTenant.name}</p>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    href="/app/settings/account"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account settings
                  </Link>

                  {availableTenants.length > 1 && (
                    <button
                      onClick={handleSwitchWorkspace}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Switch workspace
                    </button>
                  )}

                  <button
                    onClick={handleCreateWorkspace}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create new workspace
                  </button>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-800 py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
    </header>
  )
}

