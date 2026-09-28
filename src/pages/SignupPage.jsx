import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Field, { inputClass } from '../components/Field'
import { homePathForRole } from '../firebase/users'

export default function SignupPage() {
  const { signup, configured } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [role, setRole] = useState(searchParams.get('role') === 'coordinator' ? 'coordinator' : 'patient')
  const [name, setName] = useState('')
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
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    try {
      await signup(email, password, { role, name: name.trim() })
      navigate(role === 'patient' ? '/app/profile' : homePathForRole(role))
    } catch (err) {
      setError(err.message || 'Unable to register.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center text-sm font-semibold uppercase tracking-[0.18em] text-stone-800">
          Clinical Match
        </Link>
        <div className="rounded-[1.5rem] bg-white p-8 ring-1 ring-stone-200">
          <h1 className="font-serif text-3xl">Register</h1>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {[
                ['patient', 'Participant'],
                ['coordinator', 'Coordinator'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    role === value ? 'bg-white text-stone-900 shadow' : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Field label="Name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
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
              {busy ? 'Saving...' : 'Register'}
            </button>
          </form>
          <p className="mt-4 text-sm text-stone-600">
            <Link to="/login" className="font-medium text-stone-900">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
