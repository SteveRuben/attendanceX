import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { ModernButton } from '@/components/ui/modern-button'
import { useNotify } from '@/components/ui/notification-system'
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Star,
  MessageSquare,
  Heart,
  Share2,
  BarChart3
} from 'lucide-react'

// Types for engagement data
interface ParticipantStats {
  total: number
  checkedIn: number
  active: number
  engagement: number
}

interface EngagementMetrics {
  likes: number
  shares: number
  comments: number
  rating: number
  feedback: number
}

interface RealTimeEvent {
  id: string
  type: 'check_in' | 'like' | 'comment' | 'share' | 'rating'
  participant: string
  timestamp: Date
  data?: any
}

// Real-time participant counter with animations
export const LiveParticipantCounter: React.FC<{
  stats: ParticipantStats
  className?: string
}> = ({ stats, className }) => {
  const [animatedStats, setAnimatedStats] = useState(stats)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (JSON.stringify(stats) !== JSON.stringify(animatedStats)) {
      setIsUpdating(true)
      
      // Animate the counter changes
      const timer = setTimeout(() => {
        setAnimatedStats(stats)
        setIsUpdating(false)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [stats, animatedStats])

  const StatCard: React.FC<{
    icon: React.ReactNode
    label: string
    value: number
    color: string
    trend?: number
  }> = ({ icon, label, value, color, trend }) => (
    <div className={cn(
      'flex items-center space-x-3 p-4 rounded-lg border transition-all duration-300',
      `border-${color}-200 bg-${color}-50/50 dark:border-${color}-800 dark:bg-${color}-900/20`,
      isUpdating && 'scale-105 shadow-lg'
    )}>
      <div className={cn(
        'p-2 rounded-full',
        `bg-${color}-100 text-${color}-600 dark:bg-${color}-900/50 dark:text-${color}-400`
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        <div className="flex items-center space-x-2">
          <span className={cn(
            'text-2xl font-bold transition-all duration-500',
            `text-${color}-600 dark:text-${color}-400`,
            isUpdating && 'scale-110'
          )}>
            {value.toLocaleString()}
          </span>
          {trend !== undefined && (
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              trend > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
            )}>
              {trend > 0 ? '+' : ''}{trend}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <ModernCard className={cn('overflow-hidden', className)} hover elevation="lg">
      <ModernCardHeader gradient>
        <ModernCardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Live Participants
          <div className="ml-auto flex items-center space-x-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 font-medium">LIVE</span>
          </div>
        </ModernCardTitle>
      </ModernCardHeader>
      <ModernCardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Total Registered"
            value={animatedStats.total}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="h-4 w-4" />}
            label="Checked In"
            value={animatedStats.checkedIn}
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Currently Active"
            value={animatedStats.active}
            color="purple"
          />
          <StatCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Engagement Rate"
            value={animatedStats.engagement}
            color="orange"
          />
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Check-in Progress</span>
            <span className="font-medium">
              {Math.round((animatedStats.checkedIn / animatedStats.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(animatedStats.checkedIn / animatedStats.total) * 100}%` }}
            />
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  )
}

// Real-time engagement metrics
export const EngagementMetrics: React.FC<{
  metrics: EngagementMetrics
  onAction?: (action: string) => void
  className?: string
}> = ({ metrics, onAction, className }) => {
  const [animatedMetrics, setAnimatedMetrics] = useState(metrics)
  const notify = useNotify()

  useEffect(() => {
    // Animate metric changes
    const timer = setTimeout(() => {
      setAnimatedMetrics(metrics)
    }, 200)
    return () => clearTimeout(timer)
  }, [metrics])

  const handleAction = (action: string) => {
    onAction?.(action)
    notify.success('Action Recorded', `Your ${action} has been recorded!`, { duration: 2000 })
  }

  const MetricButton: React.FC<{
    icon: React.ReactNode
    label: string
    value: number
    action: string
    color: string
  }> = ({ icon, label, value, action, color }) => (
    <ModernButton
      variant="ghost"
      size="sm"
      onClick={() => handleAction(action)}
      className={cn(
        'flex-col h-auto p-4 space-y-2 transition-all duration-200',
        `hover:bg-${color}-50 hover:border-${color}-200 dark:hover:bg-${color}-900/20`
      )}
    >
      <div className="flex items-center space-x-2">
        {icon}
        <span className="font-semibold text-lg">{value}</span>
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </ModernButton>
  )

  return (
    <ModernCard className={cn('overflow-hidden', className)} hover elevation="md">
      <ModernCardHeader>
        <ModernCardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Engagement
        </ModernCardTitle>
      </ModernCardHeader>
      <ModernCardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <MetricButton
            icon={<Heart className="h-4 w-4 text-red-500" />}
            label="Likes"
            value={animatedMetrics.likes}
            action="like"
            color="red"
          />
          <MetricButton
            icon={<Share2 className="h-4 w-4 text-blue-500" />}
            label="Shares"
            value={animatedMetrics.shares}
            action="share"
            color="blue"
          />
          <MetricButton
            icon={<MessageSquare className="h-4 w-4 text-green-500" />}
            label="Comments"
            value={animatedMetrics.comments}
            action="comment"
            color="green"
          />
          <MetricButton
            icon={<Star className="h-4 w-4 text-yellow-500" />}
            label="Rating"
            value={animatedMetrics.rating}
            action="rate"
            color="yellow"
          />
          <MetricButton
            icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
            label="Feedback"
            value={animatedMetrics.feedback}
            action="feedback"
            color="purple"
          />
        </div>
      </ModernCardContent>
    </ModernCard>
  )
}

// Real-time activity feed
export const RealTimeActivityFeed: React.FC<{
  events: RealTimeEvent[]
  className?: string
}> = ({ events, className }) => {
  const [visibleEvents, setVisibleEvents] = useState<RealTimeEvent[]>([])

  useEffect(() => {
    // Animate new events coming in
    events.forEach((event, index) => {
      setTimeout(() => {
        setVisibleEvents(prev => {
          const newEvents = [event, ...prev.slice(0, 9)] // Keep only last 10 events
          return newEvents
        })
      }, index * 100)
    })
  }, [events])

  const getEventIcon = (type: RealTimeEvent['type']) => {
    switch (type) {
      case 'check_in': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'like': return <Heart className="h-4 w-4 text-red-500" />
      case 'comment': return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'share': return <Share2 className="h-4 w-4 text-purple-500" />
      case 'rating': return <Star className="h-4 w-4 text-yellow-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventMessage = (event: RealTimeEvent) => {
    switch (event.type) {
      case 'check_in': return `${event.participant} checked in`
      case 'like': return `${event.participant} liked the event`
      case 'comment': return `${event.participant} left a comment`
      case 'share': return `${event.participant} shared the event`
      case 'rating': return `${event.participant} rated the event`
      default: return `${event.participant} performed an action`
    }
  }

  return (
    <ModernCard className={cn('overflow-hidden', className)} elevation="md">
      <ModernCardHeader>
        <ModernCardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Live Activity
          <div className="ml-auto h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </ModernCardTitle>
      </ModernCardHeader>
      <ModernCardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {visibleEvents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          ) : (
            visibleEvents.map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                className={cn(
                  'flex items-center space-x-3 p-2 rounded-lg transition-all duration-300',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                  'animate-slideInLeft'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {getEventIcon(event.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getEventMessage(event)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ModernCardContent>
    </ModernCard>
  )
}

// Combined engagement dashboard
export const EngagementDashboard: React.FC<{
  participantStats: ParticipantStats
  engagementMetrics: EngagementMetrics
  realtimeEvents: RealTimeEvent[]
  onEngagementAction?: (action: string) => void
  className?: string
}> = ({ 
  participantStats, 
  engagementMetrics, 
  realtimeEvents, 
  onEngagementAction,
  className 
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveParticipantCounter stats={participantStats} />
        <EngagementMetrics 
          metrics={engagementMetrics} 
          onAction={onEngagementAction}
        />
      </div>
      <RealTimeActivityFeed events={realtimeEvents} />
    </div>
  )
}