// Authentication debugging utility
import { getSession } from 'next-auth/react'

export async function debugAuthStatus() {
  if (typeof window === 'undefined') {
    console.log('❌ Not running in browser environment')
    return
  }

  console.log('🔍 Authentication Debug Report')
  console.log('================================')

  // Check session
  try {
    const session = await getSession()
    console.log('📋 Session Status:')
    console.log('  - Has session:', !!session)
    console.log('  - Has access token:', !!(session as any)?.accessToken)
    console.log('  - Token length:', (session as any)?.accessToken?.length || 0)
    console.log('  - User email:', (session as any)?.user?.email || 'none')
    console.log('  - Session expires:', (session as any)?.expires || 'unknown')
  } catch (error) {
    console.error('❌ Error getting session:', error)
  }

  // Check localStorage
  console.log('\n💾 Local Storage:')
  console.log('  - Current tenant ID:', localStorage.getItem('currentTenantId') || 'none')
  console.log('  - Other auth keys:', Object.keys(localStorage).filter(k => 
    k.includes('auth') || k.includes('token') || k.includes('session')
  ))

  // Check cookies
  console.log('\n🍪 Cookies:')
  const cookies = document.cookie.split(';').map(c => c.trim().split('=')[0])
  const authCookies = cookies.filter(c => 
    c.includes('auth') || c.includes('token') || c.includes('session')
  )
  console.log('  - Auth-related cookies:', authCookies.length > 0 ? authCookies : 'none')

  // Check current URL
  console.log('\n🌐 Current Context:')
  console.log('  - Current URL:', window.location.href)
  console.log('  - Is auth page:', window.location.pathname.includes('/auth/'))
  console.log('  - User agent:', navigator.userAgent.substring(0, 50) + '...')

  console.log('\n💡 Recommendations:')
  console.log('  1. If no session: Go to /auth/login')
  console.log('  2. If no token: Clear storage and re-login')
  console.log('  3. If token expired: Refresh the page')
  console.log('  4. If persistent issues: Clear all browser data')
}

// Add to window for easy access in dev tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugAuth = debugAuthStatus
}