import { useEffect, useState } from "react"
import Layout from "../components/Layout"
import api from "../lib/api"

type Client = {
  id: string
  fullName: string
}

type Goal = {
  id: string
  title: string
  description?: string | null
  term: string
  therapyType: string
  progressPct: number
  isAchieved: boolean
}

type Plan = {
  id: string
  version: number
  status: string
  reviewDate?: string | null
  createdAt: string
  client?: Client
  goals?: Goal[]
}

type ApiList<T> = { data: T[] }

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string; error?: string } } }).response
  return response?.data?.message ?? response?.data?.error ?? fallback
}

export default function Plans() {
  const [clients, setClients] = useState<Client[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState("")
  const [reviewDate, setReviewDate] = useState("")
  const [goalTitle, setGoalTitle] = useState("")
  const [goalDesc, setGoalDesc] = useState("")
  const [goalTerm, setGoalTerm] = useState("SHORT")
  const [goalType, setGoalType] = useState("OT")

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      api.get<Client[]>("/clients").catch((): ApiList<Client> => ({ data: [] })),
      api.get<Plan[]>("/itps").catch((): ApiList<Plan> => ({ data: [] })),
    ]).then(([c, p]) => {
      setClients(c.data)
      setPlans(p.data)
    }).finally(() => setLoading(false))
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/itps", { clientId, reviewDate: reviewDate || undefined })
      setShowPlanForm(false)
      setClientId("")
      setReviewDate("")
      loadData()
    } catch (err: unknown) {
      alert(errorMessage(err, "Failed to save plan"))
    } finally {
      setSaving(false)
    }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlan) return
    setSaving(true)
    try {
      await api.post("/goals", {
        itpId: selectedPlan.id,
        title: goalTitle,
        description: goalDesc,
        term: goalTerm,
        therapyType: goalType,
      })
      setShowGoalForm(false)
      setSelectedPlan(null)
      setGoalTitle("")
      setGoalDesc("")
      setGoalTerm("SHORT")
      setGoalType("OT")
      loadData()
    } catch (err: unknown) {
      alert(errorMessage(err, "Failed to save goal"))
    } finally {
      setSaving(false)
    }
  }

  async function updateProgress(goalId: string, pct: number) {
    try {
      await api.patch("/goals/" + goalId, { progressPct: pct })
      loadData()
    } catch (err: unknown) {
      alert(errorMessage(err, "Failed to update progress"))
    }
  }

  function openGoalForm(plan: Plan) {
    setSelectedPlan(plan)
    setShowGoalForm(true)
  }

  return (
    <Layout title="Therapy Plans" action={
      <button onClick={() => setShowPlanForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ New Plan</button>
    }>
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8aab9e" }}>Loading plans...</div>
      ) : plans.length === 0 ? (
        <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 12, padding: 32, textAlign: "center", color: "#8aab9e", fontSize: 13 }}>No therapy plans yet</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {plans.map(plan => {
            const goals = plan.goals ?? []
            const avgProgress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progressPct, 0) / goals.length) : 0
            return (
              <div key={plan.id} style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a2724" }}>{plan.client?.fullName ?? "Unknown client"}</div>
                    <div style={{ fontSize: 12, color: "#8aab9e", marginTop: 2 }}>
                      Version {plan.version} · {goals.length} goal{goals.length === 1 ? "" : "s"} · {plan.reviewDate ? `Review ${new Date(plan.reviewDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}` : "No review date"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: plan.status === "ACTIVE" ? "#e6f4ef" : "#f0f4f2", color: plan.status === "ACTIVE" ? "#1a8c6e" : "#8aab9e", fontWeight: 600 }}>{plan.status}</span>
                    <button onClick={() => openGoalForm(plan)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", color: "#1a8c6e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Goal</button>
                  </div>
                </div>

                <div style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, height: 7, background: "#f0f4f2", borderRadius: 20, overflow: "hidden" }}>
                      <div style={{ width: `${avgProgress}%`, height: "100%", background: "#1a8c6e" }} />
                    </div>
                    <div style={{ width: 42, textAlign: "right", fontSize: 12, color: "#1a8c6e", fontWeight: 600 }}>{avgProgress}%</div>
                  </div>

                  {goals.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#8aab9e", padding: "8px 0" }}>No goals added yet</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {goals.map(goal => (
                        <div key={goal.id} style={{ border: "1px solid #f0f4f2", borderRadius: 10, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                            <div>
                              <div style={{ fontSize: 13, color: "#1a2724", fontWeight: 600 }}>{goal.title}</div>
                              {goal.description && <div style={{ fontSize: 12, color: "#8aab9e", marginTop: 2 }}>{goal.description}</div>}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 20, background: "#e8f0fb", color: "#2563a8", fontWeight: 600 }}>{goal.therapyType}</span>
                              <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 20, background: "#f0f4f2", color: "#4a6359", fontWeight: 600 }}>{goal.term}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input type="range" min="0" max="100" step="5" value={goal.progressPct} onChange={e => updateProgress(goal.id, parseInt(e.target.value))} style={{ flex: 1 }} />
                            <div style={{ width: 38, textAlign: "right", fontSize: 12, color: "#1a8c6e", fontWeight: 600 }}>{goal.progressPct}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showPlanForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 460 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a2724", margin: 0 }}>New Therapy Plan</h2>
              <button onClick={() => setShowPlanForm(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#8aab9e" }}>x</button>
            </div>
            <form onSubmit={savePlan}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Client *</label>
                <select required value={clientId} onChange={e => setClientId(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                  <option value="">Select client...</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.fullName}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Review date</label>
                <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowPlanForm(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Create Plan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoalForm && selectedPlan && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a2724", margin: 0 }}>New Goal</h2>
              <button onClick={() => setShowGoalForm(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#8aab9e" }}>x</button>
            </div>
            <form onSubmit={saveGoal}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Title *</label>
                <input required value={goalTitle} onChange={e => setGoalTitle(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Description</label>
                <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Term</label>
                  <select value={goalTerm} onChange={e => setGoalTerm(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    <option value="SHORT">Short term</option>
                    <option value="LONG">Long term</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Therapy type</label>
                  <select value={goalType} onChange={e => setGoalType(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    <option value="OT">OT</option>
                    <option value="SPEECH">Speech</option>
                    <option value="ABA">ABA</option>
                    <option value="SENSORY">Sensory</option>
                    <option value="GROUP">Group</option>
                    <option value="PSYCH">Psychology</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowGoalForm(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Goal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
