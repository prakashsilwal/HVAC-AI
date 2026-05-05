import { redirect } from 'next/navigation'
import { Check, Snowflake, Zap, Phone, Calendar, BarChart3, Shield } from 'lucide-react'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'

const BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

const features = [
  { icon: Phone,     text: '24/7 AI receptionist answers every call' },
  { icon: Calendar,  text: 'Auto-books appointments to Google Calendar' },
  { icon: BarChart3, text: 'Full dashboard with call analytics' },
  { icon: Zap,       text: 'Instant SMS + email confirmations' },
  { icon: Shield,    text: 'Never miss a lead again' },
]

async function startCheckout() {
  'use server'

  const supabase = createServiceClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', BUSINESS_ID)
    .single()

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('business_id', BUSINESS_ID)
    .maybeSingle()

  let customerId = existingSub?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: business?.name ?? 'HVAC Business',
      metadata: { business_id: BUSINESS_ID },
    })
    customerId = customer.id
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=1`,
    phone_number_collection: { enabled: false },
    subscription_data: {
      trial_period_days: 14,
      metadata: { business_id: BUSINESS_ID },
    },
    metadata: { business_id: BUSINESS_ID },
  })

  redirect(session.url!)
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4 py-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Snowflake className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">HVAC AI</span>
      </div>

      {/* Headline */}
      <div className="text-center mb-12 max-w-lg">
        <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
          Your AI receptionist.<br />
          <span className="text-blue-400">Always on. Never misses.</span>
        </h1>
        <p className="mt-4 text-zinc-400 text-lg">
          Sarah answers every call, books appointments, and sends confirmations — while you&apos;re out on the job.
        </p>
      </div>

      {/* Pricing card */}
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/30 to-purple-500/10" />

        <div className="relative rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
          {/* Trial badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            14-day free trial — no credit card charged today
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold text-white">$249</span>
              <span className="text-zinc-400 mb-2">/month</span>
            </div>
            <p className="text-sm text-zinc-500 mt-1">After trial. Cancel anytime.</p>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <Check className="h-3 w-3 text-blue-400" />
                </div>
                <span className="text-sm text-zinc-300">{text}</span>
              </li>
            ))}
          </ul>

          {/* CTA — server action form, works without JS */}
          <form action={startCheckout}>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-colors"
            >
              Start Free Trial →
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-zinc-600">
            Secured by Stripe · Cancel anytime · No setup fee
          </p>
        </div>
      </div>
    </div>
  )
}
