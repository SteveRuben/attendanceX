import Head from 'next/head'
import Link from 'next/link'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Head><title>Unauthorized</title></Head>
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">You don't have access to this page</h1>
        <p className="text-neutral-500 mb-6">Contact your administrator for permissions</p>
        <Link href="/app" className="text-blue-600 hover:underline">Go to app</Link>
      </div>
    </div>
  )
}

