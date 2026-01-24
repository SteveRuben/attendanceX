import React from 'react'
import { useTranslation, useCommonTranslation, useAuthTranslation } from '@/hooks/useTranslation'
import { useDateFormat } from '@/hooks/useDateFormat'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function I18nDemo() {
  const { t: tCommon } = useCommonTranslation()
  const { t: tAuth } = useAuthTranslation()
  const { currentLocale } = useTranslation()
  const { formatDateTime, formatDateOnly, formatRelativeTime } = useDateFormat()

  const now = new Date()
  const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Internationalization Demo</h1>
        <LanguageSelector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Common Translations */}
        <Card>
          <CardHeader>
            <CardTitle>{tCommon('app.name')} - Common Translations</CardTitle>
            <CardDescription>Current locale: {currentLocale}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Navigation</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{tCommon('navigation.dashboard')}</Badge>
                <Badge variant="outline">{tCommon('navigation.events')}</Badge>
                <Badge variant="outline">{tCommon('navigation.users')}</Badge>
                <Badge variant="outline">{tCommon('navigation.settings')}</Badge>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline">{tCommon('common.save')}</Button>
                <Button size="sm" variant="outline">{tCommon('common.cancel')}</Button>
                <Button size="sm" variant="outline">{tCommon('common.delete')}</Button>
                <Button size="sm" variant="outline">{tCommon('common.edit')}</Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Status</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-800">{tCommon('status.active')}</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">{tCommon('status.pending')}</Badge>
                <Badge className="bg-gray-100 text-gray-800">{tCommon('status.inactive')}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth Translations */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Translations</CardTitle>
            <CardDescription>Login and registration forms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Login Form</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {tAuth('login.title')}</p>
                <p><strong>Email:</strong> {tAuth('login.email')}</p>
                <p><strong>Password:</strong> {tAuth('login.password')}</p>
                <p><strong>Sign In:</strong> {tAuth('login.sign_in')}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Register Form</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {tAuth('register.title')}</p>
                <p><strong>First Name:</strong> {tAuth('register.first_name')}</p>
                <p><strong>Last Name:</strong> {tAuth('register.last_name')}</p>
                <p><strong>Create Account:</strong> {tAuth('register.create_account')}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Legal</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Terms:</strong> {tAuth('register.terms_of_service')}</p>
                <p><strong>Privacy:</strong> {tAuth('register.privacy_policy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Formatting */}
        <Card>
          <CardHeader>
            <CardTitle>Date Localization</CardTitle>
            <CardDescription>Formatted dates in current locale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current Time</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Full:</strong> {formatDateTime(now)}</p>
                <p><strong>Date Only:</strong> {formatDateOnly(now)}</p>
                <p><strong>Relative:</strong> {formatRelativeTime(pastDate)}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Time Expressions</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Today:</strong> {tCommon('time.today')}</p>
                <p><strong>Yesterday:</strong> {tCommon('time.yesterday')}</p>
                <p><strong>This Week:</strong> {tCommon('time.this_week')}</p>
                <p><strong>This Month:</strong> {tCommon('time.this_month')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Selector Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Language Selector Variants</CardTitle>
            <CardDescription>Different styles of language selection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Default</h3>
              <LanguageSelector />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Compact</h3>
              <LanguageSelector variant="compact" />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Icon Only</h3>
              <LanguageSelector variant="icon-only" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>App Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>App Name:</strong> {tCommon('app.name')}
            </div>
            <div>
              <strong>Tagline:</strong> {tCommon('app.tagline')}
            </div>
            <div>
              <strong>Current Locale:</strong> {currentLocale}
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {tCommon('app.description')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}