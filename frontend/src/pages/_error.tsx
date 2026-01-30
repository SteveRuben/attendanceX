import React from 'react'
import { NextPageContext } from 'next'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ErrorDisplay, createErrorInfo, getNetworkErrorInfo } from '@/components/ui/error-components'

interface ErrorProps {
  statusCode?: number
  hasGetInitialPropsRun?: boolean
  err?: Error
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  const router = useRouter()

  // Determine error type and create appropriate error info
  const getErrorInfo = () => {
    if (statusCode === 404) {
      return createErrorInfo(
        'notFound',
        'Page Not Found',
        'The page you are looking for could not be found.',
        { code: '404' }
      )
    }

    if (statusCode === 500) {
      return createErrorInfo(
        'server',
        'Server Error',
        'We\'re experiencing some technical difficulties. Please try again later.',
        { code: '500' }
      )
    }

    if (statusCode === 403) {
      return createErrorInfo(
        'permission',
        'Access Denied',
        'You don\'t have permission to access this resource.',
        { code: '403' }
      )
    }

    if (err) {
      return getNetworkErrorInfo(err)
    }

    return createErrorInfo(
      'generic',
      'Something went wrong',
      'An unexpected error occurred. Please try refreshing the page.',
      { 
        code: statusCode?.toString(),
        details: err?.message 
      }
    )
  }

  const errorInfo = getErrorInfo()

  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push('/app')
  }

  const handleGoBack = () => {
    router.back()
  }

  const getPageTitle = () => {
    switch (statusCode) {
      case 404:
        return 'Page Not Found - AttendanceX'
      case 500:
        return 'Server Error - AttendanceX'
      case 403:
        return 'Access Denied - AttendanceX'
      default:
        return 'Error - AttendanceX'
    }
  }

  return (
    <>
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="description" content={errorInfo.message} />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorDisplay
            error={errorInfo}
            onRetry={statusCode !== 404 ? handleRetry : undefined}
            onGoHome={handleGoHome}
            onGoBack={handleGoBack}
            showDetails={process.env.NODE_ENV === 'development'}
          />
          
          {/* Additional Information */}
          {statusCode && (
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Error Code: {statusCode}
              </p>
              {process.env.NODE_ENV === 'development' && err && (
                <details className="mt-2 text-left">
                  <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400">
                    Debug Information
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                    {err.stack || err.message}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error