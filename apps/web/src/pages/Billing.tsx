import { useEffect, useState } from "react"
import api from "../lib/api"

const NAV = [["Dashboard","/dashboard"],["Clients","/clients"],["Schedule","/schedule"],["Sessions","/sessions"],["Therapy Plans","/plans"],["Billing","/billing"],["Staff","/staff"],["Reports","/reports"]]

export default function Billing() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState([{ description:"", quantity:"1", unitPrice:"" }])

  useEffect(() => { loadData() }, [])

  function loadData() {
    Promise.all([
      api.get("/invoices").catch(() => ({ data:[] })),
      api.get("/clients").catch(() => ({ data:[] })),
    ]).then(([inv, cl]:any) => {
      setInvoices(inv.data)
      setClients(cl.data)
    }).finally(() => setLoading(false))
  }

  function addItem() {
    setItems(prev => [...prev, { description:"", quantity:"1", unitPrice:"" }])
  }

  function updateItem(index: number, field: string, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function getTotal() {
    return items.reduce((sum, item) => {
      return sum + (parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
    }, 0)
  }

  async function saveInvoice(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post("/invoices", {
        clientId,
        dueDate: dueDate || undefined,
        notes,
        lineItems: items.map(item => ({
          description: item.description,
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
        }))
      })
      setShowForm(false)
      setClientId("")
      setDueDate("")
      setNotes("")
      setItems([{ description:"", quantity:"1", unitPrice:"" }])
      loadData()
    } catch(err: any) {
      alert(err.response?.data?.message ?? "Failed to create invoice")
    } finally { setSaving(false) }
  }

  async function markPaid(invoiceId: string) {
    try {
      await api.patch("/invoices/" + invoiceId, { status:"PAID", paidAt: new Date().toISOString() })
      loadData()
    } catch(err: any) {
      alert("Failed to update invoice")
    }
  }

  const path = window.location.pathname
  const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + parseFloat(i.amountKes), 0)
  const totalOutstanding = invoices.filter(i => i.status !== "PAID").reduce((s, i) => s + parseFloat(i.amountKes), 0)

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
            <h1 style={{ fontSize:20, fontWeight:600, color:"#1a2724", margin:0 }}>Billing</h1>
            <p style={{ fontSize:13, color:"#8aab9e", margin:"4px 0 0" }}>{invoices.length} invoices total</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>+ New Invoice</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
          <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", padding:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:8 }}>Total Collected</div>
            <div style={{ fontSize:26, fontWeight:600, color:"#1a8c6e" }}>KSh {totalRevenue.toLocaleString()}</div>
          </div>
          <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", padding:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:8 }}>Outstanding</div>
            <div style={{ fontSize:26, fontWeight:600, color:"#d63f5c" }}>KSh {totalOutstanding.toLocaleString()}</div>
          </div>
          <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", padding:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:8 }}>Total Invoices</div>
            <div style={{ fontSize:26, fontWeight:600, color:"#2563a8" }}>{invoices.length}</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading...</div>
        ) : (
          <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Invoice</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Client</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Amount</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Due date</th>
                  <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Status</th>
                  <th style={{ padding:"10px 16px" }}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:"#8aab9e" }}>No invoices yet</td></tr>
                ) : invoices.map((inv, i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #f0f4f2" }}>
                    <td style={{ padding:"12px 16px", fontWeight:500, color:"#1a2724" }}>{inv.number}</td>
                    <td style={{ padding:"12px 16px", color:"#4a6359" }}>{inv.client ? inv.client.fullName : "—"}</td>
                    <td style={{ padding:"12px 16px", fontWeight:500, color:"#1a2724" }}>KSh {parseFloat(inv.amountKes).toLocaleString()}</td>
                    <td style={{ padding:"12px 16px", color:"#4a6359" }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-KE",{ day:"numeric", month:"short", year:"numeric" }) : "—"}
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:500, background:inv.status==="PAID"?"#e6f4ef":inv.status==="OVERDUE"?"#fde8ed":"#fef3c7", color:inv.status==="PAID"?"#1a8c6e":inv.status==="OVERDUE"?"#d63f5c":"#d97706" }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding:"12px 16px", textAlign:"right", display:"flex", gap:8, justifyContent:"flex-end" }}>
                      {inv.status !== "PAID" && (
                        <button onClick={() => markPaid(inv.id)} style={{ fontSize:12, color:"#1a8c6e", fontWeight:500, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", padding:"4px 10px", borderRadius:6 }}>
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:560, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:"#1a2724", margin:0 }}>New Invoice</h2>
              <button onClick={() => setShowForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>x</button>
            </div>
            <form onSubmit={saveInvoice}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Client</label>
                  <select required value={clientId} onChange={e => setClientId(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }}>
                    <option value="">Select client...</option>
                    {clients.map((c, i) => <option key={i} value={c.id}>{c.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Due date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" }} />
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <label style={{ fontSize:12, color:"#4a6359", fontWeight:500 }}>Line items</label>
                  <button type="button" onClick={addItem} style={{ fontSize:12, color:"#1a8c6e", border:"none", background:"none", cursor:"pointer", fontWeight:500 }}>+ Add item</button>
                </div>
                {items.map((item, i) => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 80px 100px 32px", gap:8, marginBottom:8 }}>
                    <input
                      placeholder="Description (e.g. OT session)"
                      value={item.description}
                      onChange={e => updateItem(i, "description", e.target.value)}
                      required
                      style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13 }}
                    />
                    <input
                      placeholder="Qty"
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(i, "quantity", e.target.value)}
                      style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13 }}
                    />
                    <input
                      placeholder="KSh"
                      type="number"
                      value={item.unitPrice}
                      onChange={e => updateItem(i, "unitPrice", e.target.value)}
                      required
                      style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13 }}
                    />
                    <button type="button" onClick={() => removeItem(i)} style={{ border:"none", background:"#fde8ed", color:"#d63f5c", borderRadius:8, cursor:"pointer", fontSize:14 }}>x</button>
                  </div>
                ))}
                <div style={{ textAlign:"right", fontSize:14, fontWeight:600, color:"#1a2724", marginTop:8 }}>
                  Total: KSh {getTotal().toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box", resize:"vertical" }} />
              </div>

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer", opacity:saving?0.7:1 }}>{saving?"Saving...":"Create Invoice"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}