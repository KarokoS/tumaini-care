import { useEffect, useState } from "react"
import api from "../lib/api"
import Layout from "../components/Layout"

const HOURS = ['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00',]
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday', 'Saturday']

const THERAPY_COLORS: Record<string,string> = {
  OT:'#3b82f6', SPEECH:'#22c55e', ABA:'#a855f7',
  SENSORY:'#f97316', GROUP:'#eab308', PSYCH:'#ec4899', PHYSIO:'#0891b2',
  LUNCH:'#8aab9e', ADMIN:'#64748b', BREAK:'#94a3b8',
}

const STATUS_COLORS: Record<string,string> = {
  SCHEDULED:'#d97706', CONFIRMED:'#2563a8', IN_SESSION:'#7c3aed',
  COMPLETED:'#1a8c6e', CANCELLED:'#d63f5c', NO_SHOW:'#8aab9e',
}

type StaffMember  = { id: string; fullName: string; role: string; specialty?: string | null }
type Appointment  = {
  id: string; scheduledAt: string; therapyType: string
  status: string; durationMin: number; notes?: string
  client?:    { fullName: string } | null
  therapist?: { id: string; fullName: string } | null
}
type BlockedSlot  = { day: number; hour: number; type: 'LUNCH'|'ADMIN'|'BREAK'; label: string }

const DEFAULT_BLOCKED: BlockedSlot[] = [
  ...([1,2,3,4,5].map(day => ({ day, hour: 13, type: 'LUNCH'  as const, label: 'Lunch Break' }))),
  ...([1,2,3,4,5].map(day => ({ day, hour: 10, type: 'BREAK'  as const, label: 'Tea Break'   }))),
]

export default function Timetable() {
  const [staff,        setStaff]        = useState<StaffMember[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState<'single'|'all'>('single')
  const [timeRange,    setTimeRange]    = useState<'week'|'month'>('week')
  const [weekOffset,   setWeekOffset]   = useState(0)
  const [monthOffset,  setMonthOffset]  = useState(0)
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>(DEFAULT_BLOCKED)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockDay,     setBlockDay]     = useState(1)
  const [blockHour,    setBlockHour]    = useState(13)
  const [blockType,    setBlockType]    = useState<'LUNCH'|'ADMIN'|'BREAK'>('ADMIN')
  const [blockLabel,   setBlockLabel]   = useState('')

  useEffect(() => { loadData() }, [])

  function loadData() {
    Promise.all([
      api.get('/staff').catch(() => ({ data: [] })),
      api.get('/appointments').catch(() => ({ data: [] })),
    ]).then(([s, a]: any) => {
      const therapists = s.data.filter((m: StaffMember) => m.role === 'THERAPIST')
      setStaff(therapists)
      if (therapists.length > 0) setSelectedStaff(therapists[0].id)
      setAppointments(a.data)
    }).finally(() => setLoading(false))
  }

  // ── Week helpers ──
  function getWeekDates(): Date[] {
    const now    = new Date()
    const day    = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
    monday.setHours(0,0,0,0)
    return DAYS.map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  function getApptForSlot(date: Date, hour: string, therapistId?: string): Appointment[] {
    const slotHour = parseInt(hour)
    return appointments.filter(a => {
      const d = new Date(a.scheduledAt)
      const matchDate      = d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate()
      const matchHour      = d.getHours() === slotHour
      const matchTherapist = !therapistId || a.therapist?.id === therapistId
      return matchDate && matchHour && matchTherapist
    })
  }

  function isBlocked(dayIdx: number, hour: string): BlockedSlot | null {
    const h = parseInt(hour)
    return blockedSlots.find(b => b.day === dayIdx + 1 && b.hour === h) ?? null
  }

  // ── Month helpers ──
  function getMonthInfo() {
    const now   = new Date()
    const year  = now.getFullYear()
    const month = now.getMonth() + monthOffset
    const first = new Date(year, month, 1)
    const last  = new Date(year, month + 1, 0)
    return { year, month, first, last, daysInMonth: last.getDate(), firstDayOfWeek: first.getDay() }
  }

  function getApptForDay(date: Date, therapistId?: string): Appointment[] {
    return appointments.filter(a => {
      const d = new Date(a.scheduledAt)
      const matchDate      = d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate()
      const matchTherapist = !therapistId || a.therapist?.id === therapistId
      return matchDate && matchTherapist
    })
  }

  function addBlockedSlot(e: React.FormEvent) {
    e.preventDefault()
    setBlockedSlots(prev => [...prev, { day: blockDay, hour: blockHour, type: blockType, label: blockLabel || (blockType === 'LUNCH' ? 'Lunch Break' : blockType === 'ADMIN' ? 'Admin Time' : 'Break') }])
    setShowBlockForm(false)
    setBlockLabel('')
  }

  function removeBlockedSlot(slot: BlockedSlot) {
    setBlockedSlots(prev => prev.filter(b => !(b.day === slot.day && b.hour === slot.hour)))
  }

  const weekDates   = getWeekDates()
  const todayStr    = new Date().toDateString()
  const monthInfo   = getMonthInfo()
  const therapists  = staff

  // Stats for selected therapist
  const selectedTherapistAppts = appointments.filter(a =>
    !selectedStaff || a.therapist?.id === selectedStaff
  )
  const thisWeekAppts = selectedTherapistAppts.filter(a => {
    const d = new Date(a.scheduledAt)
    return weekDates.some(wd => wd.toDateString() === d.toDateString())
  })
  const completedThisWeek = thisWeekAppts.filter(a => a.status === 'COMPLETED')

  return (
    <Layout title="Staff Timetable">

      {/* Controls */}
      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>

        {/* View toggle */}
        <div style={{ display:"flex", gap:4, background:"#f0f4f2", borderRadius:8, padding:4 }}>
          {([['single','👤 Single Therapist'],['all','👥 All Therapists']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding:"6px 14px", borderRadius:6, border:"none", background:view===v?"white":"transparent", color:view===v?"#1a8c6e":"#4a6359", fontSize:12.5, fontWeight:view===v?600:400, cursor:"pointer", boxShadow:view===v?"0 1px 4px rgba(0,0,0,0.1)":undefined }}>
              {label}
            </button>
          ))}
        </div>

        {/* Time range toggle */}
        <div style={{ display:"flex", gap:4, background:"#f0f4f2", borderRadius:8, padding:4 }}>
          {([['week','📅 Week'],['month','📆 Month']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTimeRange(v)}
              style={{ padding:"6px 14px", borderRadius:6, border:"none", background:timeRange===v?"white":"transparent", color:timeRange===v?"#1a8c6e":"#4a6359", fontSize:12.5, fontWeight:timeRange===v?600:400, cursor:"pointer", boxShadow:timeRange===v?"0 1px 4px rgba(0,0,0,0.1)":undefined }}>
              {label}
            </button>
          ))}
        </div>

        {/* Therapist selector for single view */}
        {view === 'single' && (
          <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
            style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, color:"#1a2724", background:"white" }}>
            {therapists.map(t => (
              <option key={t.id} value={t.id}>{t.fullName}{t.specialty ? ` — ${t.specialty}` : ''}</option>
            ))}
          </select>
        )}

        {/* Week navigation */}
        {timeRange === 'week' && (
          <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
            <button onClick={() => setWeekOffset(w=>w-1)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", fontSize:13 }}>← Prev</button>
            <button onClick={() => setWeekOffset(0)}      style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", fontSize:13 }}>Today</button>
            <button onClick={() => setWeekOffset(w=>w+1)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", fontSize:13 }}>Next →</button>
          </div>
        )}

        {/* Month navigation */}
        {timeRange === 'month' && (
          <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
            <button onClick={() => setMonthOffset(m=>m-1)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", fontSize:13 }}>← Prev</button>
            <button onClick={() => setMonthOffset(0)}      style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", fontSize:13 }}>This Month</button>
            <button onClick={() => setMonthOffset(m=>m+1)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", cursor:"pointer", fontSize:13 }}>Next →</button>
          </div>
        )}
      </div>

      {/* Stats bar — single view only */}
      {view === 'single' && selectedStaff && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
          {[
            { label:"This Week",      value: thisWeekAppts.length,      color:"#2563a8", sub:"sessions scheduled" },
            { label:"Completed",      value: completedThisWeek.length,  color:"#1a8c6e", sub:"this week" },
            { label:"Total Sessions", value: selectedTherapistAppts.length, color:"#7c3aed", sub:"all time" },
            { label:"Completion Rate",value: selectedTherapistAppts.length > 0
                ? Math.round(selectedTherapistAppts.filter(a=>a.status==='COMPLETED').length / selectedTherapistAppts.length * 100)+"%" : "—",
              color:"#d97706", sub:"all time" },
          ].map((s,i) => (
            <div key={i} style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"14px 18px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:600, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11.5, color:"#8aab9e" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#8aab9e" }}>Loading timetable...</div>
      ) : (

        <>
          {/* ══ WEEK VIEW ══ */}
          {timeRange === 'week' && (
            <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", overflow:"auto", marginBottom:14 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr>
                    <th style={{ width:60, padding:"10px 12px", borderBottom:"2px solid #d6e8e0", borderRight:"1px solid #d6e8e0", color:"#8aab9e", fontWeight:500 }}>Time</th>
                    {view === 'single' ? (
                      weekDates.map((date, idx) => (
                        <th key={idx} style={{ padding:"10px 12px", borderBottom:"2px solid #d6e8e0", borderRight:"1px solid #eee", textAlign:"center", fontWeight:600, color:date.toDateString()===todayStr?"#1a8c6e":"#1a2724", background:date.toDateString()===todayStr?"#e6f4ef":"transparent" }}>
                          <div style={{ fontSize:13 }}>{DAYS[idx]}</div>
                          <div style={{ fontSize:11, fontWeight:400, color:"#8aab9e" }}>{date.toLocaleDateString('en-KE',{ day:'numeric', month:'short' })}</div>
                        </th>
                      ))
                    ) : (
                      therapists.map(t => (
                        <th key={t.id} style={{ padding:"10px 12px", borderBottom:"2px solid #d6e8e0", borderRight:"1px solid #eee", textAlign:"center", fontWeight:600, color:"#1a2724" }}>
                          <div style={{ fontSize:12 }}>{t.fullName.split(' ')[0]}</div>
                          {t.specialty && <div style={{ fontSize:10, color:"#8aab9e", fontWeight:400 }}>{t.specialty}</div>}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map(hour => (
                    <tr key={hour}>
                      <td style={{ padding:"4px 10px", borderBottom:"1px solid #f0f4f2", borderRight:"1px solid #d6e8e0", color:"#8aab9e", fontSize:11, whiteSpace:"nowrap", verticalAlign:"top", fontWeight:500 }}>
                        {hour}
                      </td>
                      {view === 'single' ? (
                        weekDates.map((date, dayIdx) => {
                          const slots   = getApptForSlot(date, hour, selectedStaff)
                          const blocked = isBlocked(dayIdx, hour)
                          return (
                            <td key={dayIdx} style={{ padding:4, borderBottom:"1px solid #f0f4f2", borderRight:"1px solid #f0f4f2", minWidth:130, verticalAlign:"top", height:52, background:date.toDateString()===todayStr?"#f8fdf9":"white" }}>
                              {blocked ? (
                                <div style={{ background:THERAPY_COLORS[blocked.type]+"22", border:"1px dashed "+THERAPY_COLORS[blocked.type], borderRadius:6, padding:"4px 7px", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                                  <span style={{ fontSize:10.5, color:THERAPY_COLORS[blocked.type], fontWeight:600 }}>{blocked.label}</span>
                                  <button onClick={() => removeBlockedSlot(blocked)} style={{ border:"none", background:"none", cursor:"pointer", color:THERAPY_COLORS[blocked.type], fontSize:12, padding:0 }}>×</button>
                                </div>
                              ) : slots.length === 0 ? (
                                <div style={{ height:"100%", minHeight:44 }} />
                              ) : slots.map(appt => {
                                const color = THERAPY_COLORS[appt.therapyType] ?? '#8aab9e'
                                return (
                                  <div key={appt.id} style={{ background:color+"22", border:"1px solid "+color+"66", borderRadius:6, padding:"4px 7px", marginBottom:2 }}>
                                    <div style={{ fontWeight:600, color, fontSize:10.5 }}>{appt.client?.fullName ?? 'Client'}</div>
                                    <div style={{ fontSize:9.5, color:"#4a6359" }}>{appt.therapyType} · {appt.durationMin}min</div>
                                    <div style={{ fontSize:9, color:STATUS_COLORS[appt.status], fontWeight:600 }}>{appt.status}</div>
                                  </div>
                                )
                              })}
                            </td>
                          )
                        })
                      ) : (
                        therapists.map(therapist => {
                          const allSlotsForTherapist = weekDates.flatMap(date => getApptForSlot(date, hour, therapist.id))
                          return (
                            <td key={therapist.id} style={{ padding:4, borderBottom:"1px solid #f0f4f2", borderRight:"1px solid #f0f4f2", minWidth:120, verticalAlign:"top", height:52 }}>
                              {allSlotsForTherapist.map(appt => {
                                const color = THERAPY_COLORS[appt.therapyType] ?? '#8aab9e'
                                const d     = new Date(appt.scheduledAt)
                                return (
                                  <div key={appt.id} style={{ background:color+"22", border:"1px solid "+color+"66", borderRadius:6, padding:"3px 6px", marginBottom:2 }}>
                                    <div style={{ fontSize:10, fontWeight:600, color }}>{appt.client?.fullName?.split(' ')[0] ?? 'Client'}</div>
                                    <div style={{ fontSize:9, color:"#8aab9e" }}>{DAYS[d.getDay()-1]?.slice(0,3)} {d.toLocaleDateString('en-KE',{ day:'numeric', month:'short' })}</div>
                                  </div>
                                )
                              })}
                            </td>
                          )
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ MONTH VIEW ══ */}
          {timeRange === 'month' && (
            <div style={{ background:"white", borderRadius:12, border:"1px solid #d6e8e0", overflow:"hidden", marginBottom:14 }}>
              <div style={{ padding:"14px 18px", borderBottom:"1px solid #d6e8e0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:15, fontWeight:600, color:"#1a2724" }}>
                  {new Date(monthInfo.year, monthInfo.month).toLocaleDateString('en-KE',{ month:'long', year:'numeric' })}
                </div>
                <div style={{ fontSize:12.5, color:"#8aab9e" }}>
                  {view === 'single' && selectedStaff && staff.find(s=>s.id===selectedStaff)?.fullName}
                </div>
              </div>
              <div style={{ padding:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:8 }}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:"#8aab9e", padding:"4px 0" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                  {Array.from({ length: 42 }, (_, i) => {
                    const dayNum   = i - monthInfo.firstDayOfWeek + 1
                    const valid    = dayNum >= 1 && dayNum <= monthInfo.daysInMonth
                    const date     = valid ? new Date(monthInfo.year, monthInfo.month, dayNum) : null
                    const isToday  = date?.toDateString() === new Date().toDateString()
                    const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false
                    const dayAppts = date ? getApptForDay(date, view === 'single' ? selectedStaff : undefined) : []
                    const completed = dayAppts.filter(a => a.status === 'COMPLETED').length
                    const scheduled = dayAppts.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length

                    return (
                      <div key={i} style={{ minHeight:80, border:"1px solid #f0f4f2", borderRadius:8, padding:6, background:isToday?"#e6f4ef":isWeekend&&valid?"#fafafa":"white", opacity:valid?1:0.3 }}>
                        {valid && (
                          <>
                            <div style={{ fontSize:12, fontWeight:isToday?700:400, color:isToday?"#1a8c6e":"#1a2724", marginBottom:4 }}>{dayNum}</div>
                            {dayAppts.length > 0 && (
                              <div>
                                {completed > 0 && (
                                  <div style={{ fontSize:10, padding:"1px 5px", borderRadius:10, background:"#e6f4ef", color:"#1a8c6e", fontWeight:600, marginBottom:2, display:"inline-block" }}>
                                    {completed} done
                                  </div>
                                )}
                                {scheduled > 0 && (
                                  <div style={{ fontSize:10, padding:"1px 5px", borderRadius:10, background:"#fef3c7", color:"#d97706", fontWeight:600, marginBottom:2, display:"inline-block", marginLeft:2 }}>
                                    {scheduled} upcoming
                                  </div>
                                )}
                                {view === 'all' && dayAppts.slice(0,2).map((a,ai) => {
                                  const color = THERAPY_COLORS[a.therapyType]??"#8aab9e"
                                  return (
                                    <div key={ai} style={{ fontSize:9.5, padding:"1px 4px", borderRadius:4, background:color+"22", color, marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                      {a.therapist?.fullName?.split(' ')[0]} — {a.client?.fullName?.split(' ')[0]}
                                    </div>
                                  )
                                })}
                                {view === 'all' && dayAppts.length > 2 && (
                                  <div style={{ fontSize:9, color:"#8aab9e" }}>+{dayAppts.length-2} more</div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ Add blocked slot ══ */}
          {view === 'single' && timeRange === 'week' && (
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
              <button onClick={() => setShowBlockForm(true)}
                style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:12.5, cursor:"pointer", color:"#4a6359" }}>
                + Add Lunch / Admin Block
              </button>
            </div>
          )}

          {/* Legend */}
          <div style={{ background:"white", border:"1px solid #d6e8e0", borderRadius:12, padding:"14px 18px", display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8aab9e", textTransform:"uppercase" }}>Legend</div>
            {Object.entries(THERAPY_COLORS).map(([type, color]) => (
              <div key={type} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:color }} />
                <span style={{ fontSize:11.5, color:"#4a6359" }}>{type}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add block modal */}
      {showBlockForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"white", borderRadius:16, padding:28, width:400 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:15, fontWeight:600, color:"#1a2724", margin:0 }}>Add Time Block</h2>
              <button onClick={() => setShowBlockForm(false)} style={{ border:"none", background:"none", fontSize:20, cursor:"pointer", color:"#8aab9e" }}>×</button>
            </div>
            <form onSubmit={addBlockedSlot}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Day</label>
                  <select value={blockDay} onChange={e=>setBlockDay(Number(e.target.value))}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }}>
                    {DAYS.map((d,i) => <option key={i} value={i+1}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Hour</label>
                  <select value={blockHour} onChange={e=>setBlockHour(Number(e.target.value))}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }}>
                    {HOURS.map(h => <option key={h} value={parseInt(h)}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Type</label>
                  <select value={blockType} onChange={e=>setBlockType(e.target.value as any)}
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }}>
                    <option value="LUNCH">Lunch Break</option>
                    <option value="ADMIN">Admin Time</option>
                    <option value="BREAK">Break</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#4a6359", display:"block", marginBottom:4 }}>Label (optional)</label>
                  <input value={blockLabel} onChange={e=>setBlockLabel(e.target.value)} placeholder="e.g. Team meeting"
                    style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setShowBlockForm(false)} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #d6e8e0", background:"white", fontSize:13, cursor:"pointer", color:"#4a6359" }}>Cancel</button>
                <button type="submit" style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#1a8c6e", color:"white", fontSize:13, fontWeight:500, cursor:"pointer" }}>Add Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}