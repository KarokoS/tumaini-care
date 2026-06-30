import { useState } from "react"
import * as XLSX from "xlsx"
import api from "../lib/api"
import Layout from "../components/Layout"

interface ParsedRow {
  clientId:      string
  fullName:      string
  dob:           string
  gender:        string
  diagnosis:     string
  guardianName:  string
  relationship:  string
  phone:         string
  email:         string
  registrationDate: string
  valid:         boolean
  errors:        string[]
}

function excelDateToISO(value: any): string {
  if (!value) return ""
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value)
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
  }
  const parsed = new Date(value)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0]
  return ""
}

function normalizeGender(value: string): string {
  const v = (value || "").trim().toLowerCase()
  if (v.startsWith("m")) return "MALE"
  if (v.startsWith("f")) return "FEMALE"
  return "OTHER"
}

export default function ImportClients() {
  const [rows, setRows]           = useState<ParsedRow[]>([])
  const [fileName, setFileName]   = useState("")
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: "array", cellDates: false })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })

      const parsed: ParsedRow[] = json.map((r) => {
        const fullName     = String(r["Child Name"] ?? "").trim()
        const clientId     = String(r["Client ID"] ?? "").trim()
        const dob           = excelDateToISO(r["DOB"])
        const gender         = normalizeGender(String(r["Gender"] ?? ""))
        const diagnosis      = String(r["Diagnosis"] ?? "").trim()
        const guardianName   = String(r["Parent/Gurdian Name"] ?? r["Parent/Guardian Name"] ?? "").trim()
        const relationship    = String(r["Relationship"] ?? "Parent").trim()
        const phone           = String(r["Phone"] ?? "").trim()
        const email            = String(r["Email"] ?? "").trim()
        const registrationDate = excelDateToISO(r["Registration Date"])

        const errors: string[] = []
        if (!fullName) errors.push("Missing child name")
        if (!dob) errors.push("Invalid or missing DOB")
        if (!guardianName) errors.push("Missing guardian name")
        if (!phone) errors.push("Missing phone number")

        return {
          clientId, fullName, dob, gender, diagnosis,
          guardianName, relationship, phone, email, registrationDate,
          valid: errors.length === 0,
          errors,
        }
      })

      setRows(parsed)
    }
    reader.readAsArrayBuffer(file)
  }

  async function runImport() {
    const validRows = rows.filter(r => r.valid)
    if (validRows.length === 0) {
      alert("No valid rows to import")
      return
    }
    setImporting(true)
    try {
      const res = await api.post("/clients/bulk-import", { clients: validRows })
      setResult(res.data)
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const validCount   = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  return (
    <Layout title="Import Clients">
      <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: "24px", marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2724", marginBottom: 6 }}>Upload Excel or CSV file</div>
        <div style={{ fontSize: 12.5, color: "#8aab9e", marginBottom: 16 }}>
          Expected columns: Registration Date, Client ID, Child Name, DOB, Gender, Diagnosis, Parent/Guardian Name, Relationship, Phone, Email
        </div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          style={{ fontSize: 13, padding: "8px 0" }}
        />
        {fileName && <div style={{ fontSize: 12.5, color: "#1a8c6e", marginTop: 8 }}>📄 {fileName} — {rows.length} rows found</div>}
      </div>

      {rows.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Total Rows",   value: rows.length,   color: "#2563a8" },
              { label: "Ready to Import", value: validCount, color: "#1a8c6e" },
              { label: "Needs Attention", value: invalidCount, color: "#d63f5c" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "white", borderRadius: 14, border: "1px solid #d6e8e0", overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Preview</div>
              <button
                onClick={runImport}
                disabled={importing || validCount === 0}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: importing ? 0.7 : 1 }}
              >
                {importing ? "Importing..." : `Import ${validCount} Clients`}
              </button>
            </div>
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f8faf9", borderBottom: "1px solid #d6e8e0", position: "sticky", top: 0 }}>
                    {["Client ID", "Child Name", "DOB", "Gender", "Diagnosis", "Guardian", "Phone", "Email", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10.5, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f4f2", background: r.valid ? "white" : "#fef2f2" }}>
                      <td style={{ padding: "8px 12px" }}>{r.clientId || "—"}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 500 }}>{r.fullName || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.dob || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.gender}</td>
                      <td style={{ padding: "8px 12px" }}>{r.diagnosis || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.guardianName || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.phone || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.email || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {r.valid ? (
                          <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "#e6f4ef", color: "#1a8c6e", fontWeight: 600 }}>Ready</span>
                        ) : (
                          <span title={r.errors.join(", ")} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "#fde8ed", color: "#d63f5c", fontWeight: 600, cursor: "help" }}>
                            {r.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {result && (
        <div style={{ background: "#e6f4ef", border: "1px solid #b6ddd1", borderRadius: 14, padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a8c6e", marginBottom: 8 }}>✓ Import Complete</div>
          <div style={{ fontSize: 13, color: "#1a2724" }}>
            {result.imported} clients imported successfully.
            {result.skipped > 0 && ` ${result.skipped} skipped (duplicate Client ID).`}
          </div>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#d63f5c" }}>
              {result.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <button
            onClick={() => window.location.href = "/clients"}
            style={{ marginTop: 14, padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            View Clients
          </button>
        </div>
      )}
    </Layout>
  )
}