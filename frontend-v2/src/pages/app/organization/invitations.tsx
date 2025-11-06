import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Select from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import {
  InvitationItem,
  InvitationStatus,
  cancelInvitation,
  getInvitations,
  resendInvitation,
  sendBulkInvitations,
  sendInvitation,
} from '@/services/invitationsService'

export default function InvitationsPage() {
  const [status, setStatus] = useState<InvitationStatus>('pending')
  const [list, setList] = useState<InvitationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sending, setSending] = useState(false)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('user')

  const [bulk, setBulk] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const data = await getInvitations({ status })
        if (!mounted) return
        setList(data)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [status])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter(i =>
      i.email.toLowerCase().includes(s) || (i.name || '').toLowerCase().includes(s)
    )
  }, [q, list])

  const handleSend = async () => {
    if (!email) return
    setSending(true)
    try {
      await sendInvitation({ email, firstName, lastName, role })
      setEmail(''); setFirstName(''); setLastName('')
      const data = await getInvitations({ status })
      setList(data)
    } finally {
      setSending(false)
    }
  }

  const handleBulk = async () => {
    const emails = Array.from(new Set(bulk.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean)))
    if (emails.length === 0) return
    setSending(true)
    try {
      await sendBulkInvitations({ invitations: emails.map(e => ({ email: e, role: 'user' })) })
      setBulk('')
      const data = await getInvitations({ status })
      setList(data)
    } finally {
      setSending(false)
    }
  }

  const doResend = async (id: string) => {
    await resendInvitation(id)
  }
  const doCancel = async (id: string) => {
    await cancelInvitation(id)
    const data = await getInvitations({ status })
    setList(data)
  }

  return (
    <AppShell title="Invitations">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Invitations</h1>
            <p className="text-sm text-muted-foreground">Invite teammates and manage pending invitations</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onChange={e => setStatus(e.target.value as InvitationStatus)}>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pending & Sent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Search email or name" value={q} onChange={e => setQ(e.target.value)} />
              <div className="rounded-md border divide-y">
                {loading ? (
                  <div className="p-6 text-sm text-muted-foreground">Loading...</div>
                ) : filtered.length === 0 ? (
                  <EmptyState title="No invitations" description="Start by sending invitations from the form on the right." />
                ) : (
                  filtered.map(i => (
                    <div key={i.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{i.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{i.name || ''}{i.role ? ` • ${i.role}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(i.status === 'pending' || i.status === 'sent') && (
                          <Button variant="secondary" size="sm" onClick={() => doResend(i.id)}>Resend</Button>
                        )}
                        {i.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => doCancel(i.id)}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
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
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button disabled={sending || !email} onClick={handleSend}>{sending ? 'Sending...' : 'Send invitation'}</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
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
    </AppShell>
  )
}

