import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"
import { generateInvoicePDF, generateFinancialReportPDF } from "../lib/pdf"
import { useAuthStore } from "../stores/auth.store"

export default function Billing() {
  const { user }                                    = useAuthStore()
  const [invoices, setInvoices]                     = useState<any[]>([])
  const [clients, setClients]                       = useState<any[]>([])
  const [loading, setLoading]                       = useState(true)
  const [showForm, setShowForm]                     = useState(false)
  const [saving, setSaving]                         = useState(false)
  const [clientId, setClientId]                     = useState("")
  const [dueDate, setDueDate]                       = useState("")
  const [notes, setNotes]                           = useState("")
  const [isProBonoInvoice, setIsProBonoInvoice]     = useState(false)
  const [items, setItems]                           = useState([{ description: "", quantity: "1", unitPrice: "" }])
  const [showMpesa, setShowMpesa]                   = useState(false)
  const [mpesaInvoice, setMpesaInvoice]             = useState<any>(null)
  const [mpesaPhone, setMpesaPhone]                 = useState("")
  const [mpesaLoading, setMpesaLoading]             = useState(false)
  const [mpesaStatus, setMpesaStatus]               = useState<"idle"|"pending"|"success"|"failed">("idle")
  const [mpesaMessage, setMpesaMessage]             = useState("")
  const [filterStatus, setFilterStatus]             = useState("ALL")
  const [confirmDeleteInvoice, setConfirmDeleteInvoice] = useState<any>(null)
  const [deletingInvoice, setDeletingInvoice]       = useState(false)

  useEffect(() => { loadData() }, [])

  function loadData() {
    Promise.all([
      api.get("/invoices").catch(() => ({ data: [] })),
      api.get("/clients").catch(() => ({ data: [] })),
    ]).then(([inv, cl]: any) => {
      setInvoices(inv.data)
      setClients(cl.data)
    }).finally(() => setLoading(false))
  }

  function handleClientChange(id: string) {
    setClientId(id)
    const client = clients.find(c => c.id === id)
    if (client?.isProBono) {
      setIsProBonoInvoice(true)
      setItems([{ description: "Pro Bono Session — No charge", quantity: "1", unitPrice: "0" }])
    } else {
      setIsProBonoInvoice(false)
      setItems([{ description: "", quantity: "1", unitPrice: "" }])
    }
  }

  function addItem() { setItems(p => [...p, { description: "", quantity: "1", unitPrice: "" }]) }
  function updateItem(i: number, f: string, v: string) { setItems(p => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item)) }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)) }
  function getTotal() { return items.reduce((s, item) => s + (parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0) }

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/invoices", {
        clientId, dueDate: dueDate || undefined, notes,
        lineItems: items.map(item => ({
          description: item.description,
          quantity:    parseInt(item.quantity) || 1,
          unitPrice:   parseFloat(item.unitPrice) || 0
        }))
      })
      setShowForm(false)
      setClientId(""); setDueDate(""); setNotes(""); setIsProBonoInvoice(false)
      setItems([{ description: "", quantity: "1", unitPrice: "" }])
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to create invoice")
    } finally { setSaving(false) }
  }

  function openMpesa(inv: any) {
    setMpesaInvoice(inv)
    setMpesaPhone("")
    setMpesaStatus("idle")
    setMpesaMessage("")
    setShowMpesa(true)
  }

  async function sendStkPush(e: React.FormEvent) {
    e.preventDefault()
    setMpesaLoading(true); setMpesaStatus("idle"); setMpesaMessage("")
    try {
      const res = await api.post("/mpesa/stkpush", { invoiceId: mpesaInvoice.id, phone: mpesaPhone })
      setMpesaStatus("pending")
      setMpesaMessage("STK push sent! Ask the customer to check their phone and enter their M-Pesa PIN.")
      pollStatus(res.data.checkoutRequestId)
    } catch (err: any) {
      setMpesaStatus("failed")
      setMpesaMessage(err.response?.data?.message ?? "Failed to send STK push")
    } finally { setMpesaLoading(false) }
  }

  function pollStatus(cid: string) {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await api.get("/mpesa/status/" + cid)
        if (res.data.paid) {
          clearInterval(interval)
          setMpesaStatus("success")
          setMpesaMessage("Payment confirmed! ✓")
          loadData()
        } else if (attempts >= 6) {
          clearInterval(interval)
          setMpesaStatus("failed")
          setMpesaMessage("Payment not confirmed after 30 seconds. The customer may have cancelled.")
        }
      } catch { clearInterval(interval) }
    }, 5000)
  }

  async function markPaid(invoiceId: string) {
    try {
      await api.patch("/invoices/" + invoiceId, { status: "PAID", paidAt: new Date().toISOString() })
      setShowMpesa(false)
      loadData()
    } catch { alert("Failed to update invoice") }
  }

  async function deleteInvoice(inv: any) {
    setDeletingInvoice(true)
    try {
      await api.delete(`/invoices/${inv.id}`)
      setConfirmDeleteInvoice(null)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Failed to delete invoice")
    } finally { setDeletingInvoice(false) }
  }

  const totalRevenue     = invoices.filter(i => i.status === "PAID" && parseFloat(i.amountKes) > 0).reduce((s, i) => s + parseFloat(i.amountKes), 0)
  const totalOutstanding = invoices.filter(i => i.status !== "PAID" && parseFloat(i.amountKes) > 0).reduce((s, i) => s + parseFloat(i.amountKes), 0)
  const proBonoCount     = invoices.filter(i => parseFloat(i.amountKes) === 0 || i.client?.isProBono).length

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === "PAID")    return inv.status === "PAID" && parseFloat(inv.amountKes) > 0
    if (filterStatus === "UNPAID")  return inv.status !== "PAID" && parseFloat(inv.amountKes) > 0
    if (filterStatus === "PROBONO") return parseFloat(inv.amountKes) === 0 || inv.client?.isProBono
    return true
  })

  const selectedClient = clients.find(c => c.id === clientId)
  const canDelete      = user?.role === "SUPER_ADMIN" || user?.role === "MANAGER"

  return (
    <Layout
      title="Billing & Payments"
      action={
        <div style={{ display:"flex", gap:8 }}>
          <button
            onClick={() => generateFinancialReportPDF(invoices, "All time")}
            style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", color:"#4a6359", fontSize:13, cursor:"pointer" }}
          >
            Export PDF
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}
          >
            + New Invoice
          </button>
        </div>
      }
    >

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Total Collected",   value:"KSh "+totalRevenue.toLocaleString(),     color:"#1a8c6e", sub: invoices.filter(i=>i.status==="PAID"&&parseFloat(i.amountKes)>0).length+" paid invoices" },
          { label:"Outstanding",       value:"KSh "+totalOutstanding.toLocaleString(), color:"#d63f5c", sub: invoices.filter(i=>i.status!=="PAID"&&parseFloat(i.amountKes)>0).length+" unpaid invoices" },
          { label:"Total Invoiced",    value:"KSh "+invoices.filter(i=>parseFloat(i.amountKes)>0).reduce((s,i)=>s+parseFloat(i.amountKes),0).toLocaleString(), color:"#2563a8", sub:invoices.length+" invoices total" },
          { label:"Pro Bono Sessions", value:proBonoCount+" sessions",                 color:"#d97706", sub:"no charge rendered" },
        ].map((s, i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:16, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, right:0, width:60, height:60, borderRadius:"0 16px 0 100%", background:s.color, opacity:0.06 }} />
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:600, color:s.color, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:11.5, color:"#8aab9e" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[["ALL","All"],["PAID","Paid"],["UNPAID","Unpaid"],["PROBONO","Pro Bono 🤝"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            style={{ padding:"6px 14px", borderRadius:8, border:"1px solid", borderColor:filterStatus===val?"#1a8c6e":"#d6e8e0", background:filterStatus===val?"#e6f4ef":"white", color:filterStatus===val?"#1a8c6e":"#4a6359", fontSize:12.5, fontWeight:500, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Invoices table */}
      <div style={{ background:"white", borderRadius:14, border:"1px solid #d6e8e0", overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
              {["#","Client","Amount","Method","Date","Status",""].map((h, i) => (
                <th key={i} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>Loading...</td></tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>No invoices found</td></tr>
            ) : filteredInvoices.map((inv, i) => {
              const isProBono = parseFloat(inv.amountKes) === 0 || inv.client?.isProBono
              return (
                <tr key={i} style={{ borderBottom:"1px solid #f0f4f2", background:isProBono?"#fffbeb":"white" }}>
                  <td style={{ padding:"12px 16px", fontWeight:500, color:"#1a2724" }}>
                    {inv.number}
                    {isProBono && <span style={{ fontSize:10, marginLeft:6, padding:"1px 6px", borderRadius:20, background:"#fef3c7", color:"#d97706", fontWeight:600 }}>Pro Bono</span>}
                  </td>
                  <td style={{ padding:"12px 16px", color:"#4a6359" }}>{inv.client?.fullName ?? "—"}</td>
                  <td style={{ padding:"12px 16px", fontWeight:500, color:isProBono?"#d97706":"#1a2724" }}>
                    {isProBono ? "No charge" : "KSh "+parseFloat(inv.amountKes).toLocaleString()}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ fontSize:11.5, padding:"2px 8px", borderRadius:20, background:"#f0f4f2", color:"#4a6359", fontWeight:500 }}>
                      {inv.mpesaRef ? "M-Pesa" : isProBono ? "Pro Bono" : inv.status==="PAID" ? "Manual" : "—"}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#4a6359", fontSize:12 }}>
                    {inv.paidAt
                      ? new Date(inv.paidAt).toLocaleDateString("en-KE",{ day:"numeric", month:"short" })
                      : inv.dueDate
                      ? "Due "+new Date(inv.dueDate).toLocaleDateString("en-KE",{ day:"numeric", month:"short" })
                      : "—"}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:500,
                      background: isProBono?"#fef3c7":inv.status==="PAID"?"#e6f4ef":inv.status==="OVERDUE"?"#fde8ed":"#fef3c7",
                      color:      isProBono?"#d97706":inv.status==="PAID"?"#1a8c6e":inv.status==="OVERDUE"?"#d63f5c":"#d97706"
                    }}>
                      {isProBono && inv.status!=="PAID" ? "PRO BONO" : inv.status}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                      {inv.status === "PAID" || isProBono ? (
                        <button onClick={() => generateInvoicePDF(inv)}
                          style={{ fontSize:12, color:"#1a8c6e", fontWeight:500, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", padding:"4px 10px", borderRadius:6 }}>
                          Receipt PDF
                        </button>
                      ) : (
                        <button onClick={() => openMpesa(inv)}
                          style={{ fontSize:12, color:"#1a8c6e", fontWeight:500, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", padding:"4px 10px", borderRadius:6 }}>
                          Pay via M-Pesa
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setConfirmDeleteInvoice(inv)}
                          style={{ fontSize:12, color:"#d63f5c", border:"1px solid #fde8ed", background:"#fde8ed", cursor:"pointer", padding:"4px 10px", borderRadius:6 }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New Invoice modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:560, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>New Invoice</h2>
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <form onSubmit={saveInvoice}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Client</label>
                  <select required value={clientId} onChange={e => handleClientChange(e.target.value)}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="">Select client...</option>
                    {clients.map((c, i) => (
                      <option key={i} value={c.id}>{c.fullName}{c.isProBono?" 🤝 Pro Bono":""}</option>
                    ))}
                  </select>
                  {selectedClient?.isProBono && (
                    <div style={{ marginTop:8, padding:"8px 12px", borderRadius:8, background:"#fef3c7", border:"1px solid #fbbf24", fontSize:12.5, color:"#92400e" }}>
                      🤝 This is a pro bono client. Invoice will be set to KSh 0 — no payment required.
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Due date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
                <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:4 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#1a2724", cursor:"pointer" }}>
                    <input type="checkbox" checked={isProBonoInvoice}
                      onChange={e => {
                        setIsProBonoInvoice(e.target.checked)
                        if (e.target.checked) {
                          setItems([{ description:"Pro Bono Session — No charge", quantity:"1", unitPrice:"0" }])
                        } else {
                          setItems([{ description:"", quantity:"1", unitPrice:"" }])
                        }
                      }} />
                    Mark as Pro Bono (KSh 0)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <label style={{ fontSize:12, color:"#4a6359", fontWeight:500 }}>Line items</label>
                  {!isProBonoInvoice && (
                    <button type="button" onClick={addItem} style={{ fontSize:12, color:"#1a8c6e", border:"none", background:"none", cursor:"pointer", fontWeight:500 }}>+ Add item</button>
                  )}
                </div>
                {items.map((item, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 100px 32px", gap:8, marginBottom:8 }}>
                    <input placeholder="Description" value={item.description} onChange={e => updateItem(i,"description",e.target.value)} required readOnly={isProBonoInvoice}
                      style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, background:isProBonoInvoice?"#f8faf9":"white" }} />
                    <input placeholder="Qty" type="number" value={item.quantity} onChange={e => updateItem(i,"quantity",e.target.value)} readOnly={isProBonoInvoice}
                      style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, background:isProBonoInvoice?"#f8faf9":"white" }} />
                    <input placeholder="KSh" type="number" value={item.unitPrice} onChange={e => updateItem(i,"unitPrice",e.target.value)} required readOnly={isProBonoInvoice}
                      style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, background:isProBonoInvoice?"#f8faf9":"white" }} />
                    {!isProBonoInvoice && (
                      <button type="button" onClick={() => removeItem(i)} style={{ border:"none", background:"#fde8ed", color:"#d63f5c", borderRadius:8, cursor:"pointer", fontSize:14 }}>×</button>
                    )}
                  </div>
                ))}
                <div style={{ textAlign:"right", fontSize:14, fontWeight:600, color:isProBonoInvoice?"#d97706":"#1a2724", marginTop:8 }}>
                  Total: {isProBonoInvoice ? "KSh 0 (Pro Bono)" : "KSh "+getTotal().toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding:"9px 16px", borderRadius:8, border:"none", background:isProBonoInvoice?"#d97706":"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>
                  {saving ? "Saving..." : isProBonoInvoice ? "Record Pro Bono Session" : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* M-Pesa modal */}
      {showMpesa && mpesaInvoice && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>M-Pesa Payment</h2>
              <button onClick={() => setShowMpesa(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <div style={{ background:"#f8faf9", borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
              {[
                ["Invoice", mpesaInvoice.number],
                ["Client",  mpesaInvoice.client?.fullName],
                ["Amount",  "KSh "+parseFloat(mpesaInvoice.amountKes).toLocaleString()],
              ].map(([label, value], i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize: i===2?15:13, marginBottom: i===2?0:4 }}>
                  <span style={{ color:"#4a6359" }}>{label}</span>
                  <span style={{ fontWeight: i===2?700:i===0?600:500, color: i===2?"#1a8c6e":"#1a2724" }}>{value}</span>
                </div>
              ))}
            </div>
            {mpesaStatus !== "success" && (
              <form onSubmit={sendStkPush}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:6 }}>Customer phone number</label>
                <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                  <input required value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} placeholder="07XX XXX XXX"
                    style={{ flex:1, padding:"10px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13 }} />
                  <button type="submit" disabled={mpesaLoading || mpesaStatus==="pending"}
                    style={{ padding:"10px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:mpesaLoading?0.7:1, whiteSpace:"nowrap" }}>
                    {mpesaLoading ? "Sending..." : "Send STK Push"}
                  </button>
                </div>
              </form>
            )}
            {mpesaMessage && (
              <div style={{ padding:"12px 16px", borderRadius:10, marginBottom:16, fontSize:13,
                background: mpesaStatus==="success"?"#e6f4ef":mpesaStatus==="failed"?"#fde8ed":"#fef3c7",
                color:      mpesaStatus==="success"?"#1a8c6e":mpesaStatus==="failed"?"#d63f5c":"#d97706",
                border:`1px solid ${mpesaStatus==="success"?"#b6ddd1":mpesaStatus==="failed"?"#f5b8c4":"#fde68a"}`
              }}>
                {mpesaStatus==="pending"&&<span style={{ marginRight:8 }}>⏳</span>}
                {mpesaStatus==="success"&&<span style={{ marginRight:8 }}>✓</span>}
                {mpesaStatus==="failed" &&<span style={{ marginRight:8 }}>✗</span>}
                {mpesaMessage}
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:"#d6e8e0" }} />
              <span style={{ fontSize:11, color:"#8aab9e", fontWeight:500 }}>OR PAY MANUALLY</span>
              <div style={{ flex:1, height:1, background:"#d6e8e0" }} />
            </div>
            <div style={{ background:"#e6f4ef", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#1a8c6e", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>M-Pesa Paybill Instructions</div>
              {[
                ["1. Go to M-Pesa",    "Select Lipa na M-Pesa"],
                ["2. Select Pay Bill", "Enter Business No."],
                ["3. Business Number", "880100"],
                ["4. Account Number",  "411511"],
                ["5. Amount",          "KSh "+parseFloat(mpesaInvoice.amountKes).toLocaleString()],
                ["6. Enter PIN",       "Confirm and send"],
              ].map(([step, detail], i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:6 }}>
                  <span style={{ color:"#4a6359" }}>{step}</span>
                  <span style={{ fontWeight:i===2||i===3||i===4?700:500, color:"#1a2724" }}>{detail}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {mpesaStatus !== "success" && (
                <button onClick={() => markPaid(mpesaInvoice.id)}
                  style={{ flex:1, padding:"9px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12.5, cursor:"pointer", color:"#4a6359" }}>
                  Mark as paid manually
                </button>
              )}
              <button onClick={() => setShowMpesa(false)}
                style={{ flex:1, padding:"9px", borderRadius:8, border:"none", background:mpesaStatus==="success"?"#1a8c6e":"#f0f4f2", color:mpesaStatus==="success"?"white":"#4a6359", fontSize:12.5, fontWeight:500, cursor:"pointer" }}>
                {mpesaStatus === "success" ? "Done" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete invoice confirmation */}
      {confirmDeleteInvoice && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:420 }}>
            <div style={{ fontSize:16, fontWeight:600, color:"#1a2724", marginBottom:10 }}>Delete invoice?</div>
            <div style={{ fontSize:13, color:"#4a6359", marginBottom:20, lineHeight:1.6 }}>
              This will permanently delete invoice <strong>{confirmDeleteInvoice.number}</strong> for <strong>{confirmDeleteInvoice.client?.fullName}</strong>. This cannot be undone.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setConfirmDeleteInvoice(null)}
                style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
              <button onClick={() => deleteInvoice(confirmDeleteInvoice)} disabled={deletingInvoice}
                style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#d63f5c", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:deletingInvoice?0.7:1 }}>
                {deletingInvoice ? "Deleting..." : "Delete Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}