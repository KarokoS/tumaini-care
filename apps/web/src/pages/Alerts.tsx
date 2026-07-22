import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"
import { useAuthStore } from "../stores/auth.store"

export default function Alerts() {
  const { user } = useAuthStore()
  const isAdmin  = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER"

  const [missing,  setMissing]  = useState<{ count:number; clients:any[] } | null>(null)
  const [reviews,  setReviews]  = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [sendingSMS, setSendingSMS] = useState(false)
  const [smsSent,  setSmsSent]  = useState<number | null>(null)

  useEffect(() => { loadAlerts() }, [])

  function loadAlerts() {
    setLoading(true)
    Promise.all([
      api.get("/clients/alerts/missing-sessions").catch(() => ({ data:{ count:0, clients:[] } })),
      api.get("/itps/review-alerts").catch(() => ({ data:{ overdue:[], upcoming:[], noReviewDate:[], counts:{ overdue:0, upcoming:0, noDate:0, total:0 } } })),
    ]).then(([m, r]:any) => {
      setMissing(m.data)
      setReviews(r.data)
    }).finally(() => setLoading(false))
  }

  async function sendReviewSMS() {
    setSendingSMS(true)
    try {
      const res = await api.post("/itps/send-review-reminders", {})
      setSmsSent(res.data.sent)
    } catch { alert("Failed to send SMS reminders") }
    finally { setSendingSMS(false) }
  }

  const totalAlerts = (missing?.count ?? 0) + (reviews?.counts?.total ?? 0)

  return (
    <Layout title="Alerts & Reminders">

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#fde8ed,#fef3c7)", border:"1px solid #fbbf24", borderRadius:14, padding:"16px 22px", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontSize:28 }}>⚠️</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"#92400e" }}>Centre Alerts</div>
          <div style={{ fontSize:12.5, color:"#b45309", marginTop:3 }}>
            Items requiring attention — missing sessions and ITP reviews due
          </div>
        </div>
        <div style={{ textAlign:"center", flexShrink:0 }}>
          <div style={{ fontSize:32, fontWeight:700, color:"#d63f5c" }}>{loading?"...":totalAlerts}</div>
          <div style={{ fontSize:11.5, color:"#b45309" }}>total alerts</div>
        </div>
        <button onClick={loadAlerts} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #fbbf24", background:"white", fontSize:12.5, cursor:"pointer", color:"#92400e", flexShrink:0 }}>
          ↺ Refresh
        </button>
      </div>

      {/* ── ITP Review Alerts ── */}
      <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>🎯 ITP Review Reminders</div>
            <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>Therapy plans overdue or due for review within 7 days</div>
          </div>
          {isAdmin && (reviews?.counts?.upcoming > 0 || reviews?.counts?.overdue > 0) && (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {smsSent !== null && (
                <span style={{ fontSize:12, color:"#1a8c6e", fontWeight:500 }}>✓ {smsSent} SMS sent</span>
              )}
              <button onClick={sendReviewSMS} disabled={sendingSMS}
                style={{ padding:"7px 14px", borderRadius:8, border:"none", background:sendingSMS?"#8aab9e":"#1a8c6e", color:"white", fontSize:12.5, fontWeight:500, cursor:"pointer" }}>
                {sendingSMS ? "Sending..." : "📱 Send SMS Reminders"}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Checking ITP dates...</div>
        ) : reviews?.counts?.total === 0 && reviews?.counts?.noDate === 0 ? (
          <div style={{ padding:40, textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:600, color:"#1a8c6e" }}>All ITP reviews are on track</div>
          </div>
        ) : (
          <div>
            {/* Overdue */}
            {reviews?.overdue?.length > 0 && (
              <>
                <div style={{ padding:"8px 18px", background:"#fde8ed", borderBottom:"1px solid #f5b8c4" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#d63f5c", textTransform:"uppercase" }}>
                    🔴 Overdue — {reviews.overdue.length} plan{reviews.overdue.length>1?"s":""}
                  </span>
                </div>
                {reviews.overdue.map((itp:any, i:number) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:"1px solid #f0f4f2", flexWrap:"wrap" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"#fde8ed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#d63f5c", flexShrink:0 }}>
                      {itp.clientName.charAt(0)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>{itp.clientName}</div>
                      <div style={{ fontSize:12, color:"#8aab9e", marginTop:2 }}>
                        Review was due: <strong style={{ color:"#d63f5c" }}>{new Date(itp.reviewDate).toLocaleDateString('en-KE',{ day:'numeric', month:'long', year:'numeric' })}</strong>
                        {" · "}{itp.daysOverdue} days overdue
                      </div>
                      <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>
                        {itp.goalsTotal} goals · {itp.goalsAchieved} achieved
                        {itp.guardian ? ` · Guardian: ${itp.guardian.fullName} ${itp.guardian.phone}` : ""}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <a href={`/clients/${itp.clientId}`}
                        style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, color:"#4a6359", textDecoration:"none" }}>
                        View Client
                      </a>
                      <a href={`/plans?clientId=${itp.clientId}`}
                        style={{ padding:"6px 12px", borderRadius:8, border:"none", background:"#d63f5c", color:"white", fontSize:12, fontWeight:500, textDecoration:"none" }}>
                        Review Now
                      </a>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Upcoming */}
            {reviews?.upcoming?.length > 0 && (
              <>
                <div style={{ padding:"8px 18px", background:"#fef3c7", borderBottom:"1px solid #fde68a", borderTop:reviews?.overdue?.length>0?"1px solid #f0f4f2":"none" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#d97706", textTransform:"uppercase" }}>
                    🟡 Due within 7 days — {reviews.upcoming.length} plan{reviews.upcoming.length>1?"s":""}
                  </span>
                </div>
                {reviews.upcoming.map((itp:any, i:number) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:"1px solid #f0f4f2", flexWrap:"wrap" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#d97706", flexShrink:0 }}>
                      {itp.clientName.charAt(0)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>{itp.clientName}</div>
                      <div style={{ fontSize:12, color:"#8aab9e", marginTop:2 }}>
                        Review due: <strong style={{ color:"#d97706" }}>{new Date(itp.reviewDate).toLocaleDateString('en-KE',{ day:'numeric', month:'long', year:'numeric' })}</strong>
                        {" · "}in {itp.daysUntil} day{itp.daysUntil!==1?"s":""}
                      </div>
                      <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>
                        {itp.goalsTotal} goals · {itp.goalsAchieved} achieved
                        {itp.guardian ? ` · Guardian: ${itp.guardian.fullName} ${itp.guardian.phone}` : ""}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <a href={`/clients/${itp.clientId}`}
                        style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, color:"#4a6359", textDecoration:"none" }}>
                        View Client
                      </a>
                      <a href={`/plans?clientId=${itp.clientId}`}
                        style={{ padding:"6px 12px", borderRadius:8, border:"none", background:"#d97706", color:"white", fontSize:12, fontWeight:500, textDecoration:"none" }}>
                        Schedule Review
                      </a>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* No review date set */}
            {reviews?.noReviewDate?.length > 0 && (
              <>
                <div style={{ padding:"8px 18px", background:"#f0f4f2", borderTop:"1px solid #d6e8e0" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#8aab9e", textTransform:"uppercase" }}>
                    ⚪ No review date set — {reviews.noReviewDate.length} plan{reviews.noReviewDate.length>1?"s":""}
                  </span>
                </div>
                {reviews.noReviewDate.map((itp:any, i:number) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:"1px solid #f0f4f2" }}>
                    <span style={{ fontSize:13, color:"#4a6359" }}>{itp.clientName}</span>
                    <a href={`/plans?clientId=${itp.clientId}`}
                      style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, color:"#1a8c6e", textDecoration:"none" }}>
                      Set Review Date
                    </a>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Missing Sessions ── */}
      <div style={{ background:"white", borderRadius:14, border:"1px solid #d6e8e0", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>👥 Missing Sessions</div>
          <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>Active clients with no session in the last 14 days</div>
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Checking session records...</div>
        ) : !missing || missing.clients.length === 0 ? (
          <div style={{ padding:40, textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:14, fontWeight:600, color:"#1a8c6e" }}>All clients attended recently</div>
          </div>
        ) : missing.clients.map((client:any, i:number) => {
          const days = client.daysSince
          const isUrgent = days === null || days > 30
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:i<missing.clients.length-1?"1px solid #f0f4f2":"none", flexWrap:"wrap" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:isUrgent?"#fde8ed":"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:isUrgent?"#d63f5c":"#d97706", flexShrink:0 }}>
                {client.fullName.charAt(0)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>{client.fullName}</span>
                  {client.isProBono && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:20, background:"#fef3c7", color:"#d97706", fontWeight:600 }}>Pro Bono</span>}
                </div>
                <div style={{ fontSize:12, color:"#8aab9e", marginTop:2 }}>
                  {client.guardian ? `${client.guardian.fullName} · ${client.guardian.phone}` : "No guardian on record"}
                </div>
                {client.lastAppointment ? (
                  <div style={{ fontSize:12, color:"#4a6359", marginTop:3 }}>
                    Last session: {new Date(client.lastAppointment.scheduledAt).toLocaleDateString('en-KE',{ day:'numeric', month:'short' })}
                    {" · "}<span style={{ color:isUrgent?"#d63f5c":"#d97706", fontWeight:500 }}>{days} days ago</span>
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:"#d63f5c", marginTop:3, fontWeight:500 }}>No sessions on record</div>
                )}
              </div>
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <a href={`/clients/${client.id}`}
                  style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, color:"#4a6359", textDecoration:"none" }}>
                  View
                </a>
                <a href={`/schedule`}
                  style={{ padding:"6px 12px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:12, fontWeight:500, textDecoration:"none" }}>
                  📅 Book
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}