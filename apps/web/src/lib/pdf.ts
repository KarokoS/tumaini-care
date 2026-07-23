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
  doc.text("Nanyuki, Laikipia, Kenya · Tel: +254 797 496 129 · www.tumainiautismcentre.adnyeri.org", 22, 12.5)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text("Nanyuki, Laikipia, Kenya · Tel: +254 797 496 129 · www.tumainiautismcentre.adnyeri.org", 22, 12.5)
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
    doc.text("Paybill: 880100  |  Account No: 411511  |  Name: Tumaini St. Thorlak Autism Centre", 18, finalY + 13)
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

// ── Annual Financial Report PDF ──
export function generateAnnualReportPDF(data: {
  invoices:     any[]
  appointments: any[]
  clients:      any[]
  assessments:  any[]
  period:       { label: string; from: Date; to: Date }
}) {
  const doc  = new jsPDF()
  const { invoices, appointments, clients, assessments, period } = data

  // ── Cover page ──
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, 210, 297, "F")

  // Logo circle
  doc.setFillColor(255, 255, 255)
  doc.circle(105, 80, 22, "F")
  doc.setTextColor(...TEAL)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("T", 105, 80, { align:"center", baseline:"middle" })

  // Centre name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("TUMAINI", 105, 116, { align:"center" })
  doc.setFontSize(13)
  doc.setFont("helvetica", "normal")
  doc.text("St. Thorlak Autism Centre", 105, 124, { align:"center" })
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255, 0.7 as any)
  doc.text("Meeting Neurodiversity with Love", 105, 131, { align:"center" })

  // Report title box
  doc.setFillColor(255, 255, 255, 0.15 as any)
  doc.roundedRect(30, 148, 150, 50, 4, 4, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("ANNUAL FINANCIAL &", 105, 163, { align:"center" })
  doc.text("OPERATIONS REPORT", 105, 171, { align:"center" })
  doc.setFontSize(14)
  doc.text(period.label, 105, 183, { align:"center" })

  // Generated date
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(255, 255, 255)
  doc.text(`Generated: ${new Date().toLocaleDateString("en-KE",{ day:"numeric", month:"long", year:"numeric" })}`, 105, 220, { align:"center" })
  doc.text("Nanyuki, Laikipia, Kenya  ·  +254 797 496 129", 105, 228, { align:"center" })
  doc.text("Confidential — For Internal Use Only", 105, 240, { align:"center" })

  // Signatures block
  doc.setFillColor(255, 255, 255, 0.1 as any)
  doc.roundedRect(20, 255, 75, 30, 2, 2, "F")
  doc.roundedRect(115, 255, 75, 30, 2, 2, "F")
  doc.setFontSize(8)
  doc.text("_________________________", 57.5, 274, { align:"center" })
  doc.text("Centre Director", 57.5, 279, { align:"center" })
  doc.text("_________________________", 152.5, 274, { align:"center" })
  doc.text("Fr. Stephen Ndungu Gitonga", 152.5, 279, { align:"center" })
  doc.text("Chairperson, Planning Committee", 152.5, 283, { align:"center" })

  // ── Page 2: Executive Summary ──
  doc.addPage()
  let y = addHeader(doc, "Executive Summary", period.label)
  y += 6

  // Financial calculations
  const paidInvoices     = invoices.filter(i => i.status === "PAID" && parseFloat(i.amountKes) > 0)
  const unpaidInvoices   = invoices.filter(i => i.status !== "PAID" && parseFloat(i.amountKes) > 0)
  const proBonoInvoices  = invoices.filter(i => parseFloat(i.amountKes) === 0)
  const totalRevenue     = paidInvoices.reduce((s,i) => s + parseFloat(i.amountKes), 0)
  const totalOutstanding = unpaidInvoices.reduce((s,i) => s + parseFloat(i.amountKes), 0)
  const proBonoValue     = proBonoInvoices.length * 300

  // Client calculations
  const activeClients    = clients.filter(c => c.status === "ACTIVE")
  const proBonoClients   = clients.filter(c => c.isProBono)
  const newClients       = clients.filter(c => {
    const d = new Date(c.createdAt)
    return d >= period.from && d <= period.to
  })

  // Session calculations
  const periodAppts      = appointments.filter(a => {
    const d = new Date(a.scheduledAt)
    return d >= period.from && d <= period.to
  })
  const completedSessions = periodAppts.filter(a => a.status === "COMPLETED")
  const noShows           = periodAppts.filter(a => a.status === "NO_SHOW")
  const attendanceRate    = periodAppts.length > 0
    ? Math.round(completedSessions.length / periodAppts.length * 100) : 0

  // Summary cards — 2x3 grid
  const summaryItems = [
    { label:"Total Revenue Collected",  value:"KSh "+totalRevenue.toLocaleString(),      color:TEAL },
    { label:"Outstanding Invoices",     value:"KSh "+totalOutstanding.toLocaleString(),  color:[214,63,92] as [number,number,number] },
    { label:"Pro Bono Value Waived",    value:"KSh "+proBonoValue.toLocaleString(),      color:[217,119,6] as [number,number,number] },
    { label:"Total Sessions Delivered", value:completedSessions.length.toString(),        color:[37,99,168] as [number,number,number] },
    { label:"Active Clients",           value:activeClients.length.toString(),            color:TEAL },
    { label:"Attendance Rate",          value:attendanceRate+"%",                         color:attendanceRate>=75?TEAL:[217,119,6] as [number,number,number] },
  ]

  summaryItems.forEach((item, i) => {
    const col = i % 2 === 0 ? 14 : 109
    const row = Math.floor(i / 2)
    const iy  = y + row * 24
    doc.setFillColor(...LIGHT)
    doc.roundedRect(col, iy, 91, 20, 2, 2, "F")
    doc.setFillColor(...item.color)
    doc.roundedRect(col, iy, 4, 20, 1, 1, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...MUTED)
    doc.text(item.label, col+8, iy+7)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...item.color)
    doc.text(item.value, col+8, iy+15)
  })

  y += 80

  // Key metrics paragraph
  doc.setFillColor(...TEAL)
  doc.roundedRect(14, y, 182, 6, 2, 2, "F")
  doc.setTextColor(255,255,255)
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.text("KEY HIGHLIGHTS", 18, y+4)
  y += 10

  const highlights = [
    `• ${completedSessions.length} therapy sessions delivered to ${activeClients.length} active clients during ${period.label}.`,
    `• ${newClients.length} new clients registered during this period.`,
    `• ${proBonoClients.length} families supported through pro bono services — KSh ${proBonoValue.toLocaleString()} in community care.`,
    `• Attendance rate of ${attendanceRate}% — ${noShows.length} no-shows recorded.`,
    `• ${assessments.length} clinical assessments conducted.`,
    `• ${paidInvoices.length} invoices paid totalling KSh ${totalRevenue.toLocaleString()}.`,
  ]
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...DARK)
  highlights.forEach(h => {
    const lines = doc.splitTextToSize(h, 178)
    doc.text(lines, 16, y)
    y += lines.length * 5 + 2
  })

  // ── Page 3: Monthly Revenue ──
  doc.addPage()
  y = addHeader(doc, "Monthly Revenue Breakdown", period.label)
  y += 4

  // Build monthly data
  const monthlyData: Record<string,{ revenue:number; sessions:number; invoices:number }> = {}
  paidInvoices.forEach(inv => {
    const key = new Date(inv.paidAt ?? inv.createdAt).toLocaleDateString("en-KE",{ month:"short", year:"numeric" })
    if (!monthlyData[key]) monthlyData[key] = { revenue:0, sessions:0, invoices:0 }
    monthlyData[key].revenue  += parseFloat(inv.amountKes)
    monthlyData[key].invoices += 1
  })
  completedSessions.forEach(a => {
    const key = new Date(a.scheduledAt).toLocaleDateString("en-KE",{ month:"short", year:"numeric" })
    if (!monthlyData[key]) monthlyData[key] = { revenue:0, sessions:0, invoices:0 }
    monthlyData[key].sessions += 1
  })

  const months = Object.keys(monthlyData)

  autoTable(doc, {
    startY: y,
    head: [["Month","Sessions Completed","Invoices Raised","Revenue (KSh)","Avg per Session"]],
    body: months.map(m => {
      const d   = monthlyData[m]
      const avg = d.sessions > 0 ? Math.round(d.revenue / d.sessions) : 0
      return [m, d.sessions, d.invoices, "KSh "+d.revenue.toLocaleString(), "KSh "+avg.toLocaleString()]
    }),
    foot: [["TOTAL",
      completedSessions.length,
      paidInvoices.length,
      "KSh "+totalRevenue.toLocaleString(),
      "KSh "+(completedSessions.length>0?Math.round(totalRevenue/completedSessions.length):0).toLocaleString()
    ]],
    headStyles:  { fillColor:TEAL, textColor:[255,255,255], fontSize:8, fontStyle:"bold" },
    footStyles:  { fillColor:DARK, textColor:[255,255,255], fontSize:8, fontStyle:"bold" },
    bodyStyles:  { fontSize:8.5, textColor:DARK },
    alternateRowStyles: { fillColor:LIGHT },
    columnStyles: { 3:{ fontStyle:"bold" }, 4:{ textColor:TEAL as any } },
    margin: { left:14, right:14 },
  })

  y = (doc as any).lastAutoTable.finalY + 12

  // Visual bar chart (simple)
  if (months.length > 0 && y < 220) {
    const maxRev    = Math.max(...months.map(m => monthlyData[m].revenue))
    const chartH    = 50
    const chartW    = 180
    const barW      = Math.min(20, (chartW / months.length) - 4)
    const chartX    = 14
    const chartY    = y + 10

    doc.setFontSize(8.5)
    doc.setFont("helvetica","bold")
    doc.setTextColor(...DARK)
    doc.text("Monthly Revenue Chart (KSh)", 14, y)

    // Y axis
    doc.setDrawColor(...MUTED)
    doc.line(chartX+12, chartY, chartX+12, chartY+chartH)
    doc.line(chartX+12, chartY+chartH, chartX+12+chartW, chartY+chartH)

    months.forEach((m, i) => {
      const barH   = maxRev > 0 ? (monthlyData[m].revenue / maxRev) * (chartH - 5) : 0
      const bx     = chartX + 14 + i * (chartW / months.length)
      const by     = chartY + chartH - barH

      doc.setFillColor(...TEAL)
      doc.roundedRect(bx, by, barW, barH, 1, 1, "F")

      doc.setFontSize(6)
      doc.setTextColor(...MUTED)
      doc.text(m.split(" ")[0], bx + barW/2, chartY + chartH + 4, { align:"center" })
    })
  }

  // ── Page 4: Client & Clinical Summary ──
  doc.addPage()
  y = addHeader(doc, "Client & Clinical Summary", period.label)
  y += 4

  // Client breakdown table
  doc.setFontSize(9)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...DARK)
  doc.text("Client Overview", 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [["Category","Count","% of Total"]],
    body: [
      ["Total Registered Clients",  clients.length,        "100%"],
      ["Active Clients",            activeClients.length,  clients.length>0?Math.round(activeClients.length/clients.length*100)+"%":"0%"],
      ["Inactive Clients",          clients.filter(c=>c.status!=="ACTIVE").length, clients.length>0?Math.round(clients.filter(c=>c.status!=="ACTIVE").length/clients.length*100)+"%":"0%"],
      ["Pro Bono Clients",          proBonoClients.length, clients.length>0?Math.round(proBonoClients.length/clients.length*100)+"%":"0%"],
      ["New Clients This Period",   newClients.length,     "—"],
    ],
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:8.5 },
    alternateRowStyles: { fillColor:LIGHT },
    margin: { left:14, right:14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // Session breakdown by therapy type
  doc.setFontSize(9)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...DARK)
  doc.text("Sessions by Therapy Type", 14, y)
  y += 4

  const byType: Record<string,{ total:number; completed:number }> = {}
  periodAppts.forEach(a => {
    if (!byType[a.therapyType]) byType[a.therapyType] = { total:0, completed:0 }
    byType[a.therapyType].total++
    if (a.status === "COMPLETED") byType[a.therapyType].completed++
  })

  autoTable(doc, {
    startY: y,
    head: [["Therapy Type","Total Sessions","Completed","Completion Rate"]],
    body: Object.entries(byType).map(([type,d]) => [
      type,
      d.total,
      d.completed,
      d.total>0?Math.round(d.completed/d.total*100)+"%":"0%"
    ]),
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:8.5 },
    alternateRowStyles: { fillColor:LIGHT },
    margin: { left:14, right:14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // Assessments conducted
  if (assessments.length > 0) {
    doc.setFontSize(9)
    doc.setFont("helvetica","bold")
    doc.setTextColor(...DARK)
    doc.text("Assessments Conducted", 14, y)
    y += 4

    const byTemplate: Record<string,number> = {}
    assessments.forEach((a:any) => {
      byTemplate[a.templateName] = (byTemplate[a.templateName]||0)+1
    })

    autoTable(doc, {
      startY: y,
      head: [["Assessment Tool","Count"]],
      body: Object.entries(byTemplate).map(([tool,count]) => [tool, count]),
      foot: [["TOTAL", assessments.length]],
      headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
      footStyles: { fillColor:DARK, textColor:[255,255,255], fontSize:8 },
      bodyStyles: { fontSize:8.5 },
      alternateRowStyles: { fillColor:LIGHT },
      margin: { left:14, right:14 },
    })

    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── Page 5: Pro Bono & Community Impact ──
  doc.addPage()
  y = addHeader(doc, "Pro Bono & Community Impact", period.label)
  y += 6

  // Community impact statement box
  doc.setFillColor(...TEAL)
  doc.roundedRect(14, y, 182, 24, 3, 3, "F")
  doc.setTextColor(255,255,255)
  doc.setFontSize(9)
  doc.setFont("helvetica","bold")
  doc.text("COMMUNITY IMPACT STATEMENT", 105, y+7, { align:"center" })
  doc.setFontSize(8.5)
  doc.setFont("helvetica","normal")
  const impactPct = activeClients.length > 0 ? Math.round(proBonoClients.length/activeClients.length*100) : 0
  doc.text(`During ${period.label}, Tumaini St. Thorlak Autism Centre provided pro bono services to ${proBonoClients.length} families,`, 105, y+14, { align:"center" })
  doc.text(`representing ${impactPct}% of active clients — totalling KSh ${proBonoValue.toLocaleString()} in subsidised care.`, 105, y+19, { align:"center" })
  y += 32

  autoTable(doc, {
    startY: y,
    head: [["Pro Bono Metric","Value"]],
    body: [
      ["Pro Bono Clients Supported",     proBonoClients.length],
      ["Pro Bono Sessions Delivered",     proBonoInvoices.length],
      ["Estimated Value Waived (KSh 300/session)", "KSh "+proBonoValue.toLocaleString()],
      ["Pro Bono as % of Active Clients", impactPct+"%"],
      ["Pro Bono as % of Total Invoices", invoices.length>0?Math.round(proBonoInvoices.length/invoices.length*100)+"%":"0%"],
    ],
    headStyles: { fillColor:[217,119,6] as [number,number,number], textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:8.5 },
    alternateRowStyles: { fillColor:[255,251,235] as [number,number,number] },
    margin: { left:14, right:14 },
  })

  y = (doc as any).lastAutoTable.finalY + 16

  // Therapist productivity
  doc.setFontSize(9)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...DARK)
  doc.text("Therapist Productivity", 14, y)
  y += 4

  const byTherapist: Record<string,{ name:string; total:number; completed:number; types:Set<string> }> = {}
  periodAppts.forEach(a => {
    const name = a.therapist?.fullName ?? "Unassigned"
    if (!byTherapist[name]) byTherapist[name] = { name, total:0, completed:0, types:new Set() }
    byTherapist[name].total++
    if (a.status==="COMPLETED") byTherapist[name].completed++
    byTherapist[name].types.add(a.therapyType)
  })

  autoTable(doc, {
    startY: y,
    head: [["Therapist","Sessions","Completed","Rate","Specialties"]],
    body: Object.values(byTherapist)
      .sort((a,b) => b.completed-a.completed)
      .map(t => [
        t.name,
        t.total,
        t.completed,
        t.total>0?Math.round(t.completed/t.total*100)+"%":"0%",
        Array.from(t.types).join(", ")
      ]),
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:8.5 },
    alternateRowStyles: { fillColor:LIGHT },
    margin: { left:14, right:14 },
  })

  // ── Final page: Closing ──
  doc.addPage()
  y = addHeader(doc, "Declaration & Sign-off", period.label)
  y += 10

  doc.setFontSize(9)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...DARK)
  const declaration = `This Annual Financial and Operations Report for ${period.label} has been prepared by the management team of Tumaini St. Thorlak Autism Centre, Nanyuki, Laikipia, Kenya. The information contained herein is based on records maintained in the Tumaini Care management system and reflects the operations of the centre during the stated period.\n\nThis report is intended for internal governance, planning, and reporting to the Diocese of Nyeri and relevant stakeholders. All client information has been handled in accordance with Kenya's Data Protection Act, 2019.`

  const splitDecl = doc.splitTextToSize(declaration, 178)
  doc.text(splitDecl, 16, y)
  y += splitDecl.length * 5 + 16

  // Signature blocks
  const sigBlocks = [
    { title:"Centre Director",           name:"_______________________" },
    { title:"Fr. Stephen Ndung'u Gitonga", name:"Chairperson, Planning Committee" },
    { title:"Date",                       name:"_______________________" },
  ]

  sigBlocks.forEach((sig, i) => {
    const sx = i === 2 ? 14 : i === 0 ? 14 : 110
    const sy = i === 2 ? y + 40 : y
    doc.setFontSize(8.5)
    doc.setFont("helvetica","normal")
    doc.setTextColor(...MUTED)
    doc.text("_______________________________", sx, sy+20)
    doc.text(sig.name, sx, sy+25)
    doc.setFont("helvetica","bold")
    doc.setTextColor(...DARK)
    doc.text(sig.title, sx, sy+30)
  })

  addFooter(doc)
  doc.save(`Tumaini-Annual-Report-${period.label.replace(/\s/g,"-")}.pdf`)
}