import { Mic } from 'lucide-react'
import { saveBusinessDetails } from './actions'

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
]

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 mb-4">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            {[1, 2].map(n => (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${n === 1 ? 'bg-blue-600 text-white' : 'bg-white/[0.08] text-zinc-500'}`}>
                  {n}
                </div>
                {n < 2 && <div className="h-px w-8 bg-white/[0.08]" />}
              </div>
            ))}
          </div>
          <h1 className="text-xl font-semibold text-white">Set up your business</h1>
          <p className="mt-1 text-sm text-zinc-500">This helps your AI receptionist introduce itself correctly</p>
        </div>

        {/* Form */}
        <form action={saveBusinessDetails} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Business name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                placeholder="Acme HVAC"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Your first name</label>
              <input
                type="text"
                name="ownerName"
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                placeholder="John"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Business phone</label>
              <input
                type="tel"
                name="phone"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Service area / city</label>
              <input
                type="text"
                name="serviceArea"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                placeholder="Charlotte, NC"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Timezone</label>
              <select
                name="timezone"
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz.replace('America/', '').replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 mt-2"
          >
            Continue →
          </button>
        </form>
      </div>
    </div>
  )
}
