import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckInRecord, CheckInStats, getCheckInRecords, getCheckInStats } from '@/services/checkinService'

interface CheckInDashboardProps {
  eventId: string
  refreshInterval?: number
}

export function CheckInDashboard({ eventId, refreshInterval = 30000 }: CheckInDashboardProps) {
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [recentRecords, setRecentRecords] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadData()
    
    const interval = setInterval(loadData, refreshInterval)
    return () => clearInterval(interval)
  }, [eventId, refreshInterval])

  const loadData = async () => {
    try {
      const [statsData, recordsData] = await Promise.all([
        getCheckInStats(eventId),
        getCheckInRecords(eventId)
      ])
      
      setStats(statsData)
      setRecentRecords(recordsData.slice(0, 10)) // Show last 10 records
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'late': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'early': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'qr_code': return '📱'
      case 'pin_code': return '🔢'
      case 'manual': return '✋'
      case 'geofencing': return '📍'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Participants</div>
              </div>
              <div className="text-3xl">👥</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats?.checkedIn || 0}</div>
                <div className="text-sm text-muted-foreground">Checked In</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{Math.round(stats?.checkInRate || 0)}%</div>
                <div className="text-sm text-muted-foreground">Check-in Rate</div>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Check-ins</CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No check-ins yet
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getMethodIcon(record.method)}
                    </div>
                    <div>
                      <div className="font-medium">{record.userName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {record.method.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {stats && stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Check-in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{stats.checkedIn} / {stats.total}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(stats.checkInRate, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>{Math.round(stats.checkInRate)}%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}