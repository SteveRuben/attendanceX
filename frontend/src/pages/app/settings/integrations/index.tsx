import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { getUserIntegrations, connectProvider, disconnectIntegration, triggerManualSync, Integration, IntegrationProvider } from '@/services/integrationsService'
import { Plug, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'

interface ProviderMeta {
  id: IntegrationProvider
  name: string
  description: string
  icon: string
  color: string
}

const PROVIDERS: ProviderMeta[] = [
  { id: 'google', name: 'Google', description: 'Sync with Google Calendar & Contacts', icon: '🔵', color: 'bg-red-500' },
  { id: 'microsoft', name: 'Microsoft 365', description: 'Connect Outlook, Teams & OneDrive', icon: '🟦', color: 'bg-blue-600' },
  { id: 'slack', name: 'Slack', description: 'Send notifications to Slack channels', icon: '💬', color: 'bg-purple-600' },
  { id: 'zoom', name: 'Zoom', description: 'Create & join Zoom meetings', icon: '📹', color: 'bg-blue-500' },
  { id: 'github', name: 'GitHub', description: 'Link your GitHub account', icon: '🐙', color: 'bg-gray-800' },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3 w-3" /> Connected</span>
  if (status === 'error') return <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3 w-3" /> Error</span>
  if (status === 'pending') return <span className="flex items-center gap-1 text-xs text-yellow-600"><AlertTriangle className="h-3 w-3" /> Pending</span>
  return <span className="text-xs text-muted-foreground">Not connected</span>
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const data = await getUserIntegrations()
      setIntegrations(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getIntegration = (provider: IntegrationProvider) => integrations.find(i => i.provider === provider)

  const handleConnect = async (provider: IntegrationProvider) => {
    setConnecting(provider)
    try {
      const { authUrl } = await connectProvider(provider)
      window.location.href = authUrl
    } catch (e) {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    try {
      await disconnectIntegration(integration.id)
      setIntegrations(prev => prev.filter(i => i.id !== integration.id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleSync = async (integration: Integration) => {
    setSyncing(integration.id)
    try {
      await triggerManualSync(integration.id)
    } finally {
      setSyncing(null)
    }
  }

  if (loading) {
    return (
      <AppShell title="Integrations">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Integrations">
      <div className="p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Plug className="h-6 w-6" /> Integrations</h1>
        <p className="text-muted-foreground">Connect third-party services to enhance your experience</p>
        <div className="grid gap-4">
          {PROVIDERS.map(provider => {
            const integration = getIntegration(provider.id)
            const isConnected = integration?.status === 'connected'
            return (
              <Card key={provider.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${provider.color} text-white`}>
                      {provider.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription>{provider.description}</CardDescription>
                      <div className="mt-1"><StatusBadge status={integration?.status ?? 'disconnected'} /></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleSync(integration!)} disabled={syncing === integration?.id}>
                          {syncing === integration?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDisconnect(integration!)}>
                          Disconnect
                        </Button>
                      </>
                    )}
                    {!isConnected && (
                      <Button size="sm" onClick={() => handleConnect(provider.id)} disabled={connecting === provider.id}>
                        {connecting === provider.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}

