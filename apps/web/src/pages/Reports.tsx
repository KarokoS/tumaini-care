import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

export default function Reports() {
  const [clients, setClients] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/clients").catch(() => ({ data:[] })),
      api.get("/appointments").catch(() => ({ data:[] })),
      api.get("/invoices").catch(() => ({ data:[] })),
      api.get("/itps").catch(() => ({ data:[] })),
    ]).then(([c,a,inv,p]:any) => {
      setClients(c.data)
      setAppointments(a.data)
      setInvoices(inv.data)
      setPlans(p.data)
    }).finally(() => setLoading(false))
  }, [])

  const allGoals = plans.flatMap((p:any) => p.goals || [])
  const achievedGoals = allGoals.filter((g:any) => g.isAchieved)
  const avgProgress = allGoals.length > 0
    ? Math.round(allGoals.reduce((s:number, g:any) => s + g.progressPct, 0) / allGoals.length)
    : 0
  const completedAppts = appointments.filter(a => a.status === "COMPLETED")
  const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s,i) => s + parseFloat(i.amountKes), 0)
  const attendanceRate = appointments.length > 0
    ? Math.round((completedAppts.length / appointments.length) * 100)
    : 0

  const therapyTypeCounts: Record<string,number> = {}
  appointments.forEach(a => {
    therapyTypeCounts[a.therapyType] = (therapyTypeCounts[a.therapyType] || 0) + 1
  })

  const last6Months = Array.from({ length:6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return {
      label: d.toLocaleDateString("en-KE", { month:"short" }),
      month: d.getMonth(),
      year: d.getFullYear(),
    }
  })

  const sessionsByMonth = last6Months.map(m => ({
    label: m.label,
    count: appointments.filter(a => {
      const d = new Date(a.scheduledAt)
      return d.getMonth() === m.month && d.getFullYear() === m.year
    }).length
  }))

  const maxSessions = Math.max(...sessionsByMonth.map(m => m.count), 1)

  const THERAPY_COLORS: Record<string,string> = {
    OT:"#3b82f6", SPEECH:"#22c55e", ABA:"#a855f7",
    SENSORY:"#f97316", GROUP:"#eab308", PSYCH:"#ec4899"
  }

  const totalTherapySessions = Object.values(therapyTypeCounts).reduce((s,n) => s+n, 0) || 1

  const revenueByMonth = last6Months.map(m => ({
    label: m.label,
    amount: invoices.filter(i => {
      const d = new Date(i.createdAt)
      return d.getMonth() === m.month && d.getFullYear() === m.year && i.status === "PAID"
    }).reduce((s,i) => s + parseFloat(i.amountKes), 0)
  }))

  const maxRevenue = Math.max(...revenueByMonth.map(m => m.amount), 1)

  return (
    <Layout title="Reports & Analytics">
      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading...</div>
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
            {[
              { label:"Goals Active", value: allGoals.length, sub:"across all clients", color:"#1a8c6e" },
              { label:"Goals Achieved", value: achievedGoals.length, sub:"total this year", color:"#2563a8" },
              { label:"Avg Goal Progress", value: avgProgress+"%", sub:"across active goals", color:"#d97706" },
              { label:"Attendance Rate", value: attendanceRate+"%", sub:"completed vs scheduled", color:"#d63f5c" },
            ].map((s, i) => (
              <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, right:0, width:60, height:60, borderRadius:"0 16px 0 100%", background:s.color, opacity:0.06 }}></div>
                <div style={{ fontSize:11.5, fontWeight:500, color:"#8aab9e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:28, fontWeight:600, color:s.color, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                <div style={{ fontSize:11.5, color:"#8aab9e" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:14 }}>
            <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Monthly Sessions Delivered</div>
                <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>Last 6 months</div>
              </div>
              <div style={{ padding:"20px 18px" }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:160 }}>
                  {sessionsByMonth.map((m, i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:"#1a8c6e" }}>{m.count > 0 ? m.count : ""}</div>
                      <div style={{ width:"100%", background:"#1a8c6e", borderRadius:"4px 4px 0 0", height: Math.max((m.count/maxSessions)*120, m.count>0?4:0)+"px", transition:"height 0.5s", opacity: m.count===0?0.2:1 }}></div>
                      <div style={{ fontSize:11, color:"#8aab9e", fontWeight:500 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                {appointments.length === 0 && (
                  <div style={{ textAlign:"center", color:"#8aab9e", fontSize:12, marginTop:8 }}>No sessions recorded yet</div>
                )}
              </div>
            </div>

            <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Therapy Type Split</div>
                <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>{appointments.length} total sessions</div>
              </div>
              <div style={{ padding:"16px 18px" }}>
                {Object.keys(therapyTypeCounts).length === 0 ? (
                  <div style={{ textAlign:"center", color:"#8aab9e", fontSize:12, padding:"40px 0" }}>No sessions yet</div>
                ) : (
                  <>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
                      <div style={{ position:"relative", width:100, height:100 }}>
                        <svg viewBox="0 0 36 36" style={{ width:100, height:100, transform:"rotate(-90deg)" }}>
                          {(() => {
                            let offset = 0
                            return Object.entries(therapyTypeCounts).map(([type, count], i) => {
                              const pct = (count / totalTherapySessions) * 100
                              const dash = `${pct} ${100 - pct}`
                              const el = (
                                <circle key={i} cx="18" cy="18" r="15.9155" fill="none"
                                  stroke={THERAPY_COLORS[type] ?? "#888"}
                                  strokeWidth="3.5"
                                  strokeDasharray={dash}
                                  strokeDashoffset={-offset}
                                />
                              )
                              offset += pct
                              return el
                            })
                          })()}
                        </svg>
                        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, color:"#1a2724" }}>
                          {appointments.length}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {Object.entries(therapyTypeCounts).map(([type, count], i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:10, height:10, borderRadius:"50%", background:THERAPY_COLORS[type]??"#888", flexShrink:0 }}></div>
                            <span style={{ color:"#4a6359" }}>{type}</span>
                          </div>
                          <span style={{ fontWeight:600, color:"#1a2724" }}>{Math.round((count/totalTherapySessions)*100)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:14 }}>
            <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Revenue Trend</div>
                <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>Paid invoices — last 6 months</div>
              </div>
              <div style={{ padding:"20px 18px" }}>
                <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:120 }}>
                  {revenueByMonth.map((m, i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                      <div style={{ fontSize:10, fontWeight:600, color:"#2563a8" }}>{m.amount > 0 ? "K"+Math.round(m.amount/1000) : ""}</div>
                      <div style={{ width:"100%", background:"#2563a8", borderRadius:"4px 4px 0 0", height: Math.max((m.amount/maxRevenue)*90, m.amount>0?4:0)+"px", opacity: m.amount===0?0.15:1, transition:"height 0.5s" }}></div>
                      <div style={{ fontSize:11, color:"#8aab9e", fontWeight:500 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10, fontSize:12, color:"#8aab9e", textAlign:"right" }}>
                  Total collected: <strong style={{ color:"#1a8c6e" }}>KSh {totalRevenue.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Goal Progress</div>
                <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>{allGoals.length} active goals</div>
              </div>
              <div style={{ padding:"14px 18px" }}>
                {allGoals.length === 0 ? (
                  <div style={{ textAlign:"center", color:"#8aab9e", fontSize:12, padding:"20px 0" }}>No goals yet</div>
                ) : allGoals.slice(0,6).map((g:any, i:number) => {
                  const colors = ["#1a8c6e","#2563a8","#d97706","#a855f7","#22c55e","#f97316"]
                  const color = g.isAchieved ? "#1a8c6e" : colors[i % colors.length]
                  return (
                    <div key={i} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ color:"#1a2724", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"75%" }}>{g.title}</span>
                        <span style={{ fontWeight:600, color, flexShrink:0 }}>{g.progressPct}%</span>
                      </div>
                      <div style={{ height:6, background:"#f0f4f2", borderRadius:20, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:g.progressPct+"%", background:color, borderRadius:20 }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"18px 20px" }}>
              <div style={{ fontSize:11.5, fontWeight:500, color:"#8aab9e", textTransform:"uppercase", marginBottom:12 }}>Client Summary</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Total clients</span>
                  <span style={{ fontWeight:600, color:"#1a2724" }}>{clients.length}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Active</span>
                  <span style={{ fontWeight:600, color:"#1a8c6e" }}>{clients.filter(c=>c.status==="ACTIVE").length}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>With therapy plans</span>
                  <span style={{ fontWeight:600, color:"#2563a8" }}>{plans.length}</span>
                </div>
              </div>
            </div>

            <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"18px 20px" }}>
              <div style={{ fontSize:11.5, fontWeight:500, color:"#8aab9e", textTransform:"uppercase", marginBottom:12 }}>Session Summary</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Total booked</span>
                  <span style={{ fontWeight:600, color:"#1a2724" }}>{appointments.length}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Completed</span>
                  <span style={{ fontWeight:600, color:"#1a8c6e" }}>{completedAppts.length}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Attendance rate</span>
                  <span style={{ fontWeight:600, color:"#d97706" }}>{attendanceRate}%</span>
                </div>
              </div>
            </div>

            <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"18px 20px" }}>
              <div style={{ fontSize:11.5, fontWeight:500, color:"#8aab9e", textTransform:"uppercase", marginBottom:12 }}>Financial Summary</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Total invoiced</span>
                  <span style={{ fontWeight:600, color:"#1a2724" }}>KSh {invoices.reduce((s,i)=>s+parseFloat(i.amountKes),0).toLocaleString()}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Collected</span>
                  <span style={{ fontWeight:600, color:"#1a8c6e" }}>KSh {totalRevenue.toLocaleString()}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:"#4a6359" }}>Outstanding</span>
                  <span style={{ fontWeight:600, color:"#d63f5c" }}>KSh {invoices.filter(i=>i.status!=="PAID").reduce((s,i)=>s+parseFloat(i.amountKes),0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}