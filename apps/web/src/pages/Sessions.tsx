import { useEffect, useState } from "react"
import api from "../lib/api"

const NAV = [["Dashboard","/dashboard"],["Clients","/clients"],["Schedule","/schedule"],["Sessions","/sessions"],["Therapy Plans","/plans"],["Billing","/billing"],["Staff","/staff"],["Reports","/reports"]]

export default function Sessions() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [showNote, setShowNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subjective, setSubjective] = useState("")
  const [objective, setObjective] = useState("")
  const [assessment, setAssessment] = useState("")
  const [plan, setPlan] = useState("")

  useEffect(() => { loadData() }, [])

  function loadData() {
    api.get("/appointments").catch(() => ({ data:[] }))
      .then((r:any) => setAppointments(r.data))
      .finally(() => setLoading(false))
  }

  function openNote(appt: any) {
    setSelected(appt)
    setSubjective(appt.sessionNote?.subjective || "")
    setObjective(appt.sessionNote?.objective || "")
    setAssessment(appt.sessionNote?.assessment || "")
    setPlan(appt.sessionNote?.plan || "")
    setShowNote(true)
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/sessions", {
        appointmentId: selected.id,
        subjective, objective, assessment, plan
      })
      setShowNote(false)
      loadData()
    } catch(err: any) {
      alert(err.response?.data?.message ?? "Failed to save note")
    } finally { setSaving(false) }
  }

  const path = window.location.pathname

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f4f7f5" }}>
      <aside style={{ width:224, background:"white", borderRight:"1px solid #d6e8e0", position:"fixed", top:0, left:0, height:"100%", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:20, borderBottom:"1px solid #d6e8e0", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"#1a8c6e", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:"bold" }}>T</div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:"#1a8c6e" }}>Tumaini</div>
            <div style={{ fontSize:10, color:"#8aab9e" }}>St. Thorlak Centre</div>
          </div>
        </div>
        <nav style={{ flex:1, padding:12 }}>
          {NAV.map((item, idx) => {
            const active = path === item[1]
            return <a key={idx} href={item[1]} style={{ display:"block", padding:"9px 12px", borderRadius:8, fontSize:13, color:active?"#1a8c6e":"#4a6359", background:active?"#e6f4ef":"transparent", fontWeight:active?600:400, textDecoration:"none", marginBottom:2 }}>{item[0]}</a>
          })}
        </nav>
      </aside>

      <main style={{ marginLeft:224, flex:1, padding:24 }}>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:20, fontWeight:600, color:"#1a2724", margin:0 }}>Sessions</h1>
          <p style={{ fontSize:13, color:"#8aab9e", margin:"4px 0 0" }}>{appointments.length} appointments total</p>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading...</div>
        ) : (
          <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Client</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Date</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Type</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Therapist</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Status</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Note</th>
                  <th style={{ padding:"10px 16px" }}></th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>No sessions yet. Book one from the Schedule page.</td></tr>
                ) : appointments.map((a, i) => {
                  const d = new Date(a.scheduledAt)
                  return (
                    <tr key={i} style={{ borderBottom:"1px solid #f0f4f2" }}>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:"50%", background:"#e6f4ef", display:"flex", alignItems:"center", justifyContent:"center", color:"#1a8c6e", fontSize:11, fontWeight:600 }}>
                            {a.client ? a.client.fullName.charAt(0) : "?"}
                          </div>
                          <span style={{ fontWeight:500, color:"#1a2724" }}>{a.client ? a.client.fullName : "Unknown"}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", color:"#4a6359" }}>
                        <div>{d.toLocaleDateString("en-KE",{ day:"numeric", month:"short", year:"numeric" })}</div>
                        <div style={{ fontSize:11, color:"#8aab9e" }}>{d.toLocaleTimeString("en-KE",{ hour:"2-digit", minute:"2-digit" })}</div>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#e8f0fb", color:"#2563a8", fontWeight:500 }}>{a.therapyType}</span>
                      </td>
                      <td style={{ padding:"12px 16px", color:"#4a6359" }}>{a.therapist ? a.therapist.fullName : "—"}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:a.status==="COMPLETED"?"#e6f4ef":"#f0f4f2", color:a.status==="COMPLETED"?"#1a8c6e":"#8aab9e", fontWeight:500 }}>{a.status}</span>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        {a.sessionNote ? (
                          <span style={{ fontSize:11, color:"#1a8c6e", fontWeight:500 }}>Saved</span>
                        ) : (
                          <span style={{ fontSize:11, color:"#8aab9e" }}>No note</span>
                        )}
                      </td>
                      <td style={{ padding:"12px 16px", textAlign:"right" }}>
                        <button onClick={() => openNote(a)} style={{ fontSize:12, color:"#1a8c6e", fontWeight:500, border:"none", background:"none", cursor:"pointer", textDecoration:"underline" }}>
                          {a.sessionNote ? "View note" : "Add note"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showNote && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:600, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Session Note — SOAP</h2>
              <button onClick={() => setShowNote(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <div style={{ fontSize:12, color:"#8aab9e", marginBottom:20 }}>
              {selected.client ? selected.client.fullName : ""} — {new Date(selected.scheduledAt).toLocaleDateString("en-KE",{ weekday:"long", day:"numeric", month:"long" })} — {selected.therapyType}
            </div>
            <form onSubmit={saveNote}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#2563a8", display:"block", marginBottom:6, textTransform:"uppercase" }}>S — Subjective</label>
                <textarea value={subjective} onChange={e => setSubjective(e.target.value)} placeholder="Parent or carer report before the session..." rows={3} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", borderLeft:"3px solid #2563a8", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#1a8c6e", display:"block", marginBottom:6, textTransform:"uppercase" }}>O — Objective</label>
                <textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="What you directly observed in the session..." rows={3} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", borderLeft:"3px solid #1a8c6e", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#d97706", display:"block", marginBottom:6, textTransform:"uppercase" }}>A — Assessment</label>
                <textarea value={assessment} onChange={e => setAssessment(e.target.value)} placeholder="Your clinical interpretation..." rows={3} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", borderLeft:"3px solid #d97706", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#7c3aed", display:"block", marginBottom:6, textTransform:"uppercase" }}>P — Plan</label>
                <textarea value={plan} onChange={e => setPlan(e.target.value)} placeholder="Plan for next session and home program..." rows={3} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", borderLeft:"3px solid #7c3aed", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowNote(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Save Note"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}