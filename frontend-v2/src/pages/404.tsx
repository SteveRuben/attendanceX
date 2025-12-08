import Head from 'next/head'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Head><title>Page not found</title></Head>
      <div className="text-center">
        <h1 className="text-4xl font-semibold mb-2">404</h1>
        <p className="text-neutral-500 mb-6">This page could not be found</p>
        <Link href="/app" className="text-blue-600 hover:underline">Go to app</Link>
      </div>
    </div>
  )
}

