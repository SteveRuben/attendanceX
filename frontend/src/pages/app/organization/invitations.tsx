import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { useTenant } from '@/contexts/TenantContext'
import {
  InvitationItem,
  InvitationStats,
  InvitationStatus,
  cancelInvitation,
  getAllInvitations,
  getInvitations,
  getInvitationStats,
  resendInvitation,
  sendBulkInvitations,
  sendInvitation,
} from '@/services/invitationsService'

export default function InvitationsPage() {
  const { currentTenant } = useTenant()
  const [status, setStatus] = useState<InvitationStatus | 'all'>('all')
  const [list, setList] = useState<InvitationItem[]>([])
  const [stats, setStats] = useState<InvitationStats>({ total: 0, pending: 0, sent: 0, accepted: 0, declined: 0, expired: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sending, setSending] = useState(false)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('user')

  const [bulk, setBulk] = useState('')

  const loadInvitations = async () => {
    if (!currentTenant?.id) {
      console.log('No current tenant, skipping invitation load')
      return
    }
    
    setLoading(true)
    try {
      console.log('Loading invitations for tenant:', currentTenant.id, 'with status:', status)
      
      let data: InvitationItem[]
      if (status === 'all') {
        console.log('Fetching ALL invitations')
        data = await getAllInvitations({ tenantId: currentTenant.id })
      } else {
        console.log('Fetching invitations with status:', status)
        data = await getInvitations({ tenantId: currentTenant.id, status: status as InvitationStatus })
      }
      console.log('Loaded invitations count:', data.length, 'data:', data)
      setList(data)
      
      // Charger aussi les statistiques
      try {
        const statsData = await getInvitationStats(currentTenant.id)
        console.log('Loaded invitation stats:', statsData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load invitation stats:', error)
      }
    } catch (error) {
      console.error('Failed to load invitations:', error)
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvitations()
  }, [currentTenant?.id, status])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter(i =>
      i.email.toLowerCase().includes(s) || (i.name || '').toLowerCase().includes(s)
    )
  }, [q, list])

  const handleSend = async () => {
    if (!email || !currentTenant?.id) return
    setSending(true)
    try {
      // Fournir des valeurs par défaut si firstName/lastName sont vides
      const finalFirstName = firstName.trim() || 'New'
      const finalLastName = lastName.trim() || 'User'
      
      await sendInvitation({ 
        tenantId: currentTenant.id, 
        email, 
        firstName: finalFirstName, 
        lastName: finalLastName, 
        role 
      })
      setEmail(''); setFirstName(''); setLastName('')
      // Recharger les invitations après envoi
      const data = status === 'all' 
        ? await getAllInvitations({ tenantId: currentTenant.id }) 
        : await getInvitations({ tenantId: currentTenant.id, status: status as InvitationStatus })
      setList(data)
    } catch (error) {
      console.error('Failed to send invitation:', error)
    } finally {
      setSending(false)
    }
  }

  const handleBulk = async () => {
    if (!currentTenant?.id) return
    const emails = Array.from(new Set(bulk.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean)))
    if (emails.length === 0) return
    setSending(true)
    try {
      await sendBulkInvitations({ 
        tenantId: currentTenant.id, 
        invitations: emails.map(e => ({ email: e, role: 'user', firstName: 'New', lastName: 'User' })) 
      })
      setBulk('')
      // Recharger les invitations après envoi
      const data = status === 'all' 
        ? await getAllInvitations({ tenantId: currentTenant.id }) 
        : await getInvitations({ tenantId: currentTenant.id, status: status as InvitationStatus })
      setList(data)
    } catch (error) {
      console.error('Failed to send bulk invitations:', error)
    } finally {
      setSending(false)
    }
  }

  const doResend = async (id: string) => {
    if (!currentTenant?.id) return
    try {
      await resendInvitation(currentTenant.id, id)
      // Recharger les invitations après action
      const data = status === 'all' 
        ? await getAllInvitations({ tenantId: currentTenant.id }) 
        : await getInvitations({ tenantId: currentTenant.id, status: status as InvitationStatus })
      setList(data)
    } catch (error) {
      console.error('Failed to resend invitation:', error)
    }
  }
  
  const doCancel = async (id: string) => {
    if (!currentTenant?.id) return
    try {
      await cancelInvitation(currentTenant.id, id)
      // Recharger les invitations après action
      const data = status === 'all' 
        ? await getAllInvitations({ tenantId: currentTenant.id }) 
        : await getInvitations({ tenantId: currentTenant.id, status: status as InvitationStatus })
      setList(data)
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    }
  }

  // Afficher un message si aucun tenant n'est sélectionné
  if (!currentTenant) {
    return (
      <AppShell title="Invitations">
        <div className="p-6">
          <EmptyState 
            title="No Organization Selected" 
            description="Please select an organization to manage invitations." 
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Invitations">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
        <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Invitations</h1>
              <p className="text-sm text-muted-foreground">
                Invite teammates to <span className="font-medium">{currentTenant.name}</span> and manage pending invitations
              </p>
              {(stats.total ?? 0) > 0 && (
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Total: {stats.total ?? 0}</span>
                  {(stats.pending ?? 0) > 0 && <span className="text-yellow-600">Pending: {stats.pending}</span>}
                  {(stats.sent ?? 0) > 0 && <span className="text-blue-600">Sent: {stats.sent}</span>}
                  {(stats.accepted ?? 0) > 0 && <span className="text-green-600">Accepted: {stats.accepted}</span>}
                  {(stats.declined ?? 0) > 0 && <span className="text-red-600">Declined: {stats.declined}</span>}
                  {(stats.expired ?? 0) > 0 && <span className="text-orange-600">Expired: {stats.expired}</span>}
                </div>
              )}
              {list.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {list.length} invitation{list.length !== 1 ? 's' : ''} {status === 'all' ? 'total' : `with status "${status}"`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 text-xs">
                <button 
                  type="button" 
                  onClick={() => document.getElementById('invitations-list')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-2 py-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                >
                  List
                </button>
                <button 
                  type="button" 
                  onClick={() => document.getElementById('send-invitation')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-2 py-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                >
                  Send
                </button>
                <button 
                  type="button" 
                  onClick={() => document.getElementById('bulk-invite')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-2 py-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                >
                  Bulk
                </button>
              </div>
              <Select value={status} onChange={e => setStatus(e.target.value as InvitationStatus | 'all')}>
                <option value="all">All Invitations</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" id="invitations-list">
            <CardHeader>
              <CardTitle>Invitations ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Search email or name" value={q} onChange={e => setQ(e.target.value)} />
              <div className="rounded-md border divide-y max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <div className="text-sm text-muted-foreground">Loading invitations...</div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-6">
                    <EmptyState 
                      title={list.length === 0 ? "No invitations yet" : "No matching invitations"} 
                      description={list.length === 0 
                        ? "Start by sending invitations from the form on the right." 
                        : "Try adjusting your search or filter criteria."
                      } 
                    />
                  </div>
                ) : (
                  filtered.map(i => (
                    <div key={i.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{i.email}</div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                          {(i.firstName || i.lastName) && (
                            <span>{[i.firstName, i.lastName].filter(Boolean).join(' ')}</span>
                          )}
                          {i.role && (
                            <>
                              {(i.firstName || i.lastName) && <span>•</span>}
                              <span className="capitalize">{i.role}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            i.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            i.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            i.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            i.status === 'declined' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            i.status === 'expired' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {i.status}
                          </span>
                        </div>
                        {i.createdAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Invited {new Date(i.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(i.status === 'pending' || i.status === 'expired') && (
                          <Button variant="outline" size="sm" onClick={() => doResend(i.id)}>
                            Resend
                          </Button>
                        )}
                        {i.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => doCancel(i.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card id="send-invitation">
              <CardHeader>
                <CardTitle>Send invitation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First name</Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Last name</Label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={role} onChange={e => setRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button disabled={sending || !email} onClick={handleSend}>{sending ? 'Sending...' : 'Send invitation'}</Button>
                </div>
              </CardContent>
            </Card>

            <Card id="bulk-invite">
              <CardHeader>
                <CardTitle>Bulk invite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Emails (comma, space or newline separated)</Label>
                  <textarea className="w-full min-h-[120px] rounded-md border bg-background p-2 text-sm" value={bulk} onChange={e => setBulk(e.target.value)} placeholder="alice@example.com\nbob@example.com" />
                </div>
                <div className="flex justify-end">
                  <Button variant="secondary" disabled={sending || bulk.trim().length === 0} onClick={handleBulk}>{sending ? 'Sending...' : 'Send bulk invites'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  )
}

