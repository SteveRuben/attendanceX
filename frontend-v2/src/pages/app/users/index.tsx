import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/services/apiClient'
import { EmptyState } from '@/components/ui/empty-state'

interface UserItem {
  id: string
  displayName: string
  email: string
  role?: string
}

const mockUsers: UserItem[] = [
  { id: 'u1', displayName: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
  { id: 'u2', displayName: 'Bob Smith', email: 'bob@example.com', role: 'Manager' },
  { id: 'u3', displayName: 'Claire Lee', email: 'claire@example.com', role: 'Member' },
]

export default function UsersPage() {
  const [items, setItems] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const data = await apiClient.get<any>(`/users?limit=${limit}&offset=${(page - 1) * limit}`, { mock: mockUsers })
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        const mapped: UserItem[] = list.map((u: any) => ({
          id: String(u.id ?? u._id ?? Math.random()),
          displayName: u.displayName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email || u.username || '',
          role: u.role || u.type || u.authRole,
        }))
        if (!mounted) return
        setItems(mapped)
        setTotal(Number(data?.total ?? data?.count ?? mapped.length))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [page, limit])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(i =>
      i.displayName.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.role || '').toLowerCase().includes(q)
    )
  }, [items, search])

  const start = filtered.length ? (page - 1) * limit + 1 : 0
  const end = filtered.length ? (page - 1) * limit + filtered.length : 0
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <AppShell title="Users">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Card>
          <CardHeader>
            <CardTitle>Directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Search by name, email or role" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="divide-y rounded-md border">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <EmptyState title="No users" description="Invite your team to get started" />
              ) : filtered.map(u => (
                <Link key={u.id} href={`/app/users/${u.id}`} className="block p-4 hover:bg-muted/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{u.displayName}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{u.role}</div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>{total > 0 ? `Showing ${start}\u2013${end} of ${total}` : ' '}</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={!canPrev} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="ghost" size="sm" disabled={!canNext} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
