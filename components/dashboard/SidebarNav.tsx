'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Phone,
  CalendarDays,
  Settings,
  Mic,
  Zap,
  CreditCard,
  LogOut,
} from 'lucide-react'

const nav = [
  { href: '/dashboard',          label: 'Overview',  icon: LayoutDashboard },
  { href: '/dashboard/calls',    label: 'Calls',     icon: Phone },
  { href: '/dashboard/bookings', label: 'Bookings',  icon: CalendarDays },
  { href: '/dashboard/billing',  label: 'Billing',   icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings',  icon: Settings },
]

type Props = {
  userName: string
  userEmail: string
  businessName: string
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function SidebarNav({ userName, userEmail, businessName }: Props) {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 flex-col border-r border-white/[0.06] bg-[#0a0a0f]">
      {/* Logo */}
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">VoiceDesk</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 p-3 pt-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-[15px] w-[15px] shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              {label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20">
            <Zap className="h-3 w-3 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Pro Trial</p>
            <p className="text-[10px] text-zinc-500 truncate">{businessName}</p>
          </div>
        </div>

        {/* User + sign out */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white">
            {initials(userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-300 truncate">{userName}</p>
            <p className="text-[10px] text-zinc-600 truncate">{userEmail}</p>
          </div>
          <a
            href="/api/auth/signout"
            title="Sign out"
            className="text-zinc-600 hover:text-zinc-300 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </aside>
  )
}
