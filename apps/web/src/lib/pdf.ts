import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const TEAL  = [26, 140, 110]  as [number, number, number]
const DARK  = [26, 39, 36]    as [number, number, number]
const MUTED = [138, 171, 158] as [number, number, number]
const LIGHT = [240, 244, 242] as [number, number, number]

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, 210, 18, "F")
  doc.setFillColor(255, 255, 255)
  doc.circle(14, 9, 5, "F")
  doc.setTextColor(...TEAL)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("T", 14, 9, { align: "center", baseline: "middle" })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Tumaini St. Thorlak Autism Centre", 22, 8)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text("Nanyuki, Laikipia, Kenya · Tel: +254 797 496 129 · www.tumainiautismcentre.adnyeri.org", 22, 12.5)
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
  doc.text(appt.therapyType ?? "—", 120, y + 12)
  y += 24

  const sections = [
    { label: "SUBJECTIVE", value: note?.subjective },
    { label: "OBJECTIVE", value: note?.objective },
    { label: "ASSESSMENT", value: note?.assessment },
    { label: "PLAN", value: note?.plan },
  ]

  sections.forEach(section => {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...TEAL)
    doc.text(section.label, 14, y)
    y += 5
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(section.value || "—", 182)
    doc.text(lines, 14, y)
    y += lines.length * 5 + 8
  })

  addFooter(doc)
  doc.save(`${clientName.replace(/\s+/g,"-")}-Session-Note-${date.replace(/\s+/g,"-")}.pdf`)
}

// ── Invoice PDF ──
export function generateInvoicePDF(invoice: any) {
  const doc = new jsPDF()
  let y = addHeader(doc, "Payment Receipt", `Invoice ${invoice.number}`)

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 24, 2, 2, "F")
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...DARK)
  doc.text("Client:", 18, y + 8)
  doc.setFont("helvetica", "normal")
  doc.text(invoice.client?.fullName ?? "—", 40, y + 8)
  doc.setFont("helvetica", "bold")
  doc.text("Invoice No:", 18, y + 15)
  doc.setFont("helvetica", "normal")
  doc.text(invoice.number, 45, y + 15)
  doc.setFont("helvetica", "bold")
  doc.text("Status:", 120, y + 8)
  doc.setTextColor(...(invoice.status === "PAID" ? TEAL : [217,119,6] as [number,number,number]))
  doc.text(invoice.status, 140, y + 8)
  doc.setTextColor(...DARK)
  doc.setFont("helvetica", "bold")
  doc.text("Date:", 120, y + 15)
  doc.setFont("helvetica", "normal")
  doc.text(new Date(invoice.paidAt ?? invoice.createdAt).toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"}), 140, y + 15)
  y += 32

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price (KSh)", "Total (KSh)"]],
    body: (invoice.lineItems ?? []).map((item: any) => [
      item.description,
      item.quantity,
      parseFloat(item.unitPrice).toLocaleString(),
      (item.quantity * parseFloat(item.unitPrice)).toLocaleString(),
    ]),
    foot: [["", "", "TOTAL", "KSh " + parseFloat(invoice.amountKes).toLocaleString()]],
    headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8 },
    footStyles: { fillColor: DARK, textColor: [255,255,255], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5 },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  })

  let finalY = (doc as any).lastAutoTable.finalY + 12

  if (invoice.status === "PAID") {
    doc.setFillColor(...TEAL)
    doc.roundedRect(14, finalY, 182, 10, 2, 2, "F")
    doc.setTextColor(255,255,255)
    doc.setFontSize(9)
    doc.setFont("helvetica","bold")
    doc.text(`✓ PAID${invoice.mpesaRef ? " — M-Pesa Ref: "+invoice.mpesaRef : ""}`, 105, finalY+6.5, { align:"center" })
    finalY += 18
  } else {
    doc.setFillColor(...LIGHT)
    doc.roundedRect(14, finalY, 182, 20, 2, 2, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica","bold")
    doc.setTextColor(...DARK)
    doc.text("M-Pesa Paybill: 880100 | Account No: 411511 | Name: Tumaini St. Thorlak Autism Centre", 18, finalY + 13)
    finalY += 26
  }

  addFooter(doc)
  doc.save(`Invoice-${invoice.number}.pdf`)
}

// ── Financial Report PDF ──
export function generateFinancialReportPDF(invoices: any[], period: string) {
  const doc = new jsPDF()
  let y = addHeader(doc, "Financial Report", period)

  const paid = invoices.filter(i => i.status === "PAID" && parseFloat(i.amountKes) > 0)
  const unpaid = invoices.filter(i => i.status !== "PAID" && parseFloat(i.amountKes) > 0)
  const proBono = invoices.filter(i => parseFloat(i.amountKes) === 0)
  const totalRevenue = paid.reduce((s,i) => s + parseFloat(i.amountKes), 0)
  const totalOutstanding = unpaid.reduce((s,i) => s + parseFloat(i.amountKes), 0)

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 24, 2, 2, "F")
  doc.setFontSize(8.5)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...TEAL)
  doc.text("KSh " + totalRevenue.toLocaleString(), 18, y+9)
  doc.setFontSize(7)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...MUTED)
  doc.text("Total Collected", 18, y+15)

  doc.setFontSize(8.5)
  doc.setFont("helvetica","bold")
  doc.setTextColor(214,63,92)
  doc.text("KSh " + totalOutstanding.toLocaleString(), 80, y+9)
  doc.setFontSize(7)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...MUTED)
  doc.text("Outstanding", 80, y+15)

  doc.setFontSize(8.5)
  doc.setFont("helvetica","bold")
  doc.setTextColor(217,119,6)
  doc.text(proBono.length + " sessions", 142, y+9)
  doc.setFontSize(7)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...MUTED)
  doc.text("Pro Bono", 142, y+15)
  y += 32

  autoTable(doc, {
    startY: y,
    head: [["Invoice #", "Client", "Status", "Amount (KSh)", "Date"]],
    body: invoices.map(i => [
      i.number,
      i.client?.fullName ?? "—",
      parseFloat(i.amountKes) === 0 ? "PRO BONO" : i.status,
      parseFloat(i.amountKes) === 0 ? "—" : parseFloat(i.amountKes).toLocaleString(),
      new Date(i.paidAt ?? i.createdAt).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"}),
    ]),
    headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  })

  addFooter(doc)
  doc.save(`Financial-Report-${period.replace(/\s+/g,"-")}.pdf`)
}

// ── Parent-facing Session Summary PDF ──
export function generateParentSessionPDF(appt: any) {
  const doc = new jsPDF()
  const note = appt.sessionNote
  const clientName = appt.client?.fullName ?? "Your child"
  const date = new Date(appt.scheduledAt).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  let y = addHeader(doc, "Session Summary", `${clientName} · ${date}`)

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 16, 2, 2, "F")
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...DARK)
  doc.text("Therapy type:", 18, y + 6)
  doc.setFont("helvetica", "normal")
  doc.text(appt.therapyType ?? "—", 55, y + 6)
  doc.setFont("helvetica", "bold")
  doc.text("Therapist:", 18, y + 12)
  doc.setFont("helvetica", "normal")
  doc.text(appt.therapist?.fullName ?? "—", 55, y + 12)
  y += 24

  doc.setFontSize(9)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...TEAL)
  doc.text("HOW YOUR CHILD DID TODAY", 14, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...DARK)
  const objLines = doc.splitTextToSize(note?.objective || "No notes recorded for this session.", 182)
  doc.text(objLines, 14, y)
  y += objLines.length * 5 + 10

  if (note?.plan) {
    doc.setFontSize(9)
    doc.setFont("helvetica","bold")
    doc.setTextColor(...TEAL)
    doc.text("NEXT STEPS / HOME PRACTICE", 14, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont("helvetica","normal")
    doc.setTextColor(...DARK)
    const planLines = doc.splitTextToSize(note.plan, 182)
    doc.text(planLines, 14, y)
    y += planLines.length * 5 + 10
  }

  doc.setFontSize(8)
  doc.setFont("helvetica","italic")
  doc.setTextColor(...MUTED)
  doc.text("Questions about this session? Please speak with your child's therapist at your next visit.", 14, y)

  addFooter(doc)
  doc.save(`${clientName.replace(/\s+/g,"-")}-Parent-Summary-${date.replace(/\s+/g,"-")}.pdf`)
}

// ── Attendance Report PDF ──
export function generateAttendanceReportPDF(appointments: any[], clients: any[]) {
  const doc = new jsPDF()
  let y = addHeader(doc, "Attendance Report", `${appointments.length} sessions`)

  const completed = appointments.filter(a => a.status === "COMPLETED").length
  const noShows = appointments.filter(a => a.status === "NO_SHOW").length
  const rate = appointments.length > 0 ? Math.round(completed/appointments.length*100) : 0

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 20, 2, 2, "F")
  doc.setFontSize(8.5)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...TEAL)
  doc.text(`${completed} completed`, 18, y+9)
  doc.setTextColor(214,63,92)
  doc.text(`${noShows} no-shows`, 80, y+9)
  doc.setTextColor(...DARK)
  doc.text(`${rate}% attendance rate`, 142, y+9)
  y += 28

  autoTable(doc, {
    startY: y,
    head: [["Date", "Client", "Therapy", "Therapist", "Status"]],
    body: appointments.map(a => [
      new Date(a.scheduledAt).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"}),
      a.client?.fullName ?? "—",
      a.therapyType,
      a.therapist?.fullName ?? "—",
      a.status,
    ]),
    headStyles: { fillColor: TEAL, textColor: [255,255,255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  })

  addFooter(doc)
  doc.save(`Attendance-Report.pdf`)
}

// ── Annual Financial & Operations Report PDF ──
export function generateAnnualReportPDF(data: {
  invoices: any[]
  appointments: any[]
  clients: any[]
  assessments: any[]
  period: { label: string; from: Date; to: Date }
}) {
  const doc  = new jsPDF()
  const { invoices, appointments, clients, assessments, period } = data

  doc.setFillColor(...TEAL)
  doc.rect(0, 0, 210, 297, "F")
  doc.setFillColor(255, 255, 255)
  doc.circle(105, 80, 22, "F")
  doc.setTextColor(...TEAL)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("T", 105, 80, { align:"center", baseline:"middle" })
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("TUMAINI", 105, 116, { align:"center" })
  doc.setFontSize(13)
  doc.setFont("helvetica", "normal")
  doc.text("St. Thorlak Autism Centre", 105, 124, { align:"center" })
  doc.setFontSize(9)
  doc.text("Meeting Neurodiversity with Love", 105, 131, { align:"center" })

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(30, 148, 150, 50, 4, 4, "F")
  doc.setTextColor(...TEAL)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("ANNUAL FINANCIAL &", 105, 163, { align:"center" })
  doc.text("OPERATIONS REPORT", 105, 171, { align:"center" })
  doc.setFontSize(14)
  doc.text(period.label, 105, 183, { align:"center" })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Generated: ${new Date().toLocaleDateString("en-KE",{ day:"numeric", month:"long", year:"numeric" })}`, 105, 220, { align:"center" })
  doc.text("Nanyuki, Laikipia, Kenya  ·  +254 797 496 129", 105, 228, { align:"center" })
  doc.text("Confidential — For Internal Use Only", 105, 240, { align:"center" })

  doc.setFontSize(8)
  doc.text("_________________________", 57.5, 274, { align:"center" })
  doc.text("Centre Director", 57.5, 279, { align:"center" })
  doc.text("_________________________", 152.5, 274, { align:"center" })
  doc.text("Fr. Stephen Ndungu Gitonga", 152.5, 279, { align:"center" })
  doc.text("Chairperson, Planning Committee", 152.5, 283, { align:"center" })

  doc.addPage()
  let y = addHeader(doc, "Executive Summary", period.label)
  y += 6

  const paidInvoices = invoices.filter(i => i.status === "PAID" && parseFloat(i.amountKes) > 0)
  const unpaidInvoices = invoices.filter(i => i.status !== "PAID" && parseFloat(i.amountKes) > 0)
  const proBonoInvoices = invoices.filter(i => parseFloat(i.amountKes) === 0)
  const totalRevenue = paidInvoices.reduce((s,i) => s + parseFloat(i.amountKes), 0)
  const totalOutstanding = unpaidInvoices.reduce((s,i) => s + parseFloat(i.amountKes), 0)
  const proBonoValue = proBonoInvoices.length * 300

  const activeClients = clients.filter(c => c.status === "ACTIVE")
  const proBonoClients = clients.filter(c => c.isProBono)
  const newClients = clients.filter(c => {
    const d = new Date(c.createdAt)
    return d >= period.from && d <= period.to
  })

  const periodAppts = appointments.filter(a => {
    const d = new Date(a.scheduledAt)
    return d >= period.from && d <= period.to
  })
  const completedSessions = periodAppts.filter(a => a.status === "COMPLETED")
  const noShows = periodAppts.filter(a => a.status === "NO_SHOW")
  const attendanceRate = periodAppts.length > 0 ? Math.round(completedSessions.length / periodAppts.length * 100) : 0

  const summaryItems = [
    { label:"Total Revenue Collected", value:"KSh "+totalRevenue.toLocaleString(), color:TEAL },
    { label:"Outstanding Invoices", value:"KSh "+totalOutstanding.toLocaleString(), color:[214,63,92] as [number,number,number] },
    { label:"Pro Bono Value Waived", value:"KSh "+proBonoValue.toLocaleString(), color:[217,119,6] as [number,number,number] },
    { label:"Total Sessions Delivered", value:completedSessions.length.toString(), color:[37,99,168] as [number,number,number] },
    { label:"Active Clients", value:activeClients.length.toString(), color:TEAL },
    { label:"Attendance Rate", value:attendanceRate+"%", color:attendanceRate>=75?TEAL:[217,119,6] as [number,number,number] },
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

  doc.addPage()
  y = addHeader(doc, "Monthly Revenue Breakdown", period.label)
  y += 4

  const monthlyData: Record<string,{ revenue:number; sessions:number; invoices:number }> = {}
  paidInvoices.forEach(inv => {
    const key = new Date(inv.paidAt ?? inv.createdAt).toLocaleDateString("en-KE",{ month:"short", year:"numeric" })
    if (!monthlyData[key]) monthlyData[key] = { revenue:0, sessions:0, invoices:0 }
    monthlyData[key].revenue += parseFloat(inv.amountKes)
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
      const d = monthlyData[m]
      const avg = d.sessions > 0 ? Math.round(d.revenue / d.sessions) : 0
      return [m, d.sessions, d.invoices, "KSh "+d.revenue.toLocaleString(), "KSh "+avg.toLocaleString()]
    }),
    foot: [["TOTAL",
      completedSessions.length,
      paidInvoices.length,
      "KSh "+totalRevenue.toLocaleString(),
      "KSh "+(completedSessions.length>0?Math.round(totalRevenue/completedSessions.length):0).toLocaleString()
    ]],
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8, fontStyle:"bold" },
    footStyles: { fillColor:DARK, textColor:[255,255,255], fontSize:8, fontStyle:"bold" },
    bodyStyles: { fontSize:8.5, textColor:DARK },
    alternateRowStyles: { fillColor:LIGHT },
    columnStyles: { 3:{ fontStyle:"bold" }, 4:{ textColor:TEAL as any } },
    margin: { left:14, right:14 },
  })

  y = (doc as any).lastAutoTable.finalY + 12

  if (months.length > 0 && y < 220) {
    const maxRev = Math.max(...months.map(m => monthlyData[m].revenue))
    const chartH = 50
    const chartW = 180
    const barW = Math.min(20, (chartW / months.length) - 4)
    const chartX = 14
    const chartY = y + 10

    doc.setFontSize(8.5)
    doc.setFont("helvetica","bold")
    doc.setTextColor(...DARK)
    doc.text("Monthly Revenue Chart (KSh)", 14, y)

    doc.setDrawColor(...MUTED)
    doc.line(chartX+12, chartY, chartX+12, chartY+chartH)
    doc.line(chartX+12, chartY+chartH, chartX+12+chartW, chartY+chartH)

    months.forEach((m, i) => {
      const barH = maxRev > 0 ? (monthlyData[m].revenue / maxRev) * (chartH - 5) : 0
      const bx = chartX + 14 + i * (chartW / months.length)
      const by = chartY + chartH - barH
      doc.setFillColor(...TEAL)
      doc.roundedRect(bx, by, barW, barH, 1, 1, "F")
      doc.setFontSize(6)
      doc.setTextColor(...MUTED)
      doc.text(m.split(" ")[0], bx + barW/2, chartY + chartH + 4, { align:"center" })
    })
  }

  doc.addPage()
  y = addHeader(doc, "Client & Clinical Summary", period.label)
  y += 4

  doc.setFontSize(9)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...DARK)
  doc.text("Client Overview", 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [["Category","Count","% of Total"]],
    body: [
      ["Total Registered Clients", clients.length, "100%"],
      ["Active Clients", activeClients.length, clients.length>0?Math.round(activeClients.length/clients.length*100)+"%":"0%"],
      ["Inactive Clients", clients.filter(c=>c.status!=="ACTIVE").length, clients.length>0?Math.round(clients.filter(c=>c.status!=="ACTIVE").length/clients.length*100)+"%":"0%"],
      ["Pro Bono Clients", proBonoClients.length, clients.length>0?Math.round(proBonoClients.length/clients.length*100)+"%":"0%"],
      ["New Clients This Period", newClients.length, "—"],
    ],
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:8.5 },
    alternateRowStyles: { fillColor:LIGHT },
    margin: { left:14, right:14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

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
      type, d.total, d.completed, d.total>0?Math.round(d.completed/d.total*100)+"%":"0%"
    ]),
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:8.5 },
    alternateRowStyles: { fillColor:LIGHT },
    margin: { left:14, right:14 },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  if (assessments.length > 0) {
    doc.setFontSize(9)
    doc.setFont("helvetica","bold")
    doc.setTextColor(...DARK)
    doc.text("Assessments Conducted", 14, y)
    y += 4

    const byTemplate: Record<string,number> = {}
    assessments.forEach((a: any) => {
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

  doc.addPage()
  y = addHeader(doc, "Pro Bono & Community Impact", period.label)
  y += 6

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
      ["Pro Bono Clients Supported", proBonoClients.length],
      ["Pro Bono Sessions Delivered", proBonoInvoices.length],
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
        t.name, t.total, t.completed,
        t.total>0?Math.round(t.completed/t.total*100)+"%":"0%",
        Array.from(t.types).join(", ")
      ]),
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:8.5 },
    alternateRowStyles: { fillColor:LIGHT },
    margin: { left:14, right:14 },
  })

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

  doc.setFontSize(8.5)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...MUTED)
  doc.text("_______________________________", 14, y+20)
  doc.text("_______________________________", 14, y+40)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...DARK)
  doc.text("Centre Director", 14, y+30)
  doc.text("Date", 14, y+50)

  doc.setFontSize(8.5)
  doc.setFont("helvetica","normal")
  doc.setTextColor(...MUTED)
  doc.text("_______________________________", 110, y+20)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...DARK)
  doc.text("Fr. Stephen Ndungu Gitonga", 110, y+25)
  doc.text("Chairperson, Planning Committee", 110, y+29)

  addFooter(doc)
  doc.save(`Tumaini-Annual-Report-${period.label.replace(/\s/g,"-")}.pdf`)
}

// ── Parent Progress Report PDF ──
export function generateParentProgressReportPDF(client: any, progress: any) {
  const doc = new jsPDF()
  let y = addHeader(doc, "Progress Report", `${client.fullName} · Prepared for parent/guardian`)

  const age = Math.floor((new Date().getTime() - new Date(client.dob).getTime()) / (1000*60*60*24*365))

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 20, 2, 2, "F")
  doc.setFontSize(9)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...DARK)
  doc.text("Child:", 18, y+8)
  doc.setFont("helvetica","normal")
  doc.text(`${client.fullName}, ${age} years`, 40, y+8)
  doc.setFont("helvetica","bold")
  doc.text("Report date:", 18, y+15)
  doc.setFont("helvetica","normal")
  doc.text(new Date().toLocaleDateString("en-KE",{day:"numeric",month:"long",year:"numeric"}), 55, y+15)
  y += 28

  const s = progress.summary
  doc.setFontSize(10)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...TEAL)
  doc.text("Attendance Summary", 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    head: [["Total Sessions","Completed","Attendance Rate"]],
    body: [[s.totalSessions, s.completedSessions, s.attendanceRate+"%"]],
    headStyles: { fillColor:TEAL, textColor:[255,255,255], fontSize:8 },
    bodyStyles: { fontSize:9, halign:"center" },
    margin: { left:14, right:14 },
  })
  y = (doc as any).lastAutoTable.finalY + 12

  doc.setFontSize(10)
  doc.setFont("helvetica","bold")
  doc.setTextColor(...TEAL)
  doc.text("Therapy Goals Progress", 14, y)
  y += 6

  if (!progress.goals || progress.goals.length === 0) {
    doc.setFontSize(9)
    doc.setFont("helvetica","normal")
    doc.setTextColor(...MUTED)
    doc.text("No goals recorded yet.", 16, y)
    y += 10
  } else {
    progress.goals.forEach((g: any) => {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFontSize(9)
      doc.setFont("helvetica","bold")
      doc.setTextColor(...DARK)
      const titleLines = doc.splitTextToSize(g.title, 140)
      doc.text(titleLines, 14, y)
      const goalColor: [number,number,number] = g.isAchieved ? TEAL : [37, 99, 168]
      doc.setTextColor(...goalColor)
      doc.text(`${g.currentPct}%${g.isAchieved ? " ✓ Achieved" : ""}`, 196, y, { align:"right" })
      y += titleLines.length * 5 + 2

      doc.setFillColor(...LIGHT)
      doc.roundedRect(14, y, 182, 4, 2, 2, "F")
      doc.setFillColor(...goalColor)
      doc.roundedRect(14, y, 182 * (g.currentPct/100), 4, 2, 2, "F")
      y += 10
    })
  }

  y += 4
  doc.setFontSize(8.5)
  doc.setFont("helvetica","italic")
  doc.setTextColor(...MUTED)
  const note = "This report reflects progress recorded in the Tumaini Care system. For questions about your child's therapy plan, please speak with their assigned therapist."
  const noteLines = doc.splitTextToSize(note, 182)
  doc.text(noteLines, 14, y)

  addFooter(doc)
  doc.save(`${client.fullName.replace(/\s+/g,"-")}-Progress-Report.pdf`)
}