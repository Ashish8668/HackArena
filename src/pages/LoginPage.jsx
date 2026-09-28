import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { homePathForRole } from '../firebase/users'
import Field, { inputClass } from '../components/Field'

export default function LoginPage() {
  const { login, configured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!configured) {
      setError('Configuration missing.')
      return
    }
    setBusy(true)
    try {
      const nextProfile = await login(email, password)
      navigate(homePathForRole(nextProfile?.role))
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' ? 'Unable to sign in.' : err.message || 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4efe6] px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <Link to="/" className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-stone-800">
          Clinical Match
        </Link>
        <div className="rounded-[1.5rem] bg-white p-8 ring-1 ring-stone-200">
          <h1 className="font-serif text-3xl">Sign in</h1>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Field label="Email">
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-5 text-sm text-stone-600">
            <Link to="/signup" className="font-medium text-stone-900">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
