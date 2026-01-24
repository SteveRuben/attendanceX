import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useAuthTranslation } from '@/hooks/useTranslation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { apiClient } from '@/services/apiClient'
import { extractFieldErrors, extractMessage } from '@/utils/apiErrors'
import { showToast } from '@/hooks/use-toast'

export default function Register() {
  const router = useRouter()
  const { status } = useSession()
  const { t } = useAuthTranslation()
  const [error, setError] = useState<string | null>(null)
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required(t('register.first_name') + ' is required'),
      lastName: Yup.string().required(t('register.last_name') + ' is required'),
      email: Yup.string().email('Invalid email').required(t('register.email') + ' is required'),
      password: Yup.string().min(6, 'Min 6 characters').required(t('register.password') + ' is required'),
      confirmPassword: Yup.string().oneOf([Yup.ref('password')], 'Passwords must match').required('Confirm your password'),
      acceptTerms: Yup.boolean().oneOf([true], 'You must accept the terms'),
    }),
    onSubmit: async (values, { setSubmitting, setErrors }) => {
      setError(null)
      try {
        const res = await apiClient.post<any>('/auth/register', values, {
          withAuth: false,
          withToast: { loading: 'Creating your account...' }
        })
        const email = res?.email || values.email
        showToast({ title: t('register.verification_sent'), variant: 'success' })
        router.replace(`/auth/verify-email?email=${encodeURIComponent(email)}`)
      } catch (err: any) {
        setError(extractMessage(err))
        setErrors(extractFieldErrors(err))
      } finally {
        setSubmitting(false)
      }
    },
  })

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-900" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-neutral-500">Checking session...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') router.replace('/app')
    return null
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
          </Link>
          <LanguageSelector variant="compact" />
        </div>

        <div className="flex items-center justify-center">
          <form onSubmit={formik.handleSubmit} className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl space-y-4 overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-blue-200/50 dark:bg-blue-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-indigo-200/50 dark:bg-indigo-900/20 blur-3xl" />
            <h1 className="text-2xl font-semibold relative">{t('register.title')}</h1>
            {error && <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2 relative">{error}</p>}
            <div className="flex gap-2 relative">
              <div className="w-1/2">
                <Label htmlFor="firstName">{t('register.first_name')}</Label>
                <Input id="firstName" name="firstName" placeholder={t('register.first_name')} value={formik.values.firstName} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                {(formik.touched.firstName || formik.submitCount > 0) && formik.errors.firstName && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.firstName}</p>}
              </div>
              <div className="w-1/2">
                <Label htmlFor="lastName">{t('register.last_name')}</Label>
                <Input id="lastName" name="lastName" placeholder={t('register.last_name')} value={formik.values.lastName} onChange={formik.handleChange} onBlur={formik.handleBlur} />
                {(formik.touched.lastName || formik.submitCount > 0) && formik.errors.lastName && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.lastName}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="email">{t('register.email')}</Label>
              <Input id="email" name="email" type="email" placeholder={t('register.email')} value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {(formik.touched.email || formik.submitCount > 0) && formik.errors.email && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="password">{t('register.password')}</Label>
              <Input id="password" name="password" type="password" placeholder={t('register.password')} value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {(formik.touched.password || formik.submitCount > 0) && formik.errors.password && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.password}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('register.confirm_password')}</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" placeholder={t('register.confirm_password')} value={formik.values.confirmPassword} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {(formik.touched.confirmPassword || formik.submitCount > 0) && formik.errors.confirmPassword && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.confirmPassword}</p>}
            </div>
            <div className="flex items-start gap-2 text-sm relative">
              <Checkbox id="acceptTerms" checked={formik.values.acceptTerms} onCheckedChange={(v) => formik.setFieldValue('acceptTerms', !!v)} />
              <Label htmlFor="acceptTerms" className="leading-relaxed">
                I accept the{' '}
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  {t('register.terms_of_service')}
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  {t('register.privacy_policy')}
                </Link>
              </Label>
            </div>
            {(formik.submitCount > 0) && formik.errors.acceptTerms && <p className="-mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.acceptTerms}</p>}
            <Button type="submit" disabled={formik.isSubmitting} className="w-full">
              {formik.isSubmitting ? t('register.creating') : t('register.create_account')}
            </Button>
            <p className="text-sm text-center text-neutral-600 dark:text-neutral-300 relative">
              {t('register.already_have_account')} <Link className="text-blue-600 dark:text-blue-400 font-medium" href="/auth/login">{t('register.sign_in')}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}


export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'auth'])),
    },
  }
}