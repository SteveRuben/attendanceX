import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { completeOAuthCallback, IntegrationProvider } from '@/services/integrationsService'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function IntegrationCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { code, state, provider, error: oauthError } = router.query

    if (oauthError) {
      setStatus('error')
      setError(String(oauthError))
      return
    }

    if (!code || !state || !provider) return

    (async () => {
      try {
        await completeOAuthCallback(
          provider as IntegrationProvider,
          String(code),
          String(state)
        )
        setStatus('success')
        setTimeout(() => router.push('/app/settings/integrations'), 2000)
      } catch (e: any) {
        setStatus('error')
        setError(e.message || 'Failed to complete connection')
      }
    })()
  }, [router.query])

  return (
    <AppShell title="Connecting...">
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <h2 className="text-xl font-semibold">Completing connection...</h2>
                <p className="text-muted-foreground">Please wait while we finish setting up your integration.</p>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 text-green-600" />
                <h2 className="text-xl font-semibold">Connected!</h2>
                <p className="text-muted-foreground">Your integration has been set up successfully. Redirecting...</p>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 text-red-600" />
                <h2 className="text-xl font-semibold">Connection Failed</h2>
                <p className="text-muted-foreground">{error || 'An error occurred while connecting.'}</p>
                <Button onClick={() => router.push('/app/settings/integrations')}>
                  Back to Integrations
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

