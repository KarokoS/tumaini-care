import { useEffect, useState, useRef } from "react"
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from "chart.js"
import { Bar, Doughnut, Line } from "react-chartjs-2"
import api from "../lib/api"
import Layout from "../components/Layout"

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
)

const THERAPY_COLORS: Record<string, string> = {
  OT:      "#3b82f6",
  SPEECH:  "#22c55e",
  ABA:     "#a855f7",
  SENSORY: "#f97316",
  GROUP:   "#eab308",
  PSYCH:   "#ec4899",
}

export default function Reports() {
  const [clients,      setClients]      = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [invoices,     setInvoices]     = useState<any[]>([])
  const [plans,        setPlans]        = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/clients").catch(() => ({ data: [] })),
      api.get("/appointments").catch(() => ({ data: [] })),
      api.get("/invoices").catch(() => ({ data: [] })),
      api.get("/itps").catch(() => ({ data: [] })),
    ]).then(([c, a, inv, p]: any) => {
      setClients(c.data)
      setAppointments(a.data)
      setInvoices(inv.data)
      setPlans(p.data)
    }).finally(() => setLoading(false))
  }, [])

  // ── Derived stats ──
  const allGoals       = plans.flatMap((p: any) => p.goals || [])
  const achievedGoals  = allGoals.filter((g: any) => g.isAchieved)
  const avgProgress    = allGoals.length > 0
    ? Math.round(allGoals.reduce((s: number, g: any) => s + g.progressPct, 0) / allGoals.length) : 0
  const completedAppts = appointments.filter(a => a.status === "COMPLETED")
  const totalRevenue   = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + parseFloat(i.amountKes), 0)
  const attendanceRate = appointments.length > 0
    ? Math.round((completedAppts.length / appointments.length) * 100) : 0

  // ── Last 6 months labels ──
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { label: d.toLocaleDateString("en-KE", { month: "short" }), month: d.getMonth(), year: d.getFullYear() }
  })

  // ── Sessions stacked bar by therapy type ──
  const therapyTypes = Object.keys(THERAPY_COLORS)
  const stackedBarData = {
    labels: last6.map(m => m.label),
    datasets: therapyTypes.map(type => ({
      label: type,
      data: last6.map(m =>
        appointments.filter(a => {
          const d = new Date(a.scheduledAt)
          return a.therapyType === type && d.getMonth() === m.month && d.getFullYear() === m.year
        }).length
      ),
      backgroundColor: THERAPY_COLORS[type] + "cc",
      borderRadius: 4,
    }))
  }

  // ── Therapy type doughnut ──
  const therapyTypeCounts: Record<string, number> = {}
  appointments.forEach(a => {
    therapyTypeCounts[a.therapyType] = (therapyTypeCounts[a.therapyType] || 0) + 1
  })
  const doughnutData = {
    labels: Object.keys(therapyTypeCounts),
    datasets: [{
      data: Object.values(therapyTypeCounts),
      backgroundColor: Object.keys(therapyTypeCounts).map(t => THERAPY_COLORS[t] ?? "#8aab9e"),
      borderWidth: 0,
      hoverOffset: 6,
    }]
  }

  // ── Revenue line chart ──
  const revenueByMonth = last6.map(m => ({
    label: m.label,
    amount: invoices.filter(i => {
      const d = new Date(i.createdAt)
      return i.status === "PAID" && d.getMonth() === m.month && d.getFullYear() === m.year
    }).reduce((s, i) => s + parseFloat(i.amountKes), 0)
  }))
  const lineData = {
    labels: revenueByMonth.map(m => m.label),
    datasets: [{
      label: "Revenue (KSh)",
      data: revenueByMonth.map(m => m.amount),
      fill: true,
      borderColor: "#1a8c6e",
      backgroundColor: "#1a8c6e18",
      tension: 0.4,
      pointBackgroundColor: "#1a8c6e",
      pointRadius: 5,
    }]
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { font: { size: 11 }, boxWidth: 10, padding: 12 } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, grid: { color: "#d6e8e040" }, ticks: { precision: 0 } },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } },
    },
    cutout: "68%",
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => "KSh " + ctx.parsed.y.toLocaleString()
        }
      }
    },
    scales: {
      y: {
        grid: { color: "#d6e8e040" },
        ticks: { callback: (v: any) => "KSh " + (v / 1000).toFixed(0) + "K" }
      },
      x: { grid: { display: false } },
    },
  }

  return (
    <Layout title="Reports & Analytics">
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8aab9e" }}>Loading...</div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Goals Active",      value: allGoals.length,        sub: "across all clients",        color: "#1a8c6e" },
              { label: "Goals Achieved",    value: achievedGoals.length,   sub: "total this year",           color: "#2563a8" },
              { label: "Avg Goal Progress", value: avgProgress + "%",      sub: "across active goals",       color: "#d97706" },
              { label: "Attendance Rate",   value: attendanceRate + "%",   sub: "completed vs scheduled",    color: "#d63f5c" },
            ].map((s, i) => (
              <div key={i} style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, borderRadius: "0 16px 0 100%", background: s.color, opacity: 0.06 }} />
                <div style={{ fontSize: 11.5, fontWeight: 500, color: "#8aab9e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: "#8aab9e" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Row 1: Stacked bar + Doughnut ── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>

            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Sessions by Therapy Type</div>
                <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>Last 6 months — stacked by type</div>
              </div>
              <div style={{ padding: "20px 18px", height: 220 }}>
                {appointments.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8aab9e", fontSize: 13 }}>No sessions recorded yet</div>
                ) : (
                  <Bar data={stackedBarData} options={barOptions} />
                )}
              </div>
            </div>

            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Therapy Type Split</div>
                <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>{appointments.length} total sessions</div>
              </div>
              <div style={{ padding: "16px 18px", height: 220 }}>
                {Object.keys(therapyTypeCounts).length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8aab9e", fontSize: 13 }}>No sessions yet</div>
                ) : (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                )}
              </div>
            </div>
          </div>

          {/* ── Row 2: Revenue line + Goal progress ── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>

            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Revenue Trend</div>
                <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>Paid invoices — last 6 months</div>
              </div>
              <div style={{ padding: "20px 18px", height: 200 }}>
                {invoices.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8aab9e", fontSize: 13 }}>No invoices yet</div>
                ) : (
                  <Line data={lineData} options={lineOptions} />
                )}
              </div>
              <div style={{ padding: "0 18px 14px", textAlign: "right", fontSize: 12, color: "#8aab9e" }}>
                Total collected: <strong style={{ color: "#1a8c6e" }}>KSh {totalRevenue.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #d6e8e0" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a2724" }}>Goal Progress</div>
                <div style={{ fontSize: 11.5, color: "#8aab9e", marginTop: 2 }}>{allGoals.length} active goals</div>
              </div>
              <div style={{ padding: "14px 18px" }}>
                {allGoals.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#8aab9e", fontSize: 12, padding: "20px 0" }}>No goals yet</div>
                ) : allGoals.slice(0, 6).map((g: any, i: number) => {
                  const colors = ["#1a8c6e", "#2563a8", "#d97706", "#a855f7", "#22c55e", "#f97316"]
                  const color = g.isAchieved ? "#1a8c6e" : colors[i % colors.length]
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#1a2724", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{g.title}</span>
                        <span style={{ fontWeight: 600, color, flexShrink: 0 }}>{g.progressPct}%</span>
                      </div>
                      <div style={{ height: 6, background: "#f0f4f2", borderRadius: 20, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: g.progressPct + "%", background: color, borderRadius: 20 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Row 3: Summary cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            {[
              {
                title: "Client Summary",
                rows: [
                  { label: "Total clients",       value: clients.length,                                    color: "#1a2724" },
                  { label: "Active",               value: clients.filter(c => c.status === "ACTIVE").length, color: "#1a8c6e" },
                  { label: "With therapy plans",   value: plans.length,                                      color: "#2563a8" },
                ]
              },
              {
                title: "Session Summary",
                rows: [
                  { label: "Total booked",    value: appointments.length,    color: "#1a2724" },
                  { label: "Completed",       value: completedAppts.length,  color: "#1a8c6e" },
                  { label: "Attendance rate", value: attendanceRate + "%",   color: "#d97706" },
                ]
              },
              {
                title: "Financial Summary",
                rows: [
                  { label: "Total invoiced",  value: "KSh " + invoices.reduce((s, i) => s + parseFloat(i.amountKes), 0).toLocaleString(),                           color: "#1a2724" },
                  { label: "Collected",       value: "KSh " + totalRevenue.toLocaleString(),                                                                          color: "#1a8c6e" },
                  { label: "Outstanding",     value: "KSh " + invoices.filter(i => i.status !== "PAID").reduce((s, i) => s + parseFloat(i.amountKes), 0).toLocaleString(), color: "#d63f5c" },
                ]
              },
            ].map((card, ci) => (
              <div key={ci} style={{ background: "white", border: "1px solid #d6e8e0", borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: "#8aab9e", textTransform: "uppercase", marginBottom: 12 }}>{card.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {card.rows.map((row, ri) => (
                    <div key={ri} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#4a6359" }}>{row.label}</span>
                      <span style={{ fontWeight: 600, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}