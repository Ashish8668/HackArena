import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4efe6] text-stone-600">
        Loading session...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
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

export function AdminRoute() {
  const { role, loading } = useAuth()
  if (loading) return null
  if (role !== 'admin' && role !== 'coordinator') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
