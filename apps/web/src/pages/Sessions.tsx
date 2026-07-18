import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"
import { useAuthStore } from "../stores/auth.store"
import { generateSessionNotePDF, generateParentSessionPDF } from "../lib/pdf"

const THERAPY_COLORS: Record<string,string> = {
  OT:'#3b82f6', SPEECH:'#22c55e', ABA:'#a855f7',
  SENSORY:'#f97316', GROUP:'#eab308', PSYCH:'#ec4899', PHYSIO:'#0891b2',
}

export default function Sessions() {
  const { user } = useAuthStore()
  const isTherapist = user?.role === "THERAPIST"

  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [savingNote, setSavingNote]     = useState(false)
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiError, setAiError]           = useState("")

  // Note form fields
  const [subjective, setSubjective]   = useState("")
  const [objective, setObjective]     = useState("")
  const [assessment, setAssessment]   = useState("")
  const [plan, setPlan]               = useState("")
  const [goalsWorked, setGoalsWorked] = useState<string[]>([])
  const [markComplete, setMarkComplete] = useState(true)
  const [generateInvoice, setGenerateInvoice] = useState(true)

  useEffect(() => { loadData() }, [])

  function loadData() {
    setLoading(true)
    api.get("/appointments").catch(() => ({ data:[] }))
      .then((r:any) => {
        // Filter to therapist's own sessions if therapist role
        const appts = r.data.filter((a:any) =>
          !isTherapist || a.therapist?.id === user?.id
        )
        setAppointments(appts)
      })
      .finally(() => setLoading(false))
  }

  function openNoteForm(appt: any) {
    setSelectedAppt(appt)
    const note = appt.sessionNote
    setSubjective(note?.subjective ?? "")
    setObjective(note?.objective   ?? "")
    setAssessment(note?.assessment ?? "")
    setPlan(note?.plan             ?? "")
    setGoalsWorked(note?.goalsWorked ?? [])
    setMarkComplete(appt.status !== "COMPLETED")
    setGenerateInvoice(appt.status !== "COMPLETED")
    setAiError("")
    setShowNoteForm(true)
  }

  async function generateAISoap() {
    if (!selectedAppt) return
    setAiLoading(true); setAiError("")
    try {
      const res = await api.post("/ai/soap-draft", {
        clientId:      selectedAppt.client?.id ?? selectedAppt.clientId,
        therapyType:   selectedAppt.therapyType,
        appointmentId: selectedAppt.id,
      })
      setSubjective(res.data.subjective ?? "")
      setObjective(res.data.objective   ?? "")
      setAssessment(res.data.assessment ?? "")
      setPlan(res.data.plan             ?? "")
    } catch (err: any) {
      setAiError(err.response?.data?.message ?? "AI generation failed. Please write notes manually.")
    } finally { setAiLoading(false) }
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAppt) return
    setSavingNote(true)
    try {
      const noteData = { subjective, objective, assessment, plan, goalsWorked }

      if (selectedAppt.sessionNote?.id) {
        await api.patch(`/sessions/${selectedAppt.sessionNote.id}`, noteData)
      } else {
        await api.post("/sessions", { appointmentId: selectedAppt.id, ...noteData })
      }

      // Mark session as completed
      if (markComplete && selectedAppt.status !== "COMPLETED") {
        await api.patch(`/appointments/${selectedAppt.id}`, { status: "COMPLETED" })
      }

      // Auto-generate invoice at KSh 300
      if (generateInvoice && selectedAppt.status !== "COMPLETED") {
        try {
          await api.post("/invoices", {
            clientId: selectedAppt.client?.id ?? selectedAppt.clientId,
            lineItems: [{
              description: `${selectedAppt.therapyType} Session — ${new Date(selectedAppt.scheduledAt).toLocaleDateString('en-KE',{ day:'numeric', month:'long', year:'numeric' })}`,
              quantity:    1,
              unitPrice:   300,
            }]
          })
        } catch (invErr) {
          console.warn("Invoice auto-generation failed:", invErr)
        }
      }

      setShowNoteForm(false)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to save session note")
    } finally { setSavingNote(false) }
  }

  const filtered = appointments.filter(a => {
    const matchSearch = (a.client?.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
                        (a.therapist?.fullName ?? "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const STATUS_COLORS: Record<string,string> = {
    SCHEDULED:'#d97706', CONFIRMED:'#2563a8', IN_SESSION:'#7c3aed',
    COMPLETED:'#1a8c6e', CANCELLED:'#d63f5c', NO_SHOW:'#8aab9e',
  }

  const textarea = {
    width:"100%", padding:"9px 12px", borderRadius:8,
    border:"1px solid #d6e8e0", fontSize:13,
    boxSizing:"border-box" as const, resize:"vertical" as const,
    fontFamily:"inherit", lineHeight:1.6,
  }

  return (
    <Layout title="Sessions">
      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:16 }}>
        {[
          { label:"Total",     value: appointments.length,                                      color:"#2563a8" },
          { label:"Today",     value: appointments.filter(a => new Date(a.scheduledAt).toDateString()===new Date().toDateString()).length, color:"#d97706" },
          { label:"Completed", value: appointments.filter(a=>a.status==="COMPLETED").length,    color:"#1a8c6e" },
          { label:"With Notes",value: appointments.filter(a=>a.sessionNote).length,             color:"#7c3aed" },
        ].map((s,i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:600, color:s.color }}>{loading?"...":s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search client or therapist..."
          style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, width:260, outline:"none" }} />
        <div style={{ display:"flex", gap:6 }}>
          {["ALL","SCHEDULED","COMPLETED","CANCELLED","NO_SHOW"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding:"6px 12px", borderRadius:8, border:"1px solid", borderColor:statusFilter===s?"#1a8c6e":"#d6e8e0", background:statusFilter===s?"#e6f4ef":"white", color:statusFilter===s?"#1a8c6e":"#4a6359", fontSize:12, fontWeight:500, cursor:"pointer" }}>
              {s==="ALL"?"All":s.charAt(0)+s.slice(1).toLowerCase().replace("_"," ")}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:40, color:"#8aab9e" }}>Loading sessions...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:40, color:"#8aab9e" }}>No sessions found</div>
        ) : filtered.map((appt, i) => {
          const color    = THERAPY_COLORS[appt.therapyType] ?? "#8aab9e"
          const d        = new Date(appt.scheduledAt)
          const hasNote  = !!appt.sessionNote
          const isToday  = d.toDateString() === new Date().toDateString()
          return (
            <div key={i} style={{ background:"white", border:`1px solid ${isToday?"#1a8c6e44":"#d6e8e0"}`, borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              {/* Therapy type badge */}
              <div style={{ width:44, height:44, borderRadius:12, background:color+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:700, color }}>{appt.therapyType}</span>
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:14, fontWeight:600, color:"#1a2724" }}>{appt.client?.fullName ?? "Unknown"}</span>
                  {isToday && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:20, background:"#e6f4ef", color:"#1a8c6e", fontWeight:600 }}>TODAY</span>}
                  {hasNote && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:20, background:"#f0f4f2", color:"#8aab9e", fontWeight:500 }}>📝 Note saved</span>}
                  {(appt as any).isRecurring && <span style={{ fontSize:10, color:"#8aab9e" }}>🔁</span>}
                </div>
                <div style={{ fontSize:12.5, color:"#8aab9e", marginTop:3 }}>
                  {d.toLocaleDateString('en-KE',{ weekday:'short', day:'numeric', month:'short' })} at {d.toLocaleTimeString('en-KE',{ hour:'2-digit', minute:'2-digit' })}
                  {appt.therapist?.fullName ? " · "+appt.therapist.fullName : ""}
                  {appt.durationMin ? ` · ${appt.durationMin}min` : ""}
                </div>
              </div>

              {/* Status */}
              <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:(STATUS_COLORS[appt.status]??"#8aab9e")+"22", color:STATUS_COLORS[appt.status]??"#8aab9e", fontWeight:600, flexShrink:0 }}>
                {appt.status}
              </span>

              {/* Actions */}
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button
                  onClick={() => openNoteForm(appt)}
                  style={{ padding:"7px 14px", borderRadius:8, border:"none", background:hasNote?"#f0f4f2":"#1a8c6e", color:hasNote?"#4a6359":"white", fontSize:12.5, fontWeight:500, cursor:"pointer" }}
                >
                  {hasNote ? "Edit Note" : "✏️ Write Note"}
                </button>
                {hasNote && (
                  <>
                    <button onClick={() => generateSessionNotePDF(appt)}
                      style={{ padding:"7px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, cursor:"pointer", color:"#4a6359" }}>
                      PDF
                    </button>
                    <button onClick={() => generateParentSessionPDF(appt)}
                      style={{ padding:"7px 12px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12, cursor:"pointer", color:"#1a8c6e" }}>
                      Parent
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Session Note modal */}
      {showNoteForm && selectedAppt && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
          <div style={{ background:"white", borderRadius:16, width:"100%", maxWidth:680, maxHeight:"95vh", overflowY:"auto" }}>

            {/* Header */}
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:"#1a2724" }}>
                  Session Note — {selectedAppt.client?.fullName}
                </div>
                <div style={{ fontSize:12.5, color:"#8aab9e", marginTop:3 }}>
                  {selectedAppt.therapyType} · {new Date(selectedAppt.scheduledAt).toLocaleDateString('en-KE',{ weekday:'long', day:'numeric', month:'long' })}
                  {selectedAppt.therapist?.fullName ? " · "+selectedAppt.therapist.fullName : ""}
                </div>
              </div>
              <button onClick={() => setShowNoteForm(false)} style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>

            {/* AI Draft button */}
            <div style={{ padding:"14px 24px", borderBottom:"1px solid #d6e8e0", background:"#f8faf9" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <button
                  type="button"
                  onClick={generateAISoap}
                  disabled={aiLoading}
                  style={{ padding:"9px 18px", borderRadius:8, border:"none", background:aiLoading?"#8aab9e":"#7c3aed", color:"white", fontSize:13, fontWeight:500, cursor:aiLoading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:8 }}
                >
                  {aiLoading ? (
                    <>⏳ Generating AI draft...</>
                  ) : (
                    <>✨ Generate AI SOAP Draft</>
                  )}
                </button>
                <div style={{ fontSize:12, color:"#8aab9e" }}>
                  AI will draft notes based on {selectedAppt.therapyType} therapy and client goals — review and edit before saving
                </div>
              </div>
              {aiError && (
                <div style={{ marginTop:8, fontSize:12.5, color:"#d63f5c", background:"#fde8ed", padding:"6px 12px", borderRadius:6 }}>
                  {aiError}
                </div>
              )}
            </div>

            <form onSubmit={saveNote} style={{ padding:"20px 24px" }}>

              {/* SOAP sections */}
              {[
                { key:"S", label:"Subjective", color:"#2563a8", desc:"What the parent/guardian reports — child's week, mood, presentation today", value:subjective, setter:setSubjective },
                { key:"O", label:"Objective",  color:"#1a8c6e", desc:"Observable behaviours and measurable performance during the session", value:objective, setter:setObjective },
                { key:"A", label:"Assessment", color:"#d97706", desc:"Clinical interpretation — progress toward goals, response to therapy", value:assessment, setter:setAssessment },
                { key:"P", label:"Plan",       color:"#7c3aed", desc:"Next steps, home programme, focus for next session", value:plan, setter:setPlan },
              ].map(section => (
                <div key={section.key} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ width:24, height:24, borderRadius:6, background:section.color, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11, fontWeight:700 }}>
                      {section.key}
                    </div>
                    <label style={{ fontSize:13, fontWeight:600, color:section.color }}>{section.label}</label>
                    <span style={{ fontSize:11.5, color:"#8aab9e" }}>— {section.desc}</span>
                  </div>
                  <textarea
                    value={section.value}
                    onChange={e => section.setter(e.target.value)}
                    rows={3}
                    placeholder={`Write ${section.label.toLowerCase()} notes here...`}
                    style={{ ...textarea, borderColor:section.value ? section.color+"66" : "#d6e8e0" }}
                  />
                </div>
              ))}

              {/* Auto-complete options */}
              <div style={{ background:"#f8faf9", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#1a2724", marginBottom:10 }}>On save:</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#1a2724", cursor:"pointer" }}>
                    <input type="checkbox" checked={markComplete} onChange={e=>setMarkComplete(e.target.checked)}
                      disabled={selectedAppt.status==="COMPLETED"} />
                    <span style={{ color:selectedAppt.status==="COMPLETED"?"#8aab9e":"#1a2724" }}>
                      Mark session as <strong>Completed</strong>
                      {selectedAppt.status==="COMPLETED" && " (already completed)"}
                    </span>
                  </label>
                  <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#1a2724", cursor:"pointer" }}>
                    <input type="checkbox" checked={generateInvoice} onChange={e=>setGenerateInvoice(e.target.checked)}
                      disabled={selectedAppt.status==="COMPLETED"} />
                    <span style={{ color:selectedAppt.status==="COMPLETED"?"#8aab9e":"#1a2724" }}>
                      Auto-generate invoice <strong>(KSh 300)</strong>
                      {selectedAppt.status==="COMPLETED" && " (already invoiced)"}
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowNoteForm(false)}
                  style={{ padding:"10px 18px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingNote}
                  style={{ padding:"10px 18px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:savingNote?0.7:1 }}>
                  {savingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}