import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { useTenant } from '@/contexts/TenantContext'
import { createTeam, deleteTeam, getTeams, Team } from '@/services/teamsService'

export default function TeamsPage() {
  const { currentTenant } = useTenant()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [department, setDepartment] = useState('')

  useEffect(() => {
    loadTeams()
  }, [currentTenant?.id])

  const loadTeams = async () => {
    if (!currentTenant?.id) return
    
    setLoading(true)
    try {
      const result = await getTeams(currentTenant.id)
      setTeams(result.data)
    } catch (error) {
      console.error('Failed to load teams:', error)
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  const addTeam = async () => {
    if (!name.trim() || !currentTenant?.id) return
    
    setCreating(true)
    try {
      await createTeam(currentTenant.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        department: department.trim() || undefined
      })
      setName('')
      setDescription('')
      setDepartment('')
      await loadTeams()
    } catch (error) {
      console.error('Failed to create team:', error)
    } finally {
      setCreating(false)
    }
  }

  const removeTeam = async (teamId: string) => {
    if (!currentTenant?.id) return
    
    try {
      await deleteTeam(currentTenant.id, teamId)
      await loadTeams()
    } catch (error) {
      console.error('Failed to delete team:', error)
    }
  }

  if (!currentTenant) {
    return (
      <AppShell title="Teams">
        <div className="p-6">
          <EmptyState 
            title="No Organization Selected" 
            description="Please select an organization to manage teams." 
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Teams">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Teams</h1>
                <p className="text-sm text-muted-foreground">
                  Manage teams for <span className="font-medium">{currentTenant.name}</span>
                </p>
                {teams.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {teams.length} team{teams.length !== 1 ? 's' : ''} found
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Teams ({teams.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border divide-y max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <div className="text-sm text-muted-foreground">Loading teams...</div>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="p-6">
                      <EmptyState 
                        title="No teams yet" 
                        description="Create your first team using the form on the right." 
                      />
                    </div>
                  ) : (
                    teams.map(team => (
                      <div key={team.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{team.name}</div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                            {team.department && (
                              <>
                                <span>{team.department}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              team.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {team.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {team.description && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {team.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeTeam(team.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Team name</Label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g., Engineering" 
                  />
                </div>
                <div>
                  <Label className="text-xs">Description (optional)</Label>
                  <Input 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Brief description of the team" 
                  />
                </div>
                <div>
                  <Label className="text-xs">Department (optional)</Label>
                  <Input 
                    value={department} 
                    onChange={e => setDepartment(e.target.value)} 
                    placeholder="e.g., IT, HR, Sales" 
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={addTeam} 
                    disabled={!name.trim() || creating}
                  >
                    {creating ? 'Creating...' : 'Create team'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

