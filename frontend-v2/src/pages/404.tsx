import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ErrorDisplay, createErrorInfo } from '@/components/ui/error-components'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function Custom404() {
  const router = useRouter()

  const errorInfo = createErrorInfo(
    'notFound',
    'Page Not Found',
    'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
    {
      code: '404'
    }
  )

  const handleGoHome = () => {
    router.push('/app')
  }

  const handleGoBack = () => {
    router.back()
  }

  const handleSearch = () => {
    router.push('/app/search')
  }

  return (
    <>
      <Head>
        <title>Page Not Found - AttendanceX</title>
        <meta name="description" content="The page you are looking for could not be found." />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorDisplay
            error={errorInfo}
            onRetry={undefined}
            onGoHome={handleGoHome}
            onGoBack={handleGoBack}
            showDetails={false}
          />
          
          {/* Additional Actions */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You can also try:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={handleSearch}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <Search className="h-4 w-4" />
                Search the site
              </button>
              <button
                onClick={() => router.push('/app/help')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Get help
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}