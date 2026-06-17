import { useEffect, useState } from 'react'
import Layout from "../components/Layout"
import api from '../lib/api'

type Guardian = {
  fullName: string
}

type Client = {
  id: string
  fullName: string
  dob: string
  diagnosis?: string | null
  status: string
  guardians?: Guardian[]
}

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string; error?: string } } }).response
  return response?.data?.message ?? response?.data?.error ?? fallback
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: '', dob: '', gender: 'Male', diagnosis: '',
    referralSrc: '', schoolName: '', allergies: '',
    guardianName: '', guardianRelationship: 'Mother',
    guardianPhone: '', guardianEmail: ''
  })

  useEffect(() => {
    loadClients()
  }, [])

  function loadClients() {
    setLoading(true)
    api.get<Client[]>('/clients')
      .then(res => setClients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/clients', {
        fullName: form.fullName,
        dob: form.dob,
        gender: form.gender,
        diagnosis: form.diagnosis,
        referralSrc: form.referralSrc,
        schoolName: form.schoolName,
        allergies: form.allergies,
        guardian: {
          fullName: form.guardianName,
          relationship: form.guardianRelationship,
          phone: form.guardianPhone,
          email: form.guardianEmail || undefined,
        }
      })
      setShowForm(false)
      setForm({ fullName: '', dob: '', gender: 'Male', diagnosis: '', referralSrc: '', schoolName: '', allergies: '', guardianName: '', guardianRelationship: 'Mother', guardianPhone: '', guardianEmail: '' })
      loadClients()
    } catch (err: unknown) {
      alert(errorMessage(err, 'Failed to save client'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = clients.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Clients" action={
      <button onClick={() => setShowForm(true)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ New Client</button>
    }>
      <div style={{ marginBottom:16 }}>
        <input type="text" placeholder="Search clients by name..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding:"9px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, width:280, outline:"none" }} />
      </div>

      <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Client</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Age</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Diagnosis</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Guardian</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Status</th>
              <th style={{ padding:"10px 16px" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>No clients found</td></tr>
            ) : filtered.map((client, i) => {
              const age = new Date().getFullYear() - new Date(client.dob).getFullYear()
              const guardian = client.guardians?.[0]
              return (
                <tr key={i} style={{ borderBottom:"1px solid #f0f4f2" }}>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:"#e6f4ef", display:"flex", alignItems:"center", justifyContent:"center", color:"#1a8c6e", fontSize:11, fontWeight:600 }}>{client.fullName.charAt(0)}</div>
                      <span style={{ fontWeight:500, color:"#1a2724" }}>{client.fullName}</span>
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#4a6359" }}>{age} yrs</td>
                  <td style={{ padding:"12px 16px", color:"#4a6359" }}>{client.diagnosis ?? "—"}</td>
                  <td style={{ padding:"12px 16px", color:"#4a6359" }}>{guardian?.fullName ?? "—"}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:client.status==="ACTIVE"?"#e6f4ef":"#f0f4f2", color:client.status==="ACTIVE"?"#1a8c6e":"#8aab9e", fontWeight:500 }}>{client.status}</span>
                  </td>
                  <td style={{ padding:"12px 16px", textAlign:"right" }}>
                    <a href={"/clients/"+client.id} style={{ fontSize:12, color:"#1a8c6e", fontWeight:500 }}>View</a>
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
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ fontSize:12, fontWeight:600, color:"#1a8c6e", textTransform:"uppercase", marginBottom:12 }}>Child Information</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Full name *</label><input required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Date of birth *</label><input required type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Gender *</label><select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}><option>Male</option><option>Female</option><option>Other</option></select></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Diagnosis</label><input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. ASD Level 2" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>School name</label><input value={form.schoolName} onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Referral source</label><input value={form.referralSrc} onChange={e => setForm(f => ({ ...f, referralSrc: e.target.value }))} placeholder="e.g. Paediatrician" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
              </div>
              <div style={{ marginBottom:20 }}><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Allergies / medical alerts</label><input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
              <div style={{ fontSize:12, fontWeight:600, color:"#1a8c6e", textTransform:"uppercase", marginBottom:12 }}>Parent / Guardian</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Full name *</label><input required value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Relationship *</label><select value={form.guardianRelationship} onChange={e => setForm(f => ({ ...f, guardianRelationship: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}><option>Mother</option><option>Father</option><option>Guardian</option><option>Grandmother</option><option>Grandfather</option><option>Other</option></select></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Phone number *</label><input required value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))} placeholder="+254 7XX XXX XXX" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Email (optional)</label><input type="email" value={form.guardianEmail} onChange={e => setForm(f => ({ ...f, guardianEmail: e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Save Client"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
