import { useState } from "react"
import api from "../lib/api"
import { useAuthStore } from "../stores/auth.store"

export default function ChangePassword() {
  const { logout } = useAuthStore()
  const [current, setCurrent]   = useState("")
  const [newPwd, setNewPwd]     = useState("")
  const [confirm, setConfirm]   = useState("")
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")
  const [success, setSuccess]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd !== confirm) { setError("New passwords do not match"); return }
    if (newPwd.length < 8)  { setError("Password must be at least 8 characters"); return }
    setSaving(true); setError("")
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: newPwd,
      })
      setSuccess(true)
      setTimeout(() => { logout() }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to change password")
    } finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#e6f4ef 0%,#f4f7f5 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <img src="/logo.png" alt="Tumaini" style={{ width:72, height:72, objectFit:"contain", marginBottom:12 }} />
          <h1 style={{ fontSize:20, fontWeight:600, color:"#1a2724", margin:0 }}>Set Your Password</h1>
          <p style={{ fontSize:13, color:"#8aab9e", marginTop:6 }}>Please set a personal password before continuing</p>
        </div>

        <div style={{ background:"white", borderRadius:16, padding:28, border:"1px solid #d6e8e0" }}>
          {success ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:14, fontWeight:500, color:"#1a8c6e" }}>Password changed successfully!</div>
              <div style={{ fontSize:12.5, color:"#8aab9e", marginTop:6 }}>Redirecting to login...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:16 }}>
                  {error}
                </div>
              )}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Current password</label>
                <input required type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Your temporary password" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>New password</label>
                <input required type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 8 characters" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Confirm new password</label>
                <input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <button type="submit" disabled={saving} style={{ width:"100%", padding:"10px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:14, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>
                {saving ? "Saving..." : "Set Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}