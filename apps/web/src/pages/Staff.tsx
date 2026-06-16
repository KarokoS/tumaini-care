import { useEffect, useState } from "react"
import api from "../lib/api"

const NAV = [["Dashboard","/dashboard"],["Clients","/clients"],["Schedule","/schedule"],["Sessions","/sessions"],["Therapy Plans","/plans"],["Billing","/billing"],["Staff","/staff"],["Reports","/reports"]]

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
      await api.post("/staff", { fullName, email, role, specialty: role === "THERAPIST" ? specialty : null, phone, password })
      setShowForm(false)
      setFullName(""); setEmail(""); setRole("THERAPIST"); setSpecialty("OT"); setPhone(""); setPassword("")
      loadData()
    } catch(err: any) {
      alert(err.response?.data?.message ?? "Failed to save staff member")
    } finally { setSaving(false) }
  }

  const path = window.location.pathname
  const roleColors: Record<string,string> = {
    SUPER_ADMIN:"#7c3aed", MANAGER:"#2563a8", THERAPIST:"#1a8c6e",
    RECEPTIONIST:"#d97706", FINANCE:"#d63f5c", PARENT:"#8aab9e"
  }
  const roleBg: Record<string,string> = {
    SUPER_ADMIN:"#f5f3ff", MANAGER:"#e8f0fb", THERAPIST:"#e6f4ef",
    RECEPTIONIST:"#fef3c7", FINANCE:"#fde8ed", PARENT:"#f0f4f2"
  }

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
            <h1 style={{ fontSize:20, fontWeight:600, color:"#1a2724", margin:0 }}>Staff</h1>
            <p style={{ fontSize:13, color:"#8aab9e", margin:"4px 0 0" }}>{staff.length} team members</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Add Staff</button>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading...</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
            {staff.map((member, i) => (
              <div key={i} style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", padding:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:roleBg[member.role]||"#f0f4f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:600, color:roleColors[member.role]||"#8aab9e", flexShrink:0 }}>
                    {member.fullName.charAt(0)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:"#1a2724", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{member.fullName}</div>
                    <div style={{ fontSize:11, color:"#8aab9e", marginTop:2 }}>{member.email}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:roleBg[member.role]||"#f0f4f2", color:roleColors[member.role]||"#8aab9e", fontWeight:500 }}>{member.role}</span>
                  {member.specialty && (
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#f0f4f2", color:"#4a6359", fontWeight:500 }}>{member.specialty}</span>
                  )}
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:member.isActive?"#e6f4ef":"#fde8ed", color:member.isActive?"#1a8c6e":"#d63f5c", fontWeight:500 }}>{member.isActive?"Active":"Inactive"}</span>
                </div>
                {member.phone && (
                  <div style={{ fontSize:12, color:"#4a6359" }}>
                    <span style={{ color:"#8aab9e" }}>Phone: </span>{member.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:480 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Add Staff Member</h2>
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <form onSubmit={saveStaff}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Full name</label>
                  <input required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="THERAPIST">Therapist</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="FINANCE">Finance</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                {role === "THERAPIST" && (
                  <div>
                    <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Specialty</label>
                    <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                      <option value="OT">Occupational Therapy</option>
                      <option value="SPEECH">Speech Therapy</option>
                      <option value="ABA">ABA</option>
                      <option value="SENSORY">Sensory</option>
                      <option value="PSYCH">Psychology</option>
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Password</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Add Staff"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}