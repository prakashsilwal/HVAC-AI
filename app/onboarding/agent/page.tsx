import { Mic, CheckCircle2 } from 'lucide-react'
import { saveAgentConfig } from '../actions'

const industries = [
  { value: 'hvac',       label: 'HVAC' },
  { value: 'plumbing',   label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'beauty',     label: 'Beauty / Salon' },
  { value: 'medical',    label: 'Medical / Dental' },
  { value: 'legal',      label: 'Legal' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail',     label: 'Retail' },
  { value: 'other',      label: 'Other' },
]

export default function OnboardingAgentPage() {
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
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${n === 2 ? 'bg-blue-600 text-white' : 'bg-blue-600/30 text-blue-400'}`}>
                  {n === 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
                </div>
                {n < 2 && <div className="h-px w-8 bg-white/[0.08]" />}
              </div>
            ))}
          </div>
          <h1 className="text-xl font-semibold text-white">Configure your AI receptionist</h1>
          <p className="mt-1 text-sm text-zinc-500">Customize how your AI answers calls</p>
        </div>

        <form action={saveAgentConfig} className="space-y-5">

          {/* Agent name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">AI receptionist name</label>
            <input
              type="text"
              name="agentName"
              defaultValue="Sarah"
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              placeholder="Sarah"
            />
            <p className="mt-1.5 text-[11px] text-zinc-600">This is how the AI will introduce itself on calls</p>
          </div>

          {/* Industry */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-400">Industry</label>
            <div className="grid grid-cols-3 gap-2">
              {industries.map(({ value, label }) => (
                <label key={value} className="relative flex cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-blue-500/40 hover:text-white has-[:checked]:border-blue-500/60 has-[:checked]:bg-blue-500/10 has-[:checked]:text-blue-300">
                  <input type="radio" name="industry" value={value} className="sr-only" defaultChecked={value === 'hvac'} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* What the AI can do */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2.5">
            <p className="text-xs font-semibold text-zinc-300">Your AI receptionist will:</p>
            {[
              'Answer calls 24/7 — never miss a lead',
              'Book appointments directly into your calendar',
              'Collect customer name, phone, and service details',
              'Send confirmation emails to customers automatically',
              'Alert you instantly for every new booking',
            ].map(item => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs text-zinc-400">{item}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Launch my AI receptionist →
          </button>
        </form>
      </div>
    </div>
  )
}
