import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL

export default function Register() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!API_URL) {
      setError('Missing API_URL')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, confirmPassword, acceptTerms })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || 'Registration failed')
      router.replace('/auth/login')
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <div className="flex gap-2">
          <input className="w-1/2 border rounded px-3 py-2" placeholder="First name" value={firstName} onChange={e=>setFirstName(e.target.value)} />
          <input className="w-1/2 border rounded px-3 py-2" placeholder="Last name" value={lastName} onChange={e=>setLastName(e.target.value)} />
        </div>
        <input type="email" className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full border rounded px-3 py-2" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <input type="password" className="w-full border rounded px-3 py-2" placeholder="Confirm Password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)} />
          <span>I accept the terms</span>
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-60">
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <p className="text-sm text-center">
          Already have an account? <Link className="text-blue-600" href="/auth/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}

