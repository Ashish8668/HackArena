import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { user, loading, configured } = useAuth()

  if (!configured) {
    return <Navigate to="/" replace />
  }
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4efe6] text-stone-600">
        Loading...
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  return <Outlet />
}

export function CoordinatorRoute() {
  const { role, loading } = useAuth()
  if (loading) return null
  if (role === 'patient') return <Navigate to="/app" replace />
  return <Outlet />
}

export function PatientRoute() {
  const { role, loading } = useAuth()
  if (loading) return null
  if (role !== 'patient') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
