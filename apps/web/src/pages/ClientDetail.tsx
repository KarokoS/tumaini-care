import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "../lib/api"
import Layout from "../components/Layout"
import { useAuthStore } from "../stores/auth.store"

type Guardian = {
  fullName:     string
  relationship: string
  phone:        string
  email?:       string | null
  isPrimary:    boolean
}

type Goal = { title: string; progressPct: number; isAchieved: boolean }
type ITP  = { goals?: Goal[] }

type Appointment = {
  scheduledAt: string
  therapyType: string
  status:      string
  therapist?:  { fullName: string } | null
}

type Client = {
  id:               string
  fullName:         string
  dob:              string
  gender:           string
  diagnosis?:       string | null
  coOccurring?:     string | null
  allergies?:       string | null
  schoolName?:      string | null
  referralSrc?:     string | null
  status:           string
  isProBono?:       boolean
  createdAt:        string
  registrationDate?: string | null
  guardians?:       Guardian[]
  itps?:            ITP[]
  appointments?:    Appointment[]
}

export default function ClientDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuthStore()
  const isSuperAdmin = user?.role === "SUPER_ADMIN"
  const canEdit = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER" || user?.role === "RECEPTIONIST" || user?.role === "THERAPIST"

  const [client, setClient]         = useState<Client | null>(null)
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [form, setForm]             = useState<any>({})

  useEffect(() => { loadClient() }, [id])

  function loadClient() {
    api.get(`/clients/${id}`)
      .then((r: any) => {
        setClient(r.data)
        setForm({
          fullName:    r.data.fullName,
          dob:         r.data.dob?.split("T")[0] ?? "",
          gender:      r.data.gender,
          diagnosis:   r.data.diagnosis ?? "",
          coOccurring: r.data.coOccurring ?? "",
          allergies:   r.data.allergies ?? "",
          schoolName:  r.data.schoolName ?? "",
          referralSrc: r.data.referralSrc ?? "",
          status:      r.data.status,
        })
      })
      .catch(() => navigate("/clients"))
      .finally(() => setLoading(false))
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/clients/${id}`, form)
      setEditing(false)
      loadClient()
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to save changes")
    } finally { setSaving(false) }
  }

  async function deleteClient() {
    setDeleting(true)
    try {
      await api.delete(`/clients/${id}`)
      navigate("/clients")
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to delete client")
    } finally { setDeleting(false) }
  }

  async function toggleStatus() {
    const newStatus = client?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await api.patch(`/clients/${id}/status`, { status: newStatus })
      loadClient()
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to update status")
    }
  }

  if (loading) return (
    <Layout title="Client">
      <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading...</div>
    </Layout>
  )

  if (!client) return null

  const age      = Math.floor((new Date().getTime() - new Date(client.dob).getTime()) / (1000*60*60*24*365))
  const guardian = client.guardians?.[0] ?? null
  const allGoals = (client.itps ?? []).flatMap(p => p.goals ?? [])
  const recentAppts = (client.appointments ?? []).slice(0, 5)

  const inp = { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }
  const lbl = { fontSize:12, color:"#4a6359", display:"block" as const, marginBottom:4 }

  return (
    <Layout title={client.fullName}>

      {/* Header */}
      <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"24px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#e6f4ef", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"#1a8c6e", flexShrink:0 }}>
            {client.fullName.charAt(0)}
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:20, fontWeight:600, color:"#1a2724" }}>{client.fullName}</div>
              {client.isProBono && <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#fef3c7", color:"#d97706", fontWeight:600 }}>🤝 Pro Bono</span>}
            </div>
            <div style={{ fontSize:13, color:"#8aab9e", marginTop:4 }}>
              {age} years old · {client.gender} · {client.diagnosis || "No diagnosis recorded"}
            </div>
            <div style={{ marginTop:6 }}>
              <span style={{ fontSize:11.5, padding:"2px 10px", borderRadius:20, background:client.status==="ACTIVE"?"#e6f4ef":"#fde8ed", color:client.status==="ACTIVE"?"#1a8c6e":"#d63f5c", fontWeight:600 }}>
                {client.status}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {canEdit && (
            <button onClick={() => setEditing(true)} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>
              ✏️ Edit
            </button>
          )}
          {canEdit && (
            <button onClick={toggleStatus} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#d97706" }}>
              {client.status === "ACTIVE" ? "Mark Inactive" : "Mark Active"}
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={() => setConfirmDelete(true)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#d63f5c", color:"white", fontSize:13, cursor:"pointer" }}>
              🗑 Delete
            </button>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

        {/* Client info */}
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"20px 24px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:14 }}>Child Information</div>
          {[
            { label:"Full Name",       value: client.fullName },
            { label:"Date of Birth",   value: new Date(client.dob).toLocaleDateString("en-KE",{ day:"numeric", month:"long", year:"numeric" }) },
            { label:"Age",             value: `${age} years` },
            { label:"Gender",          value: client.gender },
            { label:"Diagnosis",       value: client.diagnosis || "—" },
            { label:"Co-occurring",    value: client.coOccurring || "—" },
            { label:"Allergies",       value: client.allergies || "—" },
            { label:"School",          value: client.schoolName || "—" },
            { label:"Referral Source", value: client.referralSrc || "—" },
            { label:"Registered",      value: client.registrationDate
                ? new Date(client.registrationDate).toLocaleDateString("en-KE")
                : new Date(client.createdAt).toLocaleDateString("en-KE") },
          ].map((row, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f0f4f2", fontSize:13 }}>
              <span style={{ color:"#8aab9e", fontWeight:500 }}>{row.label}</span>
              <span style={{ color:"#1a2724", textAlign:"right", maxWidth:"60%" }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Guardian */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"20px 24px" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:14 }}>Parent / Guardian</div>
            {guardian ? (
              <>
                {[
                  { label:"Name",         value: guardian.fullName },
                  { label:"Relationship", value: guardian.relationship },
                  { label:"Phone",        value: guardian.phone || "—" },
                  { label:"Email",        value: guardian.email || "—" },
                ].map((row, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f0f4f2", fontSize:13 }}>
                    <span style={{ color:"#8aab9e", fontWeight:500 }}>{row.label}</span>
                    <span style={{ color:"#1a2724" }}>{row.value}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ fontSize:13, color:"#8aab9e" }}>No guardian on record</div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"20px 24px" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:14 }}>Quick Actions</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"📅 View Schedule",  href:`/schedule?clientId=${id}` },
                { label:"📝 View Sessions",   href:`/sessions?clientId=${id}` },
                { label:"🎯 Therapy Plans",   href:`/plans?clientId=${id}` },
                { label:"💳 Billing",         href:`/billing?clientId=${id}` },
                { label:"📋 Assessments",     href:`/assessments?clientId=${id}` },
                { label:"📈 Progress Charts", href:`/clients/${id}/progress` },
              ].map((action, i) => (
                <a key={i} href={action.href} style={{ padding:"9px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"#f8faf9", fontSize:13, color:"#1a8c6e", textDecoration:"none", fontWeight:500 }}>
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Goal progress */}
      {allGoals.length > 0 && (
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"20px 24px", marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:14 }}>Goal Progress</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
            {allGoals.map((g, i) => (
              <div key={i} style={{ marginBottom:4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4 }}>
                  <span style={{ color:"#1a2724", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"75%" }}>{g.title}</span>
                  <span style={{ fontWeight:600, color:g.isAchieved?"#1a8c6e":"#2563a8", flexShrink:0 }}>{g.progressPct}%</span>
                </div>
                <div style={{ height:6, background:"#f0f4f2", borderRadius:20, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:g.progressPct+"%", background:g.isAchieved?"#1a8c6e":"#2563a8", borderRadius:20 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent appointments */}
      {recentAppts.length > 0 && (
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, overflow:"hidden", marginBottom:16 }}>
          <div style={{ padding:"14px 20px", borderBottom:"1px solid #d6e8e0" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Recent Sessions</div>
          </div>
          <div style={{ padding:"0 20px" }}>
            {recentAppts.map((a, i) => {
              const STATUS_COLORS: Record<string,string> = {
                COMPLETED:"#1a8c6e", CANCELLED:"#d63f5c", NO_SHOW:"#8aab9e",
                SCHEDULED:"#d97706", CONFIRMED:"#2563a8"
              }
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<recentAppts.length-1?"1px solid #f0f4f2":"none" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>{a.therapyType}</div>
                    <div style={{ fontSize:11.5, color:"#8aab9e" }}>
                      {new Date(a.scheduledAt).toLocaleDateString("en-KE",{ weekday:"short", day:"numeric", month:"short" })}
                      {a.therapist?.fullName ? " · "+a.therapist.fullName : ""}
                    </div>
                  </div>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:(STATUS_COLORS[a.status]??"#8aab9e")+"22", color:STATUS_COLORS[a.status]??"#8aab9e", fontWeight:600 }}>
                    {a.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:560, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Edit Client</h2>
              <button onClick={() => setEditing(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <form onSubmit={saveEdit}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={lbl}>Full Name *</label>
                  <input required value={form.fullName??""} onChange={e=>setForm((p:any)=>({...p,fullName:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Date of Birth *</label>
                  <input type="date" required value={form.dob??""} onChange={e=>setForm((p:any)=>({...p,dob:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Gender</label>
                  <select value={form.gender??""} onChange={e=>setForm((p:any)=>({...p,gender:e.target.value}))} style={inp}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Diagnosis</label>
                  <input value={form.diagnosis??""} onChange={e=>setForm((p:any)=>({...p,diagnosis:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Co-occurring conditions</label>
                  <input value={form.coOccurring??""} onChange={e=>setForm((p:any)=>({...p,coOccurring:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Allergies / alerts</label>
                  <input value={form.allergies??""} onChange={e=>setForm((p:any)=>({...p,allergies:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>School name</label>
                  <input value={form.schoolName??""} onChange={e=>setForm((p:any)=>({...p,schoolName:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Referral source</label>
                  <input value={form.referralSrc??""} onChange={e=>setForm((p:any)=>({...p,referralSrc:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Status</label>
                  <select value={form.status??""} onChange={e=>setForm((p:any)=>({...p,status:e.target.value}))} style={inp}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setEditing(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:420 }}>
            <div style={{ fontSize:16, fontWeight:600, color:"#1a2724", marginBottom:10 }}>Delete client?</div>
            <div style={{ fontSize:13, color:"#4a6359", marginBottom:20, lineHeight:1.6 }}>
              This will permanently delete <strong>{client.fullName}</strong> and all related sessions, therapy plans, invoices and assessments. This cannot be undone.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setConfirmDelete(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
              <button onClick={deleteClient} disabled={deleting} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#d63f5c", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:deleting?0.7:1 }}>{deleting?"Deleting...":"Delete Permanently"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}