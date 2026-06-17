import { useEffect, useState } from "react"
import Layout from "../components/Layout"
import api from "../lib/api"

type StaffMember = {
  id: string
  fullName: string
  email: string
  role: string
  specialty?: string | null
  phone?: string | null
  isActive: boolean
}

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string; error?: string } } }).response
  return response?.data?.message ?? response?.data?.error ?? fallback
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("THERAPIST")
  const [specialty, setSpecialty] = useState("OT")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    api.get<StaffMember[]>("/staff").catch(() => ({ data: [] as StaffMember[] }))
      .then(r => setStaff(r.data))
      .finally(() => setLoading(false))
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/staff", { fullName, email, role, specialty: role === "THERAPIST" ? specialty : null, phone, password })
      setShowForm(false)
      setFullName("")
      setEmail("")
      setRole("THERAPIST")
      setSpecialty("OT")
      setPhone("")
      setPassword("")
      loadData()
    } catch (err: unknown) {
      alert(errorMessage(err, "Failed to save staff member"))
    } finally {
      setSaving(false)
    }
  }

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "#7c3aed",
    MANAGER: "#2563a8",
    THERAPIST: "#1a8c6e",
    RECEPTIONIST: "#d97706",
    FINANCE: "#d63f5c",
    PARENT: "#8aab9e",
  }
  const roleBg: Record<string, string> = {
    SUPER_ADMIN: "#f5f3ff",
    MANAGER: "#e8f0fb",
    THERAPIST: "#e6f4ef",
    RECEPTIONIST: "#fef3c7",
    FINANCE: "#fde8ed",
    PARENT: "#f0f4f2",
  }
  const filtered = staff.filter(member =>
    member.fullName.toLowerCase().includes(search.toLowerCase()) ||
    member.email.toLowerCase().includes(search.toLowerCase()) ||
    member.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Staff" action={
      <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ New Staff Member</button>
    }>
      <div style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Search staff by name, email, or role..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, width: 320, outline: "none" }} />
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #d6e8e0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8faf9", borderBottom: "1px solid #d6e8e0" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Name</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Email</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Role</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Specialty</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Phone</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#8aab9e" }}>Loading staff...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#8aab9e" }}>No staff found</td></tr>
            ) : filtered.map(member => (
              <tr key={member.id} style={{ borderBottom: "1px solid #f0f4f2" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e6f4ef", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a8c6e", fontSize: 11, fontWeight: 600 }}>{member.fullName.charAt(0)}</div>
                    <span style={{ fontWeight: 500, color: "#1a2724" }}>{member.fullName}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#4a6359" }}>{member.email}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: roleBg[member.role] ?? "#f0f4f2", color: roleColors[member.role] ?? "#4a6359", fontWeight: 600 }}>{member.role}</span>
                </td>
                <td style={{ padding: "12px 16px", color: "#4a6359" }}>{member.specialty ?? "-"}</td>
                <td style={{ padding: "12px 16px", color: "#4a6359" }}>{member.phone ?? "-"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: member.isActive ? "#e6f4ef" : "#f0f4f2", color: member.isActive ? "#1a8c6e" : "#8aab9e", fontWeight: 500 }}>{member.isActive ? "ACTIVE" : "INACTIVE"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a2724", margin: 0 }}>New Staff Member</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#8aab9e" }}>x</button>
            </div>
            <form onSubmit={saveStaff}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Full name *</label>
                  <input required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Email *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    <option value="THERAPIST">Therapist</option>
                    <option value="MANAGER">Manager</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="FINANCE">Finance</option>
                    <option value="SUPER_ADMIN">Super admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Specialty</label>
                  <select value={specialty} onChange={e => setSpecialty(e.target.value)} disabled={role !== "THERAPIST"} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box", opacity: role === "THERAPIST" ? 1 : 0.55 }}>
                    <option value="OT">Occupational Therapy</option>
                    <option value="SPEECH">Speech Therapy</option>
                    <option value="ABA">ABA</option>
                    <option value="SENSORY">Sensory</option>
                    <option value="GROUP">Group</option>
                    <option value="PSYCH">Psychology</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Temporary password *</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save Staff"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
