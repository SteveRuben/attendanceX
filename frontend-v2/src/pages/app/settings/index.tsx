import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SettingsIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/app/settings/profile')
  }, [router])

  return null
}

