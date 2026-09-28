import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute, { CoordinatorRoute, PatientRoute, AdminRoute } from './components/ProtectedRoute'
import AppLayout, { PatientLayout } from './components/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import PatientDetailsPage from './pages/PatientDetailsPage'
import TrialsPage from './pages/TrialsPage'
import TrialDetailsPage from './pages/TrialDetailsPage'
import TrialSearchPage from './pages/TrialSearchPage'
import RecruitmentPage from './pages/RecruitmentPage'
import SettingsPage from './pages/SettingsPage'
import EligibilityDecisionPage from './pages/EligibilityDecisionPage'
import AdminPage from './pages/AdminPage'
import PatientHomePage from './pages/patient/PatientHomePage'
import PatientProfilePage from './pages/patient/PatientProfilePage'
import { useAuth } from './hooks/useAuth'
import { homePathForRole } from './firebase/users'

function PublicOnly({ children }) {
  const { user, loading, configured, role } = useAuth()
  if (!configured) return children
  if (loading) return null
  if (user) return <Navigate to={homePathForRole(role)} replace />
  return children
}

function LandingGate() {
  const { user, loading, role } = useAuth()
  if (loading) {
    return <div className="min-h-screen bg-[#f4efe6]" />
  }
  return <LandingPage signedIn={Boolean(user)} workspacePath={homePathForRole(role)} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingGate />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <SignupPage />
          </PublicOnly>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<CoordinatorRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/decision-paths" element={<EligibilityDecisionPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:patientId" element={<PatientDetailsPage />} />
            <Route path="/trials" element={<TrialsPage />} />
            <Route path="/trials/:trialId" element={<TrialDetailsPage />} />
            <Route path="/search" element={<TrialSearchPage />} />
            <Route path="/recruitment" element={<RecruitmentPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route element={<PatientRoute />}>
          <Route element={<PatientLayout />}>
            <Route path="/app" element={<PatientHomePage />} />
            <Route path="/app/profile" element={<PatientProfilePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
