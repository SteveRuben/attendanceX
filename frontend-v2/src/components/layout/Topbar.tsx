import Link from 'next/link'
import { useAuthZ } from '@/hooks/use-authz'
import { cn } from '@/lib/utils'

export function Topbar({ title }: { title?: string }) {
  const { user } = useAuthZ()
  const name = user?.name || user?.fullName || user?.email || 'Account'
  const initial = (name || 'A').charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-950/60 relative">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/app" className="font-semibold truncate">AttendanceX</Link>
          {title ? <span className="text-neutral-400">/</span> : null}
          {title ? <span className="truncate text-sm text-neutral-600 dark:text-neutral-300">{title}</span> : null}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/app/coming-soon?feature=Notifications" className="text-sm text-neutral-600 dark:text-neutral-300">Notifications</Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-sm font-medium">
              {initial}
            </div>
            <span className="text-sm text-neutral-700 dark:text-neutral-200 max-w-[12rem] truncate">{name}</span>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
    </header>
  )
}

