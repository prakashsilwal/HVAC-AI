import { type NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

function periodEnd(sub: Stripe.Subscription): string {
  // In Stripe API dahlia, current_period_end moved to the subscription item
  const item = sub.items?.data?.[0]
  const ts = (item as unknown as { current_period_end?: number })?.current_period_end
    ?? sub.cancel_at
    ?? null
  return ts ? new Date(ts * 1000).toISOString() : new Date().toISOString()
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } else {
      console.warn('[stripe/webhook] No webhook secret — skipping signature check')
      event = JSON.parse(rawBody) as Stripe.Event
    }
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()
  console.log('[stripe/webhook] Event:', event.type)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const businessId = session.metadata?.business_id
      if (!businessId || session.mode !== 'subscription') break

      const subscriptionId = session.subscription as string
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items'],
      })

      await supabase.from('subscriptions').delete().eq('business_id', businessId)
      await supabase.from('subscriptions').insert({
        business_id: businessId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        stripe_price_id: process.env.STRIPE_PRO_PRICE_ID!,
        status: sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete',
        plan: 'pro',
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        current_period_end: periodEnd(sub),
      })

      console.log('[stripe/webhook] Subscription activated for business:', businessId)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const businessId = sub.metadata?.business_id
      if (!businessId) break

      await supabase.from('subscriptions').update({
        status: sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete',
        current_period_end: periodEnd(sub),
        trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      }).eq('business_id', businessId)

      console.log('[stripe/webhook] Subscription updated:', sub.status)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const businessId = sub.metadata?.business_id
      if (!businessId) break

      await supabase.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('business_id', businessId)

      console.log('[stripe/webhook] Subscription cancelled for business:', businessId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('business_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (sub?.business_id) {
        await supabase.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('business_id', sub.business_id)
        console.log('[stripe/webhook] Payment failed for business:', sub.business_id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
