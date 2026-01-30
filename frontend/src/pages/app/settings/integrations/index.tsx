import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getUserIntegrations, connectProvider, disconnectIntegration, syncIntegration, getCompatibleProviders, type Integration, type CompatibleProvidersResponse } from '@/services/integrationsService'
import { Plug, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Zap, Video, Calendar } from 'lucide-react'

type IntegrationProvider = 'google' | 'microsoft' | 'slack' | 'zoom' | 'github'

interface ProviderMeta {
  id: IntegrationProvider
  name: string
  description: string
  icon: string
  color: string
  features: string[]
  supportsMeetingLinks: boolean
}

const PROVIDERS: ProviderMeta[] = [
  { 
    id: 'google', 
    name: 'Google Workspace', 
    description: 'Intégration avec Google Calendar et Google Meet', 
    icon: '🔵', 
    color: 'bg-blue-500',
    features: ['Google Calendar', 'Google Meet', 'Contacts Gmail'],
    supportsMeetingLinks: true
  },
  { 
    id: 'microsoft', 
    name: 'Microsoft 365', 
    description: 'Intégration avec Outlook Calendar et Microsoft Teams', 
    icon: '🟦', 
    color: 'bg-orange-500',
    features: ['Outlook Calendar', 'Microsoft Teams', 'Contacts Outlook'],
    supportsMeetingLinks: true
  },
  { 
    id: 'zoom', 
    name: 'Zoom', 
    description: 'Génération automatique de réunions Zoom', 
    icon: '📹', 
    color: 'bg-blue-600',
    features: ['Réunions Zoom', 'Webinaires', 'Enregistrements'],
    supportsMeetingLinks: true
  },
  { 
    id: 'slack', 
    name: 'Slack', 
    description: 'Intégration avec Slack Huddles et notifications', 
    icon: '💬', 
    color: 'bg-purple-600',
    features: ['Slack Huddles', 'Notifications', 'Canaux'],
    supportsMeetingLinks: true
  },
  { 
    id: 'github', 
    name: 'GitHub', 
    description: 'Link your GitHub account', 
    icon: '🐙', 
    color: 'bg-gray-800',
    features: ['Repositories', 'Issues', 'Pull Requests'],
    supportsMeetingLinks: false
  },
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
  const [compatibleProviders, setCompatibleProviders] = useState<CompatibleProvidersResponse>({ hasIntegrations: false, availableProviders: [] })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const [integrationsData, providersData] = await Promise.all([
        getUserIntegrations(),
        getCompatibleProviders()
      ])
      setIntegrations(integrationsData)
      setCompatibleProviders(providersData)
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
      await connectProvider(provider)
      // Dans une implémentation complète, ceci ouvrirait une popup OAuth
      // Pour l'instant, on recharge les données
      await load()
    } catch (e) {
      console.error('Error connecting provider:', e)
      alert('Erreur lors de la connexion. Veuillez réessayer.')
    } finally {
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
      await syncIntegration(integration.id)
      await load() // Recharger les données après la synchronisation
    } catch (e) {
      console.error('Error syncing integration:', e)
      alert('Erreur lors de la synchronisation.')
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
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Plug className="h-6 w-6" /> Intégrations</h1>
          <p className="text-muted-foreground">Connectez des services tiers pour améliorer votre expérience</p>
        
        {/* Section d'information sur la génération de liens */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Génération automatique de liens de réunion
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Configurez l'un de vos connecteurs (Google, Teams, Zoom, Slack) pour générer automatiquement des liens de réunion lors de la création d'événements virtuels ou hybrides.
                </p>
                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <strong>Événements virtuels :</strong> Lien généré automatiquement
                  </div>
                  <div>
                    <strong>Événements hybrides :</strong> Adresse + lien automatique
                  </div>
                  <div>
                    <strong>Ordre de priorité :</strong> Google Meet → Teams → Zoom → Slack
                  </div>
                  <div>
                    <strong>Statut actuel :</strong> 
                    {compatibleProviders.hasIntegrations ? (
                      <span className="text-green-700 dark:text-green-300 ml-1">
                        ✅ {compatibleProviders.availableProviders.length} connecteur(s) configuré(s) ({compatibleProviders.availableProviders.join(', ')})
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300 ml-1">
                        ⚠️ Aucun connecteur configuré - Configurez au moins un connecteur ci-dessous
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {PROVIDERS.map(provider => {
            const integration = getIntegration(provider.id)
            const isConnected = integration?.status === 'connected'
            return (
              <Card key={provider.id}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${provider.color} text-white`}>
                        {provider.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          {provider.supportsMeetingLinks && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              Liens auto
                            </span>
                          )}
                        </div>
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
                            Déconnecter
                          </Button>
                        </>
                      )}
                      {!isConnected && (
                        <Button size="sm" onClick={() => handleConnect(provider.id)} disabled={connecting === provider.id}>
                          {connecting === provider.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                          Connecter
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Afficher les fonctionnalités */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Fonctionnalités :</h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.features.map(feature => (
                        <span key={feature} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Afficher l'email connecté si disponible */}
                  {integration?.userEmail && (
                    <div className="text-sm text-muted-foreground">
                      Connecté en tant que : <span className="font-medium">{integration.userEmail}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* Section d'aide */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Comment ça fonctionne
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1">Événements présentiels</h4>
                <p>Seule l'adresse physique est requise, aucun lien de réunion n'est généré.</p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Événements virtuels</h4>
                <p>Un lien de réunion est automatiquement généré selon vos intégrations configurées.</p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Événements hybrides</h4>
                <p>Vous saisissez l'adresse physique ET un lien de réunion est généré automatiquement.</p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Sécurité</h4>
                <p>Toutes les connexions utilisent OAuth 2.0 et vos tokens sont stockés de manière sécurisée.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AppShell>
  )
}

