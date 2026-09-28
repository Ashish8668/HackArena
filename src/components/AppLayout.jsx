import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  Award,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
  Users,
  Workflow,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/decision-paths', label: 'Decision Paths (3-Path Engine)', icon: Award },
  { to: '/patients', label: 'Participants', icon: Users },
  { to: '/trials', label: 'Trials', icon: ClipboardList },
  { to: '/search', label: 'Intelligent Search', icon: Search },
  { to: '/recruitment', label: 'Recruitment & Consent', icon: Workflow },
  { to: '/admin', label: 'Admin & Drug RAG', icon: Shield },
  { to: '/settings', label: 'Data Setup', icon: Settings },
]

export default function AppLayout() {
  const { user, profile, role, logout, demoLogin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2 text-teal-300">
            <Activity className="h-6 w-6" />
            <span className="text-sm font-bold tracking-wide">TRIALMATCH</span>
          </div>
          <h1 className="mt-2 text-base font-bold leading-snug">Research Workspace</h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Smart Clinical Trial Matching & Decision Paths
          </p>
        </div>

        {/* Quick Role Switcher Pill for Demo / Review */}
        <div className="px-3 pt-3">
          <div className="rounded-xl bg-white/5 p-2 text-xs">
            <div className="text-[10px] uppercase font-bold text-slate-400">Quick Persona Switch:</div>
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  demoLogin('coordinator')
                  navigate('/dashboard')
                }}
                className={`rounded py-1 transition ${
                  role === 'coordinator' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-white/10'
                }`}
              >
                Coord
              </button>
              <button
                type="button"
                onClick={() => {
                  demoLogin('patient', 'P001')
                  navigate('/app')
                }}
                className={`rounded py-1 transition ${
                  role === 'patient' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-white/10'
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => {
                  demoLogin('admin')
                  navigate('/admin')
                }}
                className={`rounded py-1 transition ${
                  role === 'admin' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-white/10'
                }`}
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
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
          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-teal-300 capitalize">{role || 'Coordinator'}</p>
              <p className="truncate text-[11px] text-slate-400 max-w-[140px]">{profile?.name || user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xs lg:hidden">
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-900 text-sm">TrialMatch Core</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  demoLogin('patient', 'P001')
                  navigate('/app')
                }}
                className="text-xs text-teal-700 font-semibold"
              >
                Patient Portal
              </button>
              <button type="button" onClick={handleLogout} className="text-xs text-slate-600">
                Logout
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto text-xs">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/dashboard'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1 font-medium ${
                    isActive ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`
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
  const { user, profile, logout, demoLogin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const links = [
    { to: '/app', label: 'Eligible Studies', icon: HeartPulse },
    { to: '/app/profile', label: 'My Health Profile', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-teal-50/40">
      <header className="border-b border-teal-100 bg-white sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 text-teal-800">
            <Activity className="h-5 w-5" />
            <div>
              <p className="text-sm font-bold">TrialMatch Patient Portal</p>
              <p className="text-[11px] text-slate-500">Self Access & Applications</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/app'}
                  className={({ isActive }) =>
                    `text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                      isActive ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                demoLogin('coordinator')
                navigate('/dashboard')
              }}
              className="text-xs font-semibold text-teal-800 border border-teal-300 rounded-lg px-2.5 py-1 hover:bg-teal-50"
            >
              Switch to Coordinator
            </button>

            <button type="button" onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-800">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
