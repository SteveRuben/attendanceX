import { useSession } from 'next-auth/react'

export function useAuthZ() {
  const { data: session, status } = useSession()
  const user = (session as any)?.user
  const email: string = user?.email || ''
  const list = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const isSuperAdmin = (process.env.NEXT_PUBLIC_SUPERADMIN === 'true') || (email ? list.includes(email.toLowerCase()) : false)
  return { session, status, user, email, isSuperAdmin }
}

