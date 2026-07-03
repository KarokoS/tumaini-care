import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

const TEMPLATES = [
  {
    name: "ADOS-2",
    full: "Autism Diagnostic Observation Schedule",
    color: "#1a8c6e",
    when: "First visit · Formal diagnosis",
    guide: "Gold standard autism diagnostic tool. Clinician observes child during structured play. Use when a new child needs formal autism diagnosis confirmed.",
    who: "Psychologist / trained clinician",
    duration: "40–60 min",
  },
  {
    name: "ADOS-2 Module 1",
    full: "For non-verbal / single words",
    color: "#22c55e",
    when: "First visit · Non-verbal children",
    guide: "Same as ADOS-2 but designed for children with no speech or only single words. Use for younger or minimally verbal children.",
    who: "Psychologist / trained clinician",
    duration: "30–45 min",
  },
  {
    name: "CARS-2",
    full: "Childhood Autism Rating Scale",
    color: "#2563a8",
    when: "Intake screening · 6-month review",
    guide: "Clinician rates child across 15 areas including social interaction, communication, and emotional response. Quicker than ADOS-2. Use for initial screening or to track severity over time.",
    who: "Any trained therapist",
    duration: "15–20 min",
  },
  {
    name: "Vineland-3",
    full: "Vineland Adaptive Behavior Scales",
    color: "#7c3aed",
    when: "Intake · 6-month review · Annual review",
    guide: "Measures practical daily living skills — communication, self-care, socialisation, and motor skills. Administered through structured parent/guardian interview. Tracks real-world progress beyond the therapy room.",
    who: "Any therapist · parent interview",
    duration: "20–45 min",
  },
  {
    name: "Sensory Profile 2",
    full: "Dunn Sensory Profile",
    color: "#f97316",
    when: "Intake · When sensory issues present",
    guide: "Parent questionnaire identifying how the child processes sensory information — sound, touch, movement, taste. Essential for OT and sensory integration therapy planning. Use when child shows sensory sensitivities, meltdowns, or avoidance behaviours.",
    who: "OT therapist · parent completes",
    duration: "15–20 min",
  },
  {
    name: "FBA",
    full: "Functional Behavior Assessment",
    color: "#d97706",
    when: "When behaviour concerns present",
    guide: "Identifies why a child shows a challenging behaviour — triggers, what maintains it, and what the child communicates through it. Use before designing a behaviour intervention plan for any child with significant behavioural challenges.",
    who: "ABA therapist",
    duration: "60–90 min",
  },
]

const WORKFLOW = [
  { stage: "First visit / Intake",  tools: ["CARS-2", "Sensory Profile 2"] },
  { stage: "Formal Diagnosis",      tools: ["ADOS-2", "ADOS-2 Module 1"] },
  { stage: "Behaviour Concerns",    tools: ["FBA"] },
  { stage: "6-Month Review",        tools: ["Vineland-3", "CARS-2"] },
  { stage: "Annual Review",         tools: ["ADOS-2", "Vineland-3", "CARS-2", "Sensory Profile 2"] },
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
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get("/clients").catch(() => ({ data: [] })),
      api.get("/assessments").catch(() => ({ data: [] })),
    ]).then(([c, a]: any) => {
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
      const r = await api.get("/assessments").catch(() => ({ data: [] }))
      setAssessments((r as any).data)
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to save assessment")
    } finally { setSaving(false) }
  }

  const COLORS: Record<string, string> = {
    "ADOS-2": "#1a8c6e", "CARS-2": "#2563a8", "Vineland-3": "#7c3aed",
    "Sensory Profile 2": "#f97316", "ADOS-2 Module 1": "#22c55e", "FBA": "#d97706"
  }

  return (
    <Layout title="Assessments" action={
      <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
        + New Assessment
      </button>
    }>

      {/* Workflow banner */}
      <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Assessment Workflow — When to use each tool</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {WORKFLOW.map((w, i) => (
            <div key={i} style={{ background: "#f8faf9", border: "1px solid #d6e8e0", borderRadius: 10, padding: "10px 14px", minWidth: 160 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1a2724", marginBottom: 6 }}>{w.stage}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {w.tools.map((t, ti) => (
                  <span key={ti} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 20, background: (COLORS[t] ?? "#8aab9e") + "22", color: COLORS[t] ?? "#8aab9e", fontWeight: 600 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>

        {/* Templates with guidance */}
        <div>
          <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Assessment Tools</div>
              <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>Click any tool to see guidance</div>
            </div>
            <div style={{ padding: "0 18px" }}>
              {TEMPLATES.map((t, i) => (
                <div key={i} style={{ borderBottom: i < TEMPLATES.length - 1 ? "1px solid #f0f4f2" : "none" }}>
                  <div
                    onClick={() => setExpandedTemplate(expandedTemplate === t.name ? null : t.name)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer" }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "#8aab9e", marginTop: 2 }}>{t.full}</div>
                      <div style={{ fontSize: 10.5, color: "#d97706", marginTop: 2, fontWeight: 500 }}>📅 {t.when}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedTemplate(t.name); setShowForm(true) }}
                        style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #d6e8e0", background: "white", color: "#1a8c6e", cursor: "pointer", fontWeight: 500, flexShrink: 0 }}
                      >
                        Use
                      </button>
                      <span style={{ color: "#8aab9e", fontSize: 14 }}>{expandedTemplate === t.name ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {expandedTemplate === t.name && (
                    <div style={{ background: "#f8faf9", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                      <div style={{ fontSize: 12.5, color: "#1a2724", lineHeight: 1.6, marginBottom: 10 }}>{t.guide}</div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase", marginBottom: 3 }}>Administered by</div>
                          <div style={{ fontSize: 12, color: "#4a6359" }}>{t.who}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase", marginBottom: 3 }}>Duration</div>
                          <div style={{ fontSize: 12, color: "#4a6359" }}>{t.duration}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent assessments */}
        <div>
          <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Recent Assessments</div>
                <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>{assessments.length} completed</div>
              </div>
            </div>
            <div style={{ padding: "0 18px" }}>
              {loading ? (
                <div style={{ padding: 32, textAlign: "center", color: "#8aab9e" }}>Loading...</div>
              ) : assessments.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "#1a2724", marginBottom: 6 }}>No assessments yet</div>
                  <div style={{ fontSize: 12.5, color: "#8aab9e", marginBottom: 16, lineHeight: 1.6 }}>
                    Start with a <strong>CARS-2</strong> and <strong>Sensory Profile 2</strong> for every new client at intake.
                  </div>
                  <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    Record first assessment
                  </button>
                </div>
              ) : assessments.map((a: any, i: number) => {
                const color = COLORS[a.templateName] ?? "#8aab9e"
                const template = TEMPLATES.find(t => t.name === a.templateName)
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: i < assessments.length - 1 ? "1px solid #f0f4f2" : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
                      📋
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1a2724" }}>
                        <span style={{ color }}>{a.templateName}</span> — {a.client?.fullName ?? "Unknown"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>
                        {a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : ""}
                        {a.assessorName ? " · " + a.assessorName : ""}
                      </div>
                      {template && (
                        <div style={{ fontSize: 11, color: "#d97706", marginTop: 3, fontWeight: 500 }}>
                          📅 {template.when}
                        </div>
                      )}
                      {a.findings && (
                        <div style={{ fontSize: 12, color: "#4a6359", marginTop: 6, lineHeight: 1.5, background: "#f8faf9", borderRadius: 8, padding: "8px 10px" }}>
                          <strong style={{ color: "#1a2724" }}>Findings: </strong>
                          {a.findings.slice(0, 120)}{a.findings.length > 120 ? "..." : ""}
                        </div>
                      )}
                      {a.recommendations && (
                        <div style={{ fontSize: 12, color: "#4a6359", marginTop: 6, lineHeight: 1.5 }}>
                          <strong style={{ color: "#1a8c6e" }}>→ </strong>
                          {a.recommendations.slice(0, 100)}{a.recommendations.length > 100 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: color + "22", color, fontWeight: 500, flexShrink: 0 }}>
                      {a.templateName}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a2724", margin: 0 }}>Record Assessment</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#8aab9e" }}>×</button>
            </div>

            {selectedTemplate && (() => {
              const t = TEMPLATES.find(t => t.name === selectedTemplate)
              return t ? (
                <div style={{ background: "#f8faf9", borderRadius: 10, padding: "12px 14px", marginBottom: 16, borderLeft: `3px solid ${t.color}` }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: t.color, marginBottom: 4 }}>{t.name} — {t.full}</div>
                  <div style={{ fontSize: 12, color: "#4a6359", lineHeight: 1.5 }}>{t.guide}</div>
                  <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 6 }}>
                    Administered by: <strong style={{ color: "#1a2724" }}>{t.who}</strong> · Duration: <strong style={{ color: "#1a2724" }}>{t.duration}</strong>
                  </div>
                </div>
              ) : null
            })()}

            <form onSubmit={saveAssessment}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Client</label>
                  <select required value={clientId} onChange={e => setClientId(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    <option value="">Select client...</option>
                    {clients.map((c, i) => <option key={i} value={c.id}>{c.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Assessment tool</label>
                  <select required value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    <option value="">Select tool...</option>
                    {TEMPLATES.map((t, i) => <option key={i} value={t.name}>{t.name} — {t.full}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Assessor name</label>
                  <input value={assessorName} onChange={e => setAssessorName(e.target.value)} placeholder="e.g. Dr. Florence N." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Assessment date</label>
                  <input type="date" required value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Key findings</label>
                <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={3} placeholder="Summary of assessment findings..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Recommendations</label>
                <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={3} placeholder="Recommended interventions and next steps..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Assessment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}