import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "../lib/api"
import Layout from "../components/Layout"

export default function ConsentForm() {
  const { id: clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<any>(null)
  const [existing, setExisting] = useState<any[]>([])
  const [guardianName, setGuardianName] = useState("")
  const [relationship, setRelationship] = useState("Mother")
  const [consentAssessment, setConsentAssessment] = useState(false)
  const [consentTherapy, setConsentTherapy] = useState(false)
  const [consentDataStorage, setConsentDataStorage] = useState(false)
  const [consentPhotoVideo, setConsentPhotoVideo] = useState(false)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    Promise.all([
      api.get(`/clients/${clientId}`),
      api.get(`/consent/${clientId}`).catch(()=>({data:[]})),
    ]).then(([c,cs]:any) => {
      setClient(c.data)
      setExisting(cs.data)
      const g = c.data.guardians?.[0]
      if (g) { setGuardianName(g.fullName); setRelationship(g.relationship || "Mother") }
    })
  }, [clientId])

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true
    draw(e)
  }
  function stopDraw() { drawing.current = false }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const point = "touches" in e ? e.touches[0] : e
    const x = point.clientX - rect.left
    const y = point.clientY - rect.top
    ctx.fillStyle = "#1a2724"
    ctx.beginPath()
    ctx.arc(x, y, 1.5, 0, Math.PI*2)
    ctx.fill()
  }
  function clearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) ctx.clearRect(0,0,canvas.width,canvas.height)
  }

  async function saveConsent(e: React.FormEvent) {
    e.preventDefault()
    if (!consentAssessment && !consentTherapy) {
      alert("Please select at least Assessment or Therapy consent")
      return
    }
    setSaving(true)
    try {
      const signatureData = canvasRef.current?.toDataURL() ?? null
      await api.post("/consent", {
        clientId, guardianName, relationship,
        consentAssessment, consentTherapy, consentDataStorage, consentPhotoVideo,
        signatureData,
      })
      navigate(`/clients/${clientId}`)
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to save consent")
    } finally { setSaving(false) }
  }

  if (!client) return <Layout title="Consent Form"><div style={{padding:40,textAlign:"center",color:"#8aab9e"}}>Loading...</div></Layout>

  const chk = { display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderRadius:10, background:"#f8faf9", marginBottom:10, cursor:"pointer" as const }

  return (
    <Layout title={`Consent Form — ${client.fullName}`} action={
      <button onClick={()=>navigate(`/clients/${clientId}`)} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>
        ← Back to Client
      </button>
    }>

      {existing.length > 0 && (
        <div style={{ background:"#e6f4ef", border:"1px solid #b6ddd1", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#1a8c6e", marginBottom:8 }}>✓ Consent on file</div>
          {existing.map((c,i)=>(
            <div key={i} style={{ fontSize:12.5, color:"#4a6359", marginBottom:4 }}>
              Signed by {c.guardianName} ({c.relationship}) on {new Date(c.signedAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}
              {" — "}
              {[c.consentAssessment&&"Assessment",c.consentTherapy&&"Therapy",c.consentDataStorage&&"Data Storage",c.consentPhotoVideo&&"Photo/Video"].filter(Boolean).join(", ")}
            </div>
          ))}
        </div>
      )}

      <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, padding:"24px 28px", maxWidth:640 }}>
        <div style={{ fontSize:15, fontWeight:600, color:"#1a2724", marginBottom:4 }}>Parent / Guardian Consent</div>
        <div style={{ fontSize:12.5, color:"#8aab9e", marginBottom:20 }}>
          Tumaini St. Thorlak Autism Centre — required before assessment or therapy begins, in accordance with Kenya's Data Protection Act, 2019.
        </div>

        <form onSubmit={saveConsent}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div>
              <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Guardian full name *</label>
              <input required value={guardianName} onChange={e=>setGuardianName(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Relationship to child *</label>
              <select value={relationship} onChange={e=>setRelationship(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                <option>Mother</option><option>Father</option><option>Guardian</option><option>Grandmother</option><option>Grandfather</option><option>Other</option>
              </select>
            </div>
          </div>

          <div style={{ fontSize:12, fontWeight:600, color:"#1a8c6e", textTransform:"uppercase", marginBottom:10 }}>I consent to:</div>

          <label style={chk}>
            <input type="checkbox" checked={consentAssessment} onChange={e=>setConsentAssessment(e.target.checked)} style={{ marginTop:2 }}/>
            <div><div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>Clinical Assessment</div>
              <div style={{ fontSize:11.5, color:"#8aab9e" }}>My child may undergo diagnostic and clinical assessments (e.g. ADOS-2, CARS-2, Vineland-3)</div></div>
          </label>
          <label style={chk}>
            <input type="checkbox" checked={consentTherapy} onChange={e=>setConsentTherapy(e.target.checked)} style={{ marginTop:2 }}/>
            <div><div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>Therapy Services</div>
              <div style={{ fontSize:11.5, color:"#8aab9e" }}>My child may receive OT, Speech, ABA, Sensory, and other therapy services</div></div>
          </label>
          <label style={chk}>
            <input type="checkbox" checked={consentDataStorage} onChange={e=>setConsentDataStorage(e.target.checked)} style={{ marginTop:2 }}/>
            <div><div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>Data Storage</div>
              <div style={{ fontSize:11.5, color:"#8aab9e" }}>My child's clinical records may be stored digitally per the Data Protection Act, 2019</div></div>
          </label>
          <label style={chk}>
            <input type="checkbox" checked={consentPhotoVideo} onChange={e=>setConsentPhotoVideo(e.target.checked)} style={{ marginTop:2 }}/>
            <div><div style={{ fontSize:13, fontWeight:500, color:"#1a2724" }}>Photo / Video (optional)</div>
              <div style={{ fontSize:11.5, color:"#8aab9e" }}>My child may be photographed/recorded for therapy documentation only — never shared externally without separate consent</div></div>
          </label>

          <div style={{ marginTop:20, marginBottom:8 }}>
            <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:6 }}>Guardian signature</label>
            <canvas
              ref={canvasRef} width={560} height={140}
              style={{ border:"1px solid #d6e8e0", borderRadius:8, touchAction:"none", width:"100%", background:"#fafbfa" }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
            />
            <button type="button" onClick={clearSignature} style={{ marginTop:6, fontSize:12, color:"#8aab9e", border:"none", background:"none", cursor:"pointer" }}>Clear signature</button>
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
            <button type="button" onClick={()=>navigate(`/clients/${clientId}`)}
              style={{ padding:"10px 18px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ padding:"10px 18px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>
              {saving?"Saving...":"Record Consent"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}