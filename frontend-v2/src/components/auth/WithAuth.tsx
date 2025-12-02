import { ReactNode, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

export function WithAuth({ children }: { children?: ReactNode }) {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/login')
  }, [status, router])

  if (status !== 'authenticated') return null
  return <>{children}</>
}

