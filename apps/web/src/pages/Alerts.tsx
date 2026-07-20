import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

export default function Alerts() {
  const [data, setData]       = useState<{ count: number; clients: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAlerts() }, [])

  function loadAlerts() {
    setLoading(true)
    api.get("/clients/alerts/missing-sessions")
      .then((r:any) => setData(r.data))
      .catch(() => setData({ count:0, clients:[] }))
      .finally(() => setLoading(false))
  }

  async function bookSession(clientId: string) {
    window.location.href = `/schedule?clientId=${clientId}`
  }

  const urgency = (days: number | null) => {
    if (days === null) return { label:"Never attended",  color:"#d63f5c", bg:"#fde8ed" }
    if (days > 30)     return { label:`${days} days ago`, color:"#d63f5c", bg:"#fde8ed" }
    if (days > 21)     return { label:`${days} days ago`, color:"#d97706", bg:"#fef3c7" }
    return               { label:`${days} days ago`, color:"#d97706", bg:"#fef3c7" }
  }

  return (
    <Layout title="Session Alerts">

      {/* Header banner */}
      <div style={{ background:"linear-gradient(135deg,#fde8ed,#fef3c7)", border:"1px solid #fbbf24", borderRadius:14, padding:"16px 22px", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontSize:28 }}>⚠️</span>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:"#92400e" }}>Session Frequency Monitor</div>
          <div style={{ fontSize:12.5, color:"#b45309", marginTop:3 }}>
            Active clients who have not attended or been scheduled for a session in the last <strong>14 days</strong>.
            Regular therapy is critical for progress — follow up with these families.
          </div>
        </div>
        <div style={{ marginLeft:"auto", textAlign:"center", flexShrink:0 }}>
          <div style={{ fontSize:32, fontWeight:700, color:"#d63f5c" }}>{loading?"...":data?.count??0}</div>
          <div style={{ fontSize:11.5, color:"#b45309" }}>clients flagged</div>
        </div>
      </div>

      {/* Stats row */}
      {data && data.clients.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
          {[
            { label:"Never attended",   value: data.clients.filter(c=>c.daysSince===null).length,  color:"#d63f5c" },
            { label:"Missing 30+ days", value: data.clients.filter(c=>c.daysSince!==null&&c.daysSince>30).length, color:"#d97706" },
            { label:"Missing 14+ days", value: data.clients.filter(c=>c.daysSince!==null&&c.daysSince<=30).length, color:"#d97706" },
          ].map((s,i) => (
            <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"14px 18px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Client list */}
      <div style={{ background:"white", borderRadius:14, border:"1px solid #d6e8e0", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Flagged Clients</div>
          <button onClick={loadAlerts} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12.5, cursor:"pointer", color:"#4a6359" }}>
            ↺ Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"#8aab9e" }}>Checking session records...</div>
        ) : !data || data.clients.length === 0 ? (
          <div style={{ padding:48, textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:600, color:"#1a8c6e", marginBottom:6 }}>All clients are up to date!</div>
            <div style={{ fontSize:13, color:"#8aab9e" }}>Every active client has a session in the last 14 days.</div>
          </div>
        ) : (
          <div>
            {data.clients.map((client, i) => {
              const u = urgency(client.daysSince)
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderBottom:i<data.clients.length-1?"1px solid #f0f4f2":"none", flexWrap:"wrap" }}>

                  {/* Avatar */}
                  <div style={{ width:40, height:40, borderRadius:"50%", background:u.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:u.color, flexShrink:0 }}>
                    {client.fullName.charAt(0)}
                  </div>

                  {/* Client info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:14, fontWeight:600, color:"#1a2724" }}>{client.fullName}</span>
                      {client.isProBono && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:20, background:"#fef3c7", color:"#d97706", fontWeight:600 }}>Pro Bono</span>}
                      {client.hasActivePlan && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:20, background:"#e6f4ef", color:"#1a8c6e", fontWeight:500 }}>Has ITP</span>}
                    </div>
                    <div style={{ fontSize:12.5, color:"#8aab9e", marginTop:3 }}>
                      {client.guardian ? `${client.guardian.fullName} · ${client.guardian.phone}` : "No guardian on record"}
                    </div>
                    {client.lastAppointment ? (
                      <div style={{ fontSize:12, color:"#4a6359", marginTop:4 }}>
                        Last session: <strong>{new Date(client.lastAppointment.scheduledAt).toLocaleDateString('en-KE',{ weekday:'short', day:'numeric', month:'short' })}</strong>
                        {" "}({client.lastAppointment.therapyType}
                        {client.lastAppointment.therapist?.fullName ? " · "+client.lastAppointment.therapist.fullName : ""})
                        {" · "}<span style={{ color:client.lastAppointment.status==="COMPLETED"?"#1a8c6e":"#d97706" }}>{client.lastAppointment.status}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize:12, color:"#d63f5c", marginTop:4, fontWeight:500 }}>
                        ⚠ No sessions on record — new client or never attended
                      </div>
                    )}
                  </div>

                  {/* Days since badge */}
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:u.bg, color:u.color, fontWeight:600, marginBottom:6 }}>
                      {u.label}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <a href={`/clients/${client.id}`}
                      style={{ padding:"7px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12.5, color:"#4a6359", textDecoration:"none", fontWeight:500 }}>
                      View
                    </a>
                    <button onClick={() => bookSession(client.id)}
                      style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:12.5, fontWeight:500, cursor:"pointer" }}>
                      📅 Book Session
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}