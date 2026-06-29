import { useState } from "react"
import * as XLSX from "xlsx"
import api from "../lib/api"
import Layout from "../components/Layout"

const REQUIRED_COLS = ["Child Name", "DOB", "Gender"]

const TEMPLATE_HEADERS = [
  "No.",
  "Registration Date",
  "Client ID",
  "Child Name",
  "DOB",
  "Gender",
  "Diagnosis",
  "Co-occurring Conditions",
  "Allergies",
  "Parent/Guardian Name",
  "Relationship",
  "Phone",
  "Email",
  "School Name",
  "Referral Source",
  "Notes",
]

function parseDate(val: any): string | null {
  if (!val) return null
  // Excel serial date
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) return `${date.y}-${String(date.m).padStart(2,"0")}-${String(date.d).padStart(2,"0")}`
  }
  // String date
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  return null
}

function normalizeGender(val: any): string {
  const v = String(val ?? "").toLowerCase().trim()
  if (v.startsWith("m")) return "Male"
  if (v.startsWith("f")) return "Female"
  return "Other"
}

export default function Import() {
  const [rows, setRows]           = useState<any[]>([])
  const [errors, setErrors]       = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [done, setDone]           = useState(0)
  const [failed, setFailed]       = useState<string[]>([])
  const [step, setStep]           = useState<"upload"|"preview"|"done">("upload")

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data   = new Uint8Array(evt.target!.result as ArrayBuffer)
      const wb     = XLSX.read(data, { type: "array" })
      const ws     = wb.Sheets[wb.SheetNames[0]]
      const json   = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[]

      const errs: string[] = []
      const parsed = json.map((row, i) => {
        const rowNum = i + 2 // account for header row
        const name   = row["Child Name"] || row["child name"] || row["Name"] || row["name"] || ""
        const dob    = parseDate(row["DOB"] || row["dob"] || row["Date of Birth"] || row["date of birth"])
        const gender = normalizeGender(row["Gender"] || row["gender"] || "")

        if (!name) errs.push(`Row ${rowNum}: Missing Child Name`)
        if (!dob)  errs.push(`Row ${rowNum}: Invalid or missing DOB for "${name}"`)

        return {
          _rowNum:        rowNum,
          _valid:         !!name && !!dob,
          fullName:       name,
          dob,
          gender,
          diagnosis:      row["Diagnosis"]               || row["diagnosis"]               || null,
          coOccurring:    row["Co-occurring Conditions"] || row["co-occurring conditions"] || null,
          allergies:      row["Allergies"]               || row["allergies"]               || null,
          schoolName:     row["School Name"]             || row["school name"]             || null,
          referralSrc:    row["Referral Source"]         || row["referral source"]         || null,
          status:         "ACTIVE",
          // Guardian info (stored separately)
          guardianName:   row["Parent/Guardian Name"]    || row["parent/guardian name"]    || null,
          relationship:   row["Relationship"]            || row["relationship"]            || "Parent",
          phone:          row["Phone"]                   || row["phone"]                   || null,
          email:          row["Email"]                   || row["email"]                   || null,
          notes:          row["Notes"]                   || row["notes"]                   || null,
          registrationDate: parseDate(row["Registration Date"] || row["registration date"]) || null,
        }
      })

      setErrors(errs)
      setRows(parsed)
      setStep("preview")
    }
    reader.readAsArrayBuffer(file)
  }

  async function runImport() {
    setImporting(true)
    setProgress(0)
    const failedList: string[] = []
    let count = 0

    for (const row of rows) {
      if (!row._valid) { failedList.push(`Row ${row._rowNum}: skipped (invalid data)`); count++; continue }
      try {
        await api.post("/clients", {
          fullName:    row.fullName,
          dob:         row.dob,
          gender:      row.gender,
          diagnosis:   row.diagnosis,
          coOccurring: row.coOccurring,
          allergies:   row.allergies,
          schoolName:  row.schoolName,
          referralSrc: row.referralSrc,
          status:      row.status,
          guardians: row.guardianName ? [{
            fullName:     row.guardianName,
            relationship: row.relationship || "Parent",
            phone:        row.phone || "",
            email:        row.email || null,
            isPrimary:    true,
          }] : [],
        })
      } catch (err: any) {
        failedList.push(`Row ${row._rowNum} (${row.fullName}): ${err.response?.data?.message ?? "Failed"}`)
      }
      count++
      setProgress(Math.round((count / rows.length) * 100))
    }

    setFailed(failedList)
    setDone(rows.length - failedList.length)
    setStep("done")
    setImporting(false)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Clients")
    XLSX.writeFile(wb, "tumaini-client-import-template.xlsx")
  }

  const validRows   = rows.filter(r => r._valid)
  const invalidRows = rows.filter(r => !r._valid)

  return (
    <Layout title="Import Clients">
      {step === "upload" && (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a2724", marginBottom: 8 }}>Import Clients from Excel</div>
            <div style={{ fontSize: 13, color: "#8aab9e", marginBottom: 24, lineHeight: 1.6 }}>
              Upload an Excel (.xlsx) or CSV file with your client list.<br />
              Column headers must match your spreadsheet.
            </div>
            <label style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 16 }}>
              Choose File
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
            </label>
            <div style={{ fontSize: 12, color: "#8aab9e" }}>Supported: .xlsx, .xls, .csv</div>
          </div>

          <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724", marginBottom: 12 }}>Expected columns</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {TEMPLATE_HEADERS.map((h, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "#4a6359", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: i < 3 ? "#d63f5c" : "#8aab9e", fontSize: 10 }}>●</span>
                  {h} {i < 3 && <span style={{ fontSize: 10, color: "#d63f5c" }}>required</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f4f2" }}>
              <button
                onClick={downloadTemplate}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 12.5, cursor: "pointer", color: "#1a8c6e", fontWeight: 500 }}
              >
                ⬇ Download blank template
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Total rows",     value: rows.length,        color: "#1a2724" },
              { label: "Ready to import", value: validRows.length,  color: "#1a8c6e" },
              { label: "Issues found",   value: invalidRows.length, color: invalidRows.length > 0 ? "#d63f5c" : "#8aab9e" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{ background: "#fde8ed", border: "1px solid #f5b8c4", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#d63f5c", marginBottom: 8 }}>⚠ Issues found — these rows will be skipped</div>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 12.5, color: "#d63f5c", marginBottom: 4 }}>{e}</div>)}
            </div>
          )}

          {/* Preview table */}
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #d6e8e0", overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #d6e8e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Preview — first 10 rows</div>
              <button onClick={() => setStep("upload")} style={{ fontSize: 12, color: "#4a6359", border: "1px solid #d6e8e0", background: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>
                ← Change file
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f8faf9", borderBottom: "1px solid #d6e8e0" }}>
                    {["", "Name", "DOB", "Gender", "Diagnosis", "Guardian", "Phone"].map((h, i) => (
                      <th key={i} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#8aab9e", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f4f2", background: row._valid ? "white" : "#fff8f8" }}>
                      <td style={{ padding: "8px 14px" }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 20, background: row._valid ? "#e6f4ef" : "#fde8ed", color: row._valid ? "#1a8c6e" : "#d63f5c", fontWeight: 600 }}>
                          {row._valid ? "✓" : "✗"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 14px", fontWeight: 500, color: "#1a2724" }}>{row.fullName || "—"}</td>
                      <td style={{ padding: "8px 14px", color: "#4a6359" }}>{row.dob || "—"}</td>
                      <td style={{ padding: "8px 14px", color: "#4a6359" }}>{row.gender}</td>
                      <td style={{ padding: "8px 14px", color: "#4a6359" }}>{row.diagnosis || "—"}</td>
                      <td style={{ padding: "8px 14px", color: "#4a6359" }}>{row.guardianName || "—"}</td>
                      <td style={{ padding: "8px 14px", color: "#4a6359" }}>{row.phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          {importing ? (
            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 12, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724", marginBottom: 12 }}>Importing... {progress}%</div>
              <div style={{ height: 8, background: "#f0f4f2", borderRadius: 20, overflow: "hidden", maxWidth: 400, margin: "0 auto" }}>
                <div style={{ height: "100%", width: progress + "%", background: "#1a8c6e", borderRadius: 20, transition: "width 0.3s" }} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("upload")} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>
                Cancel
              </button>
              <button
                onClick={runImport}
                disabled={validRows.length === 0}
                style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: validRows.length === 0 ? "#8aab9e" : "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: validRows.length === 0 ? "not-allowed" : "pointer" }}
              >
                Import {validRows.length} clients
              </button>
            </div>
          )}
        </div>
      )}

      {step === "done" && (
        <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
          <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{failed.length === 0 ? "✅" : "⚠️"}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1a2724", marginBottom: 8 }}>
              {failed.length === 0 ? "Import complete!" : "Import finished with some issues"}
            </div>
            <div style={{ fontSize: 13.5, color: "#4a6359", marginBottom: 24 }}>
              <strong style={{ color: "#1a8c6e" }}>{done} clients</strong> imported successfully
              {failed.length > 0 && <>, <strong style={{ color: "#d63f5c" }}>{failed.length} failed</strong></>}
            </div>
            {failed.length > 0 && (
              <div style={{ background: "#fde8ed", borderRadius: 10, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
                {failed.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#d63f5c", marginBottom: 4 }}>{f}</div>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setStep("upload"); setRows([]); setErrors([]); setFailed([]); setDone(0) }}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d6e8e0", background: "white", fontSize: 13, cursor: "pointer", color: "#4a6359" }}>
                Import more
              </button>
              <button onClick={() => window.location.href = "/clients"}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1a8c6e", color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                View clients
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}