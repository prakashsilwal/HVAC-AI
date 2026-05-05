import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SidebarNav from '@/components/dashboard/SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('full_name, email, business_id')
    .eq('id', user.id)
    .maybeSingle()

  let businessName: string | null = null
  if (profile?.business_id) {
    const { data: biz } = await serviceClient
      .from('businesses')
      .select('name, owner_first_name')
      .eq('id', profile.business_id)
      .maybeSingle()
    businessName = biz?.name ?? null

    // First-time user — send to onboarding
    if (!biz?.owner_first_name) {
      redirect('/onboarding')
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f7]">
      <SidebarNav
        userName={profile?.full_name ?? user.email ?? 'User'}
        userEmail={profile?.email ?? user.email ?? ''}
        businessName={businessName ?? 'My Business'}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
