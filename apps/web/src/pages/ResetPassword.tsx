import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import api from "../lib/api"

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token    = params.get("token") ?? ""
  const [step, setStep]       = useState<"request"|"reset"|"done">(token ? "reset" : "request")
  const [email, setEmail]     = useState("")
  const [newPwd, setNewPwd]   = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError]     = useState("")

  async function requestReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      await api.post("/auth/forgot-password", { email })
      setMessage("Reset link sent! Check your email inbox.")
      setStep("done")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally { setLoading(false) }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd !== confirm) { setError("Passwords do not match"); return }
    if (newPwd.length < 8)  { setError("Password must be at least 8 characters"); return }
    setLoading(true); setError("")
    try {
      await api.post("/auth/reset-password", { token, newPassword: newPwd })
      setMessage("Password reset successfully! You can now log in.")
      setStep("done")
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Invalid or expired link.")
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#e6f4ef 0%,#f4f7f5 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <img src="/logo.png" alt="Tumaini" style={{ width:72, height:72, objectFit:"contain", marginBottom:12 }} />
          <h1 style={{ fontSize:20, fontWeight:600, color:"#1a2724", margin:0 }}>
            {step === "request" ? "Forgot Password" : step === "reset" ? "Set New Password" : "Done!"}
          </h1>
        </div>

        <div style={{ background:"white", borderRadius:16, padding:28, border:"1px solid #d6e8e0" }}>
          {error && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:16 }}>
              {error}
            </div>
          )}

          {step === "done" ? (
            <div style={{ textAlign:"center", padding:"10px 0" }}>
              <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:14, color:"#1a8c6e", fontWeight:500, marginBottom:16 }}>{message}</div>
              <a href="/login" style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, textDecoration:"none", display:"inline-block" }}>
                Back to Login
              </a>
            </div>
          ) : step === "request" ? (
            <form onSubmit={requestReset}>
              <p style={{ fontSize:13, color:"#4a6359", marginBottom:20, lineHeight:1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Email address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <button type="submit" disabled={loading} style={{ width:"100%", padding:"10px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:14, fontWeight:500, cursor:"pointer", opacity:loading?0.7:1, marginBottom:12 }}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <a href="/login" style={{ display:"block", textAlign:"center", fontSize:13, color:"#8aab9e", textDecoration:"none" }}>Back to login</a>
            </form>
          ) : (
            <form onSubmit={resetPassword}>
              <p style={{ fontSize:13, color:"#4a6359", marginBottom:20, lineHeight:1.6 }}>
                Enter your new password below.
              </p>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>New password</label>
                <input required type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 8 characters" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Confirm password</label>
                <input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
              </div>
              <button type="submit" disabled={loading} style={{ width:"100%", padding:"10px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:14, fontWeight:500, cursor:"pointer", opacity:loading?0.7:1 }}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}