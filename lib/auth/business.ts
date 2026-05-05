import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getBusinessId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('business_id')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.business_id ?? '00000000-0000-0000-0000-000000000001'
}
