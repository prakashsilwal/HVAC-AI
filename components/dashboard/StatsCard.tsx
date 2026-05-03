import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  color: 'blue' | 'purple' | 'green' | 'orange'
  trend?: string
}

const colorMap = {
  blue:   { icon: 'bg-blue-500/10 text-blue-500',   border: 'border-blue-500/10' },
  purple: { icon: 'bg-purple-500/10 text-purple-500', border: 'border-purple-500/10' },
  green:  { icon: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/10' },
  orange: { icon: 'bg-orange-500/10 text-orange-500', border: 'border-orange-500/10' },
}

export default function StatsCard({ label, value, sub, icon: Icon, color, trend }: Props) {
  const c = colorMap[color]

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white px-5 py-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="h-[17px] w-[17px]" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-zinc-500">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
      </div>

      {/* Subtle bottom accent */}
      <div className={`absolute bottom-0 left-0 h-0.5 w-full ${c.icon} opacity-50`} />
    </div>
  )
}
