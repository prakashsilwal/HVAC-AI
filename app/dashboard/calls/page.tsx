import { Phone } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import CallsList from '@/components/dashboard/CallsList'

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

async function getAllCalls(businessId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .order('started_at', { ascending: false })
    .limit(200)
  return data ?? []
}

export default async function CallsPage() {
  const calls = await getAllCalls(BUSINESS_ID)

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-zinc-200/80 bg-[#f5f5f7]/80 px-7 backdrop-blur-md">
        <div>
          <h1 className="text-[15px] font-semibold text-zinc-900">Calls</h1>
          <p className="text-xs text-zinc-400">{calls.length} total calls</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 shadow-sm">
          <Phone className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-600">All time</span>
        </div>
      </header>

      <div className="flex-1 p-7">
        <CallsList calls={calls} />
      </div>
    </div>
  )
}
