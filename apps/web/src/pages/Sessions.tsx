import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"
import { generateSessionNotePDF, generateParentSessionPDF } from "../lib/pdf"

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
  const [filter, setFilter] = useState("ALL")

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

  const COLORS: Record<string,string> = {
    OT:"#3b82f6", SPEECH:"#22c55e", ABA:"#a855f7",
    SENSORY:"#f97316", GROUP:"#eab308", PSYCH:"#ec4899"
  }

  const filtered = filter === "ALL"
    ? appointments
    : filter === "WITH_NOTES"
    ? appointments.filter(a => a.sessionNote)
    : appointments.filter(a => !a.sessionNote && a.status === "COMPLETED")

  const completedWithNotes = appointments.filter(a => a.sessionNote)

  return (
    <Layout title="Sessions" action={
      <button
        onClick={() => {
          if (appointments.length > 0) openNote(appointments[0])
          else alert("Book an appointment first from the Schedule page")
        }}
        style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}
      >
        + New Note
      </button>
    }>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Total Sessions", value: appointments.length, color:"#1a8c6e" },
          { label:"Notes Written", value: completedWithNotes.length, color:"#2563a8" },
          { label:"Pending Notes", value: appointments.filter(a => !a.sessionNote).length, color:"#d97706" },
        ].map((s, i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:600, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["ALL","All sessions"],["WITH_NOTES","With notes"],["MISSING","Missing notes"]].map(([val, label], i) => (
          <button
            key={i}
            onClick={() => setFilter(val)}
            style={{ padding:"6px 14px", borderRadius:8, border:"1px solid", borderColor: filter===val?"#1a8c6e":"#d6e8e0", background: filter===val?"#e6f4ef":"white", color: filter===val?"#1a8c6e":"#4a6359", fontSize:12.5, fontWeight:500, cursor:"pointer" }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", padding:48, textAlign:"center" }}>
          <div style={{ fontSize:13, color:"#8aab9e" }}>No sessions found</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.map((appt, i) => {
            const d = new Date(appt.scheduledAt)
            const color = COLORS[appt.therapyType] ?? "#888"
            const note = appt.sessionNote
            return (
              <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
                <div style={{ padding:"14px 18px", background:"#f8faf9", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color, flexShrink:0 }}>
                      {appt.client ? appt.client.fullName.charAt(0) : "?"}
                    </div>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>
                        {appt.client ? appt.client.fullName : "Unknown"} — {appt.therapyType} Session
                      </div>
                      <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>
                        {d.toLocaleDateString("en-KE",{ weekday:"long", day:"numeric", month:"long", year:"numeric" })} · {d.toLocaleTimeString("en-KE",{ hour:"2-digit", minute:"2-digit" })}
                        {appt.therapist && " · " + appt.therapist.fullName}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background: appt.status==="COMPLETED"?"#e6f4ef":"#fef3c7", color: appt.status==="COMPLETED"?"#1a8c6e":"#d97706", fontWeight:600 }}>
                      {appt.status}
                    </span>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:color+"22", color, fontWeight:600 }}>
                      {appt.therapyType}
                    </span>
                  </div>
                </div>

                {note ? (
                  <div style={{ padding:"14px 18px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                      {[
                        { letter:"S", label:"Subjective", content: note.subjective, color:"#2563a8" },
                        { letter:"O", label:"Objective", content: note.objective, color:"#1a8c6e" },
                        { letter:"A", label:"Assessment", content: note.assessment, color:"#d97706" },
                        { letter:"P", label:"Plan", content: note.plan, color:"#7c3aed" },
                      ].map((s, si) => (
                        <div key={si} style={{ borderLeft:"3px solid "+s.color, paddingLeft:10, paddingTop:4, paddingBottom:4 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:s.color, textTransform:"uppercase", marginBottom:4 }}>{s.letter} — {s.label}</div>
                          <div style={{ fontSize:12.5, color:"#4a6359", lineHeight:1.6 }}>{s.content || "—"}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, paddingTop:10, borderTop:"1px solid #f0f4f2" }}>
                      <button
  onClick={() => generateSessionNotePDF(appt)}
  style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, cursor:"pointer", color:"#4a6359" }}
>
  Print PDF
</button>
<button
  onClick={() => generateParentSessionPDF(appt)}
  style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, cursor:"pointer", color:"#1a8c6e" }}
>
  Share with Parent
</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12.5, color:"#8aab9e" }}>No session note written yet</span>
                    <button onClick={() => openNote(appt)} style={{ padding:"6px 14px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:12.5, fontWeight:500, cursor:"pointer" }}>
                      Add note
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showNote && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:620, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Session Note — SOAP</h2>
              <button onClick={() => setShowNote(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <div style={{ fontSize:12, color:"#8aab9e", marginBottom:20 }}>
              {selected.client ? selected.client.fullName : ""} · {new Date(selected.scheduledAt).toLocaleDateString("en-KE",{ weekday:"long", day:"numeric", month:"long" })} · {selected.therapyType}
            </div>
            <form onSubmit={saveNote}>
              {[
                { label:"S — Subjective", placeholder:"Parent or carer report before the session...", value:subjective, onChange: setSubjective, color:"#2563a8" },
                { label:"O — Objective", placeholder:"What you directly observed...", value:objective, onChange: setObjective, color:"#1a8c6e" },
                { label:"A — Assessment", placeholder:"Your clinical interpretation...", value:assessment, onChange: setAssessment, color:"#d97706" },
                { label:"P — Plan", placeholder:"Plan for next session and home program...", value:plan, onChange: setPlan, color:"#7c3aed" },
              ].map((f, fi) => (
                <div key={fi} style={{ marginBottom:14 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:f.color, display:"block", marginBottom:6, textTransform:"uppercase" }}>{f.label}</label>
                  <textarea
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", borderLeft:"3px solid "+f.color, fontSize:13, boxSizing:"border-box", resize:"vertical" }}
                  />
                </div>
              ))}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowNote(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Save Note"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}