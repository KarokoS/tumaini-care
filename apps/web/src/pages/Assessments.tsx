import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

const TEMPLATES = [
  { name:"ADOS-2", full:"Autism Diagnostic Observation Schedule", color:"#1a8c6e" },
  { name:"CARS-2", full:"Childhood Autism Rating Scale", color:"#2563a8" },
  { name:"Vineland-3", full:"Vineland Adaptive Behavior Scales", color:"#7c3aed" },
  { name:"Sensory Profile 2", full:"Dunn Sensory Profile", color:"#f97316" },
  { name:"ADOS-2 Module 1", full:"For non-verbal / single words", color:"#22c55e" },
  { name:"FBA", full:"Functional Behavior Assessment", color:"#d97706" },
]

export default function Assessments() {
  const [clients, setClients] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [clientId, setClientId] = useState("")
  const [assessorName, setAssessorName] = useState("")
  const [assessmentDate, setAssessmentDate] = useState("")
  const [findings, setFindings] = useState("")
  const [recommendations, setRecommendations] = useState("")

  useEffect(() => {
    Promise.all([
      api.get("/clients").catch(() => ({ data:[] })),
      api.get("/assessments").catch(() => ({ data:[] })),
    ]).then(([c, a]:any) => {
      setClients(c.data)
      setAssessments(a.data)
    }).finally(() => setLoading(false))
  }, [])

  async function saveAssessment(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/assessments", {
        clientId, templateName: selectedTemplate,
        assessorName, assessmentDate,
        findings, recommendations
      })
      setShowForm(false)
      setClientId(""); setSelectedTemplate(""); setAssessorName("")
      setAssessmentDate(""); setFindings(""); setRecommendations("")
      const r = await api.get("/assessments").catch(() => ({ data:[] }))
      setAssessments((r as any).data)
    } catch(err: any) {
      alert(err.response?.data?.message ?? "Failed to save assessment")
    } finally { setSaving(false) }
  }

  const COLORS: Record<string,string> = {
    "ADOS-2":"#1a8c6e","CARS-2":"#2563a8","Vineland-3":"#7c3aed",
    "Sensory Profile 2":"#f97316","ADOS-2 Module 1":"#22c55e","FBA":"#d97706"
  }

  return (
    <Layout title="Assessments" action={
      <button onClick={() => setShowForm(true)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ New Assessment</button>
    }>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16 }}>

        <div>
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden", marginBottom:14 }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Assessment Templates</div>
              <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>Standardised tools</div>
            </div>
            <div style={{ padding:"0 18px" }}>
              {TEMPLATES.map((t, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom: i<TEMPLATES.length-1?"1px solid #f0f4f2":"none" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>{t.name}</div>
                    <div style={{ fontSize:11, color:"#8aab9e", marginTop:2 }}>{t.full}</div>
                  </div>
                  <button
                    onClick={() => { setSelectedTemplate(t.name); setShowForm(true) }}
                    style={{ fontSize:12, padding:"4px 10px", borderRadius:6, border:"1px solid #d6e8e0", background:"white", color:"#1a8c6e", cursor:"pointer", fontWeight:500, flexShrink:0 }}
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Recent Assessments</div>
                <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>{assessments.length} completed</div>
              </div>
            </div>
            <div style={{ padding:"0 18px" }}>
              {loading ? (
                <div style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Loading...</div>
              ) : assessments.length === 0 ? (
                <div style={{ padding:40, textAlign:"center" }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>📋</div>
                  <div style={{ fontSize:13.5, fontWeight:500, color:"#1a2724", marginBottom:6 }}>No assessments yet</div>
                  <div style={{ fontSize:12.5, color:"#8aab9e", marginBottom:16 }}>Record a formal assessment for a client using the templates on the left</div>
                  <button onClick={() => setShowForm(true)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>Record first assessment</button>
                </div>
              ) : assessments.map((a:any, i:number) => {
                const color = COLORS[a.templateName] ?? "#8aab9e"
                return (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom: i<assessments.length-1?"1px solid #f0f4f2":"none" }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:color+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:14 }}>📋</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>
                        <span style={{ color }}>{a.templateName}</span> — {a.client ? a.client.fullName : "Unknown"}
                      </div>
                      <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>
                        {a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString("en-KE",{ day:"numeric", month:"long", year:"numeric" }) : ""} · {a.assessorName || ""}
                      </div>
                      {a.findings && (
                        <div style={{ fontSize:12, color:"#4a6359", marginTop:4, lineHeight:1.5 }}>{a.findings.slice(0,100)}{a.findings.length>100?"...":""}</div>
                      )}
                    </div>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:color+"22", color, fontWeight:500, flexShrink:0 }}>{a.templateName}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:560, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Record Assessment</h2>
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <form onSubmit={saveAssessment}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Client</label>
                  <select required value={clientId} onChange={e => setClientId(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="">Select client...</option>
                    {clients.map((c, i) => <option key={i} value={c.id}>{c.fullName}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Assessment tool</label>
                  <select required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="">Select template...</option>
                    {TEMPLATES.map((t, i) => <option key={i} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Assessor name</label>
                  <input value={assessorName} onChange={e => setAssessorName(e.target.value)} placeholder="e.g. Dr. Florence N." style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Assessment date</label>
                  <input type="date" required value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Key findings</label>
                <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={3} placeholder="Summary of assessment findings..." style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Recommendations</label>
                <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={3} placeholder="Recommended interventions and next steps..." style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Save Assessment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}