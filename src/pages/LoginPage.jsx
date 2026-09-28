import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Award, HeartPulse, Shield, User, Users } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { homePathForRole } from '../firebase/users'
import Field, { inputClass } from '../components/Field'

export default function LoginPage() {
  const { login, demoLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const nextProfile = await login(email, password)
      navigate(homePathForRole(nextProfile?.role))
    } catch (err) {
      setError(err.message || 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  function handleDemo(role, patientId) {
    const profile = demoLogin(role, patientId)
    navigate(homePathForRole(profile?.role))
  }

  return (
    <div className="min-h-screen bg-[#f4efe6] px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <Link to="/" className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-stone-800">
          TrialMatch Core System
        </Link>
        <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-stone-200">
          <h1 className="font-serif text-3xl">Sign in</h1>
          <p className="mt-2 text-xs text-stone-500">
            Sign in with email or use instant 1-click Demo credentials below.
          </p>

          {/* 1-Click Demo Accounts */}
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              1-Click Demo Personas (No Setup Needed):
            </span>
            <div className="mt-2.5 space-y-2">
              <button
                type="button"
                onClick={() => handleDemo('coordinator')}
                className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white p-2.5 text-left text-xs font-semibold text-stone-800 hover:border-teal-700 hover:bg-teal-50/50"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-700" />
                  <div>
                    <div>Demo Research Coordinator</div>
                    <div className="text-[10px] font-normal text-stone-400">Pipeline, Decision Paths, Outreach</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-700">Login →</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemo('patient', 'P001')}
                className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white p-2.5 text-left text-xs font-semibold text-stone-800 hover:border-teal-700 hover:bg-teal-50/50"
              >
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-teal-700" />
                  <div>
                    <div>Demo Participant (P001 - Diabetes)</div>
                    <div className="text-[10px] font-normal text-stone-400">View Eligible Studies, Apply, Consent</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-700">Login →</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemo('admin')}
                className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white p-2.5 text-left text-xs font-semibold text-stone-800 hover:border-teal-700 hover:bg-teal-50/50"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-700" />
                  <div>
                    <div>Demo System Administrator</div>
                    <div className="text-[10px] font-normal text-stone-400">Trials, Drug Knowledge Base, Gemini RAG</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-700">Login →</span>
              </button>
            </div>
          </div>

          <div className="relative my-6 text-center">
            <hr className="border-stone-200" />
            <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white px-2 text-[11px] font-semibold text-stone-400">
              OR EMAIL LOGIN
            </span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator@trialmatch.org"
                required
              />
            </Field>
            <Field label="Password">
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-stone-600">
            Need an account?{' '}
            <Link to="/signup" className="font-semibold text-[#c45c26]">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
