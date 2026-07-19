import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

export default function Staff() {
  const [staff, setStaff]                             = useState<any[]>([])
  const [loading, setLoading]                         = useState(true)
  const [showForm, setShowForm]                       = useState(false)
  const [saving, setSaving]                           = useState(false)
  const [filter, setFilter]                           = useState("ALL")
  const [openMenuId, setOpenMenuId]                   = useState<string | null>(null)
  const [confirmDeleteStaff, setConfirmDeleteStaff]   = useState<any>(null)
  const [deletingStaff, setDeletingStaff]             = useState(false)
  const [showEditForm, setShowEditForm]               = useState(false)
  const [editMember, setEditMember]                   = useState<any>(null)
  const [savingEdit, setSavingEdit]                   = useState(false)
  const [showResetPwd, setShowResetPwd]               = useState(false)
  const [resetTarget, setResetTarget]                 = useState<any>(null)
  const [newPassword, setNewPassword]                 = useState("")
  const [savingReset, setSavingReset]                 = useState(false)

  // Add form
  const [fullName, setFullName]         = useState("")
  const [email, setEmail]               = useState("")
  const [role, setRole]                 = useState("THERAPIST")
  const [specialty, setSpecialty]       = useState("OT")
  const [phone, setPhone]               = useState("")
  const [password, setPassword]         = useState("")
  const [isTrainee, setIsTrainee]       = useState(false)
  const [institution, setInstitution]   = useState("")

  // Edit form
  const [editFullName, setEditFullName]       = useState("")
  const [editEmail, setEditEmail]             = useState("")
  const [editPhone, setEditPhone]             = useState("")
  const [editRole, setEditRole]               = useState("")
  const [editSpecialty, setEditSpecialty]     = useState("")
  const [editIsTrainee, setEditIsTrainee]     = useState(false)
  const [editInstitution, setEditInstitution] = useState("")

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest("[data-menu]")) setOpenMenuId(null)
    }
    if (openMenuId) document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [openMenuId])

  function loadData() {
    api.get("/staff").catch(() => ({ data:[] }))
      .then((r:any) => setStaff(r.data))
      .finally(() => setLoading(false))
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await api.post("/staff", {
        fullName, email, role,
        specialty: (role==="THERAPIST"||isTrainee) ? specialty : null,
        phone, password, isTrainee,
        institution: isTrainee ? institution : null,
      })
      setShowForm(false)
      setFullName(""); setEmail(""); setRole("THERAPIST"); setSpecialty("OT")
      setPhone(""); setPassword(""); setIsTrainee(false); setInstitution("")
      loadData()
    } catch (err:any) { alert(err.response?.data?.message ?? "Failed to save staff member") }
    finally { setSaving(false) }
  }

  async function toggleActive(member: any) {
    try {
      await api.patch(`/staff/${member.id}`, { isActive: !member.isActive })
      setOpenMenuId(null); loadData()
    } catch (err:any) { alert(err.response?.data?.message ?? "Failed to update staff status") }
  }

  async function deleteStaff(member: any) {
    setDeletingStaff(true)
    try {
      await api.delete(`/staff/${member.id}`)
      setConfirmDeleteStaff(null); loadData()
    } catch (err:any) { alert(err.response?.data?.message ?? "Failed to delete staff member") }
    finally { setDeletingStaff(false) }
  }

  function openEdit(member: any) {
    setEditMember(member)
    setEditFullName(member.fullName ?? "")
    setEditEmail(member.email ?? "")
    setEditPhone(member.phone ?? "")
    setEditRole(member.role ?? "THERAPIST")
    setEditSpecialty(member.specialty ?? "OT")
    setEditIsTrainee(member.isTrainee ?? false)
    setEditInstitution(member.institution ?? "")
    setOpenMenuId(null)
    setShowEditForm(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault(); setSavingEdit(true)
    try {
      await api.put(`/staff/${editMember.id}`, {
        fullName:    editFullName,
        email:       editEmail,
        phone:       editPhone,
        role:        editRole,
        specialty:   editSpecialty || null,
        isTrainee:   editIsTrainee,
        institution: editIsTrainee ? editInstitution : null,
      })
      setShowEditForm(false); loadData()
    } catch (err:any) { alert(err.response?.data?.message ?? "Failed to update staff member") }
    finally { setSavingEdit(false) }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) { alert("Password must be at least 8 characters"); return }
    setSavingReset(true)
    try {
      await api.post(`/staff/${resetTarget.id}/reset-password`, { newPassword })
      alert(`Password reset for ${resetTarget.fullName}. They will be asked to set a new password on next login.`)
      setShowResetPwd(false); setNewPassword("")
    } catch (err:any) { alert(err.response?.data?.message ?? "Failed to reset password") }
    finally { setSavingReset(false) }
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
    SENSORY:"Sensory Integration", PSYCH:"Psychology", GROUP:"Group Therapy", PHYSIO:"Physiotherapy"
  }

  const filtered    = staff.filter(m => {
    if (filter==="ACTIVE")   return m.isActive && !m.isTrainee
    if (filter==="INACTIVE") return !m.isActive
    if (filter==="TRAINEE")  return m.isTrainee
    return true
  })
  const regularStaff = filtered.filter(m => !m.isTrainee)
  const trainees     = filtered.filter(m => m.isTrainee)
  const selectedMember = openMenuId ? staff.find(m => m.id===openMenuId) : null

  function renderRow(member: any) {
    return (
      <tr key={member.id} style={{ borderBottom:"1px solid #f0f4f2" }}>
        <td style={{ padding:"12px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:roleBg[member.role]||"#f0f4f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:roleColors[member.role]||"#8aab9e", flexShrink:0 }}>
              {member.fullName.split(" ").map((n:string)=>n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:500, color:"#1a2724" }}>{member.fullName}</div>
              <div style={{ fontSize:11.5, color:"#8aab9e" }}>{member.email}</div>
              {member.isTrainee && (
                <div style={{ fontSize:10.5, color:"#d97706", marginTop:2, fontWeight:500 }}>
                  🎓 {member.institution || "Volunteer / Student"}
                </div>
              )}
            </div>
          </div>
        </td>
        <td style={{ padding:"12px 16px" }}>
          <span style={{ fontSize:11.5, padding:"2px 8px", borderRadius:20, background:roleBg[member.role]||"#f0f4f2", color:roleColors[member.role]||"#8aab9e", fontWeight:500 }}>
            {roleLabel[member.role]||member.role}
          </span>
        </td>
        <td style={{ padding:"12px 16px", color:"#4a6359" }}>
          {member.specialty ? specialtyLabel[member.specialty]||member.specialty : "—"}
        </td>
        <td style={{ padding:"12px 16px", color:"#4a6359" }}>{member.phone||"—"}</td>
        <td style={{ padding:"12px 16px" }}>
          <span style={{ fontSize:11.5, padding:"2px 8px", borderRadius:20, background:member.isActive?"#e6f4ef":"#fde8ed", color:member.isActive?"#1a8c6e":"#d63f5c", fontWeight:500 }}>
            {member.isActive?"Active":"Inactive"}
          </span>
        </td>
        <td style={{ padding:"12px 16px", textAlign:"right" }} data-menu="true">
          <button data-menu="true"
            onClick={e=>{e.stopPropagation();setOpenMenuId(openMenuId===member.id?null:member.id)}}
            style={{ border:"none", background:openMenuId===member.id?"#f0f4f2":"none", cursor:"pointer", color:"#8aab9e", fontSize:18, padding:"4px 8px", borderRadius:6 }}>
            ⋮
          </button>
        </td>
      </tr>
    )
  }

  const inp = { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }
  const lbl = { fontSize:12, color:"#4a6359", display:"block" as const, marginBottom:4 }

  return (
    <Layout title="Staff" action={
      <button onClick={() => setShowForm(true)} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>
        + Add Staff
      </button>
    }>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Total Staff",           value: staff.length,                                                    color:"#1a8c6e" },
          { label:"Therapists",            value: staff.filter(s=>s.role==="THERAPIST"&&!s.isTrainee).length,     color:"#2563a8" },
          { label:"Volunteers / Students", value: staff.filter(s=>s.isTrainee).length,                            color:"#d97706" },
          { label:"Active",                value: staff.filter(s=>s.isActive).length,                             color:"#7c3aed" },
        ].map((s,i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:600, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["ALL","All staff"],["ACTIVE","Active"],["INACTIVE","Inactive"],["TRAINEE","Volunteers & Students"]].map(([val,label]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding:"6px 14px", borderRadius:8, border:"1px solid", borderColor:filter===val?"#1a8c6e":"#d6e8e0", background:filter===val?"#e6f4ef":"white", color:filter===val?"#1a8c6e":"#4a6359", fontSize:12.5, fontWeight:500, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Staff table */}
      <div style={{ background:"white", borderRadius:14, border:"1px solid #d6e8e0", overflow:"visible" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
              {["Staff Member","Role","Specialty","Contact","Status",""].map((h,i) => (
                <th key={i} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>No staff members found</td></tr>
            ) : (
              <>
                {regularStaff.map(m => renderRow(m))}
                {trainees.length > 0 && regularStaff.length > 0 && filter !== "TRAINEE" && (
                  <tr>
                    <td colSpan={6} style={{ padding:"8px 16px", background:"#fef3c7", borderBottom:"1px solid #fde68a", borderTop:"1px solid #fde68a" }}>
                      <span style={{ fontSize:11, fontWeight:600, color:"#d97706", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                        🎓 Volunteers & Students on Attachment
                      </span>
                    </td>
                  </tr>
                )}
                {trainees.map(m => renderRow(m))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating dropdown */}
      {selectedMember && (
        <div data-menu="true"
          style={{ position:"fixed", top:"50%", right:32, transform:"translateY(-50%)", background:"white", border:"1px solid #d6e8e0", borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:999, minWidth:220, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #f0f4f2", background:"#f8faf9" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#1a2724" }}>{selectedMember.fullName}</div>
            <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>{roleLabel[selectedMember.role]||selectedMember.role}</div>
          </div>
          <button onClick={() => openEdit(selectedMember)}
            style={{ display:"block", width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#4a6359", cursor:"pointer" }}>
            ✏️ Edit Details
          </button>
          <div style={{ height:1, background:"#f0f4f2" }} />
          <button onClick={() => { setResetTarget(selectedMember); setShowResetPwd(true); setOpenMenuId(null) }}
            style={{ display:"block", width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#2563a8", cursor:"pointer" }}>
            🔑 Reset Password
          </button>
          <div style={{ height:1, background:"#f0f4f2" }} />
          <button onClick={() => toggleActive(selectedMember)}
            style={{ display:"block", width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#4a6359", cursor:"pointer" }}>
            {selectedMember.isActive ? "⏸ Mark as Inactive" : "✓ Mark as Active"}
          </button>
          <div style={{ height:1, background:"#f0f4f2" }} />
          <button onClick={() => { setConfirmDeleteStaff(selectedMember); setOpenMenuId(null) }}
            style={{ display:"block", width:"100%", padding:"10px 16px", border:"none", background:"none", textAlign:"left", fontSize:13, color:"#d63f5c", cursor:"pointer" }}>
            🗑 Delete Staff Member
          </button>
          <div style={{ height:1, background:"#f0f4f2" }} />
          <button onClick={() => setOpenMenuId(null)}
            style={{ display:"block", width:"100%", padding:"8px 16px", border:"none", background:"#f8faf9", textAlign:"center", fontSize:12, color:"#8aab9e", cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      )}

      {/* Add Staff modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:480 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Add Staff Member</h2>
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <form onSubmit={saveStaff}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div><label style={lbl}>Full name</label><input required value={fullName} onChange={e=>setFullName(e.target.value)} style={inp}/></div>
                <div><label style={lbl}>Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp}/></div>
                <div><label style={lbl}>Role</label>
                  <select value={role} onChange={e=>setRole(e.target.value)} style={inp}>
                    <option value="THERAPIST">Therapist</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="FINANCE">Finance</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                {(role==="THERAPIST"||isTrainee) && (
                  <div><label style={lbl}>Specialty</label>
                    <select value={specialty} onChange={e=>setSpecialty(e.target.value)} style={inp}>
                      <option value="OT">Occupational Therapy</option>
                      <option value="SPEECH">Speech Therapy</option>
                      <option value="ABA">ABA</option>
                      <option value="SENSORY">Sensory</option>
                      <option value="PSYCH">Psychology</option>
                      <option value="PHYSIO">Physiotherapy</option>
                    </select>
                  </div>
                )}
                <div><label style={lbl}>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" style={inp}/></div>
                <div><label style={lbl}>Password</label><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters" style={inp}/></div>
              </div>
              <div style={{ background:"#f8faf9", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#1a2724", cursor:"pointer", marginBottom:isTrainee?10:0 }}>
                  <input type="checkbox" checked={isTrainee} onChange={e=>setIsTrainee(e.target.checked)} />
                  This is a volunteer or student on attachment
                </label>
                {isTrainee && (
                  <div><label style={lbl}>Institution</label>
                    <input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="e.g. KMTC Nyeri Campus" style={inp}/>
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Add Staff"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff modal */}
      {showEditForm && editMember && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:480 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Edit — {editMember.fullName}</h2>
              <button onClick={() => setShowEditForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <form onSubmit={saveEdit}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div style={{ gridColumn:"span 2" }}><label style={lbl}>Full name</label><input required value={editFullName} onChange={e=>setEditFullName(e.target.value)} style={inp}/></div>
                <div style={{ gridColumn:"span 2" }}><label style={lbl}>Email</label><input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} style={inp}/></div>
                <div><label style={lbl}>Phone</label><input value={editPhone} onChange={e=>setEditPhone(e.target.value)} placeholder="+254 7XX XXX XXX" style={inp}/></div>
                <div><label style={lbl}>Role</label>
                  <select value={editRole} onChange={e=>setEditRole(e.target.value)} style={inp}>
                    <option value="THERAPIST">Therapist</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="FINANCE">Finance</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                {(editRole==="THERAPIST"||editIsTrainee) && (
                  <div><label style={lbl}>Specialty</label>
                    <select value={editSpecialty} onChange={e=>setEditSpecialty(e.target.value)} style={inp}>
                      <option value="OT">Occupational Therapy</option>
                      <option value="SPEECH">Speech Therapy</option>
                      <option value="ABA">ABA</option>
                      <option value="SENSORY">Sensory</option>
                      <option value="PSYCH">Psychology</option>
                      <option value="PHYSIO">Physiotherapy</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ background:"#f8faf9", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#1a2724", cursor:"pointer", marginBottom:editIsTrainee?10:0 }}>
                  <input type="checkbox" checked={editIsTrainee} onChange={e=>setEditIsTrainee(e.target.checked)} />
                  Volunteer or student on attachment
                </label>
                {editIsTrainee && (
                  <div><label style={lbl}>Institution</label>
                    <input value={editInstitution} onChange={e=>setEditInstitution(e.target.value)} placeholder="e.g. KMTC Nyeri Campus" style={inp}/>
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowEditForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={savingEdit} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:savingEdit?0.7:1 }}>{savingEdit?"Saving...":"Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password modal */}
      {showResetPwd && resetTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:420 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>Reset Password</h2>
              <button onClick={() => setShowResetPwd(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <div style={{ background:"#f8faf9", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#4a6359" }}>
              Setting a new password for <strong>{resetTarget.fullName}</strong>. They will be required to change it on next login.
            </div>
            <form onSubmit={resetPassword}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>New temporary password</label>
                <input required type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Min 8 characters" style={inp}/>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowResetPwd(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={savingReset} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#2563a8", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:savingReset?0.7:1 }}>{savingReset?"Resetting...":"Reset Password"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteStaff && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:420 }}>
            <div style={{ fontSize:16, fontWeight:600, color:"#1a2724", marginBottom:10 }}>Delete staff member?</div>
            <div style={{ fontSize:13, color:"#4a6359", marginBottom:20, lineHeight:1.6 }}>
              This will permanently delete <strong>{confirmDeleteStaff.fullName}</strong>. Historical session notes will be preserved but unlinked.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setConfirmDeleteStaff(null)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
              <button onClick={() => deleteStaff(confirmDeleteStaff)} disabled={deletingStaff} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#d63f5c", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:deletingStaff?0.7:1 }}>{deletingStaff?"Deleting...":"Delete Permanently"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}