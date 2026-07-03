import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

const CATEGORIES = ["All", "Sensory", "OT", "Speech", "AAC", "ABA", "Group", "Furniture", "Admin"]

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  OK:       { bg: "#e6f4ef", color: "#1a8c6e", label: "In Stock" },
  LOW:      { bg: "#fde8ed", color: "#d63f5c", label: "Low Stock" },
  REORDER:  { bg: "#fef3c7", color: "#d97706", label: "Reorder" },
  OUT:      { bg: "#f3f4f6", color: "#6b7280", label: "Out of Stock" },
}

const LOCATION_COLORS: Record<string, string> = {
  "OT Room":      "#3b82f6",
  "Speech Room":  "#22c55e",
  "Sensory Room": "#f97316",
  "Group Room":   "#eab308",
  "Gym Room":     "#a855f7",
  "Reception":    "#ec4899",
  "Store":        "#8aab9e",
  "Physio Room":  "#0891b2",
}

// Seed data matching the prototype
const SEED_ITEMS = [
  { name: "Therapy Putty (set)",      category: "Sensory",   quantity: 2,  location: "Sensory Room", status: "LOW",  notes: "" },
  { name: "Weighted Vest (child)",    category: "OT",        quantity: 8,  location: "OT Room",      status: "OK",   notes: "" },
  { name: "PECS Picture Cards",       category: "AAC",       quantity: 15, location: "Speech Room",  status: "OK",   notes: "" },
  { name: "Trampoline (mini)",        category: "OT",        quantity: 3,  location: "Gym Room",     status: "OK",   notes: "" },
  { name: "Fidget Tools Set",         category: "Sensory",   quantity: 5,  location: "Group Room",   status: "OK",   notes: "" },
  { name: "Communication Board A3",   category: "AAC",       quantity: 6,  location: "Speech Room",  status: "OK",   notes: "" },
  { name: "Balance Board",            category: "OT",        quantity: 4,  location: "OT Room",      status: "OK",   notes: "" },
  { name: "Sand Tray (set)",          category: "Sensory",   quantity: 1,  location: "Sensory Room", status: "LOW",  notes: "" },
  { name: "Picture Exchange Cards",   category: "Speech",    quantity: 0,  location: "Speech Room",  status: "OUT",  notes: "Awaiting restock" },
  { name: "ABA Token Board",          category: "ABA",       quantity: 10, location: "Group Room",   status: "OK",   notes: "" },
]

export default function Inventory() {
  const [items, setItems]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [category, setCategory]     = useState("All")
  const [search, setSearch]         = useState("")
  const [showForm, setShowForm]     = useState(false)
  const [editItem, setEditItem]     = useState<any>(null)
  const [saving, setSaving]         = useState(false)

  // form fields
  const [name, setName]             = useState("")
  const [cat, setCat]               = useState("Sensory")
  const [quantity, setQuantity]     = useState("1")
  const [location, setLocation]     = useState("OT Room")
  const [status, setStatus]         = useState("OK")
  const [notes, setNotes]           = useState("")

  useEffect(() => { loadData() }, [])

  function loadData() {
    api.get("/inventory").catch(() => ({ data: [] }))
      .then((r: any) => {
        const data = Array.isArray(r.data) && r.data.length > 0 ? r.data : SEED_ITEMS
        setItems(data)
      })
      .finally(() => setLoading(false))
  }

  function openAdd() {
    setEditItem(null)
    setName(""); setCat("Sensory"); setQuantity("1")
    setLocation("OT Room"); setStatus("OK"); setNotes("")
    setShowForm(true)
  }

  function openEdit(item: any) {
    setEditItem(item)
    setName(item.name); setCat(item.category); setQuantity(String(item.quantity))
    setLocation(item.location); setStatus(item.status); setNotes(item.notes || "")
    setShowForm(true)
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { name, category: cat, quantity: parseInt(quantity) || 0, location, status, notes }
    try {
      if (editItem?.id) {
        await api.patch("/inventory/" + editItem.id, payload)
      } else {
        await api.post("/inventory", payload)
      }
      setShowForm(false)
      loadData()
    } catch {
      // optimistic local update if API not yet wired
      if (editItem) {
        setItems(prev => prev.map(i => i === editItem ? { ...editItem, ...payload } : i))
      } else {
        setItems(prev => [...prev, { ...payload, id: Date.now() }])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function reorder(item: any) {
    alert(`Reorder request noted for "${item.name}". In production this will trigger a procurement notification.`)
  }

  const filtered = items.filter(i => {
    const matchCat = category === "All" || i.category === category
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
                        i.location?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const lowItems  = items.filter(i => i.status === "LOW" || i.status === "REORDER")
  const outItems  = items.filter(i => i.status === "OUT")
  const okItems   = items.filter(i => i.status === "OK")

  const locationCounts: Record<string, number> = {}
  items.forEach(i => { locationCounts[i.location] = (locationCounts[i.location] || 0) + 1 })

  return (
    <Layout title="Inventory & Equipment" action={
      <button onClick={openAdd} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
        + Add Item
      </button>
    }>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Items",   value: items.length,    color: "#1a8c6e", sub: "tracked in inventory" },
          { label: "In Stock",      value: okItems.length,  color: "#2563a8", sub: "fully stocked" },
          { label: "Low / Reorder", value: lowItems.length, color: "#d97706", sub: "need attention" },
          { label: "Out of Stock",  value: outItems.length, color: "#d63f5c", sub: "unavailable now" },
        ].map((s, i) => (
          <div key={i} style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, borderRadius: "0 16px 0 100%", background: s.color, opacity: 0.06 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "#8aab9e" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 14 }}>

        {/* Main table */}
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search items or location..."
              style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, width: 220, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid", borderColor: category === c ? "#1a8c6e" : "#d6e8e0", background: category === c ? "#e6f4ef" : "white", color: category === c ? "#1a8c6e" : "#4a6359", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 14, border: "1px solid #d6e8e0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8faf9", borderBottom: "1px solid #d6e8e0" }}>
                  {["Item", "Category", "Qty", "Location", "Status", ""].map((h, i) => (
                    <th key={i} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#8aab9e" }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#8aab9e" }}>No items found</td></tr>
                ) : filtered.map((item, i) => {
                  const s = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.OK
                  const locColor = LOCATION_COLORS[item.location] ?? "#8aab9e"
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f4f2" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500, color: "#1a2724" }}>{item.name}</div>
                        {item.notes && <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>{item.notes}</div>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: "#f0f4f2", color: "#4a6359", fontWeight: 500 }}>{item.category}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: item.quantity === 0 ? "#d63f5c" : item.quantity <= 3 ? "#d97706" : "#1a2724" }}>
                          {item.quantity}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: locColor + "18", color: locColor, fontWeight: 500 }}>{item.location}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600 }}>{s.label}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {(item.status === "LOW" || item.status === "REORDER" || item.status === "OUT") && (
                            <button onClick={() => reorder(item)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "none", background: "#1a8c6e", color: "white", cursor: "pointer", fontWeight: 500 }}>Reorder</button>
                          )}
                          <button onClick={() => openEdit(item)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #d6e8e0", background: "white", color: "#4a6359", cursor: "pointer" }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Alerts */}
          {(lowItems.length > 0 || outItems.length > 0) && (
            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #d6e8e0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2724" }}>⚠ Alerts</div>
              </div>
              <div style={{ padding: "0 16px" }}>
                {[...outItems, ...lowItems].slice(0, 5).map((item, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i < Math.min(outItems.length + lowItems.length, 5) - 1 ? "1px solid #f0f4f2" : "none" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "#1a2724" }}>{item.name}</div>
                    <div style={{ fontSize: 11.5, color: item.status === "OUT" ? "#d63f5c" : "#d97706", marginTop: 2 }}>
                      {item.status === "OUT" ? "Out of stock" : `Only ${item.quantity} left`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By location */}
          <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #d6e8e0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2724" }}>By Location</div>
            </div>
            <div style={{ padding: "0 16px" }}>
              {Object.entries(locationCounts).map(([loc, count], i) => {
                const color = LOCATION_COLORS[loc] ?? "#8aab9e"
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < Object.keys(locationCounts).length - 1 ? "1px solid #f0f4f2" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: "#4a6359" }}>{loc}</span>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1a2724" }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1a2724", margin: 0 }}>{editItem ? "Edit Item" : "Add Item"}</h2>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#8aab9e" }}>×</button>
            </div>
            <form onSubmit={saveItem}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Item name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Category</label>
                  <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Quantity</label>
                  <input type="number" min="0" required value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Location</label>
                  <select value={location} onChange={e => setLocation(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    {Object.keys(LOCATION_COLORS).map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }}>
                    <option value="OK">In Stock</option>
                    <option value="LOW">Low Stock</option>
                    <option value="REORDER">Reorder</option>
                    <option value="OUT">Out of Stock</option>
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12, color: "#4a6359", display: "block", marginBottom: 4 }}>Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e8e0", fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : editItem ? "Save Changes" : "Add Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}