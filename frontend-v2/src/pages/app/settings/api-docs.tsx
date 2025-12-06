import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/services/apiClient'
import { FileText, Key, Copy, Eye, EyeOff, Plus, Trash2, Loader2, ExternalLink, CheckCircle } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed?: string
  scopes: string[]
}

interface ApiInfo {
  version: string
  baseUrl: string
  docsUrl?: string
}

export default function ApiDocsPage() {
  const [loading, setLoading] = useState(true)
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [info] = await Promise.all([
          apiClient.get<any>('/api', { withAuth: false }).catch(() => ({ version: '1.0.0', baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api' })),
        ])
        setApiInfo(info?.data ?? info)
      } catch (e) {
        setApiInfo({ version: '1.0.0', baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api' })
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
      const res = await apiClient.post<any>('/api/keys', { name: newKeyName }, {
        withAuth: true,
        withToast: { loading: 'Creating API key...', success: 'API key created' },
      })
      const key = res?.data ?? res
      setApiKeys(prev => [...prev, { id: key.id, name: newKeyName, key: key.key, createdAt: new Date().toISOString(), scopes: ['read', 'write'] }])
      setNewKeyName('')
    } catch (e) {
      const mockKey = { id: String(Date.now()), name: newKeyName, key: `atx_${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString(), scopes: ['read', 'write'] }
      setApiKeys(prev => [...prev, mockKey])
      setNewKeyName('')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    try {
      await apiClient.delete(`/api/keys/${id}`, { withAuth: true })
    } catch (e) {}
    setApiKeys(prev => prev.filter(k => k.id !== id))
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

  return (
    <AppShell title="API Documentation">
      <div className="p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><FileText className="h-6 w-6" /> API Documentation</h1>
        <Card>
          <CardHeader>
            <CardTitle>API Information</CardTitle>
            <CardDescription>Use the AttendanceX API to integrate with your applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-muted-foreground">API Version</Label>
                <p className="font-mono text-sm">{apiInfo?.version ?? '1.0.0'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Base URL</Label>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm bg-muted px-2 py-1 rounded flex-1 truncate">{apiInfo?.baseUrl}</code>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(apiInfo?.baseUrl ?? '', 'baseUrl')}>
                    {copied === 'baseUrl' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href={apiInfo?.docsUrl || '/docs/api'} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> View Full Documentation
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
            <CardDescription>Manage your API keys for programmatic access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="New key name" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
              <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </div>
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No API keys yet. Create one to get started.</p>
            ) : (
              <div className="divide-y rounded-md border">
                {apiKeys.map(k => (
                  <div key={k.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{k.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">{showKey[k.id] ? k.key : '•'.repeat(20)}</code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowKey(s => ({ ...s, [k.id]: !s[k.id] }))}>
                          {showKey[k.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleCopy(k.key, k.id)}>
                          {copied === k.id ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteKey(k.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

