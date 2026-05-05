# VoiceDesk — AI Receptionist SaaS

A multi-tenant SaaS platform that gives any business a 24/7 AI receptionist. The AI answers calls, books appointments, syncs with Google Calendar, and notifies the business owner — all automatically.

## Features

- **AI voice receptionist** — powered by Retell AI + custom LLM, answers calls and handles bookings
- **Multi-tenant** — each business gets its own isolated data, agent config, and dashboard
- **Appointment booking** — books directly into Google Calendar during the call
- **Email notifications** — confirmation to customer, alert to owner, missed call alerts
- **Dashboard** — calls, bookings, revenue pipeline, transcripts, and recordings
- **Billing** — Stripe subscriptions with 14-day free trial
- **Auth** — Supabase email/password with guided onboarding

## Tech Stack

- **Framework** — Next.js 16 (App Router, Server Actions)
- **Database** — Supabase (Postgres + RLS)
- **Voice AI** — Retell AI (custom LLM WebSocket)
- **AI Model** — Anthropic API
- **Calendar** — Google Calendar API (OAuth2)
- **Email** — Resend
- **Payments** — Stripe
- **Styling** — Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RETELL_API_KEY=
RETELL_WEBHOOK_SECRET=

ANTHROPIC_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_PRICE_ID=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Webhook setup (local dev)

Use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000
```

Then update:
- Retell dashboard → LLM URL: `wss://<your-ngrok>.ngrok-free.app/api/retell/llm`
- Retell dashboard → Webhook URL: `https://<your-ngrok>.ngrok-free.app/api/webhooks/retell`
- Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
