import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Clients        from './pages/Clients'
import ClientDetail   from './pages/ClientDetail'
import Schedule       from './pages/Schedule'
import Sessions       from './pages/Sessions'
import Plans          from './pages/Plans'
import Billing        from './pages/Billing'
import Staff          from './pages/Staff'
import Reports        from './pages/Reports'
import Assessments    from './pages/Assessments'
import Inventory      from './pages/Inventory'
import ImportClients  from './pages/ImportClients'
import ImportAttendance from './pages/ImportAttendance'
import ParentPortal   from './pages/ParentPortal'
import ChangePassword from './pages/ChangePassword'
import ResetPassword  from './pages/ResetPassword'
import Timetable      from './pages/Timetable'
import Alerts from './pages/Alerts'
import ClientProgress from './pages/ClientProgress'
import DailySummary from './pages/DailySummary'

const ADMIN    = ["SUPER_ADMIN", "MANAGER"]
const CLINICAL = ["SUPER_ADMIN", "MANAGER", "THERAPIST"]
const FINANCE  = ["SUPER_ADMIN", "MANAGER", "FINANCE"]
const ALL_STAFF = ["SUPER_ADMIN", "MANAGER", "THERAPIST", "RECEPTIONIST", "FINANCE"]

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  const token = localStorage.getItem('accessToken')
  if (!isAuthenticated && !token) return <Navigate to="/login" replace />
  if (roles && user?.role && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function useInactivityLogout(timeoutMinutes = 30) {
  const { logout, isAuthenticated } = useAuthStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        alert("You have been logged out due to 30 minutes of inactivity.")
        logout()
      }, timeoutMinutes * 60 * 1000)
    }

    const events = ['mousedown','mousemove','keypress','scroll','touchstart','click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [isAuthenticated, logout, timeoutMinutes])
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  useEffect(() => { initialize() }, [initialize])
  useInactivityLogout(30)

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"           element={<Login />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/parent"          element={<ParentPortal />} />

        {/* All staff */}
        <Route path="/dashboard" element={<ProtectedRoute roles={ALL_STAFF}><Dashboard /></ProtectedRoute>} />
        <Route path="/inventory"  element={<ProtectedRoute roles={ALL_STAFF}><Inventory /></ProtectedRoute>} />
        <Route path="/alerts"     element={<ProtectedRoute roles={ALL_STAFF}><Alerts /></ProtectedRoute>} />

        {/* Clients */}
        <Route path="/clients"         element={<ProtectedRoute roles={[...CLINICAL,"RECEPTIONIST"]}><Clients /></ProtectedRoute>} />
        <Route path="/clients/import"  element={<ProtectedRoute roles={ADMIN}><ImportClients /></ProtectedRoute>} />
        <Route path="/clients/:id"     element={<ProtectedRoute roles={[...CLINICAL,"RECEPTIONIST"]}><ClientDetail /></ProtectedRoute>} />
        <Route path="/clients/:id/progress" element={<ProtectedRoute roles={[...CLINICAL,"RECEPTIONIST"]}><ClientProgress /></ProtectedRoute>} />

        {/* Schedule */}
        <Route path="/schedule" element={<ProtectedRoute roles={[...CLINICAL,"RECEPTIONIST"]}><Schedule /></ProtectedRoute>} />

        {/* Clinical */}
        <Route path="/sessions"    element={<ProtectedRoute roles={CLINICAL}><Sessions /></ProtectedRoute>} />
        <Route path="/plans"       element={<ProtectedRoute roles={CLINICAL}><Plans /></ProtectedRoute>} />
        <Route path="/assessments" element={<ProtectedRoute roles={CLINICAL}><Assessments /></ProtectedRoute>} />

        {/* Timetable */}
        <Route path="/timetable" element={<ProtectedRoute roles={[...ADMIN,"THERAPIST"]}><Timetable /></ProtectedRoute>} />
        <Route path="/daily-summary" element={<ProtectedRoute roles={[...ADMIN,"THERAPIST"]}><DailySummary /></ProtectedRoute>} />

        {/* Reports */}
        <Route path="/reports" element={<ProtectedRoute roles={[...ADMIN,"FINANCE"]}><Reports /></ProtectedRoute>} />

        {/* Billing */}
        <Route path="/billing" element={<ProtectedRoute roles={[...FINANCE,"RECEPTIONIST"]}><Billing /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/staff"              element={<ProtectedRoute roles={ADMIN}><Staff /></ProtectedRoute>} />
        <Route path="/attendance/import"  element={<ProtectedRoute roles={ADMIN}><ImportAttendance /></ProtectedRoute>} />

        {/* Redirects */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}