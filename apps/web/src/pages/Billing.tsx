import { useEffect, useState } from "react"
import Layout from "../components/Layout"
import api from "../lib/api"

type Client = {
  id: string
  fullName: string
}

type InvoiceItem = {
  description: string
  quantity: string
  unitPrice: string
}

type Invoice = {
  id: string
  number: string
  amountKes: string | number
  status: string
  dueDate?: string | null
  issuedAt?: string | null
  client?: Client
  lineItems?: Array<{ description: string; quantity: number; unitPrice: string | number }>
}

type ApiList<T> = { data: T[] }

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string; error?: string } } }).response
  return response?.data?.message ?? response?.data?.error ?? fallback
}

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: "1", unitPrice: "" }])

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      api.get<Invoice[]>("/invoices").catch((): ApiList<Invoice> => ({ data: [] })),
      api.get<Client[]>("/clients").catch((): ApiList<Client> => ({ data: [] })),
    ]).then(([inv, cl]) => {
      setInvoices(inv.data)
      setClients(cl.data)
    }).finally(() => setLoading(false))
  }

  function addItem() {
    setItems(prev => [...prev, { description: "", quantity: "1", unitPrice: "" }])
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))
  }

  function getTotal() {
    return items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0)
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
        })),
      })
      setShowForm(false)
      setClientId("")
      setDueDate("")
      setNotes("")
      setItems([{ description: "", quantity: "1", unitPrice: "" }])
      loadData()
    } catch (err: unknown) {
      alert(errorMessage(err, "Failed to create invoice"))
    } finally {
      setSaving(false)
    }
  }

  async function markPaid(invoiceId: string) {
    try {
      await api.patch("/invoices/" + invoiceId, { status: "PAID", paidAt: new Date().toISOString() })
      loadData()
    } catch (err: unknown) {
      alert(errorMessage(err, "Failed to update invoice"))
    }
  }

  const totalRevenue = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + Number(i.amountKes), 0)
  const totalOutstanding = invoices.filter(i => i.status !== "PAID").reduce((s, i) => s + Number(i.amountKes), 0)

  return (
    <Layout title="Billing" action={
      <button onClick={() => setShowForm(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ New Invoice</button>
    }>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
        <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#8aab9e", textTransform: "uppercase", fontWeight: 600 }}>Paid Revenue</div>
          <div style={{ fontSize: 24, color: "#1a8c6e", fontWeight: 600, marginTop: 4 }}>KES {totalRevenue.toLocaleString("en-KE")}</div>
        </div>
        <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#8aab9e", textTransform: "uppercase", fontWeight: 600 }}>Outstanding</div>
          <div style={{ fontSize: 24, color: "#d97706", fontWeight: 600, marginTop: 4 }}>KES {totalOutstanding.toLocaleString("en-KE")}</div>
        </div>
        <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#8aab9e", textTransform: "uppercase", fontWeight: 600 }}>Invoices</div>
          <div style={{ fontSize: 24, color: "#2563a8", fontWeight: 600, marginTop: 4 }}>{invoices.length}</div>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #d6e8e0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8faf9", borderBottom: "1px solid #d6e8e0" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Invoice</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Client</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Amount</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Due</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>Status</th>
              <th style={{ padding: "10px 16px" }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#8aab9e" }}>Loading invoices...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#8aab9e" }}>No invoices yet</td></tr>
            ) : invoices.map(invoice => (
              <tr key={invoice.id} style={{ borderBottom: "1px solid #f0f4f2" }}>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1a2724" }}>{invoice.number}</td>
                <td style={{ padding: "12px 16px", color: "#4a6359" }}>{invoice.client?.fullName ?? "Unknown client"}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", color: "#4a6359" }}>KES {Number(invoice.amountKes).toLocaleString("en-KE")}</td>
                <td style={{ padding: "12px 16px", color: "#4a6359" }}>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: invoice.status === "PAID" ? "#e6f4ef" : "#fef3c7", color: invoice.status === "PAID" ? "#1a8c6e" : "#d97706", fontWeight: 500 }}>{invoice.status}</span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  {invoice.status !== "PAID" && (
                    <button onClick={() => markPaid(invoice.id)} style={{ border: "none", background: "none", color: "#1a8c6e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Mark paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a2724", margin: 0 }}>New Invoice</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#8aab9e" }}>x</button>
            </div>
            <form onSubmit={saveInvoice}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Client *</label>
                  <select required value={clientId} onChange={e => setClientId(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    <option value="">Select client...</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Due date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: "#1a8c6e", textTransform: "uppercase", marginBottom: 10 }}>Line items</div>
              {items.map((item, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 90px 120px 32px", gap: 8, marginBottom: 8 }}>
                  <input required placeholder="Description" value={item.description} onChange={e => updateItem(index, "description", e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13 }} />
                  <input required type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(index, "quantity", e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13 }} />
                  <input required type="number" min="0" placeholder="KES" value={item.unitPrice} onChange={e => updateItem(index, "unitPrice", e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13 }} />
                  <button type="button" onClick={() => removeItem(index)} style={{ border: "1px solid #d6e8e0", background: "white", borderRadius: 8, cursor: "pointer", color: "#8aab9e" }}>x</button>
                </div>
              ))}
              <button type="button" onClick={addItem} style={{ border: "none", background: "none", color: "#1a8c6e", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>+ Add line item</button>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box", resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2724" }}>Total: KES {getTotal().toLocaleString("en-KE")}</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Create Invoice"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
