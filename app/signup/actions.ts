'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const businessName = formData.get('businessName') as string

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  const userId = data.user?.id
  if (!userId) redirect('/signup?error=Signup+failed')

  // Create business + profile
  const service = createServiceClient()

  const { data: business, error: bizError } = await service
    .from('businesses')
    .insert({
      owner_user_id: userId,
      name: businessName,
      afterhours_mode: 'takemessage',
      business_hours: {},
    })
    .select('id')
    .single()

  if (bizError) {
    redirect('/signup?error=' + encodeURIComponent(bizError.message))
  }

  await service.from('user_profiles').insert({
    id: userId,
    email,
    full_name: businessName,
    business_id: business.id,
    role: 'owner',
  })

  // Sign in immediately (works when email confirmation is disabled)
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    redirect('/login?verified=check-email')
  }

  redirect('/onboarding')
}
