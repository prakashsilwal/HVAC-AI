import { Suspense } from 'react'
import { Phone, TrendingUp, CalendarCheck, DollarSign, Mic, CheckCircle2, Circle, ArrowUpRight, Clock } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import StatsCard from '@/components/dashboard/StatsCard'
import CallsList from '@/components/dashboard/CallsList'
import { getBusinessId } from '@/lib/auth/business'
import Link from 'next/link'

async function getPageData(businessId: string) {
  const supabase = createServiceClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)

  const [totalCalls, weekCalls, bookings, recentCalls, todayBookings, business] = await Promise.all([
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('business_id', businessId).gte('started_at', oneWeekAgo),
    supabase.from('bookings').select('id, estimated_value, status').eq('business_id', businessId),
    supabase.from('calls').select('*').eq('business_id', businessId).order('started_at', { ascending: false }).limit(10),
    supabase.from('bookings').select('*').eq('business_id', businessId)
      .gte('scheduled_start', todayStart.toISOString())
      .lte('scheduled_start', todayEnd.toISOString())
      .order('scheduled_start', { ascending: true }),
    supabase.from('businesses').select('name, gcal_token, retell_agent_id, phone_number, owner_first_name').eq('id', businessId).single(),
  ])

  const revenue = (bookings.data ?? []).reduce((sum, b) => sum + (b.estimated_value ?? 0), 0)

  return {
    stats: {
      totalCalls: totalCalls.count ?? 0,
      weekCalls: weekCalls.count ?? 0,
      bookingCount: bookings.data?.length ?? 0,
      revenue,
    },
    recentCalls: recentCalls.data ?? [],
    todayBookings: todayBookings.data ?? [],
    business: business.data,
    isNewAccount: (totalCalls.count ?? 0) === 0,
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatJob(job: string | null) {
  if (!job) return 'Appointment'
  return job.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default async function DashboardPage() {
  const businessId = await getBusinessId()
  const { stats, recentCalls, todayBookings, business, isNewAccount } = await getPageData(businessId)

  const businessName = business?.name ?? 'Your Business'
  const agentLive = !!business?.retell_agent_id
  const calConnected = !!business?.gcal_token
  const hasPhone = !!business?.phone_number

  const setupSteps = [
    { label: 'Complete business setup', done: !!business?.owner_first_name, href: '/onboarding' },
    { label: 'Connect Google Calendar', done: calConnected, href: '/dashboard/settings' },
    { label: 'Add a phone number', done: hasPhone, href: '/dashboard/settings' },
    { label: 'Activate your AI agent', done: agentLive, href: '/dashboard/settings' },
  ]
  const setupComplete = setupSteps.every(s => s.done)
  const setupDone = setupSteps.filter(s => s.done).length

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-zinc-200/80 bg-[#f5f5f7]/80 px-7 backdrop-blur-md">
        <div>
          <h1 className="text-[15px] font-semibold text-zinc-900">Overview</h1>
          <p className="text-xs text-zinc-400">{businessName}</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${agentLive ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-zinc-50'}`}>
          <Mic className={`h-3 w-3 ${agentLive ? 'text-emerald-600' : 'text-zinc-400'}`} />
          {agentLive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          <span className={`text-xs font-medium ${agentLive ? 'text-emerald-700' : 'text-zinc-500'}`}>
            {agentLive ? 'Agent is live' : 'Agent not configured'}
          </span>
        </div>
      </header>

      <div className="flex-1 p-7 space-y-6">

        {/* Setup checklist — only show if not complete */}
        {!setupComplete && (
          <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Get started</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{setupDone} of {setupSteps.length} steps complete</p>
              </div>
              <div className="flex items-center gap-1.5">
                {setupSteps.map((s, i) => (
                  <div key={i} className={`h-1.5 w-6 rounded-full ${s.done ? 'bg-blue-500' : 'bg-blue-200'}`} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {setupSteps.map((step) => (
                <Link key={step.label} href={step.href} className="flex items-center gap-3 rounded-lg border border-white bg-white px-4 py-2.5 text-sm transition hover:shadow-sm">
                  {step.done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <Circle className="h-4 w-4 text-zinc-300 shrink-0" />}
                  <span className={step.done ? 'text-zinc-400 line-through' : 'text-zinc-700 font-medium'}>{step.label}</span>
                  {!step.done && <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 ml-auto" />}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard label="Total Calls"   value={stats.totalCalls}   sub="All time"        icon={Phone}        color="blue"   />
          <StatsCard label="This Week"     value={stats.weekCalls}    sub="Last 7 days"     icon={TrendingUp}   color="purple" />
          <StatsCard label="Bookings"      value={stats.bookingCount} sub="All time"        icon={CalendarCheck} color="green" />
          <StatsCard label="Pipeline"      value={`$${stats.revenue.toLocaleString()}`} sub="Estimated value" icon={DollarSign} color="orange" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent calls — takes 2/3 */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Recent Calls</h2>
              <Link href="/dashboard/calls" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-200/60" />}>
              <CallsList calls={recentCalls} compact />
            </Suspense>
          </div>

          {/* Today's bookings — takes 1/3 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Today's Bookings</h2>
              <Link href="/dashboard/bookings" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {todayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-12 text-center">
                <CalendarCheck className="h-7 w-7 text-zinc-300 mb-2" />
                <p className="text-xs font-medium text-zinc-500">No bookings today</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Upcoming jobs will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayBookings.map(b => (
                  <div key={b.id} className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{b.customer_name ?? 'Unknown'}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{formatJob(b.job_type)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {b.status ?? 'confirmed'}
                      </span>
                    </div>
                    {b.scheduled_start && (
                      <div className="flex items-center gap-1.5 mt-2.5 text-xs text-zinc-500">
                        <Clock className="h-3 w-3" />
                        {formatTime(b.scheduled_start)}
                      </div>
                    )}
                    {b.customer_address && (
                      <p className="text-[11px] text-zinc-400 mt-1 truncate">{b.customer_address}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
