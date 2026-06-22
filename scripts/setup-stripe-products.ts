/**
 * Run once: npx tsx scripts/setup-stripe-products.ts
 * Creates Starter / Pro / Business products in Stripe with flat + metered prices.
 */
import Stripe from 'stripe'
import { readFileSync } from 'fs'

// Load .env.local manually
const env = readFileSync('.env.local', 'utf8')
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim()
})

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' as any })

const plans = [
  { name: 'Starter',  flat: 14900, included: 200,  overage: 50  }, // $149, $0.50/call
  { name: 'Pro',      flat: 34900, included: 600,  overage: 40  }, // $349, $0.40/call
  { name: 'Business', flat: 79900, included: 2000, overage: 30  }, // $799, $0.30/call
]

async function main() {
  for (const plan of plans) {
    const product = await stripe.products.create({
      name: `VoiceDesk ${plan.name}`,
      metadata: {
        included_calls: String(plan.included),
        overage_rate_cents: String(plan.overage),
      },
    })

    // Flat monthly base price
    const flatPrice = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: plan.flat,
      recurring: { interval: 'month' },
      metadata: { type: 'flat', plan: plan.name.toLowerCase() },
    })

    // Metered overage price (per call above included)
    const meteredPrice = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: plan.overage,
      recurring: { interval: 'month', usage_type: 'metered', aggregate_usage: 'sum' },
      metadata: { type: 'metered', plan: plan.name.toLowerCase() },
    })

    console.log(`\n✅ ${plan.name}`)
    console.log(`   Product ID:      ${product.id}`)
    console.log(`   Flat price ID:   ${flatPrice.id}   ($${plan.flat / 100}/mo, ${plan.included} calls included)`)
    console.log(`   Metered ID:      ${meteredPrice.id}   ($${plan.overage / 100}/call overage)`)
  }

  console.log('\nPaste the price IDs above into .env.local')
}

main().catch(console.error)
