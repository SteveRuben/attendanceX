import { AppShell } from '@/components/layout/AppShell'
import { EmailConfigSection } from '@/components/email-config/EmailConfigSection'
import { Mail } from 'lucide-react'

export default function EmailSettingsPage() {
  return (
    <AppShell title="Configuration Email">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Mail className="h-6 w-6" /> Configuration Email
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les paramètres SMTP et les providers email de votre organisation
            </p>
          </div>

          {/* Configuration Email Section */}
          <EmailConfigSection />
        </div>
      </div>
    </AppShell>
  )
}