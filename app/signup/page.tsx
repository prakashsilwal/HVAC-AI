import Link from 'next/link'
import { Mic } from 'lucide-react'
import { signupAction } from './actions'

type Props = { searchParams: Promise<{ error?: string }> }

export default async function SignupPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 mb-3">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-500">Start your 14-day free trial</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={signupAction} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Business name</label>
            <input
              type="text"
              name="businessName"
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              placeholder="Acme HVAC"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              placeholder="Min 8 characters"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Already have an account?{' '}
          <Link href="/login" className="text-zinc-400 hover:text-white transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
