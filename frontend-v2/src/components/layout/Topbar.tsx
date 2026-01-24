import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Bell, LogOut, User, Settings, Building2, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { getNotificationStats } from '@/services/notificationsService'
import { ProfilePicture } from '@/components/ui/ProfilePicture'

export function Topbar({ title }: { title?: string }) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { currentTenant, availableTenants } = useTenant()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const name = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.email || 'Account'

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
    try {
      setDropdownOpen(false)
      
      // Clear local storage first
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentTenantId')
        localStorage.removeItem('tenantId')
        localStorage.removeItem('user')
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('needsOnboarding')
      }
      
      // Call logout from auth service
      await logout()
      
      // Redirect to login page
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout fails, redirect to login
      router.push('/auth/login')
    }
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
              title={`${name} - Click to open menu`}
            >
              <ProfilePicture 
                name={name} 
                size="md"
                className="ring-2 ring-white dark:ring-neutral-800 shadow-sm"
              />
              <div className="hidden sm:block text-left">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 max-w-[12rem] truncate block">
                  {name}
                </span>
                {user?.email && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[12rem] truncate block">
                    {user.email}
                  </span>
                )}
              </div>
              <svg className="h-4 w-4 text-neutral-500 transition-transform duration-200" 
                   style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1 z-50">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <ProfilePicture 
                      name={name} 
                      size="lg"
                      className="ring-2 ring-neutral-200 dark:ring-neutral-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user?.email}
                      </p>
                      {user?.role && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 capitalize">
                          {user.role}
                        </p>
                      )}
                      {currentTenant && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {currentTenant.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/app/my-account/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Account settings
                  </Link>

                  {availableTenants.length > 1 && (
                    <button
                      onClick={handleSwitchWorkspace}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Building2 className="h-4 w-4" />
                      Switch workspace
                      <span className="ml-auto text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                        {availableTenants.length}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={handleCreateWorkspace}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create new workspace
                  </button>
                </div>

                {/* Logout Section */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
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

