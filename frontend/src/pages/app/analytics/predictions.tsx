import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Target, Users, TrendingUp, AlertCircle, CheckCircle, Search, Filter } from 'lucide-react'
import { predictAttendance, AttendancePrediction } from '@/services/mlService'
import { getEvents } from '@/services/eventsService'

interface Event {
  id: string
  title: string
  startDate: string
  location?: string
}

export default function PredictionsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [prediction, setPrediction] = useState<AttendancePrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('all')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setEventsLoading(true)
    try {
      const response = await getEvents({ status: 'upcoming', limit: 50 })
      setEvents(response.data || [])
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setEventsLoading(false)
    }
  }

  const handlePredict = async () => {
    if (!selectedEventId) return
    setLoading(true)
    try {
      const result = await predictAttendance({
        eventId: selectedEventId,
        predictionType: 'individual',
        timeHorizon: '7d',
        factors: { weather: true, historical: true, demographics: true, seasonality: true },
      })
      setPrediction(result)
    } catch (err) {
      console.error('Failed to get prediction:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredParticipants = prediction?.individual?.filter(p => {
    const matchesSearch = searchQuery === '' || `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRisk = riskFilter === 'all' || (riskFilter === 'high' && p.attendanceProbability < 0.5) || (riskFilter === 'medium' && p.attendanceProbability >= 0.5 && p.attendanceProbability < 0.8) || (riskFilter === 'low' && p.attendanceProbability >= 0.8)
    return matchesSearch && matchesRisk
  }) || []

  const getRiskColor = (probability: number) => {
    if (probability >= 0.8) return 'text-green-600 bg-green-100'
    if (probability >= 0.5) return 'text-amber-600 bg-amber-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <AppShell title="Attendance Predictions">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Target className="h-6 w-6 text-blue-500" /> Attendance Predictions</h1>
          <p className="text-sm text-neutral-500 mt-1">AI-powered attendance probability predictions for your events</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Select Event</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="event">Event</Label>
                <select id="event" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-full h-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 mt-1" disabled={eventsLoading}>
                  <option value="">Select an event...</option>
                  {events.map(event => <option key={event.id} value={event.id}>{event.title} - {new Date(event.startDate).toLocaleDateString()}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handlePredict} disabled={!selectedEventId || loading}>{loading ? 'Analyzing...' : 'Generate Prediction'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {prediction && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-neutral-500">Expected Attendance</p><p className="text-2xl font-semibold">{prediction.overall.expectedAttendance} / {prediction.overall.totalRegistered}</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-neutral-500">Predicted Rate</p><p className="text-2xl font-semibold">{(prediction.overall.predictedRate * 100).toFixed(1)}%</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><CheckCircle className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-neutral-500">Confidence</p><p className="text-2xl font-semibold">{(prediction.overall.confidence * 100).toFixed(1)}%</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${prediction.overall.riskLevel === 'high' ? 'bg-red-100' : prediction.overall.riskLevel === 'medium' ? 'bg-amber-100' : 'bg-green-100'}`}><AlertCircle className={`h-5 w-5 ${prediction.overall.riskLevel === 'high' ? 'text-red-600' : prediction.overall.riskLevel === 'medium' ? 'text-amber-600' : 'text-green-600'}`} /></div><div><p className="text-sm text-neutral-500">Risk Level</p><p className="text-2xl font-semibold capitalize">{prediction.overall.riskLevel}</p></div></div></CardContent></Card>
            </div>

            {prediction.insights && (
              <Card>
                <CardHeader><CardTitle>Key Factors & Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-neutral-500 mb-3">Key Influencing Factors</p>
                      <div className="space-y-2">{prediction.insights.keyFactors.map((factor, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/50">
                          <span className="text-sm">{factor.description}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${factor.impact > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{factor.impact > 0 ? '+' : ''}{(factor.impact * 100).toFixed(0)}%</span>
                        </div>
                      ))}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 mb-3">Recommendations</p>
                      <ul className="space-y-2">{prediction.insights.recommendations.map((rec, i) => <li key={i} className="text-sm text-blue-600 flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{rec}</li>)}</ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {prediction.individual && prediction.individual.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Individual Predictions</CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" /><Input placeholder="Search participants..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-64" /></div>
                      <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="h-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 text-sm">
                        <option value="all">All Risk Levels</option>
                        <option value="high">High Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="low">Low Risk</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-neutral-200 dark:border-neutral-700"><th className="text-left py-3 px-4 font-medium">Participant</th><th className="text-left py-3 px-4 font-medium">Probability</th><th className="text-left py-3 px-4 font-medium">Confidence</th><th className="text-left py-3 px-4 font-medium">Risk Factors</th></tr></thead>
                      <tbody>{filteredParticipants.map((p, i) => (
                        <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
                          <td className="py-3 px-4 font-medium">{p.firstName} {p.lastName}</td>
                          <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(p.attendanceProbability)}`}>{(p.attendanceProbability * 100).toFixed(0)}%</span></td>
                          <td className="py-3 px-4 text-neutral-500">{(p.confidence * 100).toFixed(0)}%</td>
                          <td className="py-3 px-4">{p.riskFactors.length > 0 ? <span className="text-xs text-red-600">{p.riskFactors.join(', ')}</span> : <span className="text-xs text-neutral-400">None</span>}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

