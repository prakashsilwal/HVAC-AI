import { CalendarDays, Clock, DollarSign, MapPin, Phone, ArrowUpRight } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

async function getBookings() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('bookings')
    .select('*, calls(caller_name, caller_number)')
    .eq('business_id', BUSINESS_ID)
    .order('scheduled_start', { ascending: true })
  return data ?? []
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

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

const statusStyles: Record<string, string> = {
  confirmed:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending:    'bg-amber-50 text-amber-700 ring-amber-600/20',
  cancelled:  'bg-red-50 text-red-600 ring-red-600/20',
  completed:  'bg-blue-50 text-blue-700 ring-blue-600/20',
}

const jobColors: Record<string, string> = {
  ac_repair:       'bg-blue-50 text-blue-700',
  heating_repair:  'bg-orange-50 text-orange-700',
  installation:    'bg-purple-50 text-purple-700',
  maintenance:     'bg-teal-50 text-teal-700',
  emergency:       'bg-red-50 text-red-700',
  inspection:      'bg-indigo-50 text-indigo-700',
  general_inquiry: 'bg-zinc-100 text-zinc-600',
}

export default async function BookingsPage() {
  const bookings = await getBookings()

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.estimated_value ?? 0), 0)
  const upcoming = bookings.filter(b => b.scheduled_start && new Date(b.scheduled_start) > new Date()).length

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-zinc-200/80 bg-[#f5f5f7]/80 px-7 backdrop-blur-md">
        <div>
          <h1 className="text-[15px] font-semibold text-zinc-900">Bookings</h1>
          <p className="text-xs text-zinc-400">{bookings.length} total appointments</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium shadow-sm">
            {upcoming} upcoming
          </span>
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 shadow-sm">
            ${totalRevenue.toLocaleString()} pipeline
          </span>
        </div>
      </header>

      <div className="flex-1 p-7">
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-24 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 mb-4">
              <CalendarDays className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-600">No bookings yet</p>
            <p className="mt-1 text-xs text-zinc-400 max-w-xs">
              When Sarah books an appointment during a call, it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  {['Customer', 'Service', 'Scheduled', 'Address', 'Est. Value', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {bookings.map((booking) => {
                  const status = statusStyles[booking.status ?? 'pending'] ?? statusStyles.pending
                  const jobClass = booking.job_type ? (jobColors[booking.job_type] ?? 'bg-zinc-100 text-zinc-600') : ''
                  const initials = getInitials(booking.customer_name)
                  const isPast = booking.scheduled_start && new Date(booking.scheduled_start) < new Date()

                  return (
                    <tr key={booking.id} className={`group transition-colors hover:bg-zinc-50/80 ${isPast ? 'opacity-60' : ''}`}>
                      {/* Customer */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 leading-tight">{booking.customer_name ?? '—'}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone className="h-2.5 w-2.5 text-zinc-400" />
                              <p className="text-xs text-zinc-400">{formatPhone(booking.customer_phone)}</p>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-5 py-3.5">
                        {booking.job_type ? (
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${jobClass}`}>
                            {formatJob(booking.job_type)}
                          </span>
                        ) : <span className="text-zinc-400">—</span>}
                      </td>

                      {/* Scheduled */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-600">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          <span className="text-xs tabular-nums">{formatDateTime(booking.scheduled_start)}</span>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span className="text-xs truncate max-w-[160px]">{booking.customer_address ?? '—'}</span>
                        </div>
                      </td>

                      {/* Value */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-zinc-700 font-medium">
                          <DollarSign className="h-3 w-3 text-zinc-400" />
                          {(booking.estimated_value ?? 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status}`}>
                          {booking.status ?? 'pending'}
                        </span>
                      </td>

                      {/* Link to call */}
                      <td className="pr-4">
                        {booking.call_id && (
                          <Link
                            href={`/dashboard/calls/${booking.call_id}`}
                            className="flex items-center gap-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-700"
                          >
                            View call <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
