import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const TEAL  = [26, 140, 110]  as [number, number, number]
const DARK  = [26, 39, 36]    as [number, number, number]
const MUTED = [138, 171, 158] as [number, number, number]
const LIGHT = [240, 244, 242] as [number, number, number]

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  // Teal bar
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, 210, 18, "F")
  // Logo circle
  doc.setFillColor(255, 255, 255)
  doc.circle(14, 9, 5, "F")
  doc.setTextColor(...TEAL)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("T", 14, 9, { align: "center", baseline: "middle" })
  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Tumaini St. Thorlak Autism Centre", 22, 7.5)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text("Nanyuki, Laikipia · app.tumaini.ke", 22, 12.5)
  // Page title
  doc.setTextColor(...DARK)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(title, 14, 28)
  if (subtitle) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...MUTED)
    doc.text(subtitle, 14, 34)
  }
  return subtitle ? 40 : 34
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LIGHT)
    doc.line(14, 284, 196, 284)
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text("Tumaini St. Thorlak Autism Centre · Confidential", 14, 289)
    doc.text(`Page ${i} of ${pageCount}`, 196, 289, { align: "right" })
  }
}

// ── Session Note PDF ──
export function generateSessionNotePDF(appt: any) {
  const doc = new jsPDF()
  const note = appt.sessionNote
  const clientName = appt.client?.fullName ?? "Unknown"
  const date = new Date(appt.scheduledAt).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  let y = addHeader(doc, "Session Note", `${clientName} · ${appt.therapyType} · ${date}`)

  // Meta row
  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 16, 2, 2, "F")
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...DARK)
  doc.text("Client:", 18, y + 6)
  doc.setFont("helvetica", "normal")
  doc.text(clientName, 35, y + 6)
  doc.setFont("helvetica", "bold")
  doc.text("Therapist:", 100, y + 6)
  doc.setFont("helvetica", "normal")
  doc.text(appt.therapist?.fullName ?? "—", 120, y + 6)
  doc.setFont("helvetica", "bold")
  doc.text("Date:", 18, y + 12)
  doc.setFont("helvetica", "normal")
  doc.text(date, 35, y + 12)
  doc.setFont("helvetica", "bold")
  doc.text("Type:", 100, y + 12)
  doc.setFont("helvetica", "normal")
  doc.text(appt.therapyType, 120, y + 12)
  y += 24

  // SOAP sections
  const soapColors: Record<string, [number, number, number]> = {
    S: [37, 99, 168], O: [26, 140, 110], A: [217, 119, 6], P: [124, 58, 237]
  }
  const sections = [
    { key: "S", label: "Subjective", content: note?.subjective ?? "—" },
    { key: "O", label: "Objective",  content: note?.objective  ?? "—" },
    { key: "A", label: "Assessment", content: note?.assessment ?? "—" },
    { key: "P", label: "Plan",       content: note?.plan       ?? "—" },
  ]

  sections.forEach(s => {
    const color = soapColors[s.key]
    doc.setFillColor(...color)
    doc.rect(14, y, 3, 8, "F")
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...color)
    doc.text(`${s.key} — ${s.label}`, 20, y + 5.5)
    y += 12
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...DARK)
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(s.content, 176)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 8
    if (y > 265) { doc.addPage(); y = 20 }
  })

  addFooter(doc)
  doc.save(`session-note-${clientName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`)
}

// ── Invoice PDF ──
export function generateInvoicePDF(invoice: any) {
  const doc = new jsPDF()
  const clientName = invoice.client?.fullName ?? "Unknown"
  let y = addHeader(doc, `Invoice ${invoice.number}`, `Issued to ${clientName}`)

  // Status badge
  const isPaid = invoice.status === "PAID"
  doc.setFillColor(...(isPaid ? [230, 244, 239] : [253, 232, 237]) as [number,number,number])
  doc.roundedRect(154, y - 18, 42, 10, 2, 2, "F")
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...(isPaid ? TEAL : [214, 63, 92]) as [number,number,number])
  doc.text(isPaid ? "PAID" : "UNPAID", 175, y - 11.5, { align: "center" })

  // Bill to
  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 85, 28, 2, 2, "F")
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...MUTED)
  doc.text("BILL TO", 18, y + 6)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...DARK)
  doc.text(clientName, 18, y + 13)
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...MUTED)
  doc.text("Tumaini St. Thorlak Autism Centre", 18, y + 20)
  doc.text("Nanyuki, Kenya", 18, y + 25)

  // Invoice details
  doc.setFillColor(...LIGHT)
  doc.roundedRect(111, y, 85, 28, 2, 2, "F")
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...MUTED)
  doc.text("INVOICE DETAILS", 115, y + 6)
  const details = [
    ["Invoice #:", invoice.number],
    ["Date:", new Date(invoice.createdAt).toLocaleDateString("en-KE")],
    ["Due:", invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-KE") : "On receipt"],
  ]
  details.forEach(([label, value], i) => {
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...DARK)
    doc.text(label, 115, y + 13 + i * 6)
    doc.setFont("helvetica", "normal")
    doc.text(value, 155, y + 13 + i * 6)
  })
  y += 36

  // Line items table
  const lineItems = invoice.lineItems ?? [{ description: "Therapy Services", quantity: 1, unitPrice: invoice.amountKes }]
  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price (KSh)", "Total (KSh)"]],
    body: lineItems.map((item: any) => [
      item.description,
      item.quantity,
      parseFloat(item.unitPrice).toLocaleString(),
      (item.quantity * parseFloat(item.unitPrice)).toLocaleString(),
    ]),
    foot: [["", "", "Total", "KSh " + parseFloat(invoice.amountKes).toLocaleString()]],
    headStyles:  { fillColor: TEAL, fontSize: 9, fontStyle: "bold" },
    footStyles:  { fillColor: LIGHT, textColor: DARK, fontSize: 10, fontStyle: "bold" },
    bodyStyles:  { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    margin: { left: 14, right: 14 },
  })

  // M-Pesa payment info
  const finalY = (doc as any).lastAutoTable.finalY + 10
  if (!isPaid) {
    doc.setFillColor(230, 244, 239)
    doc.roundedRect(14, finalY, 182, 22, 3, 3, "F")
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEAL)
    doc.text("Pay via M-Pesa Paybill", 18, finalY + 7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...DARK)
    doc.text("Paybill Number: 880100   |   Account Number: 411511", 18, finalY + 13)
    doc.text(`Amount: KSh ${parseFloat(invoice.amountKes).toLocaleString()}`, 18, finalY + 19)
  }

  addFooter(doc)
  doc.save(`invoice-${invoice.number}-${clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}

// ── Financial Summary PDF ──
export function generateFinancialReportPDF(invoices: any[], period: string) {
  const doc = new jsPDF()
  let y = addHeader(doc, "Financial Summary Report", period)

  const paid        = invoices.filter(i => i.status === "PAID")
  const unpaid      = invoices.filter(i => i.status !== "PAID")
  const totalPaid   = paid.reduce((s, i) => s + parseFloat(i.amountKes), 0)
  const totalUnpaid = unpaid.reduce((s, i) => s + parseFloat(i.amountKes), 0)

  // Summary boxes
  const boxes = [
    { label: "Total Collected", value: "KSh " + totalPaid.toLocaleString(),   color: TEAL },
    { label: "Outstanding",     value: "KSh " + totalUnpaid.toLocaleString(), color: [214, 63, 92] as [number,number,number] },
    { label: "Total Invoiced",  value: "KSh " + (totalPaid + totalUnpaid).toLocaleString(), color: [37, 99, 168] as [number,number,number] },
  ]
  boxes.forEach((box, i) => {
    const x = 14 + i * 62
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, y, 58, 20, 2, 2, "F")
    doc.setFontSize(7.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...MUTED)
    doc.text(box.label.toUpperCase(), x + 4, y + 6)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...box.color)
    doc.text(box.value, x + 4, y + 14)
  })
  y += 28

  autoTable(doc, {
    startY: y,
    head: [["Invoice #", "Client", "Amount (KSh)", "Date", "Status"]],
    body: invoices.map(inv => [
      inv.number,
      inv.client?.fullName ?? "—",
      parseFloat(inv.amountKes).toLocaleString(),
      new Date(inv.createdAt).toLocaleDateString("en-KE"),
      inv.status,
    ]),
    headStyles:  { fillColor: TEAL, fontSize: 9, fontStyle: "bold" },
    bodyStyles:  { fontSize: 8.5, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    margin: { left: 14, right: 14 },
    didDrawCell: (data: any) => {
      if (data.column.index === 4 && data.section === "body") {
        const status = data.cell.raw as string
        const color = status === "PAID" ? TEAL : [214, 63, 92] as [number,number,number]
        doc.setTextColor(...color)
      }
    }
  })

  addFooter(doc)
  doc.save(`financial-report-${Date.now()}.pdf`)
}

export function generateParentSessionPDF(appt: any) {
  const doc = new jsPDF()
  const note = appt.sessionNote
  const clientName = appt.client?.fullName ?? "Your Child"
  const date = new Date(appt.scheduledAt).toLocaleDateString("en-KE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  })
  let y = addHeader(doc, "Session Summary", `${clientName} · ${date}`)

  const intro = `Dear Parent/Guardian,\n\nPlease find below a summary of today's ${appt.therapyType} session for ${clientName}. This note has been prepared by ${appt.therapist?.fullName ?? "your therapist"} to keep you informed of your child's progress.`
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...DARK)
  const introLines = doc.splitTextToSize(intro, 182)
  doc.text(introLines, 14, y)
  y += introLines.length * 5.5 + 10

  // Session details box
  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 18, 3, 3, "F")
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...DARK)
  doc.text("Session Type:", 18, y + 7)
  doc.setFont("helvetica", "normal")
  doc.text(appt.therapyType, 50, y + 7)
  doc.setFont("helvetica", "bold")
  doc.text("Therapist:", 110, y + 7)
  doc.setFont("helvetica", "normal")
  doc.text(appt.therapist?.fullName ?? "—", 133, y + 7)
  doc.setFont("helvetica", "bold")
  doc.text("Date:", 18, y + 13)
  doc.setFont("helvetica", "normal")
  doc.text(date, 30, y + 13)
  y += 26

  if (note?.objective) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEAL)
    doc.text("What We Worked On Today", 14, y)
    y += 7
    doc.setFontSize(9.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(note.objective, 182)
    doc.text(lines, 14, y)
    y += lines.length * 5.5 + 10
  }

  if (note?.plan) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEAL)
    doc.text("Home Program — What You Can Do", 14, y)
    y += 7
    const planLines = doc.splitTextToSize(note.plan, 174)
    doc.setFillColor(230, 244, 239)
    doc.roundedRect(14, y - 2, 182, planLines.length * 5.5 + 8, 3, 3, "F")
    doc.setFontSize(9.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...DARK)
    doc.text(planLines, 18, y + 4)
    y += planLines.length * 5.5 + 16
  }

  if (note?.assessment) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEAL)
    doc.text("Therapist's Notes", 14, y)
    y += 7
    doc.setFontSize(9.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(note.assessment, 182)
    doc.text(lines, 14, y)
    y += lines.length * 5.5 + 10
  }

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 18, 3, 3, "F")
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...DARK)
  doc.text("Questions? Contact us:", 18, y + 7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...MUTED)
  doc.text("Tumaini St. Thorlak Autism Centre · Nanyuki · app.tumaini.ke", 18, y + 13)

  addFooter(doc)
  doc.save(`parent-session-${clientName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`)
}

// ── Attendance Report PDF ──
export function generateAttendanceReportPDF(appointments: any[], clients: any[]) {
  const doc = new jsPDF()
  const period = new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" })
  let y = addHeader(doc, "Attendance Report", period)

  const completed  = appointments.filter(a => a.status === "COMPLETED")
  const cancelled  = appointments.filter(a => a.status === "CANCELLED")
  const noShow     = appointments.filter(a => a.status === "NO_SHOW")
  const rate       = appointments.length > 0 ? Math.round((completed.length / appointments.length) * 100) : 0

  // Summary boxes
  const boxes = [
    { label: "Total Scheduled", value: String(appointments.length), color: DARK },
    { label: "Completed",       value: String(completed.length),    color: TEAL },
    { label: "Cancelled",       value: String(cancelled.length),    color: [217, 119, 6] as [number,number,number] },
    { label: "Attendance Rate", value: rate + "%",                  color: TEAL },
  ]
  boxes.forEach((box, i) => {
    const x = 14 + i * 46
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, y, 42, 18, 2, 2, "F")
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...MUTED)
    doc.text(box.label.toUpperCase(), x + 2, y + 5)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...box.color)
    doc.text(box.value, x + 2, y + 13)
  })
  y += 26

  autoTable(doc, {
    startY: y,
    head: [["Client", "Therapy Type", "Date", "Therapist", "Status"]],
    body: appointments.map(a => [
      a.client?.fullName ?? "—",
      a.therapyType,
      new Date(a.scheduledAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
      a.therapist?.fullName ?? "—",
      a.status,
    ]),
    headStyles:  { fillColor: TEAL, fontSize: 9, fontStyle: "bold" },
    bodyStyles:  { fontSize: 8.5, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    margin: { left: 14, right: 14 },
  })

  addFooter(doc)
  doc.save(`attendance-report-${Date.now()}.pdf`)
}