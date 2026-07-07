import { useEffect, useState } from "react"
import api from "../lib/api"
import { useAuthStore } from "../stores/auth.store"
import Layout from "../components/Layout"

const SESSION_RATE = 300

export default function Dashboard() {
  useAuthStore()
  const [clients,      setClients]      = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [invoices,     setInvoices]     = useState<any[]>([])
  const [plans,        setPlans]        = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/clients").catch(() => ({ data: [] })),
      api.get("/appointments").catch(() => ({ data: [] })),
      api.get("/invoices").catch(() => ({ data: [] })),
      api.get("/itps").catch(() => ({ data: [] })),
    ]).then(([c, a, inv, p]: any) => {
      setClients(c.data)
      setAppointments(a.data)
      setInvoices(inv.data)
      setPlans(p.data)
    }).finally(() => setLoading(false))
  }, [])

  const today           = new Date()
  const todayStr        = today.toDateString()
  const todayAppts      = appointments.filter((a: any) => new Date(a.scheduledAt).toDateString() === todayStr)
  const pendingInvoices = invoices.filter((i: any) => i.status !== "PAID")
  const activeClients   = clients.filter((c: any) => c.status === "ACTIVE")
  const allGoals        = plans.flatMap((p: any) => p.goals || [])

  const proBonoClients  = clients.filter((c: any) => c.isProBono)
  const proBonoIds      = new Set(proBonoClients.map((c: any) => c.id))
  const proBonoSessions = appointments.filter((a: any) => {
    const cid = a.clientId ?? a.client?.id
    return cid && proBonoIds.has(cid)
  })
  const completedPB     = proBonoSessions.filter((a: any) => a.status === "COMPLETED")
  const valueWaived     = completedPB.length * SESSION_RATE

  const COLORS: Record<string, string> = {
    OT:"#3b82f6", SPEECH:"#22c55e", ABA:"#a855f7",
    SENSORY:"#f97316", GROUP:"#eab308", PSYCH:"#ec4899", PHYSIO:"#0891b2"
  }

  const stats = [
    { label:"Active Clients",   value: activeClients.length,   color:"#1a8c6e", sub:"registered" },
    { label:"Sessions Today",   value: todayAppts.length,       color:"#2563a8", sub:"scheduled" },
    { label:"Pending Invoices", value: pendingInvoices.length,  color:"#d97706", sub:"awaiting payment" },
    { label:"Active Plans",     value: plans.length,            color:"#d63f5c", sub:"therapy plans" },
  ]

  return (
    <Layout title="Dashboard">

      {/* Main stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:14 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, right:0, width:60, height:60, borderRadius:"0 16px 0 100%", background:s.color, opacity:0.06 }} />
            <div style={{ fontSize:11.5, fontWeight:500, color:"#8aab9e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:600, color:s.color, lineHeight:1, marginBottom:4 }}>{loading ? "..." : s.value}</div>
            <div style={{ fontSize:11.5, color:"#8aab9e" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Pro Bono banner */}
      {proBonoClients.length > 0 && (
        <div style={{ background:"linear-gradient(135deg,#fef3c7,#fde68a)", border:"1px solid #fbbf24", borderRadius:14, padding:"14px 20px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>🤝</span>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600, color:"#92400e" }}>Pro Bono Services Active</div>
              <div style={{ fontSize:12, color:"#b45309", marginTop:2 }}>
                Supporting {proBonoClients.length} {proBonoClients.length === 1 ? "family" : "families"} with subsidised care
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:20 }}>
            {[
              { label:"Sessions Delivered", value: completedPB.length },
              { label:"Value Waived",       value: "KSh "+valueWaived.toLocaleString() },
            ].map((item, i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:"#92400e" }}>{item.value}</div>
                <div style={{ fontSize:11, color:"#b45309" }}>{item.label}</div>
              </div>
            ))}
            <a href="/reports" style={{ alignSelf:"center", padding:"6px 14px", borderRadius:8, background:"#d97706", color:"white", fontSize:12.5, fontWeight:500, textDecoration:"none" }}>
              Full Report →
            </a>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:14 }}>

        {/* Today's appointments */}
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>
                Today — {today.toLocaleDateString("en-KE",{ weekday:"short", day:"numeric", month:"short" })}
              </div>
              <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:1 }}>{todayAppts.length} scheduled</div>
            </div>
            <a href="/schedule" style={{ fontSize:11.5, color:"#1a8c6e", fontWeight:500, textDecoration:"none" }}>View schedule →</a>
          </div>
          <div style={{ padding:"0 18px" }}>
            {loading ? (
              <div style={{ padding:24, textAlign:"center", color:"#8aab9e" }}>Loading...</div>
            ) : todayAppts.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", color:"#8aab9e", fontSize:13 }}>No appointments today</div>
            ) : todayAppts.map((a: any, i: number) => {
              const d     = new Date(a.scheduledAt)
              const color = COLORS[a.therapyType] ?? "#888"
              const cid   = a.clientId ?? a.client?.id
              const isPB  = cid && proBonoIds.has(cid)
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i<todayAppts.length-1?"1px solid #f0f4f2":"none" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", width:44, textAlign:"right", flexShrink:0 }}>
                    {d.toLocaleTimeString("en-KE",{ hour:"2-digit", minute:"2-digit" })}
                  </div>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>
                      {a.client?.fullName ?? "Client"}
                      {isPB && <span style={{ fontSize:10, marginLeft:6, padding:"1px 6px", borderRadius:20, background:"#fef3c7", color:"#d97706", fontWeight:600 }}>Pro Bono</span>}
                    </div>
                    <div style={{ fontSize:11.5, color:"#8aab9e" }}>{a.therapyType} · {a.therapist?.fullName ?? ""}</div>
                  </div>
                  <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:20, background:color+"22", color, fontWeight:600 }}>{a.therapyType}</span>
                  <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:20, background:a.status==="COMPLETED"?"#e6f4ef":"#fef3c7", color:a.status==="COMPLETED"?"#1a8c6e":"#d97706", fontWeight:600 }}>{a.status}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Mini calendar */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>
                {today.toLocaleDateString("en-KE",{ month:"long", year:"numeric" })}
              </div>
            </div>
            <div style={{ padding:"14px 18px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, textAlign:"center", marginBottom:4 }}>
                {["S","M","T","W","T","F","S"].map((d,i) => (
                  <div key={i} style={{ fontSize:10, color:"#8aab9e", fontWeight:600, padding:"3px 0" }}>{d}</div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, textAlign:"center" }}>
                {Array.from({ length:35 }, (_, i) => {
                  const firstDay    = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
                  const day         = i - firstDay + 1
                  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()
                  const isToday     = day === today.getDate()
                  const valid       = day >= 1 && day <= daysInMonth
                  const hasAppt     = valid && appointments.some((a: any) =>
                    new Date(a.scheduledAt).getDate()  === day &&
                    new Date(a.scheduledAt).getMonth() === today.getMonth()
                  )
                  return (
                    <div key={i} style={{ fontSize:12, padding:"5px 2px", borderRadius:6, background:isToday?"#1a8c6e":"transparent", color:isToday?"white":valid?"#1a2724":"#d6e8e0", fontWeight:isToday?600:400, position:"relative" }}>
                      {valid ? day : ""}
                      {hasAppt && !isToday && (
                        <div style={{ position:"absolute", bottom:1, left:"50%", transform:"translateX(-50%)", width:4, height:4, background:"#1a8c6e", borderRadius:"50%" }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Goals */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>ITP Goals</div>
              <a href="/plans" style={{ fontSize:11.5, color:"#1a8c6e", fontWeight:500, textDecoration:"none" }}>See all →</a>
            </div>
            <div style={{ padding:"12px 18px" }}>
              {allGoals.length === 0 ? (
                <div style={{ fontSize:13, color:"#8aab9e", textAlign:"center", padding:"8px 0" }}>No goals yet</div>
              ) : allGoals.slice(0,4).map((g: any, i: number) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4 }}>
                    <span style={{ color:"#1a2724", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"70%" }}>{g.title}</span>
                    <span style={{ fontWeight:600, color:"#1a8c6e", flexShrink:0 }}>{g.progressPct}%</span>
                  </div>
                  <div style={{ height:6, background:"#f0f4f2", borderRadius:20, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:g.progressPct+"%", background:"#1a8c6e", borderRadius:20 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>

        {/* Recent Activity */}
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Recent Activity</div>
          </div>
          <div style={{ padding:"0 18px" }}>
            {loading ? (
              <div style={{ padding:24, textAlign:"center", color:"#8aab9e" }}>Loading...</div>
            ) : (
              [
                ...clients
                  .slice()
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 2)
                  .map((c: any) => ({
                    icon: "👤",
                    text: `${c.fullName} registered${c.isProBono ? " (Pro Bono)" : ""}`,
                    time: new Date(c.createdAt).toLocaleDateString("en-KE", { day:"numeric", month:"short" }),
                    bg:   c.isProBono ? "#fef3c7" : "#e6f4ef"
                  })),
                ...appointments
                  .slice()
                  .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                  .slice(0, 3)
                  .map((a: any) => ({
                    icon: "📅",
                    text: `${a.client?.fullName ?? "Client"} — ${a.therapyType} session`,
                    time: new Date(a.scheduledAt).toLocaleDateString("en-KE", { day:"numeric", month:"short" }),
                    bg:   "#e8f0fb"
                  }))
              ].slice(0, 5).map((item, i, arr) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<arr.length-1?"1px solid #f0f4f2":"none" }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:item.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, color:"#1a2724", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.text}</div>
                    <div style={{ fontSize:11, color:"#8aab9e", marginTop:2 }}>{item.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts */}
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Alerts</div>
          </div>
          <div style={{ padding:"12px 18px", display:"flex", flexDirection:"column", gap:8 }}>
            {pendingInvoices.length > 0 && (
              <div style={{ display:"flex", gap:10, padding:"10px 12px", borderRadius:10, background:"#fef3c7" }}>
                <span>⚠️</span>
                <div style={{ fontSize:12.5, color:"#92400e" }}>{pendingInvoices.length} invoice{pendingInvoices.length>1?"s":""} pending payment</div>
              </div>
            )}
            {todayAppts.length > 0 && (
              <div style={{ display:"flex", gap:10, padding:"10px 12px", borderRadius:10, background:"#e8f0fb" }}>
                <span>📅</span>
                <div style={{ fontSize:12.5, color:"#1e3a5f" }}>{todayAppts.length} session{todayAppts.length>1?"s":""} today</div>
              </div>
            )}
            {proBonoClients.length > 0 && (
              <div style={{ display:"flex", gap:10, padding:"10px 12px", borderRadius:10, background:"#fef3c7" }}>
                <span>🤝</span>
                <div style={{ fontSize:12.5, color:"#92400e" }}>{proBonoClients.length} pro bono client{proBonoClients.length>1?"s":""} — KSh {valueWaived.toLocaleString()} waived</div>
              </div>
            )}
            {plans.filter((p: any) => p.reviewDate && new Date(p.reviewDate) < new Date()).length > 0 && (
              <div style={{ display:"flex", gap:10, padding:"10px 12px", borderRadius:10, background:"#fde8ed" }}>
                <span>🎯</span>
                <div style={{ fontSize:12.5, color:"#9b1d3a" }}>ITP review overdue</div>
              </div>
            )}
            {pendingInvoices.length === 0 && todayAppts.length === 0 && proBonoClients.length === 0 && (
              <div style={{ fontSize:13, color:"#8aab9e", textAlign:"center", padding:"12px 0" }}>All clear — no alerts</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}