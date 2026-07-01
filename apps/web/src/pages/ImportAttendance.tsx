import { useState } from "react"
import * as XLSX from "xlsx"
import api from "../lib/api"
import Layout from "../components/Layout"

interface ParsedRow {
  childName:      string
  sessionType:    string
  therapistName:  string
  date:           string
  startTime:      string
  endTime:        string
  status:         string
  absenceReason:  string
  completed:      boolean
  mappedStatus:   string
  valid:          boolean
  errors:         string[]
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

function excelTimeToHHMM(value: any): string {
  if (!value && value !== 0) return "09:00"
  // Excel stores time as decimal fraction of a day
  if (typeof value === "number" && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60)
    const hours   = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }
  // String time like "9:05" or "14:00"
  const str = String(value).trim()
  const match = str.match(/^(\d{1,2}):(\d{2})/)
  if (match) {
    return `${String(parseInt(match[1])).padStart(2, "0")}:${match[2]}`
  }
  return "09:00"
}

function mapStatus(status: string, completed: boolean, reason: string): string {
  const s = (status || "").trim().toLowerCase()
  const r = (reason || "").trim().toLowerCase()
  if (s === "present") {
    return completed ? "COMPLETED" : "IN_SESSION"
  }
  if (s === "absent") {
    if (r.includes("cancel")) return "CANCELLED"
    return "NO_SHOW"
  }
  return "SCHEDULED"
}

function normalizeTherapyType(value: string): string {
  const v = (value || "").trim().toUpperCase()
  const map: Record<string,string> = {
    "OT": "OT", "OCCUPATIONAL THERAPY": "OT", "OCCUPATIONAL": "OT",
    "SPEECH": "SPEECH", "SPEECH THERAPY": "SPEECH",
    "ABA": "ABA", "BEHAVIOR": "ABA", "BEHAVIOUR": "ABA",
    "SENSORY": "SENSORY", "SENSORY INTEGRATION": "SENSORY",
    "GROUP": "GROUP", "GROUP THERAPY": "GROUP",
    "PSYCH": "PSYCH", "PSYCHOLOGY": "PSYCH",
    "PHYSIO": "PHYSIO", "PHYSIOTHERAPY": "PHYSIO",
  }
  return map[v] || "OT"
}

export default function ImportAttendance() {
  const [rows, setRows]           = useState<ParsedRow[]>([])
  const [fileName, setFileName]   = useState("")
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ imported: number; placeholders: number; skipped: number; errors: string[] } | null>(null)

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
        const getCol = (...names: string[]) => {
  for (const n of names) {
    const key = Object.keys(r).find(k =>
      k.toLowerCase().replace(/[\s_\-★]/g, "").includes(
        n.toLowerCase().replace(/[\s_\-★]/g, "")
      )
    )
    if (key && r[key] !== "") return r[key]
  }
  return ""
}

        const childName     = String(getCol("child_name")).trim()
        const sessionType    = String(getCol("session_type")).trim()
        const therapistName  = String(getCol("therapist_name")).trim()
        const date            = excelDateToISO(getCol("attend_date"))
        const startTime = excelTimeToHHMM(getCol("start_time", "start"))
        const endTime   = excelTimeToHHMM(getCol("end_time", "end"))
        const status             = String(getCol("status")).trim()
        const absenceReason       = String(getCol("absence_reason")).trim()
        const completedRaw         = String(getCol("session_completed")).trim().toUpperCase()
        const completed             = completedRaw === "TRUE"

        const mappedStatus = mapStatus(status, completed, absenceReason)

        const errors: string[] = []
        if (!childName) errors.push("Missing child name")
        if (!date) errors.push("Invalid or missing date")
        if (!sessionType) errors.push("Missing session type")

        return {
          childName, sessionType, therapistName, date, startTime, endTime,
          status, absenceReason, completed, mappedStatus,
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
      const res = await api.post("/appointments/bulk-import", {
        rows: validRows.map(r => ({
          childName:     r.childName,
          therapyType:   normalizeTherapyType(r.sessionType),
          therapistName: r.therapistName,
          date:          r.date,
          startTime:     r.startTime,
          status:        r.mappedStatus,
        }))
      })
      setResult(res.data)
    } catch (err: any) {
      alert(err.response?.data?.message ?? "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const validCount   = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  const statusColors: Record<string,string> = {
    COMPLETED: "#1a8c6e", CANCELLED: "#d97706", NO_SHOW: "#d63f5c",
    IN_SESSION: "#2563a8", SCHEDULED: "#8aab9e"
  }

  return (
    <Layout title="Import Attendance">
      <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: "24px", marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2724", marginBottom: 6 }}>Upload Attendance Excel or CSV file</div>
        <div style={{ fontSize: 12.5, color: "#8aab9e", marginBottom: 16, lineHeight: 1.6 }}>
          Expected columns: attend_date, child_name, session_type, therapist_name, session start_time, session end_time, status, absence_reason, session_completed
          <br />
          <strong style={{ color: "#d97706" }}>Note:</strong> children not found in the system will be created as placeholder client records you can complete later. Therapists not found will be left unassigned.
        </div>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ fontSize: 13, padding: "8px 0" }} />
        {fileName && <div style={{ fontSize: 12.5, color: "#1a8c6e", marginTop: 8 }}>📄 {fileName} — {rows.length} rows found</div>}
      </div>

      {rows.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Total Rows",      value: rows.length,   color: "#2563a8" },
              { label: "Ready to Import", value: validCount,    color: "#1a8c6e" },
              { label: "Needs Attention", value: invalidCount,  color: "#d63f5c" },
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
                {importing ? "Importing..." : `Import ${validCount} Records`}
              </button>
            </div>
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f8faf9", borderBottom: "1px solid #d6e8e0", position: "sticky", top: 0 }}>
                    {["Child", "Session Type", "Therapist", "Date", "Status", "Result"].map((h, i) => (
                      <th key={i} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10.5, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f4f2", background: r.valid ? "white" : "#fef2f2" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 500 }}>{r.childName || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.sessionType || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.therapistName || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{r.date || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: (statusColors[r.mappedStatus] ?? "#8aab9e") + "22", color: statusColors[r.mappedStatus] ?? "#8aab9e", fontWeight: 600 }}>
                          {r.mappedStatus}
                        </span>
                      </td>
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
          <div style={{ fontSize: 13, color: "#1a2724", lineHeight: 1.7 }}>
            {result.imported} attendance records imported.
            {result.placeholders > 0 && <><br />{result.placeholders} placeholder client records created — please review and complete their details under Clients.</>}
            {result.skipped > 0 && <><br />{result.skipped} rows skipped.</>}
          </div>
          <button
            onClick={() => window.location.href = "/clients"}
            style={{ marginTop: 14, padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Review Clients
          </button>
        </div>
      )}
    </Layout>
  )
}