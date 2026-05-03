import { Suspense } from 'react'
import { Phone, TrendingUp, CalendarCheck, DollarSign, Mic } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import StatsCard from '@/components/dashboard/StatsCard'
import CallsList from '@/components/dashboard/CallsList'

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

async function getStats(businessId: string) {
  const supabase = createServiceClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalCalls, weekCalls, bookings] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', businessId).gte('started_at', oneWeekAgo),
    supabase.from('bookings').select('id, estimated_value').eq('business_id', businessId),
  ])

  const revenue = (bookings.data ?? []).reduce((sum, b) => sum + (b.estimated_value ?? 0), 0)

  return {
    totalCalls:   totalCalls.count  ?? 0,
    weekCalls:    weekCalls.count   ?? 0,
    bookingCount: bookings.data?.length ?? 0,
    revenue,
  }
}

async function getRecentCalls(businessId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('calls')
    .select('*')
    .eq('business_id', businessId)
    .order('started_at', { ascending: false })
    .limit(25)
  return data ?? []
}

export default async function DashboardPage() {
  const [stats, calls] = await Promise.all([
    getStats(BUSINESS_ID),
    getRecentCalls(BUSINESS_ID),
  ])

  return (
    <div className="flex flex-col min-h-full">
      {/* Top header bar */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-zinc-200/80 bg-[#f5f5f7]/80 px-7 backdrop-blur-md">
        <div>
          <h1 className="text-[15px] font-semibold text-zinc-900">Overview</h1>
          <p className="text-xs text-zinc-400">Acme HVAC</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <Mic className="h-3 w-3 text-emerald-600" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">Sarah is live</span>
        </div>
      </header>

      <div className="flex-1 p-7 space-y-7">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            label="Total Calls"
            value={stats.totalCalls}
            sub="All time"
            icon={Phone}
            color="blue"
          />
          <StatsCard
            label="This Week"
            value={stats.weekCalls}
            sub="Last 7 days"
            icon={TrendingUp}
            color="purple"
          />
          <StatsCard
            label="Bookings"
            value={stats.bookingCount}
            sub="All time"
            icon={CalendarCheck}
            color="green"
          />
          <StatsCard
            label="Revenue"
            value={`$${stats.revenue.toLocaleString()}`}
            sub="Estimated value"
            icon={DollarSign}
            color="orange"
          />
        </div>

        {/* Recent calls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Recent Calls</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{calls.length} most recent</p>
            </div>
          </div>
          <Suspense fallback={
            <div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />
          }>
            <CallsList calls={calls} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
