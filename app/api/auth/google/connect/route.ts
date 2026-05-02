import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google/oauth'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('business_id')
    .eq('id', user.id)
    .single() as { data: { business_id: string | null } | null }

  if (!profile?.business_id) {
    return NextResponse.json({ error: 'No business found' }, { status: 400 })
  }

  const authUrl = getAuthUrl(profile.business_id)
  return NextResponse.redirect(authUrl)
}
