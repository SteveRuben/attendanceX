import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { CampaignWizard } from '@/components/campaigns/CampaignWizard'

export default function CreateCampaignPage() {
  const router = useRouter()

  return (
    <AppShell title="Create Campaign">
      <CampaignWizard
        onComplete={() => router.push('/app/campaigns')}
        onCancel={() => router.back()}
      />
    </AppShell>
  )
}

