import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/services/apiClient'
import { FileText, Key, Copy, Eye, EyeOff, Plus, Trash2, Loader2, ExternalLink, CheckCircle, Server, Activity, Code, BookOpen, Zap, Shield, Users, Calendar, BarChart3, Bell, Clock, CreditCard, RefreshCw } from 'lucide-react'
import { apiKeysService } from '@/services/apiKeysService'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed?: string
  scopes: string[]
}

interface ApiInfo {
  name: string
  version: string
  description: string
  documentation: {
    swagger: string
    swaggerJson: string
    postman: string
    github: string
  }
  features: string[]
  endpoints: Record<string, string>
  deprecations?: Record<string, any>
  status: string
  lastDeployed: string
}

interface ApiStatus {
  services: Record<string, string | {
    status: string
    activeSessions?: number
    todayLogins?: number
    pendingVerifications?: number
    failedLogins?: number
    timestamp?: string
  }>
  timestamp: string
  overall: string
}

export default function ApiDocsPage() {
  const [loading, setLoading] = useState(true)
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null)
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'keys' | 'status'>('overview')

  useEffect(() => {
    (async () => {
      try {
        const [info, status, keys] = await Promise.all([
          apiClient.get<ApiInfo>('/api', { withAuth: false }),
          apiClient.get<any>('/status', { withAuth: false }).catch(() => null),
          apiKeysService.listApiKeys().catch(() => []),
        ])
        
        // Traiter les données de l'API
        const apiInfoData = info?.data ?? info
        setApiInfo(apiInfoData)
        
        // Charger les clés API
        setApiKeys(keys)
        
        // Traiter les données de statut avec validation
        if (status) {
          console.log('Raw status response:', status)
          
          let statusData = null
          
          // Extraire les données selon la structure de réponse
          if (status.success && status.data) {
            // Structure avec wrapper success/data
            statusData = status.data
          } else if (status.data) {
            // Structure avec data direct
            statusData = status.data
          } else {
            // Données directes
            statusData = status
          }
          
          console.log('Processed status data:', statusData)
          
          // Vérifier si c'est la structure attendue
          if (statusData && typeof statusData === 'object') {
            if (statusData.services && statusData.overall && statusData.timestamp) {
              // Structure attendue
              setApiStatus({
                services: statusData.services || {},
                overall: String(statusData.overall),
                timestamp: String(statusData.timestamp)
              })
            } else {
              // Structure inconnue, créer un statut par défaut
              setApiStatus({
                services: { api: 'operational' },
                overall: 'operational',
                timestamp: new Date().toISOString()
              })
            }
          }
        }
      } catch (e) {
        console.error('Failed to load API info:', e)
        setApiInfo({
          name: 'AttendanceX API',
          version: '1.0.0',
          description: 'API for attendance management',
          documentation: {
            swagger: '/docs',
            swaggerJson: '/swagger.json',
            postman: '/api/postman',
            github: 'https://github.com/SteveRuben/attendanceX'
          },
          features: [],
          endpoints: {},
          status: 'unknown',
          lastDeployed: new Date().toISOString()
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const result = await apiKeysService.createApiKey({
        name: newKeyName.trim(),
        scopes: ['read', 'write'], // Scopes par défaut
        expiresInDays: 365, // 1 an par défaut
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        }
      })
      
      setApiKeys(prev => [...prev, result.apiKey])
      setNewKeyName('')
      
      // Afficher la clé en clair dans une modal ou alert
      alert(`API Key created successfully!\n\nKey: ${result.plainKey}\n\nPlease save this key securely. You won't be able to see it again.`)
    } catch (e) {
      console.error('Failed to create API key:', e)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }
    
    try {
      await apiKeysService.deleteApiKey(id)
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch (e) {
      console.error('Failed to delete API key:', e)
    }
  }

  const handleRegenerateKey = async (id: string) => {
    if (!confirm('Are you sure you want to regenerate this API key? The old key will stop working immediately.')) {
      return
    }
    
    try {
      const result = await apiKeysService.regenerateApiKey(id)
      setApiKeys(prev => prev.map(k => k.id === id ? result.apiKey : k))
      
      // Afficher la nouvelle clé
      alert(`API Key regenerated successfully!\n\nNew Key: ${result.plainKey}\n\nPlease save this key securely. The old key is now invalid.`)
    } catch (e) {
      console.error('Failed to regenerate API key:', e)
    }
  }

  const getEndpointIcon = (endpoint: string) => {
    const iconMap: Record<string, any> = {
      auth: Shield,
      users: Users,
      tenants: Users,
      teams: Users,
      events: Calendar,
      attendances: Activity,
      notifications: Bell,
      reports: BarChart3,
      timesheets: Clock,
      billing: CreditCard,
      ml: Zap,
      integrations: Code,
    }
    return iconMap[endpoint] || Code
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
      case 'degraded':
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800'
      case 'unhealthy':
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800'
    }
  }

  if (loading) {
    return (
      <AppShell title="API Documentation">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'

  return (
    <AppShell title="API Documentation">
      <div className="p-6 space-y-6 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6" /> API Documentation
          </h1>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(apiInfo?.status || 'unknown')}`}>
            {apiInfo?.status || 'Unknown'}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'endpoints', label: 'Endpoints', icon: Server },
            { id: 'keys', label: 'API Keys', icon: Key },
            { id: 'status', label: 'Status', icon: Activity },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  {apiInfo?.name || 'AttendanceX API'}
                </CardTitle>
                <CardDescription>{apiInfo?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Version</Label>
                    <p className="font-mono text-sm">{apiInfo?.version}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Base URL</Label>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{baseUrl}</code>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(baseUrl, 'baseUrl')}>
                        {copied === 'baseUrl' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Last Deployed</Label>
                    <p className="text-sm">{apiInfo?.lastDeployed ? new Date(apiInfo.lastDeployed).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {apiInfo?.documentation && Object.entries(apiInfo.documentation).map(([key, url]) => (
                    <Button key={key} variant="outline" size="sm" asChild>
                      <a href={url.startsWith('/') ? `${baseUrl}${url}` : url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {key === 'swagger' ? 'Swagger UI' : key === 'swaggerJson' ? 'OpenAPI JSON' : key.charAt(0).toUpperCase() + key.slice(1)}
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {apiInfo?.features && apiInfo.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {apiInfo.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Endpoints Tab */}
        {activeTab === 'endpoints' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Available Endpoints
                </CardTitle>
                <CardDescription>All available API endpoints and their purposes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {apiInfo?.endpoints && Object.entries(apiInfo.endpoints).map(([name, path]) => {
                    const Icon = getEndpointIcon(name)
                    return (
                      <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <code className="text-xs text-muted-foreground">{path}</code>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(`${baseUrl}${path}`, `endpoint-${name}`)}>
                          {copied === `endpoint-${name}` ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {apiInfo?.deprecations && Object.keys(apiInfo.deprecations).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600">Deprecated Endpoints</CardTitle>
                  <CardDescription>These endpoints will be removed in future versions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(apiInfo.deprecations).map(([endpoint, info]) => (
                      <div key={endpoint} className="p-3 border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 rounded-lg">
                        <div className="font-medium text-yellow-800 dark:text-yellow-200">{endpoint}</div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          {info.message} Use <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{info.replacement}</code> instead.
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Sunset: {new Date(info.sunset).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>Manage your API keys for programmatic access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter key name (e.g., 'Mobile App', 'Dashboard Integration')" 
                  value={newKeyName} 
                  onChange={e => setNewKeyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateKey()}
                />
                <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create
                </Button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map(k => {
                    const keyStatus = apiKeysService.getKeyStatus(k)
                    const expirationText = apiKeysService.formatExpirationDate(k.expiresAt)
                    
                    return (
                      <div key={k.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="font-medium">{k.name}</div>
                              <div className={`px-2 py-0.5 text-xs rounded-full border ${keyStatus.color}`}>
                                {keyStatus.label}
                              </div>
                              {k.expiresAt && (
                                <div className="text-xs text-muted-foreground">
                                  {expirationText}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mb-2">
                              {k.scopes.map(scope => (
                                <span key={scope} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                                  {scope}
                                </span>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <code className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 max-w-[300px] truncate">
                                {showKey[k.id] ? k.key : '•'.repeat(32)}
                              </code>
                              <Button variant="ghost" size="sm" onClick={() => setShowKey(s => ({ ...s, [k.id]: !s[k.id] }))}>
                                {showKey[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCopy(k.key, k.id)}>
                                {copied === k.id ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div>
                                Created {new Date(k.createdAt).toLocaleDateString()}
                                {k.lastUsed && ` • Last used ${new Date(k.lastUsed).toLocaleDateString()}`}
                                {k.usageCount > 0 && ` • ${k.usageCount} requests`}
                              </div>
                              {k.rateLimit && (
                                <div className="text-xs">
                                  {k.rateLimit.requestsPerMinute}/min, {k.rateLimit.requestsPerHour}/hour
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRegenerateKey(k.id)}
                              title="Regenerate key"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive" 
                              onClick={() => handleDeleteKey(k.id)}
                              title="Delete key"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Status
                </CardTitle>
                <CardDescription>Real-time status of all API services</CardDescription>
              </CardHeader>
              <CardContent>
                {apiStatus && typeof apiStatus === 'object' && apiStatus.overall ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${apiStatus.overall === 'operational' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <div>
                          <div className="font-medium">Overall Status</div>
                          <div className="text-sm text-muted-foreground">All systems {String(apiStatus.overall)}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(String(apiStatus.overall))}`}>
                        {String(apiStatus.overall)}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {apiStatus.services && typeof apiStatus.services === 'object' && Object.entries(apiStatus.services).map(([service, status]) => {
                        // Gérer les deux types de structures : string ou object
                        let statusStr = 'unknown'
                        let additionalInfo = null
                        
                        if (typeof status === 'string') {
                          statusStr = status
                        } else if (typeof status === 'object' && status !== null) {
                          statusStr = status.status || 'unknown'
                          // Extraire des informations supplémentaires pour certains services
                          if (service === 'auth' && status.activeSessions !== undefined) {
                            additionalInfo = `${status.activeSessions} active sessions`
                          }
                        }
                        
                        return (
                          <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${statusStr === 'operational' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <div>
                                <div className="font-medium capitalize">{service}</div>
                                {additionalInfo && (
                                  <div className="text-xs text-muted-foreground">{additionalInfo}</div>
                                )}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(statusStr)}`}>
                              {statusStr}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last updated: {apiStatus.timestamp ? new Date(apiStatus.timestamp).toLocaleString() : 'Unknown'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Status information unavailable</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}

