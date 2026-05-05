import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@voicedesk.ai',
    password: 'demo1234',
  })

  return NextResponse.json({
    success: !error,
    user: data.user?.email ?? null,
    session: !!data.session,
    error: error?.message ?? null,
  })
}
