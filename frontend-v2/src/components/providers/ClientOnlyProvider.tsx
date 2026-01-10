import { ReactNode, useEffect, useState } from 'react'

interface ClientOnlyProviderProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ClientOnlyProvider({ children, fallback = null }: ClientOnlyProviderProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}