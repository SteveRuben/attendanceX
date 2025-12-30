import React, { useState } from 'react'
import Head from 'next/head'
import { ModernButton } from '@/components/ui/modern-button'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle, ModernCardDescription } from '@/components/ui/modern-card'
import { NotificationProvider, useNotify } from '@/components/ui/notification-system'
import { DashboardSkeleton, TextSkeleton, CardSkeleton, LoadingOverlay } from '@/components/ui/loading-skeleton'
import { ErrorDisplay, InlineError, EmptyState, createErrorInfo } from '@/components/ui/error-components'
import { EngagementDashboard } from '@/components/engagement/real-time-engagement'
import { 
  Plus, 
  Heart, 
  Star, 
  Users, 
  TrendingUp, 
  Calendar,
  Settings,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

const TestUIComponents: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [showError, setShowError] = useState(false)
  const notify = useNotify()

  const handleNotification = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        notify.success('Success!', 'Your action was completed successfully.')
        break
      case 'error':
        notify.error('Error!', 'Something went wrong. Please try again.')
        break
      case 'warning':
        notify.warning('Warning!', 'Please check your input and try again.')
        break
      case 'info':
        notify.info('Info', 'Here is some useful information for you.')
        break
    }
  }

  const mockParticipantStats = {
    total: 250,
    checkedIn: 187,
    active: 142,
    engagement: 78
  }

  const mockEngagementMetrics = {
    likes: 324,
    shares: 89,
    comments: 156,
    rating: 4.7,
    feedback: 67
  }

  const mockRealtimeEvents = [
    {
      id: '1',
      type: 'check_in' as const,
      participant: 'Alice Johnson',
      timestamp: new Date(Date.now() - 30000)
    },
    {
      id: '2', 
      type: 'like' as const,
      participant: 'Bob Smith',
      timestamp: new Date(Date.now() - 60000)
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>Test UI Components - AttendanceX</title>
      </Head>

      <div className="container mx-auto px-6 py-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Modern UI Components Test
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Testing the new modern UI components for AttendanceX
          </p>
        </div>

        {/* Modern Buttons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Modern Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Button Variants</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-3">
                <ModernButton variant="primary" icon={<Plus className="h-4 w-4" />} animation="scale">
                  Primary Button
                </ModernButton>
                <ModernButton variant="secondary" icon={<Settings className="h-4 w-4" />} animation="pulse">
                  Secondary Button
                </ModernButton>
                <ModernButton variant="outline" icon={<Download className="h-4 w-4" />} animation="bounce">
                  Outline Button
                </ModernButton>
                <ModernButton variant="ghost" icon={<Share2 className="h-4 w-4" />} animation="slide">
                  Ghost Button
                </ModernButton>
                <ModernButton variant="destructive" animation="scale">
                  Destructive Button
                </ModernButton>
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Button Sizes</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-3">
                <ModernButton size="sm" variant="primary">Small Button</ModernButton>
                <ModernButton size="md" variant="primary">Medium Button</ModernButton>
                <ModernButton size="lg" variant="primary">Large Button</ModernButton>
                <ModernButton fullWidth variant="secondary">Full Width Button</ModernButton>
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Button States</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent className="space-y-3">
                <ModernButton 
                  variant="primary" 
                  loading={loading}
                  onClick={() => {
                    setLoading(true)
                    setTimeout(() => setLoading(false), 2000)
                  }}
                >
                  {loading ? 'Loading...' : 'Click to Load'}
                </ModernButton>
                <ModernButton variant="secondary" disabled>
                  Disabled Button
                </ModernButton>
                <ModernButton variant="primary" icon={<Heart className="h-4 w-4" />} iconPosition="right">
                  Icon Right
                </ModernButton>
              </ModernCardContent>
            </ModernCard>
          </div>
        </section>

        {/* Modern Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Modern Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ModernCard hover elevation="md" animation="scale">
              <ModernCardHeader>
                <ModernCardTitle>Hover Card</ModernCardTitle>
                <ModernCardDescription>This card has hover effects</ModernCardDescription>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Hover over this card to see the animation effect.
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard status="success" gradient>
              <ModernCardHeader>
                <ModernCardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Success Card
                </ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  This is a success status card with gradient background.
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard status="warning" elevation="lg">
              <ModernCardHeader>
                <ModernCardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Warning Card
                </ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  This is a warning status card with high elevation.
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard glass elevation="xl">
              <ModernCardHeader>
                <ModernCardTitle>Glass Card</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  This card has a glass morphism effect.
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard clickable onClick={() => notify.info('Card Clicked', 'You clicked on the clickable card!')}>
              <ModernCardHeader>
                <ModernCardTitle>Clickable Card</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Click on this card to see the notification.
                </p>
              </ModernCardContent>
            </ModernCard>

            <ModernCard status="error">
              <ModernCardHeader>
                <ModernCardTitle>Error Card</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <InlineError 
                  message="This is an inline error message" 
                  type="error"
                />
              </ModernCardContent>
            </ModernCard>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle>Notification System</ModernCardTitle>
              <ModernCardDescription>Test different types of notifications</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="flex flex-wrap gap-3">
                <ModernButton 
                  variant="primary" 
                  size="sm"
                  onClick={() => handleNotification('success')}
                >
                  Success
                </ModernButton>
                <ModernButton 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleNotification('error')}
                >
                  Error
                </ModernButton>
                <ModernButton 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleNotification('warning')}
                >
                  Warning
                </ModernButton>
                <ModernButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleNotification('info')}
                >
                  Info
                </ModernButton>
                <ModernButton 
                  variant="ghost" 
                  size="sm"
                  onClick={() => notify.realTime('Real-time Update', 'New participant joined!', 'info')}
                >
                  Real-time
                </ModernButton>
              </div>
            </ModernCardContent>
          </ModernCard>
        </section>

        {/* Loading States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Loading States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Skeleton Loading</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <TextSkeleton lines={3} />
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Card Skeleton</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <CardSkeleton />
              </ModernCardContent>
            </ModernCard>
          </div>

          <LoadingOverlay loading={loading}>
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Loading Overlay</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  This content is behind a loading overlay when the loading state is active.
                </p>
              </ModernCardContent>
            </ModernCard>
          </LoadingOverlay>
        </section>

        {/* Error States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Error States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Error Display</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                {showError ? (
                  <ErrorDisplay
                    error={createErrorInfo(
                      'network',
                      'Network Error',
                      'Unable to connect to the server. Please check your connection.'
                    )}
                    onRetry={() => setShowError(false)}
                    showDetails={true}
                  />
                ) : (
                  <div className="text-center py-8">
                    <ModernButton 
                      variant="destructive" 
                      onClick={() => setShowError(true)}
                    >
                      Show Error
                    </ModernButton>
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>

            <ModernCard>
              <ModernCardHeader>
                <ModernCardTitle>Empty State</ModernCardTitle>
              </ModernCardHeader>
              <ModernCardContent>
                <EmptyState
                  icon={<Users className="h-12 w-12 text-gray-400" />}
                  title="No users found"
                  description="Get started by inviting your first team member."
                  action={{
                    label: 'Invite User',
                    onClick: () => notify.success('Invite', 'User invitation sent!'),
                    icon: <Plus className="h-4 w-4" />
                  }}
                />
              </ModernCardContent>
            </ModernCard>
          </div>
        </section>

        {/* Engagement Dashboard */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Engagement Dashboard</h2>
          <EngagementDashboard
            participantStats={mockParticipantStats}
            engagementMetrics={mockEngagementMetrics}
            realtimeEvents={mockRealtimeEvents}
            onEngagementAction={(action) => notify.success('Action', `${action} recorded!`)}
          />
        </section>

        {/* Dashboard Skeleton */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard Skeleton</h2>
          <DashboardSkeleton />
        </section>
      </div>
    </div>
  )
}

// Wrap with NotificationProvider
const TestUIComponentsWithNotifications: React.FC = () => (
  <NotificationProvider>
    <TestUIComponents />
  </NotificationProvider>
)

export default TestUIComponentsWithNotifications