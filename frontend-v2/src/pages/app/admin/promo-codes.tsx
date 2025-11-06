import { useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'

interface Promo {
  id: string
  code: string
  percent: number
  active: boolean
}

const initial: Promo[] = []

export default function PromoCodesPage() {
  const [list, setList] = useState<Promo[]>(initial)
  const [code, setCode] = useState('')
  const [percent, setPercent] = useState(10)

  const add = () => {
    if (!code || percent <= 0) return
    setList(prev => [{ id: Math.random().toString(36).slice(2), code: code.toUpperCase(), percent, active: true }, ...prev])
    setCode('')
    setPercent(10)
  }

  const toggle = (id: string) => setList(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))
  const remove = (id: string) => setList(prev => prev.filter(p => p.id !== id))

  return (
    <AppShell title="Promo codes">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Promo codes</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Codes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border divide-y">
                {list.length === 0 ? (
                  <EmptyState title="No promo codes" description="Add a promo code from the form on the right." />
                ) : list.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.code}</div>
                      <div className="text-xs text-muted-foreground">{p.percent}% off</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => toggle(p.id)}>{p.active ? 'Disable' : 'Enable'}</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Add code</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Code</Label>
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g., SAVE20" />
              </div>
              <div>
                <Label className="text-xs">Discount (%)</Label>
                <Input type="number" min={1} max={100} value={percent} onChange={e => setPercent(Number(e.target.value || 0))} />
              </div>
              <div className="flex justify-end">
                <Button onClick={add} disabled={!code || percent <= 0}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

