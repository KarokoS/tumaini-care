import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Bar, Line } from "react-chartjs-2"
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from "chart.js"
import api from "../lib/api"
import Layout from "../components/Layout"

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

export default function ClientProgress() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const [client, setClient]   = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeGoal, setActiveGoal] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/clients/${id}/progress`),
    ]).then(([c, p]: any) => {
      setClient(c.data)
      setProgress(p.data)
      if (p.data.goals?.length > 0) setActiveGoal(p.data.goals[0].id)
    }).catch(() => navigate('/clients'))
    .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <Layout title="Client Progress">
      <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading progress data...</div>
    </Layout>
  )

  if (!client || !progress) return null

  const months     = Object.keys(progress.monthlyAttendance)
  const attended   = months.map((m:string) => progress.monthlyAttendance[m].attended)
  const missed     = months.map((m:string) => progress.monthlyAttendance[m].missed)
  const cancelled  = months.map((m:string) => progress.monthlyAttendance[m].cancelled)

  const attendanceData = {
    labels: months,
    datasets: [
      {
        label:           'Completed',
        data:            attended,
        backgroundColor: '#1a8c6e99',
        borderColor:     '#1a8c6e',
        borderWidth:     1,
        borderRadius:    4,
      },
      {
        label:           'No Show',
        data:            missed,
        backgroundColor: '#d63f5c99',
        borderColor:     '#d63f5c',
        borderWidth:     1,
        borderRadius:    4,
      },
      {
        label:           'Cancelled',
        data:            cancelled,
        backgroundColor: '#d9770699',
        borderColor:     '#d97706',
        borderWidth:     1,
        borderRadius:    4,
      },
    ]
  }

  const attendanceOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend:  { position:"bottom" as const, labels:{ font:{ size:11 }, boxWidth:10, padding:12 } },
      tooltip: { mode:"index" as const, intersect:false },
    },
    scales: {
      x: { grid:{ display:false }, stacked:false },
      y: { grid:{ color:"#d6e8e040" }, ticks:{ precision:0, stepSize:1 }, beginAtZero:true },
    },
  }

  // Goal progress chart for selected goal
  const selectedGoal = progress.goals?.find((g:any) => g.id === activeGoal)
  const goalChartData = selectedGoal ? {
    labels: selectedGoal.logs.length > 0
      ? selectedGoal.logs.map((l:any) => new Date(l.date).toLocaleDateString('en-KE',{ day:'numeric', month:'short' }))
      : ['Start', 'Now'],
    datasets: [{
      label:           selectedGoal.title,
      data:            selectedGoal.logs.length > 0
        ? selectedGoal.logs.map((l:any) => l.progressPct)
        : [0, selectedGoal.currentPct],
      borderColor:     '#2563a8',
      backgroundColor: '#2563a822',
      fill:            true,
      tension:         0.3,
      pointBackgroundColor: '#2563a8',
      pointRadius:     4,
    }]
  } : null

  const goalOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display:false },
      tooltip: {
        callbacks: {
          label: (ctx:any) => `Progress: ${ctx.raw}%`,
          afterLabel: (ctx:any) => {
            const log = selectedGoal?.logs[ctx.dataIndex]
            return log?.note ? `Note: ${log.note}` : ''
          }
        }
      }
    },
    scales: {
      x: { grid:{ display:false } },
      y: {
        grid:      { color:"#d6e8e040" },
        min:       0,
        max:       100,
        ticks:     { callback: (v:any) => v+"%" },
      }
    }
  }

  const s = progress.summary

  return (
    <Layout title={`${client.fullName} — Progress`} action={
      <button onClick={() => navigate(`/clients/${id}`)}
        style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>
        ← Back to Client
      </button>
    }>

      {/* Client header */}
      <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, padding:"18px 22px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:48, height:48, borderRadius:"50%", background:"#e6f4ef", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"#1a8c6e", flexShrink:0 }}>
          {client.fullName.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize:17, fontWeight:600, color:"#1a2724" }}>{client.fullName}</div>
          <div style={{ fontSize:12.5, color:"#8aab9e", marginTop:3 }}>
            {client.diagnosis || "No diagnosis"} · {Math.floor((new Date().getTime()-new Date(client.dob).getTime())/(1000*60*60*24*365))} years old
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Sessions",  value: s.totalSessions,      color:"#2563a8" },
          { label:"Completed",       value: s.completedSessions,  color:"#1a8c6e" },
          { label:"No Shows",        value: s.missedSessions,     color:"#d63f5c" },
          { label:"Attendance Rate", value: s.attendanceRate+"%", color: s.attendanceRate>=75?"#1a8c6e":s.attendanceRate>=50?"#d97706":"#d63f5c" },
          { label:"Total Goals",     value: s.goalsTotal,         color:"#7c3aed" },
          { label:"Goals Achieved",  value: s.goalsAchieved,      color:"#1a8c6e" },
        ].map((stat,i) => (
          <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:4 }}>{stat.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

        {/* Attendance chart */}
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Attendance Trend</div>
            <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>Sessions per month — all time</div>
          </div>
          <div style={{ padding:"16px 18px", height:240 }}>
            {months.length === 0 ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#8aab9e", fontSize:13 }}>
                No session data yet
              </div>
            ) : (
              <Bar data={attendanceData} options={attendanceOptions} />
            )}
          </div>
        </div>

        {/* Goal progress chart */}
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>Goal Progress</div>
            <div style={{ fontSize:11.5, color:"#8aab9e", marginTop:2 }}>Progress over time</div>
          </div>

          {progress.goals?.length === 0 ? (
            <div style={{ padding:32, textAlign:"center", color:"#8aab9e", fontSize:13 }}>
              No therapy goals recorded yet
            </div>
          ) : (
            <>
              {/* Goal selector */}
              <div style={{ padding:"10px 18px", borderBottom:"1px solid #f0f4f2", display:"flex", gap:6, flexWrap:"wrap" }}>
                {progress.goals.map((g:any) => (
                  <button key={g.id} onClick={() => setActiveGoal(g.id)}
                    style={{ padding:"4px 10px", borderRadius:20, border:"1px solid", borderColor:activeGoal===g.id?"#2563a8":"#d6e8e0", background:activeGoal===g.id?"#e8f0fb":"white", color:activeGoal===g.id?"#2563a8":"#4a6359", fontSize:11.5, cursor:"pointer", fontWeight:activeGoal===g.id?600:400 }}>
                    {g.title.length > 25 ? g.title.slice(0,25)+"..." : g.title}
                    {g.isAchieved && " ✓"}
                  </button>
                ))}
              </div>

              <div style={{ padding:"16px 18px", height:200 }}>
                {goalChartData && selectedGoal?.logs.length > 0 ? (
                  <Line data={goalChartData} options={goalOptions} />
                ) : selectedGoal ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%" }}>
                    <div style={{ fontSize:28, fontWeight:700, color:selectedGoal.isAchieved?"#1a8c6e":"#2563a8", marginBottom:8 }}>
                      {selectedGoal.currentPct}%
                    </div>
                    <div style={{ fontSize:13, color:"#8aab9e" }}>Current progress — no log history yet</div>
                    <div style={{ fontSize:12, color:"#8aab9e", marginTop:4 }}>
                      Progress logs will appear here as therapists update goals
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Current goal details */}
              {selectedGoal && (
                <div style={{ padding:"12px 18px", borderTop:"1px solid #f0f4f2", background:"#f8faf9" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:12.5, fontWeight:500, color:"#1a2724", maxWidth:"70%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {selectedGoal.title}
                    </span>
                    <span style={{ fontSize:12, fontWeight:600, color:selectedGoal.isAchieved?"#1a8c6e":"#2563a8" }}>
                      {selectedGoal.currentPct}% {selectedGoal.isAchieved?"✓ Achieved":""}
                    </span>
                  </div>
                  <div style={{ height:8, background:"#d6e8e0", borderRadius:20, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:selectedGoal.currentPct+"%", background:selectedGoal.isAchieved?"#1a8c6e":"#2563a8", borderRadius:20, transition:"width 0.3s" }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* All goals summary table */}
      {progress.goals?.length > 0 && (
        <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0" }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:"#1a2724" }}>All Goals Summary</div>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f8faf9", borderBottom:"1px solid #d6e8e0" }}>
                {["Goal","Progress","Status","Last Updated"].map((h,i) => (
                  <th key={i} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {progress.goals.map((g:any, i:number) => {
                const lastLog = g.logs[g.logs.length-1]
                return (
                  <tr key={i} style={{ borderBottom:"1px solid #f0f4f2" }}>
                    <td style={{ padding:"12px 16px", fontWeight:500, color:"#1a2724", maxWidth:300 }}>{g.title}</td>
                    <td style={{ padding:"12px 16px", minWidth:160 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ flex:1, height:6, background:"#f0f4f2", borderRadius:20, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:g.currentPct+"%", background:g.isAchieved?"#1a8c6e":"#2563a8", borderRadius:20 }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:600, color:g.isAchieved?"#1a8c6e":"#2563a8", width:36, textAlign:"right" }}>{g.currentPct}%</span>
                      </div>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:g.isAchieved?"#e6f4ef":"#e8f0fb", color:g.isAchieved?"#1a8c6e":"#2563a8", fontWeight:500 }}>
                        {g.isAchieved ? "✓ Achieved" : "In Progress"}
                      </span>
                    </td>
                    <td style={{ padding:"12px 16px", color:"#8aab9e", fontSize:12 }}>
                      {lastLog ? new Date(lastLog.date).toLocaleDateString('en-KE',{ day:'numeric', month:'short', year:'numeric' }) : "No logs yet"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}