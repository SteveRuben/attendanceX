import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'

interface Team { id: string; name: string; membersCount: number }

const initialTeams: Team[] = []

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [name, setName] = useState('')

  const addTeam = () => {
    if (!name.trim()) return
    setTeams(prev => [{ id: Math.random().toString(36).slice(2), name: name.trim(), membersCount: 0 }, ...prev])
    setName('')
  }

  return (
    <AppShell title="Teams">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Teams</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Teams</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border divide-y">
                {teams.length === 0 ? (
                  <EmptyState title="No teams" description="Create your first team using the form on the right." />
                ) : teams.map(t => (
                  <div key={t.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.membersCount} members</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm">Add member</Button>
                      <Button variant="ghost" size="sm" onClick={() => setTeams(prev => prev.filter(x => x.id !== t.id))}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create team</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Team name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Engineering" />
              </div>
              <div className="flex justify-end">
                <Button onClick={addTeam} disabled={!name.trim()}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

