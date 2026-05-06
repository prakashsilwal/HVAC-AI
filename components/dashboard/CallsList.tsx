'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Phone, Clock, ArrowUpRight, PhoneMissed, PhoneCall, CheckCheck } from 'lucide-react'
import type { Call } from '@/lib/database.types'

type Props = { calls: Call[]; compact?: boolean }

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  ongoing:   { label: 'Ongoing',   className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  missed:    { label: 'Missed',    className: 'bg-red-50 text-red-600 ring-red-600/20' },
  voicemail: { label: 'Voicemail', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  error:     { label: 'Error',     className: 'bg-zinc-100 text-zinc-500 ring-zinc-600/20' },
}

const jobColors: Record<string, string> = {
  ac_repair:       'bg-blue-50 text-blue-700',
  heating_repair:  'bg-orange-50 text-orange-700',
  installation:    'bg-purple-50 text-purple-700',
  maintenance:     'bg-teal-50 text-teal-700',
  emergency:       'bg-red-50 text-red-700',
  inspection:      'bg-indigo-50 text-indigo-700',
  duct_cleaning:   'bg-cyan-50 text-cyan-700',
  thermostat:      'bg-pink-50 text-pink-700',
  general_inquiry: 'bg-zinc-100 text-zinc-600',
}

const filterTabs = [
  { key: 'all',       label: 'All',       icon: Phone },
  { key: 'missed',    label: 'Missed',    icon: PhoneMissed },
  { key: 'completed', label: 'Completed', icon: CheckCheck },
  { key: 'ongoing',   label: 'Ongoing',   icon: PhoneCall },
]

function getInitials(name: string | null, phone: string | null) {
  if (name) {
    const p = name.trim().split(' ')
    return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0].slice(0,2).toUpperCase()
  }
  return phone?.slice(-2) ?? '??'
}

function getAvatarColor(str: string) {
  const colors = [
    'from-blue-500 to-blue-600', 'from-purple-500 to-purple-600',
    'from-emerald-500 to-emerald-600', 'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600', 'from-teal-500 to-teal-600',
    'from-indigo-500 to-indigo-600', 'from-rose-500 to-rose-600',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatDuration(s: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60); const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function formatPhone(phone: string | null) {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return phone
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatJob(job: string | null) {
  if (!job) return '—'
  return job.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function CallsList({ calls, compact = false }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = calls.filter(c => {
    const matchesFilter = activeFilter === 'all' || c.status === activeFilter
    if (!matchesFilter) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      c.caller_name?.toLowerCase().includes(q) ||
      c.caller_number?.toLowerCase().includes(q) ||
      c.job_type?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    )
  })

  const counts = {
    all: calls.length,
    missed: calls.filter(c => c.status === 'missed').length,
    completed: calls.filter(c => c.status === 'completed').length,
    ongoing: calls.filter(c => c.status === 'ongoing').length,
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <>
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {filterTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === key
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${activeFilter === key ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                  {counts[key as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by caller, job type, status…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            {query && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <Phone className="h-8 w-8 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">
            {query || activeFilter !== 'all' ? 'No calls match' : 'No calls yet'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {query || activeFilter !== 'all' ? 'Try a different filter' : 'Calls will appear here after your first inbound call'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Caller</th>
                {!compact && <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Job</th>}
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Duration</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Status</th>
                {!compact && <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Booked</th>}
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Time</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((call) => {
                const initials = getInitials(call.caller_name, call.caller_number)
                const avatarGradient = getAvatarColor(call.caller_number ?? call.id)
                const status = statusConfig[call.status] ?? statusConfig.error
                const jobClass = call.job_type ? (jobColors[call.job_type] ?? 'bg-zinc-100 text-zinc-600') : ''

                return (
                  <tr
                    key={call.id}
                    onClick={() => router.push(`/dashboard/calls/${call.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-zinc-50/80"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-xs font-semibold text-white shadow-sm`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 leading-tight">{call.caller_name ?? formatPhone(call.caller_number)}</p>
                          {call.caller_name && <p className="text-xs text-zinc-400 leading-tight mt-0.5">{formatPhone(call.caller_number)}</p>}
                        </div>
                      </div>
                    </td>

                    {!compact && (
                      <td className="px-5 py-3.5">
                        {call.job_type
                          ? <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${jobClass}`}>{formatJob(call.job_type)}</span>
                          : <span className="text-zinc-400">—</span>}
                      </td>
                    )}

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        <span className="tabular-nums">{formatDuration(call.duration_seconds)}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}>
                        {status.label}
                      </span>
                    </td>

                    {!compact && (
                      <td className="px-5 py-3.5">
                        {call.appointment_booked
                          ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Booked</span>
                          : <span className="text-zinc-400 text-xs">—</span>}
                      </td>
                    )}

                    <td className="px-5 py-3.5 text-xs text-zinc-400 tabular-nums">{formatTime(call.started_at)}</td>

                    <td className="pr-4">
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
