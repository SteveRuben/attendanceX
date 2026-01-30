import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'

export default function ComingSoonPage() {
  const router = useRouter()
  const feature = typeof router.query.feature === 'string' ? decodeURIComponent(router.query.feature) : 'Coming soon'

  return (
    <AppShell title={feature}>
      <div className="p-6">
        <h1 className="text-2xl font-semibold">{feature}</h1>
        <p className="mt-2 text-sm text-muted-foreground">This section is being migrated.</p>
      </div>
    </AppShell>
  )
}

