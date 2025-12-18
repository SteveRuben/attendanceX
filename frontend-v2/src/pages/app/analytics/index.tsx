import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Activity, Target, BarChart3, Cpu } from 'lucide-react'
import { getMLHealth, getMLAnalytics, detectAnomalies, generateInsights, getRecommendations, MLHealthStatus, MLAnalytics, MLAnomaly, MLInsight, MLRecommendation } from '@/services/mlService'

type TabType = 'overview' | 'predictions' | 'anomalies' | 'insights'

export default function MLDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [health, setHealth] = useState<MLHealthStatus | null>(null)
  const [analytics, setAnalytics] = useState<MLAnalytics | null>(null)
  const [anomalies, setAnomalies] = useState<MLAnomaly[]>([])
  const [insights, setInsights] = useState<MLInsight[]>([])
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [healthRes, analyticsRes, anomaliesRes, insightsRes, recsRes] = await Promise.allSettled([
        getMLHealth(),
        getMLAnalytics({ period: 'week' }),
        detectAnomalies({ scope: 'organization', timeframe: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() }, sensitivity: 'medium' }),
        generateInsights({ scope: 'organization', timeframe: 'last_week', depth: 'summary', includeRecommendations: true }),
        getRecommendations({ type: 'event_optimization', context: { timeframe: 'next_month' }, focus: ['attendance_optimization', 'scheduling'] }),
      ])
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value)
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value)
      if (anomaliesRes.status === 'fulfilled') setAnomalies(anomaliesRes.value.anomalies || [])
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value.insights || [])
      if (recsRes.status === 'fulfilled') setRecommendations(recsRes.value.recommendations || [])
    } catch (err) {
      console.error('Failed to load ML data:', err)
    } finally {
      setLoading(false)
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
    { id: 'predictions', label: 'Predictions', icon: <Target className="h-4 w-4" /> },
    { id: 'anomalies', label: 'Anomalies', icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'insights', label: 'Insights', icon: <Lightbulb className="h-4 w-4" /> },
  ]

  return (
    <AppShell title="ML Dashboard">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><Brain className="h-6 w-6 text-blue-500" /> ML Analytics</h1>
            <p className="text-sm text-neutral-500 mt-1">AI-powered insights and predictions for attendance optimization</p>
          </div>
          <Button onClick={loadData} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>

        <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><BarChart3 className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-neutral-500">Total Predictions</p><p className="text-2xl font-semibold">{analytics?.usage?.totalPredictions?.toLocaleString() ?? '-'}</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-neutral-500">Accuracy</p><p className="text-2xl font-semibold">{analytics?.accuracy?.overall ? `${(analytics.accuracy.overall * 100).toFixed(1)}%` : '-'}</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-neutral-500">Anomalies Detected</p><p className="text-2xl font-semibold">{anomalies.length}</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Cpu className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-neutral-500">System Status</p><p className="text-2xl font-semibold capitalize">{health?.status ?? 'Unknown'}</p></div></div></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Recent Insights</CardTitle></CardHeader>
                <CardContent>
                  {insights.length === 0 ? <p className="text-sm text-neutral-500">No insights available</p> : (
                    <div className="space-y-3">{insights.slice(0, 3).map((insight, i) => (
                      <div key={i} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs text-neutral-500 mt-1">{insight.description}</p>
                        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${insight.impact === 'high' ? 'bg-red-100 text-red-700' : insight.impact === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{insight.impact} impact</span>
                      </div>
                    ))}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-blue-500" /> Recommendations</CardTitle></CardHeader>
                <CardContent>
                  {recommendations.length === 0 ? <p className="text-sm text-neutral-500">No recommendations available</p> : (
                    <div className="space-y-3">{recommendations.slice(0, 3).map((rec, i) => (
                      <div key={i} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                        <div className="flex items-center justify-between"><p className="font-medium text-sm">{rec.title}</p><span className={`text-xs px-2 py-0.5 rounded-full ${rec.priority === 'high' ? 'bg-red-100 text-red-700' : rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{rec.priority}</span></div>
                        <p className="text-xs text-neutral-500 mt-1">{rec.description}</p>
                        {rec.impact && <p className="text-xs text-blue-600 mt-1">Expected: +{(rec.impact.expectedImprovement * 100).toFixed(0)}% {rec.impact.metric}</p>}
                      </div>
                    ))}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Detected Anomalies</CardTitle></CardHeader>
            <CardContent>
              {anomalies.length === 0 ? <p className="text-sm text-neutral-500">No anomalies detected in the selected timeframe</p> : (
                <div className="space-y-4">{anomalies.map((anomaly, i) => (
                  <div key={i} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-start justify-between">
                      <div><p className="font-medium">{anomaly.description}</p>{anomaly.event && <p className="text-sm text-neutral-500 mt-1">Event: {anomaly.event.name}</p>}</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${anomaly.severity === 'high' ? 'bg-red-100 text-red-700' : anomaly.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{anomaly.severity}</span>
                    </div>
                    {anomaly.possibleCauses?.length > 0 && <div className="mt-3"><p className="text-xs font-medium text-neutral-500">Possible causes:</p><ul className="text-xs text-neutral-600 mt-1 list-disc list-inside">{anomaly.possibleCauses.map((c, j) => <li key={j}>{c}</li>)}</ul></div>}
                    {anomaly.recommendations?.length > 0 && <div className="mt-3"><p className="text-xs font-medium text-neutral-500">Recommendations:</p><ul className="text-xs text-blue-600 mt-1 list-disc list-inside">{anomaly.recommendations.map((r, j) => <li key={j}>{r}</li>)}</ul></div>}
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'insights' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> AI-Generated Insights</CardTitle></CardHeader>
            <CardContent>
              {insights.length === 0 ? <p className="text-sm text-neutral-500">No insights available</p> : (
                <div className="space-y-4">{insights.map((insight, i) => (
                  <div key={i} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-start justify-between"><div><span className="text-xs text-blue-600 font-medium uppercase">{insight.category}</span><p className="font-medium mt-1">{insight.title}</p></div><span className={`text-xs px-2 py-1 rounded-full ${insight.impact === 'high' ? 'bg-red-100 text-red-700' : insight.impact === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{insight.impact} impact</span></div>
                    <p className="text-sm text-neutral-600 mt-2">{insight.description}</p>
                    <p className="text-xs text-neutral-500 mt-2">Confidence: {(insight.confidence * 100).toFixed(0)}%</p>
                    {insight.recommendations?.length > 0 && <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800"><p className="text-xs font-medium text-neutral-500">Recommendations:</p><ul className="text-xs text-blue-600 mt-1 list-disc list-inside">{insight.recommendations.map((r, j) => <li key={j}>{r}</li>)}</ul></div>}
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'predictions' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-blue-500" /> Attendance Predictions</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-neutral-500">Select an event to view attendance predictions. Visit the <a href="/app/analytics/predictions" className="text-blue-600 hover:underline">Predictions page</a> for detailed analysis.</p></CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}

