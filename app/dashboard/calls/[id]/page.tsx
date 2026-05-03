import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Clock, Zap, Calendar, Mic2, CheckCircle2 } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'

type TranscriptTurn = { role: 'agent' | 'user'; content: string }

async function getCallData(id: string) {
  console.log('[call-detail] fetching id:', id)
  const supabase = createServiceClient()
  const [callRes, transcriptRes, bookingRes] = await Promise.all([
    supabase.from('calls').select('*').eq('id', id).single(),
    supabase.from('transcripts').select('*').eq('call_id', id).maybeSingle(),
    supabase.from('bookings').select('*').eq('call_id', id).maybeSingle(),
  ])
  console.log('[call-detail] call data:', callRes.data, 'error:', callRes.error)
  return { call: callRes.data, transcript: transcriptRes.data, booking: bookingRes.data }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatJob(job: string | null): string {
  if (!job) return '—'
  return job.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return phone
}

function getInitials(name: string | null, phone: string | null): string {
  if (name) {
    const parts = name.trim().split(' ')
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()
  }
  return phone?.slice(-2) ?? '??'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  ongoing:   { label: 'Ongoing',   className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  missed:    { label: 'Missed',    className: 'bg-red-50 text-red-600 ring-red-600/20' },
  voicemail: { label: 'Voicemail', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  error:     { label: 'Error',     className: 'bg-zinc-100 text-zinc-500 ring-zinc-600/20' },
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { call, transcript, booking } = await getCallData(id)

  if (!call) notFound()

  const turns: TranscriptTurn[] = Array.isArray(transcript?.turns)
    ? (transcript.turns as TranscriptTurn[])
    : []

  const status = statusConfig[call.status] ?? statusConfig.error
  const initials = getInitials(call.caller_name, call.caller_number)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b border-zinc-200/80 bg-[#f5f5f7]/80 px-7 backdrop-blur-md">
        <Link
          href="/dashboard/calls"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Calls
        </Link>
        <span className="text-zinc-200">/</span>
        <span className="text-sm font-medium text-zinc-700 truncate">
          {call.caller_name ?? formatPhone(call.caller_number)}
        </span>
      </header>

      <div className="flex-1 p-7 space-y-5 max-w-4xl">

        {/* Call summary card */}
        <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-base font-bold text-white shadow-sm">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg font-bold text-zinc-900">
                    {call.caller_name ?? formatPhone(call.caller_number)}
                  </h1>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                {call.caller_name && (
                  <p className="text-sm text-zinc-400 mt-0.5">{formatPhone(call.caller_number)}</p>
                )}
              </div>
            </div>

            {/* Meta grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Zap,      label: 'Job Type', value: formatJob(call.job_type) },
                { icon: Clock,    label: 'Duration',  value: formatDuration(call.duration_seconds) },
                { icon: Phone,    label: 'Urgency',   value: call.urgency ? call.urgency.charAt(0).toUpperCase() + call.urgency.slice(1) : '—' },
                { icon: Calendar, label: 'Time',      value: formatDateTime(call.started_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3 w-3 text-zinc-400" />
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">{value}</p>
                </div>
              ))}
            </div>

            {/* AI Summary */}
            {call.summary && (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Mic2 className="h-3 w-3 text-blue-500" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">AI Summary</p>
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">{call.summary}</p>
              </div>
            )}

            {/* Recording */}
            {call.recording_url && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Recording</p>
                <audio controls src={call.recording_url} className="w-full h-9 rounded-lg" />
              </div>
            )}
          </div>
        </div>

        {/* Booking card */}
        {booking && (
          <div className="rounded-xl border border-emerald-200/60 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-emerald-100/60 bg-emerald-50/40 px-5 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-900">Appointment Booked</h2>
                <p className="text-xs text-emerald-600 mt-0.5">Sarah successfully scheduled this job</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Customer',  value: booking.customer_name },
                  { label: 'Phone',     value: formatPhone(booking.customer_phone) },
                  { label: 'Service',   value: formatJob(booking.job_type) },
                  { label: 'Address',   value: booking.customer_address },
                  { label: 'Scheduled', value: formatDateTime(booking.scheduled_start) },
                  { label: 'Est. Value',value: `$${(booking.estimated_value ?? 0).toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-zinc-50 border border-zinc-100 px-3.5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-zinc-900">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              {booking.notes && (
                <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 mb-1">Notes</p>
                  <p className="text-sm text-zinc-700">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <Mic2 className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900">Transcript</h2>
            {turns.length > 0 && (
              <span className="ml-auto text-xs text-zinc-400">{turns.length} turns</span>
            )}
          </div>

          {turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Mic2 className="h-7 w-7 text-zinc-200 mb-3" />
              <p className="text-sm text-zinc-400">Transcript not available</p>
            </div>
          ) : (
            <div className="p-5 space-y-3 max-h-[560px] overflow-y-auto">
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={`flex ${turn.role === 'agent' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      turn.role === 'agent'
                        ? 'rounded-tl-sm bg-zinc-100 text-zinc-900'
                        : 'rounded-tr-sm bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    }`}
                  >
                    <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${
                      turn.role === 'agent' ? 'text-zinc-400' : 'text-blue-200'
                    }`}>
                      {turn.role === 'agent' ? 'Sarah (AI)' : 'Caller'}
                    </p>
                    {turn.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
