import React, { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { ModernButton } from '@/components/ui/modern-button'
import { NotificationProvider, useNotify } from '@/components/ui/notification-system'
import { DashboardSkeleton, LoadingOverlay } from '@/components/ui/loading-skeleton'
import { EngagementDashboard } from '@/components/engagement/real-time-engagement'
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Settings, 
  Plus,
  Share2,
  Download,
  Filter,
  Search
} from 'lucide-react'

interface ParticipantStats {
  total: number;
  checkedIn: number;
  active: number;
  engagement: number;
}

interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  rating: number;
  feedback: number;
}

interface RealtimeEvent {
  id: string;
  type: 'check_in' | 'like' | 'comment' | 'share';
  participant: string;
  timestamp: Date;
}

const ModernEventDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [participantStats, setParticipantStats] = useState<ParticipantStats>({
    total: 0,
    checkedIn: 0,
    active: 0,
    engagement: 0
  })
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({
    likes: 0,
    shares: 0,
    comments: 0,
    rating: 0,
    feedback: 0
  })
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const notify = useNotify()

  // Load real data from API
  useEffect(() => {
    const loadEventData = async () => {
      try {
        // TODO: Replace with actual API calls
        // const stats = await eventService.getParticipantStats(eventId)
        // const metrics = await eventService.getEngagementMetrics(eventId)
        // const events = await eventService.getRealtimeEvents(eventId)
        
        // setParticipantStats(stats)
        // setEngagementMetrics(metrics)
        // setRealtimeEvents(events)
        
        setLoading(false)
      } catch (error) {
        console.error('Failed to load event data:', error)
        notify.error('Error', 'Failed to load event data')
        setLoading(false)
      }
    }

    loadEventData()
  }, [notify])

  const handleEngagementAction = (action: string) => {
    console.log('Engagement action:', action)
    // Handle engagement actions here
  }

  const handleExport = () => {
    notify.success('Export Started', 'Your report is being generated and will be ready shortly.')
  }

  const handleShare = () => {
    notify.info('Share Link', 'Event link copied to clipboard!')
  }

  if (loading) {
    return (
      <AppShell title="Event Dashboard">
        <div className="p-6">
          <DashboardSkeleton />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Modern Event Dashboard">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  Event Dashboard
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    Live
                  </span>
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Real-time event monitoring and engagement dashboard
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <ModernButton
                  variant="ghost"
                  size="sm"
                  icon={<Search className="h-4 w-4" />}
                  animation="scale"
                >
                  Search
                </ModernButton>
                <ModernButton
                  variant="ghost"
                  size="sm"
                  icon={<Filter className="h-4 w-4" />}
                  animation="scale"
                >
                  Filter
                </ModernButton>
                <ModernButton
                  variant="outline"
                  size="sm"
                  icon={<Share2 className="h-4 w-4" />}
                  onClick={handleShare}
                  animation="scale"
                >
                  Share
                </ModernButton>
                <ModernButton
                  variant="secondary"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  onClick={handleExport}
                  animation="scale"
                >
                  Export
                </ModernButton>
                <ModernButton
                  variant="primary"
                  size="sm"
                  icon={<Settings className="h-4 w-4" />}
                  animation="scale"
                >
                  Settings
                </ModernButton>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            <ModernCard hover elevation="md" gradient className="animate-fadeIn">
              <ModernCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">--</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      No data available
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>

            <ModernCard hover elevation="md" gradient className="animate-fadeIn animate-delay-100">
              <ModernCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {participantStats.total > 0 ? Math.round((participantStats.checkedIn / participantStats.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                      <Users className="h-3 w-3 mr-1" />
                      {participantStats.checkedIn} of {participantStats.total}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>

            <ModernCard hover elevation="md" gradient className="animate-fadeIn animate-delay-200">
              <ModernCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Satisfaction</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {engagementMetrics.rating > 0 ? `${engagementMetrics.rating}/5.0` : '--'}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center mt-1">
                      ⭐ Based on {engagementMetrics.feedback} reviews
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>

            <ModernCard hover elevation="md" gradient className="animate-fadeIn animate-delay-300">
              <ModernCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Now</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {participantStats.active}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center mt-1">
                      <div className="h-2 w-2 bg-purple-500 rounded-full mr-1 animate-pulse" />
                      Currently engaged
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>

          {/* Main Engagement Dashboard */}
          <div className="animate-fadeIn animate-delay-500">
            <EngagementDashboard
              participantStats={participantStats}
              engagementMetrics={engagementMetrics}
              realtimeEvents={realtimeEvents}
              onEngagementAction={handleEngagementAction}
            />
          </div>

          {/* Additional Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn animate-delay-700">
            <ModernCard hover elevation="lg">
              <ModernCardHeader gradient>
                <ModernCardTitle>Event Timeline</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="h-3 w-3 bg-blue-500 rounded-full" />
                    <div>
                      <p className="font-medium text-sm">Registration Opens</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">March 1, 2024 - 9:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <p className="font-medium text-sm">Event Live Now</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">March 15, 2024 - 10:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="h-3 w-3 bg-gray-400 rounded-full" />
                    <div>
                      <p className="font-medium text-sm">Networking Session</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">March 15, 2024 - 3:00 PM</p>
                    </div>
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>

            <ModernCard hover elevation="lg">
              <ModernCardHeader gradient>
                <ModernCardTitle>Quick Actions</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <div className="grid grid-cols-2 gap-3">
                  <ModernButton
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<Plus className="h-4 w-4" />}
                    animation="scale"
                  >
                    Add Session
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<Users className="h-4 w-4" />}
                    animation="scale"
                  >
                    Invite Speakers
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<Settings className="h-4 w-4" />}
                    animation="scale"
                  >
                    Event Settings
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<Download className="h-4 w-4" />}
                    animation="scale"
                  >
                    Download Report
                  </ModernButton>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// Wrap with NotificationProvider
const ModernEventDashboardWithNotifications: React.FC = () => (
  <NotificationProvider>
    <ModernEventDashboard />
  </NotificationProvider>
)

export default ModernEventDashboardWithNotifications