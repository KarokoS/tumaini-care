import { useEffect, useState } from "react"
import api from "../lib/api"
import { useAuthStore } from "../stores/auth.store"

export default function ParentPortal() {
  const { user, logout } = useAuthStore()
  const [data, setData]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/parent/dashboard").catch(() => ({ data: null })),
    ]).then(([d]: any) => {
      setData(d.data)
    }).finally(() => setLoading(false))
  }, [])

  // Fallback display data
  const childName      = data?.childName      ?? user?.fullName ?? "Your Child"
  const nextAppt       = data?.nextAppt       ?? { date: "Mon 23 Jun, 8:00 AM", type: "Occupational Therapy", therapist: "Mercy Akoth", room: "OT Room" }
  const sessionsMonth  = data?.sessionsMonth  ?? 0
  const goalProgress   = data?.goalProgress   ?? 0
  const recentNotes    = data?.recentNotes    ?? []
  const invoices       = data?.invoices       ?? []

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f5", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #d6e8e0", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#1a8c6e", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, fontWeight: 700 }}>T</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a8c6e" }}>Tumaini</div>
            <div style={{ fontSize: 10, color: "#8aab9e" }}>St. Thorlak Centre</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, color: "#4a6359" }}>Welcome, {user?.fullName ?? "Parent"}</div>
          <button onClick={logout} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 12, cursor: "pointer", color: "#4a6359" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>

        {/* Welcome banner */}
        <div style={{ background: "#1a8c6e", borderRadius: 16, padding: "22px 24px", marginBottom: 20, color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -30, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 6 }}>Parent Dashboard</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{childName}</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Tumaini St. Thorlak Autism Centre · Nanyuki</div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#8aab9e" }}>Loading your dashboard...</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: "#1a8c6e", lineHeight: 1 }}>{sessionsMonth}</div>
                <div style={{ fontSize: 12, color: "#8aab9e", marginTop: 6 }}>Sessions This Month</div>
              </div>
              <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: "#2563a8", lineHeight: 1 }}>{goalProgress}%</div>
                <div style={{ fontSize: 12, color: "#8aab9e", marginTop: 6 }}>Average Goal Progress</div>
              </div>
            </div>

            {/* Next appointment */}
            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Next Appointment</div>
              {nextAppt ? (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2724", marginBottom: 6 }}>{nextAppt.date}</div>
                  <div style={{ fontSize: 13, color: "#4a6359" }}>{nextAppt.type} · {nextAppt.therapist}</div>
                  {nextAppt.room && <div style={{ fontSize: 12, color: "#8aab9e", marginTop: 4 }}>{nextAppt.room}</div>}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#8aab9e" }}>No upcoming appointments scheduled</div>
              )}
            </div>

            {/* Recent session notes */}
            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #d6e8e0" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Recent Session Notes</div>
                <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>Shared by your therapist</div>
              </div>
              <div style={{ padding: "0 20px" }}>
                {recentNotes.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "#8aab9e", fontSize: 13 }}>No session notes shared yet</div>
                ) : recentNotes.slice(0, 3).map((note: any, i: number) => (
                  <div key={i} style={{ padding: "14px 0", borderBottom: i < 2 ? "1px solid #f0f4f2" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a2724" }}>{note.therapyType} Session</span>
                      <span style={{ fontSize: 11.5, color: "#8aab9e" }}>{new Date(note.date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</span>
                    </div>
                    {note.plan && (
                      <div style={{ fontSize: 12.5, color: "#4a6359", lineHeight: 1.6 }}>
                        <strong style={{ color: "#1a8c6e" }}>Plan: </strong>{note.plan}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Outstanding invoices */}
            {invoices.filter((i: any) => i.status !== "PAID").length > 0 && (
              <div style={{ background: "#fde8ed", border: "1px solid #f5b8c4", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#d63f5c", marginBottom: 8 }}>Outstanding Invoice</div>
                {invoices.filter((i: any) => i.status !== "PAID").slice(0, 1).map((inv: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>KSh {parseFloat(inv.amountKes).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#8aab9e", marginTop: 2 }}>{inv.number} · Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "on receipt"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#4a6359", marginBottom: 4 }}>M-Pesa Paybill</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2724" }}>880100</div>
                      <div style={{ fontSize: 12, color: "#8aab9e" }}>Acc: 411511</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button style={{ padding: "12px", borderRadius: 10, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                📄 Latest Report
              </button>
              <button style={{ padding: "12px", borderRadius: 10, border: "1px solid #d6e8e0", background: "white", color: "#4a6359", fontSize: 13, cursor: "pointer" }}>
                💬 Message Therapist
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}