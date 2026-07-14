import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Schedule from './pages/Schedule'
import Sessions from './pages/Sessions'
import Plans from './pages/Plans'
import Billing from './pages/Billing'
import Staff from './pages/Staff'
import Reports from './pages/Reports'
import Assessments from './pages/Assessments'
import Inventory from './pages/Inventory'
import ImportClients from './pages/ImportClients'
import ImportAttendance from './pages/ImportAttendance'
import ParentPortal from './pages/ParentPortal'
import ChangePassword from './pages/ChangePassword'
import ResetPassword from './pages/ResetPassword'
import Timetable from './pages/Timetable'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  const token = localStorage.getItem('accessToken')

  if (!isAuthenticated && !token) return <Navigate to="/login" replace />

  if (roles && user?.role && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const ADMIN    = ["SUPER_ADMIN", "MANAGER"]
const CLINICAL = ["SUPER_ADMIN", "MANAGER", "THERAPIST"]
const FINANCE  = ["SUPER_ADMIN", "MANAGER", "FINANCE"]
const FRONT    = ["SUPER_ADMIN", "MANAGER", "RECEPTIONIST"]
const ALL_STAFF = ["SUPER_ADMIN", "MANAGER", "THERAPIST", "RECEPTIONIST", "FINANCE"]

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => { initialize() }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"          element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/parent"         element={<ParentPortal />} />
        <Route path="/timetable" element={<ProtectedRoute roles={[...ADMIN, "THERAPIST"]}><Timetable /></ProtectedRoute>} />

        {/* Dashboard — all staff */}
        <Route path="/dashboard" element={
          <ProtectedRoute roles={ALL_STAFF}><Dashboard /></ProtectedRoute>
        } />

        {/* Clients — all staff except Finance */}
        <Route path="/clients" element={
          <ProtectedRoute roles={[...CLINICAL, "RECEPTIONIST"]}><Clients /></ProtectedRoute>
        } />
        <Route path="/clients/:id" element={
          <ProtectedRoute roles={[...CLINICAL, "RECEPTIONIST"]}><ClientDetail /></ProtectedRoute>
        } />
        <Route path="/clients/import" element={
          <ProtectedRoute roles={ADMIN}><ImportClients /></ProtectedRoute>
        } />

        {/* Schedule — all except Finance */}
        <Route path="/schedule" element={
          <ProtectedRoute roles={[...CLINICAL, "RECEPTIONIST"]}><Schedule /></ProtectedRoute>
        } />

        {/* Sessions — clinical only */}
        <Route path="/sessions" element={
          <ProtectedRoute roles={CLINICAL}><Sessions /></ProtectedRoute>
        } />

        {/* Therapy Plans — clinical only */}
        <Route path="/plans" element={
          <ProtectedRoute roles={CLINICAL}><Plans /></ProtectedRoute>
        } />

        {/* Assessments — clinical only */}
        <Route path="/assessments" element={
          <ProtectedRoute roles={CLINICAL}><Assessments /></ProtectedRoute>
        } />

        {/* Reports — admin and finance */}
        <Route path="/reports" element={
          <ProtectedRoute roles={[...ADMIN, "FINANCE"]}><Reports /></ProtectedRoute>
        } />

        {/* Billing — admin, finance, receptionist */}
        <Route path="/billing" element={
          <ProtectedRoute roles={[...FINANCE, "RECEPTIONIST"]}><Billing /></ProtectedRoute>
        } />

        {/* Staff — admin only */}
        <Route path="/staff" element={
          <ProtectedRoute roles={ADMIN}><Staff /></ProtectedRoute>
        } />

        {/* Inventory — all staff */}
        <Route path="/inventory" element={
          <ProtectedRoute roles={ALL_STAFF}><Inventory /></ProtectedRoute>
        } />

        {/* Import Attendance — admin only */}
        <Route path="/attendance/import" element={
          <ProtectedRoute roles={ADMIN}><ImportAttendance /></ProtectedRoute>
        } />

        {/* Redirects */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}