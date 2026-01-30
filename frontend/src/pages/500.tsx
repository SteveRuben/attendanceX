import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ErrorDisplay, createErrorInfo } from '@/components/ui/error-components'
import { RefreshCw } from 'lucide-react'

export default function Custom500() {
  const router = useRouter()

  const errorInfo = createErrorInfo(
    'server',
    'Server Error',
    'We\'re experiencing some technical difficulties. Our team has been notified and is working to fix the issue.',
    {
      code: '500'
    }
  )

  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push('/app')
  }

  const handleGoBack = () => {
    router.back()
  }

  return (
    <>
      <Head>
        <title>Server Error - AttendanceX</title>
        <meta name="description" content="We're experiencing technical difficulties. Please try again later." />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorDisplay
            error={errorInfo}
            onRetry={handleRetry}
            onGoHome={handleGoHome}
            onGoBack={handleGoBack}
            showDetails={process.env.NODE_ENV === 'development'}
          />
          
          {/* Status Information */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If the problem persists, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}