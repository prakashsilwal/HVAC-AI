import { CreditCard, Zap, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

async function getSubscription() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .maybeSingle()
  return data
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const [sub, sp] = await Promise.all([getSubscription(), searchParams])

  const isActive = sub?.status === 'active' || sub?.status === 'trialing'
  const isTrial = sub?.status === 'trialing'
  const isPastDue = sub?.status === 'past_due'

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 flex h-[60px] items-center border-b border-zinc-200/80 bg-[#f5f5f7]/80 px-7 backdrop-blur-md">
        <div>
          <h1 className="text-[15px] font-semibold text-zinc-900">Billing</h1>
          <p className="text-xs text-zinc-400">Manage your subscription</p>
        </div>
      </header>

      <div className="flex-1 p-7 max-w-2xl space-y-5">

        {/* Success banner */}
        {sp.success && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-800">
              You&apos;re all set! Your 14-day free trial has started.
            </p>
          </div>
        )}

        {/* Past due warning */}
        {isPastDue && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-800">
              Payment failed. Please update your payment method to keep Sarah active.
            </p>
          </div>
        )}

        {/* Current plan */}
        <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Current Plan</h2>
              <p className="text-xs text-zinc-400">Your subscription details</p>
            </div>
          </div>

          <div className="p-5">
            {sub ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-zinc-900">HVAC AI Pro</p>
                    <p className="text-sm text-zinc-500">$249 / month</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    isTrial ? 'bg-blue-50 text-blue-700' :
                    isActive ? 'bg-emerald-50 text-emerald-700' :
                    'bg-red-50 text-red-600'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      isTrial ? 'bg-blue-500' :
                      isActive ? 'bg-emerald-500 animate-pulse' :
                      'bg-red-500'
                    }`} />
                    {isTrial ? 'Free Trial' : sub.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {isTrial && sub.trial_ends_at && (
                    <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3.5 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="h-3 w-3 text-zinc-400" />
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Trial ends</p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">{formatDate(sub.trial_ends_at)}</p>
                    </div>
                  )}
                  {sub.current_period_end && (
                    <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3.5 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CreditCard className="h-3 w-3 text-zinc-400" />
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                          {isTrial ? 'First charge' : 'Next billing'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">{formatDate(sub.current_period_end)}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/60 p-4">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No active subscription</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Start your free trial to keep Sarah answering calls after the trial period.
                    </p>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Start 14-day Free Trial
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Manage subscription */}
        {sub && (
          <section className="rounded-xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                <CreditCard className="h-4 w-4 text-zinc-500" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-900">Payment & Invoices</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-zinc-500 mb-4">
                Update your payment method, download invoices, or cancel your subscription through the Stripe portal.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors"
              >
                Manage billing →
              </Link>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
