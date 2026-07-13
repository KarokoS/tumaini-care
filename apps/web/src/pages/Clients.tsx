import { useEffect, useState } from 'react'
import Layout from "../components/Layout"
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

type Guardian = { fullName: string; phone?: string; email?: string }
type Client   = { id: string; fullName: string; dob: string; diagnosis?: string | null; status: string; isProBono?: boolean; createdAt: string; guardians?: Guardian[] }

function errorMessage(err: unknown, fallback: string) {
  const r = (err as any)?.response?.data
  return r?.message ?? r?.error ?? fallback
}

export default function Clients() {
  const { user }   = useAuthStore()
  const isReadOnly = user?.role === "THERAPIST"
  const canManage  = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER"
  const canAdd     = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER" || user?.role === "RECEPTIONIST"

  const [clients, setClients]             = useState<Client[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('ALL')
  const [showForm, setShowForm]           = useState(false)
  const [saving, setSaving]               = useState(false)
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [form, setForm] = useState({
    fullName:'', dob:'', gender:'Male', diagnosis:'',
    referralSrc:'', schoolName:'', allergies:'',
    guardianName:'', guardianRelationship:'Mother',
    guardianPhone:'', guardianEmail:''
  })

  useEffect(() => { loadClients() }, [])

  function loadClients() {
    setLoading(true)
    api.get('/clients')
      .then((res: any) => setClients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/clients', {
        fullName: form.fullName, dob: form.dob, gender: form.gender,
        diagnosis: form.diagnosis, referralSrc: form.referralSrc,
        schoolName: form.schoolName, allergies: form.allergies,
        guardian: {
          fullName: form.guardianName, relationship: form.guardianRelationship,
          phone: form.guardianPhone, email: form.guardianEmail || undefined,
        }
      })
      setShowForm(false)
      setForm({ fullName:'', dob:'', gender:'Male', diagnosis:'', referralSrc:'', schoolName:'', allergies:'', guardianName:'', guardianRelationship:'Mother', guardianPhone:'', guardianEmail:'' })
      loadClients()
    } catch (err) { alert(errorMessage(err, 'Failed to save client')) }
    finally { setSaving(false) }
  }

  async function toggleStatus(client: Client) {
    try {
      await api.patch(`/clients/${client.id}/status`, { status: client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      setOpenMenuId(null); loadClients()
    } catch (err) { alert(errorMessage(err, 'Failed to update status')) }
  }

  async function toggleProBono(client: Client) {
    try {
      await api.patch(`/clients/${client.id}`, { isProBono: !client.isProBono })
      setOpenMenuId(null); loadClients()
    } catch (err) { alert(errorMessage(err, 'Failed to update pro bono status')) }
  }

  async function confirmDeleteClient() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await api.delete(`/clients/${confirmDelete.id}`)
      setConfirmDelete(null); loadClients()
    } catch (err) { alert(errorMessage(err, 'Failed to delete client')) }
    finally { setDeleting(false) }
  }

  const filtered = clients.filter(c => {
    const matchSearch = c.fullName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const inp = { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }
  const lbl = { fontSize:12, color:"#4a6359", display:"block" as const, marginBottom:4 }

  return (
    <Layout title="Clients" action={
      canAdd && !isReadOnly ? (
        <button onClick={() => setShowForm(true)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>
          + New Client
        </button>
      ) : undefined
    }>

      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <input type="text" placeholder="Search clients by name..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding:"9px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, width:280, outline:"none" }} />
        <div style={{ display:"flex", gap:6 }}>
          {["ALL","ACTIVE","INACTIVE"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding:"7px 14px", borderRadius:8, border:"1px solid", borderColor:statusFilter===s?"#1a8c6e":"#d6e8e0", background:statusFilter===s?"#e6f4ef":"white", color:statusFilter===s?"#1a8c6e":"#4a6359", fontSize:12.5, fontWeight:500, cursor:"pointer" }}>
              {s==="ALL"?"All":s.charAt(0)+s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {isReadOnly && (
          <span style={{ fontSize:12, color:"#8aab9e", padding:"6px 12px", borderRadius:8, background:"#f8faf9", border:"1px solid #d6e8e0" }}>👁 View only</span>
        )}
      </div>

      <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
              {["Client","Age","Diagnosis","Guardian","Status",""].map((h,i) => (
                <th key={i} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>No clients found</td></tr>
            ) : filtered.map((client, i) => {
              const age      = new Date().getFullYear() - new Date(client.dob).getFullYear()
              const guardian = client.guardians?.[0]
              return (
                <tr key={i} style={{ borderBottom:"1px solid #f0f4f2" }}>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:"#e6f4ef", display:"flex", alignItems:"center", justifyContent:"center", color:"#1a8c6e", fontSize:11, fontWeight:600 }}>
                        {client.fullName.charAt(0)}
                      </div>
                      <div>
                        <span style={{ fontWeight:500, color:"#1a2724" }}>{client.fullName}</span>
                        {client.isProBono && <span style={{ fontSize:10, marginLeft:6, padding:"1px 6px", borderRadius:20, background:"#fef3c7", color:"#d97706", fontWeight:600 }}>Pro Bono</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#4a6359" }}>{age} yrs</td>
                  <td style={{ padding:"12px 16px", color:"#4a6359" }}>{client.diagnosis ?? "—"}</td>
                  <td style={{ padding:"12px 16px", color:"#4a6359" }}>
                    <div>{guardian?.fullName ?? "—"}</div>
                    {guardian?.phone && <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>{guardian.phone}</div>}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:client.status==="ACTIVE"?"#e6f4ef":"#f0f4f2", color:client.status==="ACTIVE"?"#1a8c6e":"#8aab9e", fontWeight:500 }}>
                      {client.status}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px", textAlign:"right", position:"relative" }}>
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", alignItems:"center" }}>
                      <a href={"/clients/"+client.id} style={{ fontSize:12, color:"#1a8c6e", fontWeight:500 }}>View</a>
                      {!isReadOnly && canManage && (
                        <button onClick={() => setOpenMenuId(openMenuId===client.id?null:client.id)}
                          style={{ border:"none", background:"none", cursor:"pointer", color:"#8aab9e", fontSize:16, padding:"2px 6px" }}>⋮</button>
                      )}
                    </div>
                    {openMenuId === client.id && (
                      <div style={{ position:"absolute", right:16, top:"100%", marginTop:4, background:"white", border:"1px solid #d6e8e0", borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,0.1)", zIndex:10, minWidth:180, textAlign:"left" }}>
                        <button onClick={() => toggleStatus(client)}
                          style={{ display:"block", width:"100%", padding:"8px 14px", border:"none", background:"none", textAlign:"left", fontSize:12.5, color:"#4a6359", cursor:"pointer" }}>
                          {client.status==="ACTIVE"?"Mark as Inactive":"✓ Mark as Active"}
                        </button>
                        <button onClick={() => toggleProBono(client)}
                          style={{ display:"block", width:"100%", padding:"8px 14px", border:"none", background:"none", textAlign:"left", fontSize:12.5, color:"#d97706", cursor:"pointer", borderTop:"1px solid #f0f4f2" }}>
                          {client.isProBono?"Remove Pro Bono":"🤝 Mark as Pro Bono"}
                        </button>
                        {user?.role === "SUPER_ADMIN" && (
                          <button onClick={() => { setConfirmDelete(client); setOpenMenuId(null) }}
                            style={{ display:"block", width:"100%", padding:"8px 14px", border:"none", background:"none", textAlign:"left", fontSize:12.5, color:"#d63f5c", cursor:"pointer", borderTop:"1px solid #f0f4f2" }}>
                            Delete Client
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:560, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>New Client</h2>
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ fontSize:12, fontWeight:600, color:"#1a8c6e", textTransform:"uppercase", marginBottom:12 }}>Child Information</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div><label style={lbl}>Full name *</label><input required value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Date of birth *</label><input required type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Gender *</label>
                  <select value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))} style={inp}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div><label style={lbl}>Diagnosis</label><input value={form.diagnosis} onChange={e=>setForm(f=>({...f,diagnosis:e.target.value}))} placeholder="e.g. ASD Level 2" style={inp}/></div>
                <div><label style={lbl}>School name</label><input value={form.schoolName} onChange={e=>setForm(f=>({...f,schoolName:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Referral source</label><input value={form.referralSrc} onChange={e=>setForm(f=>({...f,referralSrc:e.target.value}))} style={inp}/></div>
              </div>
              <div style={{ marginBottom:20 }}><label style={lbl}>Allergies / medical alerts</label><input value={form.allergies} onChange={e=>setForm(f=>({...f,allergies:e.target.value}))} style={inp}/></div>
              <div style={{ fontSize:12, fontWeight:600, color:"#1a8c6e", textTransform:"uppercase", marginBottom:12 }}>Parent / Guardian</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                <div><label style={lbl}>Full name *</label><input required value={form.guardianName} onChange={e=>setForm(f=>({...f,guardianName:e.target.value}))} style={inp}/></div>
                <div><label style={lbl}>Relationship *</label>
                  <select value={form.guardianRelationship} onChange={e=>setForm(f=>({...f,guardianRelationship:e.target.value}))} style={inp}>
                    <option>Mother</option><option>Father</option><option>Guardian</option><option>Grandmother</option><option>Grandfather</option><option>Other</option>
                  </select>
                </div>
                <div><label style={lbl}>Phone number *</label><input required value={form.guardianPhone} onChange={e=>setForm(f=>({...f,guardianPhone:e.target.value}))} placeholder="+254 7XX XXX XXX" style={inp}/></div>
                <div><label style={lbl}>Email (optional)</label><input type="email" value={form.guardianEmail} onChange={e=>setForm(f=>({...f,guardianEmail:e.target.value}))} style={inp}/></div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Save Client"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:420 }}>
            <div style={{ fontSize:16, fontWeight:600, color:"#1a2724", marginBottom:10 }}>Delete client?</div>
            <div style={{ fontSize:13, color:"#4a6359", marginBottom:20, lineHeight:1.6 }}>
              Permanently delete <strong>{confirmDelete.fullName}</strong> and all related records. This cannot be undone.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
              <button onClick={confirmDeleteClient} disabled={deleting} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#d63f5c", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:deleting?0.7:1 }}>{deleting?"Deleting...":"Delete Permanently"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}