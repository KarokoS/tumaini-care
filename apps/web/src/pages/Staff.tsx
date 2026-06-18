import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("THERAPIST")
  const [specialty, setSpecialty] = useState("OT")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => { loadData() }, [])

  function loadData() {
    api.get("/staff").catch(() => ({ data:[] }))
      .then((r:any) => setStaff(r.data))
      .finally(() => setLoading(false))
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/staff", { fullName, email, role, specialty: role==="THERAPIST"?specialty:null, phone, password })
      setShowForm(false)
      setFullName(""); setEmail(""); setRole("THERAPIST"); setSpecialty("OT"); setPhone(""); setPassword("")
      loadData()
    } catch(err: any) {
      alert(err.response?.data?.message ?? "Failed to save staff member")
    } finally { setSaving(false) }
  }

  const roleColors: Record<string,string> = {
    SUPER_ADMIN:"#7c3aed", MANAGER:"#2563a8", THERAPIST:"#1a8c6e",
    RECEPTIONIST:"#d97706", FINANCE:"#d63f5c", PARENT:"#8aab9e"
  }
  const roleBg: Record<string,string> = {
    SUPER_ADMIN:"#f5f3ff", MANAGER:"#e8f0fb", THERAPIST:"#e6f4ef",
    RECEPTIONIST:"#fef3c7", FINANCE:"#fde8ed", PARENT:"#f0f4f2"
  }
  const roleLabel: Record<string,string> = {
    SUPER_ADMIN:"Super Admin", MANAGER:"Manager", THERAPIST:"Therapist",
    RECEPTIONIST:"Receptionist", FINANCE:"Finance Officer", PARENT:"Parent"
  }
  const specialtyLabel: Record<string,string> = {
    OT:"Occupational Therapy", SPEECH:"Speech Therapy", ABA:"Behavior Analysis",
    SENSORY:"Sensory Integration", PSYCH:"Psychology", GROUP:"Group Therapy"
  }

  return (
    <Layout title="Staff" action={
      <button onClick={() => setShowForm(true)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Add Staff</button>
    }>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Total Staff", value: staff.length, color:"#1a8c6e" },
          { label:"Therapists", value: staff.filter(s=>s.role==="THERAPIST").length, color:"#2563a8" },
          { label:"Active", value: staff.filter(s=>s.isActive).length, color:"#d97706" },
          { label:"Support Staff", value: staff.filter(s=>s.role!=="THERAPIST"&&s.role!=="MANAGER").length, color:"#7c3aed" },
        ].map((s, i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:600, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"white", borderRadius:14, border:"1px solid #d6e8e0", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Staff Member</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Role</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Specialty</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Contact</th>
              <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Loading...</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>No staff members yet</td></tr>
            ) : staff.map((member, i) => (
              <tr key={i} style={{ borderBottom:"1px solid #f0f4f2" }}>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background: roleBg[member.role]||"#f0f4f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color: roleColors[member.role]||"#8aab9e", flexShrink:0 }}>
                      {member.fullName.split(" ").map((n:string) => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:500, color:"#1a2724" }}>{member.fullName}</div>
                      <div style={{ fontSize:11.5, color:"#8aab9e" }}>{member.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ fontSize:11.5, padding:"2px 8px", borderRadius:20, background:roleBg[member.role]||"#f0f4f2", color:roleColors[member.role]||"#8aab9e", fontWeight:500 }}>
                    {roleLabel[member.role] || member.role}
                  </span>
                </td>
                <td style={{ padding:"12px 16px", color:"#4a6359" }}>
                  {member.specialty ? specialtyLabel[member.specialty] || member.specialty : "—"}
                </td>
                <td style={{ padding:"12px 16px", color:"#4a6359" }}>
                  {member.phone || "—"}
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{ fontSize:11.5, padding:"2px 8px", borderRadius:20, background:member.isActive?"#e6f4ef":"#fde8ed", color:member.isActive?"#1a8c6e":"#d63f5c", fontWeight:500 }}>
                    {member.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:480 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Add Staff Member</h2>
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <form onSubmit={saveStaff}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Full name</label><input required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Email</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="THERAPIST">Therapist</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="FINANCE">Finance</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                {role === "THERAPIST" && (
                  <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Specialty</label>
                    <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                      <option value="OT">Occupational Therapy</option>
                      <option value="SPEECH">Speech Therapy</option>
                      <option value="ABA">ABA</option>
                      <option value="SENSORY">Sensory</option>
                      <option value="PSYCH">Psychology</option>
                    </select>
                  </div>
                )}
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
                <div><label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Password</label><input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} /></div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Add Staff"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}