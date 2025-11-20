import { apiClient } from '@/services/apiClient'

export type OnboardingStep = 'settings' | 'policy' | 'invite'

export interface OnboardingStatus {
  completed: boolean
  nextStep?: OnboardingStep
}

export async function getOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
  const res = await apiClient.get<OnboardingStatus>(`/tenants/${tenantId}/onboarding-status`, {
    withAuth: true,
  })
  return res
}

export async function markOnboardingComplete(tenantId: string) {
  await apiClient.post(`/tenants/${tenantId}/onboarding/complete`, {}, {
    withAuth: true,
    withToast: { loading: 'Finalizing...', success: 'Workspace ready' },
  })
}

