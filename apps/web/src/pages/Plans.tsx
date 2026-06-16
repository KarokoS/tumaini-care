import { useEffect, useState } from "react"
import api from "../lib/api"

const NAV = [["Dashboard","/dashboard"],["Clients","/clients"],["Schedule","/schedule"],["Sessions","/sessions"],["Therapy Plans","/plans"],["Billing","/billing"],["Staff","/staff"],["Reports","/reports"]]

export default function Plans() {
  const [clients, setClients] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState("")
  const [reviewDate, setReviewDate] = useState("")
  const [goalTitle, setGoalTitle] = useState("")
  const [goalDesc, setGoalDesc] = useState("")
  const [goalTerm, setGoalTerm] = useState("SHORT")
  const [goalType, setGoalType] = useState("OT")

  useEffect(() => { loadData() }, [])

  function loadData() {
    Promise.all([
      api.get("/clients").catch(() => ({ data:[] })),
      api.get("/itps").catch(() => ({ data:[] })),
    ]).then(([c, p]:any) => {
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
    } catch(err: any) {
      alert(err.response?.data?.message ?? "Failed to save plan")
    } finally { setSaving(false) }
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault()
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
      setGoalTitle("")
      setGoalDesc("")
      loadData()
    } catch(err: any) {
      alert(err.response?.data?.message ?? "Failed to save goal")
    } finally { setSaving(false) }
  }

  async function updateProgress(goalId: string, pct: number) {
    try {
      await api.patch("/goals/" + goalId, { progressPct: pct })
      loadData()
    } catch(err: any) {
      alert("Failed to update progress")
    }
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
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:600, color:"#1a2724", margin:0 }}>Therapy Plans</h1>
            <p style={{ fontSize:13, color:"#8aab9e", margin:"4px 0 0" }}>{plans.length} active plans</p>
          </div>
          <button onClick={() => setShowPlanForm(true)} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ New Plan</button>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading...</div>
        ) : plans.length === 0 ? (
          <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", padding:48, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🎯</div>
            <div style={{ fontSize:15, fontWeight:500, color:"#1a2724", marginBottom:6 }}>No therapy plans yet</div>
            <div style={{ fontSize:13, color:"#8aab9e", marginBottom:20 }}>Create an individualized therapy plan for each client</div>
            <button onClick={() => setShowPlanForm(true)} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>Create first plan</button>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(380px, 1fr))", gap:16 }}>
            {plans.map((plan, pi) => (
              <div key={pi} style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", overflow:"hidden" }}>
                <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:"#1a2724" }}>{plan.client ? plan.client.fullName : "Unknown"}</div>
                    <div style={{ fontSize:11, color:"#8aab9e", marginTop:2 }}>
                      ITP v{plan.version} · {plan.goals ? plan.goals.length : 0} goals
                      {plan.reviewDate && " · Review: " + new Date(plan.reviewDate).toLocaleDateString("en-KE",{ day:"numeric", month:"short", year:"numeric" })}
                    </div>
                  </div>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#e6f4ef", color:"#1a8c6e", fontWeight:500 }}>{plan.status}</span>
                </div>

                <div style={{ padding:"12px 18px" }}>
                  {plan.goals && plan.goals.length > 0 ? (
                    plan.goals.map((goal: any, gi: number) => (
                      <div key={gi} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>{goal.title}</div>
                          <div style={{ fontSize:12, fontWeight:600, color:"#1a8c6e" }}>{goal.progressPct}%</div>
                        </div>
                        <div style={{ fontSize:11, color:"#8aab9e", marginBottom:6 }}>{goal.term} term · {goal.therapyType}</div>
                        <div style={{ height:6, background:"#f0f4f2", borderRadius:20, overflow:"hidden" }}>
                          <div style={{ height:"100%", width: goal.progressPct + "%", background:"#1a8c6e", borderRadius:20, transition:"width 0.3s" }}></div>
                        </div>
                        <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue={goal.progressPct}
                            onMouseUp={(e: any) => updateProgress(goal.id, parseInt(e.target.value))}
                            style={{ flex:1 }}
                          />
                          {goal.isAchieved && <span style={{ fontSize:10, color:"#1a8c6e", fontWeight:600 }}>Achieved</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize:12, color:"#8aab9e", padding:"8px 0" }}>No goals added yet</div>
                  )}

                  <button
                    onClick={() => { setSelectedPlan(plan); setShowGoalForm(true) }}
                    style={{ marginTop:8, width:"100%", padding:"7px", borderRadius:8, border:"1px dashed #d6e8e0", background:"transparent", fontSize:12, color:"#1a8c6e", cursor:"pointer", fontWeight:500 }}
                  >
                    + Add goal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showPlanForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:460 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>New Therapy Plan</h2>
              <button onClick={() => setShowPlanForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <form onSubmit={savePlan}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Client</label>
                <select required value={clientId} onChange={e => setClientId(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                  <option value="">Select client...</option>
                  {clients.map((c, i) => <option key={i} value={c.id}>{c.fullName}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Review date (optional)</label>
                <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowPlanForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Create Plan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGoalForm && selectedPlan && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:460 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Add Goal</h2>
              <button onClick={() => setShowGoalForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <div style={{ fontSize:12, color:"#8aab9e", marginBottom:16 }}>Plan for: {selectedPlan.client ? selectedPlan.client.fullName : ""}</div>
            <form onSubmit={saveGoal}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Goal title</label>
                <input required value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="e.g. Sustain eye contact for 5 seconds" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Description (optional)</label>
                <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)} rows={2} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Term</label>
                  <select value={goalTerm} onChange={e => setGoalTerm(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="SHORT">Short term</option>
                    <option value="LONG">Long term</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Therapy type</label>
                  <select value={goalType} onChange={e => setGoalType(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="OT">OT</option>
                    <option value="SPEECH">Speech</option>
                    <option value="ABA">ABA</option>
                    <option value="SENSORY">Sensory</option>
                    <option value="GROUP">Group</option>
                    <option value="PSYCH">Psychology</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowGoalForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Add Goal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}