'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/auth/business'
import { redirect } from 'next/navigation'

export async function saveBusinessDetails(formData: FormData) {
  const businessId = await getBusinessId()
  const service = createServiceClient()

  await service.from('businesses').update({
    name: formData.get('name') as string,
    owner_first_name: formData.get('ownerName') as string,
    phone_number: (formData.get('phone') as string) || null,
    service_area: (formData.get('serviceArea') as string) || null,
    timezone: formData.get('timezone') as string,
  }).eq('id', businessId)

  // Sync owner name to user_profiles
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await service.from('user_profiles')
      .update({ full_name: formData.get('ownerName') as string })
      .eq('id', user.id)
  }

  redirect('/onboarding/agent')
}

export async function saveAgentConfig(formData: FormData) {
  const businessId = await getBusinessId()
  const service = createServiceClient()

  const industry = formData.get('industry') as string

  // Pull current service_area — only overwrite if blank
  const { data: biz } = await service
    .from('businesses')
    .select('service_area')
    .eq('id', businessId)
    .maybeSingle()

  await service.from('businesses').update({
    is_active: true,
    ...(!biz?.service_area ? { service_area: industry } : {}),
  }).eq('id', businessId)

  redirect('/dashboard')
}
