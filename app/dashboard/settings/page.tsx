import { Settings, CalendarDays, Bot, Building2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'

const DEV_BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

async function isCalendarConnected(): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('businesses')
    .select('gcal_token')
    .eq('id', DEV_BUSINESS_ID)
    .single()
  return !!data?.gcal_token
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gcal_connected?: string; gcal_error?: string }>
}) {
  const [calConnected, sp] = await Promise.all([
    isCalendarConnected(),
    searchParams,
  ])

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 flex h-[60px] items-center border-b border-zinc-200/80 bg-[#f5f5f7]/80 px-7 backdrop-blur-md">
        <div>
          <h1 className="text-[15px] font-semibold text-zinc-900">Settings</h1>
          <p className="text-xs text-zinc-400">Manage your AI receptionist</p>
        </div>
      </header>

      <div className="flex-1 p-7 max-w-2xl space-y-5">

        {/* Toast banners */}
        {sp.gcal_connected && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">Google Calendar connected successfully!</p>
          </div>
        )}
        {sp.gcal_error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-800">Calendar error: {sp.gcal_error}</p>
          </div>
        )}

        {/* Business info */}
        <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
              <Building2 className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Business</h2>
              <p className="text-xs text-zinc-400">Your business details</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: 'Business Name', value: 'Acme HVAC' },
              { label: 'Service Area',  value: 'Charlotte, NC' },
              { label: 'Timezone',      value: 'America/New_York' },
              { label: 'Owner',         value: 'John' },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
                <input
                  type="text"
                  defaultValue={value}
                  readOnly
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 focus:outline-none cursor-default"
                />
              </div>
            ))}
          </div>
        </section>

        {/* AI Agent */}
        <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Bot className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">AI Agent</h2>
              <p className="text-xs text-zinc-400">Sarah, your AI receptionist</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white shadow-sm">
                  S
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Sarah</p>
                  <p className="text-xs text-zinc-400">Powered by advanced AI + Retell AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['HVAC Expert', 'Books Appointments', 'Handles Objections'].map(trait => (
                <div key={trait} className="flex items-center gap-1.5 rounded-md bg-zinc-50 px-2.5 py-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="text-xs text-zinc-600">{trait}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Google Calendar */}
        <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${calConnected ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <CalendarDays className={`h-4 w-4 ${calConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Google Calendar</h2>
              <p className="text-xs text-zinc-400">Auto-book appointments</p>
            </div>
            {calConnected && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            )}
          </div>
          <div className="p-5">
            {calConnected ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Calendar connected</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Sarah will automatically create calendar events when she books appointments.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/60 p-4 mb-4">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Not connected</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Connect your Google Calendar so Sarah can book appointments automatically when callers request them.
                    </p>
                  </div>
                </div>
                <a
                  href="/api/auth/google/connect"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 transition-colors"
                >
                  <CalendarDays className="h-4 w-4" />
                  Connect Google Calendar
                </a>
              </>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-red-200/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-red-100/60 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <Settings className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Danger Zone</h2>
              <p className="text-xs text-zinc-400">Irreversible actions</p>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900">Pause AI Receptionist</p>
                <p className="text-xs text-zinc-400 mt-0.5">Sarah will stop answering calls until re-enabled</p>
              </div>
              <button
                disabled
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Pause
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
