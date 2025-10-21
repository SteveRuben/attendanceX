import { FormEvent, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Login() {
  const router = useRouter()
  const { status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') router.replace('/')
    return null
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) setError('Invalid credentials')
    else router.replace('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white rounded px-3 py-2">Sign in</button>
        <p className="text-sm text-center">
          No account? <Link className="text-blue-600" href="/auth/register">Create one</Link>
        </p>
      </form>
    </div>
  )
}

