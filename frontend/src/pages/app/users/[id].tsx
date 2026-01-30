import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { changeUserRole, changeUserStatus, getUserById, updateUser, UserItem, UserRole, UserStatus } from '@/services/usersService'

const ROLE_OPTIONS: UserRole[] = ['admin','manager','organizer','moderator','analyst','contributor','viewer','guest','participant']
const STATUS_OPTIONS: UserStatus[] = ['active','inactive','suspended']

export default function UserDetailPage() {
  const router = useRouter()
  const id = useMemo(() => {
    const raw = router.query.id
    return Array.isArray(raw) ? raw[0] : raw || ''
  }, [router.query.id])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserItem | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('viewer')
  const [status, setStatus] = useState<UserStatus>('active')

  useEffect(() => {
    if (!id) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const u = await getUserById(id)
        if (!mounted) return
        setUser(u)
        setFirstName(u.firstName || '')
        setLastName(u.lastName || '')
        setPhone(u.phone || '')
        if (u.role && (ROLE_OPTIONS as string[]).includes(String(u.role))) setRole(u.role as UserRole)
        if (u.status && (STATUS_OPTIONS as string[]).includes(String(u.status))) setStatus(u.status as UserStatus)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  async function onSaveProfile() {
    if (!id) return
    setSaving(true)
    try {
      const updated = await updateUser(id, { firstName, lastName, phone })
      setUser(updated)
    } finally {
      setSaving(false)
    }
  }

  async function onUpdateRole() {
    if (!id) return
    setSaving(true)
    try {
      await changeUserRole(id, role)
    } finally {
      setSaving(false)
    }
  }

  async function onUpdateStatus() {
    if (!id) return
    setSaving(true)
    try {
      await changeUserStatus(id, status)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title={user?.displayName || 'User'}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">User</h1>
          <Link href="/app/users" className="text-sm text-muted-foreground hover:underline">Back to Users</Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : !user ? (
              <div className="text-sm text-muted-foreground">User not found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email</div>
                  <div className="h-9 flex items-center text-sm">{user.email}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Phone</div>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">First name</div>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Last name</div>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={onSaveProfile} disabled={saving}>Save profile</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Role</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={role} onChange={e => setRole(e.target.value as UserRole)}>
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
              <div className="flex justify-end"><Button variant="outline" onClick={onUpdateRole} disabled={saving}>Update role</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={status} onChange={e => setStatus(e.target.value as UserStatus)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <div className="flex justify-end"><Button variant="outline" onClick={onUpdateStatus} disabled={saving}>Update status</Button></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

