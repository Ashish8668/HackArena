import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, ClipboardList, HeartPulse, LayoutDashboard, LogOut, Search, Settings, Users, Workflow } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Participants', icon: Users },
  { to: '/trials', label: 'Trials', icon: ClipboardList },
  { to: '/search', label: 'Trial Search', icon: Search },
  { to: '/recruitment', label: 'Recruitment', icon: Workflow },
  { to: '/settings', label: 'Data Setup', icon: Settings },
]

export default function AppLayout() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-2 text-teal-300">
            <Activity className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-wide">CLINICAL MATCH</span>
          </div>
          <h1 className="mt-3 text-lg font-semibold leading-snug">Coordinator workspace</h1>
          <p className="mt-2 text-xs text-slate-400">
            Review self-registered participants. This is not a diagnostic or eligibility decision system.
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isActive ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-xs font-medium text-teal-300">Coordinator</p>
          <p className="truncate text-xs text-slate-400">{profile?.name || user?.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Coordinator</span>
            <button type="button" onClick={handleLogout} className="text-sm text-slate-600">
              Logout
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1 ${isActive ? 'bg-teal-700 text-white' : 'bg-slate-100'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </header>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PatientLayout() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const links = [
    { to: '/app', label: 'My matches', icon: HeartPulse },
    { to: '/app/profile', label: 'My profile', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-teal-50/40">
      <header className="border-b border-teal-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2 text-teal-800">
            <Activity className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">Clinical Match</p>
              <p className="text-xs text-slate-500">Patient portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/app'}
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? 'text-teal-800' : 'text-slate-500 hover:text-slate-800'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button type="button" onClick={handleLogout} className="text-sm text-slate-500">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="mb-6 rounded-xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-600">
          Signed in as {profile?.name || user?.email}. Potential matches are not a medical eligibility decision. A coordinator still reviews every criterion and contacts you if a screening visit is appropriate.
        </p>
        <Outlet />
      </main>
    </div>
  )
}
