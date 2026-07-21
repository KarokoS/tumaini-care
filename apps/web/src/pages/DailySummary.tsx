import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

const THERAPY_COLORS: Record<string,string> = {
  OT:'#3b82f6', SPEECH:'#22c55e', ABA:'#a855f7',
  SENSORY:'#f97316', GROUP:'#eab308', PSYCH:'#ec4899', PHYSIO:'#0891b2',
}

export default function DailySummary() {
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState<any[]>([])
  const [invoices, setInvoices]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => { loadData() }, [date])

  function loadData() {
    setLoading(true)
    const from = new Date(date)
    from.setHours(0,0,0,0)
    const to = new Date(date)
    to.setHours(23,59,59,999)

    Promise.all([
      api.get(`/appointments?from=${from.toISOString()}&to=${to.toISOString()}`).catch(()=>({data:[]})),
      api.get("/invoices").catch(()=>({data:[]})),
    ]).then(([a,inv]:any) => {
      setAppointments(a.data)
      // Filter invoices for selected date
      setInvoices(inv.data.filter((i:any) => {
        const d = new Date(i.createdAt ?? i.issuedAt)
        return d.toISOString().split('T')[0] === date
      }))
    }).finally(() => setLoading(false))
  }

  const completed  = appointments.filter(a=>a.status==="COMPLETED")
  const scheduled  = appointments.filter(a=>a.status==="SCHEDULED"||a.status==="CONFIRMED")
  const noShows    = appointments.filter(a=>a.status==="NO_SHOW")
  const cancelled  = appointments.filter(a=>a.status==="CANCELLED")
  const withNotes  = appointments.filter(a=>a.sessionNote)
  const revenue    = invoices.filter(i=>i.status==="PAID").reduce((s:number,i:any)=>s+parseFloat(i.amountKes),0)
  const outstanding = invoices.filter(i=>i.status!=="PAID"&&parseFloat(i.amountKes)>0).reduce((s:number,i:any)=>s+parseFloat(i.amountKes),0)

  // Group by therapist
  const byTherapist: Record<string,{ name:string; completed:number; scheduled:number; noShow:number; types:string[] }> = {}
  appointments.forEach((a:any) => {
    const name = a.therapist?.fullName ?? "Unassigned"
    if (!byTherapist[name]) byTherapist[name] = { name, completed:0, scheduled:0, noShow:0, types:[] }
    if (a.status==="COMPLETED") byTherapist[name].completed++
    if (a.status==="SCHEDULED"||a.status==="CONFIRMED") byTherapist[name].scheduled++
    if (a.status==="NO_SHOW") byTherapist[name].noShow++
    if (!byTherapist[name].types.includes(a.therapyType)) byTherapist[name].types.push(a.therapyType)
  })
  const therapistList = Object.values(byTherapist).sort((a,b)=>b.completed-a.completed)

  // Group by therapy type
  const byType: Record<string,number> = {}
  completed.forEach((a:any) => { byType[a.therapyType] = (byType[a.therapyType]||0)+1 })

  const isToday = date === new Date().toISOString().split('T')[0]

  return (
    <Layout title="Daily Summary" action={
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        style={{ padding:"7px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, cursor:"pointer" }}
      />
    }>

      {/* Date header */}
      <div style={{ background:"linear-gradient(135deg,#1a8c6e,#1a6e8c)", borderRadius:14, padding:"18px 22px", marginBottom:20, color:"white" }}>
        <div style={{ fontSize:12, opacity:0.8, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>
          {isToday ? "Today's Summary" : "Daily Summary"}
        </div>
        <div style={{ fontSize:20, fontWeight:700 }}>
          {new Date(date+"T12:00:00").toLocaleDateString('en-KE',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
        {isToday && (
          <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>
            Last updated: {new Date().toLocaleTimeString('en-KE',{ hour:'2-digit', minute:'2-digit' })}
          </div>
        )}
      </div>

      {/* Key stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Sessions Completed", value: completed.length,  color:"#1a8c6e", icon:"✓",  sub:`of ${appointments.length} scheduled` },
          { label:"Still Scheduled",    value: scheduled.length,  color:"#2563a8", icon:"📅", sub:"upcoming today" },
          { label:"No Shows",           value: noShows.length,    color:"#d63f5c", icon:"✗",  sub:`${cancelled.length} cancelled` },
          { label:"Notes Written",      value: withNotes.length,  color:"#7c3aed", icon:"📝", sub:`of ${completed.length} completed` },
        ].map((s,i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:10, right:14, fontSize:20, opacity:0.15 }}>{s.icon}</div>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:700, color:s.color, lineHeight:1, marginBottom:4 }}>{loading?"...":s.value}</div>
            <div style={{ fontSize:11.5, color:"#8aab9e" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

        {/* Sessions timeline */}
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Session Timeline</div>
            <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>All sessions for the day in order</div>
          </div>
          <div style={{ padding:"0 18px", maxHeight:400, overflowY:"auto" }}>
            {loading ? (
              <div style={{ padding:24, textAlign:"center", color:"#8aab9e" }}>Loading...</div>
            ) : appointments.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", color:"#8aab9e", fontSize:13 }}>No sessions scheduled</div>
            ) : appointments
              .slice()
              .sort((a:any,b:any) => new Date(a.scheduledAt).getTime()-new Date(b.scheduledAt).getTime())
              .map((appt:any, i:number) => {
              const color = THERAPY_COLORS[appt.therapyType]??"#8aab9e"
              const STATUS_BG: Record<string,string> = {
                COMPLETED:"#e6f4ef", SCHEDULED:"#fef3c7", CONFIRMED:"#e8f0fb",
                NO_SHOW:"#fde8ed", CANCELLED:"#f0f4f2", IN_SESSION:"#f0ebff"
              }
              const STATUS_COLOR: Record<string,string> = {
                COMPLETED:"#1a8c6e", SCHEDULED:"#d97706", CONFIRMED:"#2563a8",
                NO_SHOW:"#d63f5c", CANCELLED:"#8aab9e", IN_SESSION:"#7c3aed"
              }
              return (
                <div key={i} style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:i<appointments.length-1?"1px solid #f0f4f2":"none", alignItems:"flex-start" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", width:40, flexShrink:0, paddingTop:2, textAlign:"right" }}>
                    {new Date(appt.scheduledAt).toLocaleTimeString('en-KE',{ hour:'2-digit', minute:'2-digit' })}
                  </div>
                  <div style={{ width:3, background:color, borderRadius:2, alignSelf:"stretch", flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>{appt.client?.fullName ?? "—"}</div>
                    <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>
                      {appt.therapyType}{appt.therapist?.fullName ? " · "+appt.therapist.fullName : ""}
                      {appt.durationMin ? ` · ${appt.durationMin}min` : ""}
                    </div>
                    {appt.sessionNote && (
                      <div style={{ fontSize:11, color:"#1a8c6e", marginTop:3 }}>📝 Note recorded</div>
                    )}
                  </div>
                  <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:20, background:STATUS_BG[appt.status]??"#f0f4f2", color:STATUS_COLOR[appt.status]??"#8aab9e", fontWeight:600, flexShrink:0 }}>
                    {appt.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Therapist performance */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Therapist Summary</div>
            </div>
            <div style={{ padding:"0 18px" }}>
              {loading ? (
                <div style={{ padding:20, textAlign:"center", color:"#8aab9e" }}>Loading...</div>
              ) : therapistList.length === 0 ? (
                <div style={{ padding:20, textAlign:"center", color:"#8aab9e", fontSize:13 }}>No sessions today</div>
              ) : therapistList.map((t,i) => (
                <div key={i} style={{ padding:"12px 0", borderBottom:i<therapistList.length-1?"1px solid #f0f4f2":"none" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>{t.name}</div>
                      <div style={{ display:"flex", gap:4, marginTop:3, flexWrap:"wrap" }}>
                        {t.types.map((type,ti) => (
                          <span key={ti} style={{ fontSize:10, padding:"1px 6px", borderRadius:20, background:(THERAPY_COLORS[type]??"#8aab9e")+"22", color:THERAPY_COLORS[type]??"#8aab9e", fontWeight:500 }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:700, color:"#1a8c6e" }}>{t.completed}</div>
                      <div style={{ fontSize:10.5, color:"#8aab9e" }}>completed</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10, fontSize:11.5, color:"#8aab9e" }}>
                    {t.scheduled>0 && <span style={{ color:"#2563a8" }}>📅 {t.scheduled} upcoming</span>}
                    {t.noShow>0 && <span style={{ color:"#d63f5c" }}>✗ {t.noShow} no-show</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session types breakdown */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Sessions by Type</div>
            </div>
            <div style={{ padding:"14px 18px" }}>
              {Object.keys(byType).length === 0 ? (
                <div style={{ textAlign:"center", color:"#8aab9e", fontSize:13, padding:"8px 0" }}>No completed sessions</div>
              ) : Object.entries(byType).map(([type,count],i) => {
                const color = THERAPY_COLORS[type]??"#8aab9e"
                const max   = Math.max(...Object.values(byType) as number[])
                return (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4 }}>
                      <span style={{ color:"#1a2724", fontWeight:500 }}>{type}</span>
                      <span style={{ fontWeight:600, color }}>{count as number} session{(count as number)>1?"s":""}</span>
                    </div>
                    <div style={{ height:6, background:"#f0f4f2", borderRadius:20, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:((count as number)/max*100)+"%", background:color, borderRadius:20 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Financial summary */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, padding:"16px 18px" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724", marginBottom:14 }}>Financial Summary</div>
            {[
              { label:"Revenue collected", value:"KSh "+revenue.toLocaleString(),     color:"#1a8c6e" },
              { label:"Outstanding",       value:"KSh "+outstanding.toLocaleString(), color:"#d63f5c" },
              { label:"Invoices raised",   value: invoices.length+" invoices",        color:"#2563a8" },
            ].map((item,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:i<2?"1px solid #f0f4f2":"none", fontSize:13 }}>
                <span style={{ color:"#8aab9e" }}>{item.label}</span>
                <span style={{ fontWeight:600, color:item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}