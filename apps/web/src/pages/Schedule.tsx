import { useEffect, useState } from 'react'
import Layout from "../components/Layout"
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

const HOURS = ['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00']
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday', 'Saturday']
const COLORS: Record<string,string> = {
  OT:'#3b82f6', SPEECH:'#22c55e', ABA:'#a855f7',
  SENSORY:'#f97316', GROUP:'#eab308', PSYCH:'#ec4899', PHYSIO:'#0891b2',
}

type Client      = { id: string; fullName: string }
type StaffMember = { id: string; fullName: string; role: string }
type Appointment = {
  id: string; scheduledAt: string; therapyType: string; status: string
  durationMin: number; notes: string
  client?:    Client | null
  therapist?: { id: string; fullName: string } | null
  isRecurring?: boolean
}
type RecurringResult = {
  count: number
  first?: string | null
  last?: string | null
}
type ApiListResponse<T> = { data: T[] }
type ApiError = {
  response?: {
    data?: {
      message?: string
      error?: string
    }
  }
}

function errorMessage(err: unknown, fallback: string) {
  const r = (err as ApiError | undefined)?.response?.data
  return r?.message ?? r?.error ?? fallback
}

export default function Schedule() {
  const { user }    = useAuthStore()
  const isReadOnly  = user?.role === "THERAPIST"
  const isTherapist = user?.role === "THERAPIST"

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients]           = useState<Client[]>([])
  const [staff, setStaff]               = useState<StaffMember[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [weekOffset, setWeekOffset]     = useState(0)
  const [editAppt, setEditAppt]         = useState<Appointment | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [showRecurring, setShowRecurring]   = useState(false)
  const [recurPattern, setRecurPattern]     = useState<"WEEKLY"|"FORTNIGHTLY"|"CUSTOM">("WEEKLY")
  const [recurDays, setRecurDays]           = useState<number[]>([1])
  const [recurStartDate, setRecurStartDate] = useState('')
  const [recurStartTime, setRecurStartTime] = useState('09:00')
  const [recurWeeks, setRecurWeeks]         = useState(12)
  const [recurResult, setRecurResult]       = useState<RecurringResult | null>(null)
  const [savingRecur, setSavingRecur]       = useState(false)

  const [clientId,    setClientId]    = useState('')
  const [therapistId, setTherapistId] = useState('')
  const [therapyType, setTherapyType] = useState('OT')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMin, setDurationMin] = useState('50')
  const [notes, setNotes]             = useState('')
  const [status, setStatus]           = useState('SCHEDULED')

  useEffect(() => { loadData() }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      api.get('/appointments').catch(() => ({ data: [] })),
      api.get('/clients').catch(() => ({ data: [] })),
      api.get('/staff').catch(() => ({ data: [] })),
    ]).then(([a, c, s]: [ApiListResponse<Appointment>, ApiListResponse<Client>, ApiListResponse<StaffMember>]) => {
      setAppointments(a.data)
      setClients(c.data)
      setStaff(s.data)
    }).finally(() => setLoading(false))
  }

  function openAdd() {
    setEditAppt(null)
    setClientId(''); setTherapistId(''); setTherapyType('OT')
    setScheduledAt(''); setDurationMin('50'); setNotes(''); setStatus('SCHEDULED')
    setShowForm(true)
  }

  function openEdit(appt: Appointment) {
    setEditAppt(appt)
    setClientId(appt.client?.id ?? '')
    setTherapistId(appt.therapist?.id ?? '')
    setTherapyType(appt.therapyType)
    const d     = new Date(appt.scheduledAt)
    const local = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16)
    setScheduledAt(local)
    setDurationMin(String(appt.durationMin))
    setNotes(appt.notes ?? '')
    setStatus(appt.status)
    setSelectedAppt(null)
    setShowForm(true)
  }

  function getWeekDates() {
    const now    = new Date()
    const day    = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day===0?6:day-1) + weekOffset*7)
    monday.setHours(0,0,0,0)
    return DAYS.map((_,i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate()+i)
      return d
    })
  }

  function getApptForSlot(date: Date, hour: string) {
    const slotHour = parseInt(hour.split(':')[0])
    return appointments.filter(a => {
      const d = new Date(a.scheduledAt)
      const matchDate      = d.getFullYear()===date.getFullYear() && d.getMonth()===date.getMonth() && d.getDate()===date.getDate()
      const matchHour      = d.getHours()===slotHour
      const matchTherapist = !isTherapist || a.therapist?.id===user?.id
      return matchDate && matchHour && matchTherapist
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      if (editAppt) {
        await api.patch(`/appointments/${editAppt.id}`, {
          clientId, therapistId, therapyType,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMin: parseInt(durationMin), notes, status,
        })
      } else {
        await api.post('/appointments', {
          clientId, therapistId, therapyType,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMin: parseInt(durationMin), notes,
        })
      }
      setShowForm(false); loadData()
    } catch (err) { alert(errorMessage(err,'Failed to save appointment')) }
    finally { setSaving(false) }
  }

  async function deleteAppt() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await api.delete(`/appointments/${confirmDelete.id}`)
      setConfirmDelete(null); setSelectedAppt(null); loadData()
    } catch (err) { alert(errorMessage(err,'Failed to delete appointment')) }
    finally { setDeleting(false) }
  }

  async function saveRecurring(e: React.FormEvent) {
    e.preventDefault(); setSavingRecur(true); setRecurResult(null)
    try {
      const res = await api.post('/appointments/recurring', {
        clientId, therapistId, therapyType,
        startDate: recurStartDate, startTime: recurStartTime,
        durationMin: parseInt(durationMin),
        pattern: recurPattern, customDays: recurDays, weeks: recurWeeks, notes,
      })
      setRecurResult(res.data); loadData()
    } catch (err: unknown) {
      const error = err as ApiError
      alert(error.response?.data?.message ?? 'Failed to create recurring appointments')
    } finally { setSavingRecur(false) }
  }

  function toggleRecurDay(day: number) {
    setRecurDays(prev => prev.includes(day) ? prev.filter(d=>d!==day) : [...prev,day].sort())
  }

  const weekDates  = getWeekDates()
  const todayStr   = new Date().toDateString()
  const therapists = staff.filter(m => m.role==='THERAPIST')

  const STATUS_COLORS: Record<string,string> = {
    SCHEDULED:'#d97706', CONFIRMED:'#2563a8', IN_SESSION:'#7c3aed',
    COMPLETED:'#1a8c6e', CANCELLED:'#d63f5c', NO_SHOW:'#8aab9e',
  }
  const inp = { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #d6e8e0", fontSize:13, boxSizing:"border-box" as const }
  const lbl = { fontSize:12, color:"#4a6359", display:"block" as const, marginBottom:4 }

  return (
    <Layout title="Schedule" action={
      !isReadOnly ? (
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setShowRecurring(true); setRecurResult(null) }}
            style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #1a8c6e', background:'white', color:'#1a8c6e', cursor:'pointer', fontSize:13, fontWeight:500 }}>
            🔁 Recurring
          </button>
          <button onClick={openAdd}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#1a8c6e', color:'white', cursor:'pointer', fontSize:13, fontWeight:500 }}>
            + Book Session
          </button>
        </div>
      ) : undefined
    }>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, color:'#8aab9e' }}>
          Week of {weekDates[0].toLocaleDateString('en-KE',{ day:'numeric', month:'long', year:'numeric' })}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setWeekOffset(w=>w-1)} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', cursor:'pointer', fontSize:13 }}>← Prev</button>
          <button onClick={() => setWeekOffset(0)}      style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', cursor:'pointer', fontSize:13 }}>Today</button>
          <button onClick={() => setWeekOffset(w=>w+1)} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', cursor:'pointer', fontSize:13 }}>Next →</button>
        </div>
      </div>

      {isReadOnly && (
        <div style={{ padding:"10px 16px", borderRadius:10, background:"#e6f4ef", border:"1px solid #b6ddd1", fontSize:12.5, color:"#1a8c6e", marginBottom:14, textAlign:"center", fontWeight:500 }}>
          👁 Showing your sessions only — contact reception to book or change appointments
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#8aab9e' }}>Loading schedule...</div>
      ) : (
        <div style={{ background:'white', borderRadius:12, border:'1px solid #d6e8e0', overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>
                <th style={{ width:60, padding:'10px 12px', borderBottom:'2px solid #d6e8e0', borderRight:'1px solid #d6e8e0', color:'#8aab9e' }}></th>
                {weekDates.map((date,idx) => (
                  <th key={idx} style={{ padding:'10px 12px', borderBottom:'2px solid #d6e8e0', borderRight:'1px solid #eee', textAlign:'center', fontWeight:600, color:date.toDateString()===todayStr?'#1a8c6e':'#1a2724', background:date.toDateString()===todayStr?'#e6f4ef':'transparent' }}>
                    <div style={{ fontSize:13 }}>{DAYS[idx]}</div>
                    <div style={{ fontSize:11, fontWeight:400, color:'#8aab9e' }}>{date.toLocaleDateString('en-KE',{ day:'numeric', month:'short' })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour}>
                  <td style={{ padding:'6px 10px', borderBottom:'1px solid #f0f4f2', borderRight:'1px solid #d6e8e0', color:'#8aab9e', fontSize:11, whiteSpace:'nowrap', verticalAlign:'top', fontWeight:500 }}>
                    {hour}
                  </td>
                  {weekDates.map((date,dayIdx) => {
                    const slots = getApptForSlot(date, hour)
                    return (
                      <td key={dayIdx} style={{ padding:4, borderBottom:'1px solid #f0f4f2', borderRight:'1px solid #f0f4f2', minWidth:130, verticalAlign:'top', height:48, background:date.toDateString()===todayStr?'#f8fdf9':'white' }}>
                        {slots.map(appt => {
                          const color = COLORS[appt.therapyType]??'#8aab9e'
                          return (
                            <div key={appt.id}
                              onClick={() => setSelectedAppt(selectedAppt?.id===appt.id?null:appt)}
                              style={{ background:color+'22', border:'1px solid '+color+'66', borderRadius:6, padding:'4px 7px', marginBottom:3, cursor:'pointer' }}>
                              <div style={{ fontWeight:600, color, fontSize:11 }}>
                                {appt.client?.fullName ?? 'Client'}
                                {appt.isRecurring && <span style={{ marginLeft:4, fontSize:9 }}>🔁</span>}
                              </div>
                              <div style={{ fontSize:10, color:'#4a6359' }}>{appt.therapyType} · {appt.therapist?.fullName ?? 'Unassigned'}</div>
                              <div style={{ fontSize:9, marginTop:2, color:STATUS_COLORS[appt.status]??'#8aab9e', fontWeight:600 }}>{appt.status}</div>
                            </div>
                          )
                        })}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Appointment popup */}
      {selectedAppt && (
        <div style={{ position:'fixed', bottom:24, right:24, background:'white', border:'1px solid #d6e8e0', borderRadius:16, padding:20, width:300, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:50 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:13.5, fontWeight:600, color:'#1a2724' }}>Appointment</div>
            <button onClick={() => setSelectedAppt(null)} style={{ border:'none', background:'none', fontSize:18, cursor:'pointer', color:'#8aab9e' }}>×</button>
          </div>
          <div style={{ fontSize:12.5, color:'#4a6359', lineHeight:1.8 }}>
            <div><strong style={{ color:'#1a2724' }}>Client:</strong> {selectedAppt.client?.fullName??'—'}</div>
            <div><strong style={{ color:'#1a2724' }}>Type:</strong> {selectedAppt.therapyType}</div>
            <div><strong style={{ color:'#1a2724' }}>Therapist:</strong> {selectedAppt.therapist?.fullName??'Unassigned'}</div>
            <div><strong style={{ color:'#1a2724' }}>Time:</strong> {new Date(selectedAppt.scheduledAt).toLocaleString('en-KE',{ weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
            <div><strong style={{ color:'#1a2724' }}>Duration:</strong> {selectedAppt.durationMin} min</div>
            <div><strong style={{ color:'#1a2724' }}>Status:</strong> <span style={{ color:STATUS_COLORS[selectedAppt.status]??'#8aab9e', fontWeight:600 }}>{selectedAppt.status}</span></div>
            {selectedAppt.notes && <div><strong style={{ color:'#1a2724' }}>Notes:</strong> {selectedAppt.notes}</div>}
          </div>
          <a href="/sessions"
  style={{ display:"block", marginTop:10, padding:"8px 14px", borderRadius:8, background:"#7c3aed", color:"white", fontSize:12.5, fontWeight:500, textDecoration:"none", textAlign:"center" }}>
  ✏️ Write Session Note
</a>
          {!isReadOnly ? (
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={() => openEdit(selectedAppt)}
                style={{ flex:1, padding:'7px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', fontSize:12.5, cursor:'pointer', color:'#1a8c6e', fontWeight:500 }}>
                ✏️ Edit
              </button>
              <button onClick={() => { setConfirmDelete(selectedAppt); setSelectedAppt(null) }}
                style={{ flex:1, padding:'7px', borderRadius:8, border:'none', background:'#fde8ed', fontSize:12.5, cursor:'pointer', color:'#d63f5c', fontWeight:500 }}>
                🗑 Delete
              </button>
            </div>
          ) : (
            <div style={{ marginTop:14, padding:"8px 12px", borderRadius:8, background:"#f8faf9", fontSize:12, color:"#8aab9e", textAlign:"center" }}>
              👁 View only — contact reception to make changes
            </div>
          )}
        </div>

      {/* Book/Edit modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:500, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:16, fontWeight:600, color:'#1a2724', margin:0 }}>{editAppt?'Edit Session':'Book Session'}</h2>
              <button onClick={() => setShowForm(false)} style={{ border:'none', background:'none', fontSize:20, cursor:'pointer', color:'#8aab9e' }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label style={lbl}>Client</label>
                  <select required value={clientId} onChange={e=>setClientId(e.target.value)} style={inp}>
                    <option value="">Select client...</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.fullName}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Therapist</label>
                  <select value={therapistId} onChange={e=>setTherapistId(e.target.value)} style={inp}>
                    <option value="">Select therapist...</option>
                    {therapists.map(m=><option key={m.id} value={m.id}>{m.fullName}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Therapy type</label>
                  <select value={therapyType} onChange={e=>setTherapyType(e.target.value)} style={inp}>
                    <option value="OT">Occupational Therapy</option>
                    <option value="SPEECH">Speech Therapy</option>
                    <option value="ABA">ABA</option>
                    <option value="SENSORY">Sensory</option>
                    <option value="GROUP">Group</option>
                    <option value="PSYCH">Psychology</option>
                    <option value="PHYSIO">Physiotherapy</option>
                  </select>
                </div>
                <div><label style={lbl}>Duration (min)</label>
                  <input type="number" value={durationMin} onChange={e=>setDurationMin(e.target.value)} style={inp}/>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>Date and time</label>
                <input required type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} style={inp}/>
              </div>
              {editAppt && (
                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Status</label>
                  <select value={status} onChange={e=>setStatus(e.target.value)} style={inp}>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="IN_SESSION">In Session</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No Show</option>
                  </select>
                </div>
              )}
              <div style={{ marginBottom:20 }}>
                <label style={lbl}>Notes</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', fontSize:13, cursor:'pointer', color:'#4a6359' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:'9px 16px', borderRadius:8, border:'none', background:'#1a8c6e', color:'white', fontSize:13, fontWeight:500, cursor:'pointer', opacity:saving?0.7:1 }}>
                  {saving?'Saving...':editAppt?'Save Changes':'Book Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recurring modal */}
      {showRecurring && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:540, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <h2 style={{ fontSize:16, fontWeight:600, color:'#1a2724', margin:0 }}>🔁 Recurring Appointments</h2>
                <div style={{ fontSize:12, color:'#8aab9e', marginTop:4 }}>Generates up to 12 weeks — skips Kenya public holidays automatically</div>
              </div>
              <button onClick={() => { setShowRecurring(false); setRecurResult(null) }} style={{ border:'none', background:'none', fontSize:20, cursor:'pointer', color:'#8aab9e' }}>×</button>
            </div>

            {recurResult ? (
              <div>
                <div style={{ background:'#e6f4ef', border:'1px solid #b6ddd1', borderRadius:12, padding:'20px 24px', marginBottom:20 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:'#1a8c6e', marginBottom:12 }}>✓ Recurring appointments created!</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      { label:'Sessions booked', value: recurResult.count },
                      { label:'First session',   value: recurResult.first ? new Date(recurResult.first).toLocaleDateString('en-KE',{ weekday:'short', day:'numeric', month:'short' }) : '—' },
                      { label:'Last session',    value: recurResult.last  ? new Date(recurResult.last).toLocaleDateString('en-KE',{ weekday:'short', day:'numeric', month:'short' }) : '—' },
                    ].map((item,i) => (
                      <div key={i} style={{ background:'white', borderRadius:8, padding:'10px 14px' }}>
                        <div style={{ fontSize:11, color:'#8aab9e', textTransform:'uppercase', marginBottom:4 }}>{item.label}</div>
                        <div style={{ fontSize:16, fontWeight:600, color:'#1a2724' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setRecurResult(null)} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', fontSize:13, cursor:'pointer', color:'#4a6359' }}>Book Another</button>
                  <button onClick={() => { setShowRecurring(false); setRecurResult(null) }} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:'#1a8c6e', color:'white', fontSize:13, fontWeight:500, cursor:'pointer' }}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={saveRecurring}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  <div style={{ gridColumn:'span 2' }}><label style={lbl}>Client</label>
                    <select required value={clientId} onChange={e=>setClientId(e.target.value)} style={inp}>
                      <option value="">Select client...</option>
                      {clients.map(c=><option key={c.id} value={c.id}>{c.fullName}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Therapist</label>
                    <select value={therapistId} onChange={e=>setTherapistId(e.target.value)} style={inp}>
                      <option value="">Select therapist...</option>
                      {therapists.map(m=><option key={m.id} value={m.id}>{m.fullName}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Therapy type</label>
                    <select value={therapyType} onChange={e=>setTherapyType(e.target.value)} style={inp}>
                      <option value="OT">Occupational Therapy</option>
                      <option value="SPEECH">Speech Therapy</option>
                      <option value="ABA">ABA</option>
                      <option value="SENSORY">Sensory</option>
                      <option value="GROUP">Group</option>
                      <option value="PSYCH">Psychology</option>
                      <option value="PHYSIO">Physiotherapy</option>
                    </select>
                  </div>
                  <div><label style={lbl}>Start date</label>
                    <input required type="date" value={recurStartDate} onChange={e=>setRecurStartDate(e.target.value)} style={inp}/>
                  </div>
                  <div><label style={lbl}>Session time</label>
                    <input required type="time" value={recurStartTime} onChange={e=>setRecurStartTime(e.target.value)} style={inp}/>
                  </div>
                  <div><label style={lbl}>Duration (min)</label>
                    <input type="number" value={durationMin} onChange={e=>setDurationMin(e.target.value)} style={inp}/>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:12, color:'#4a6359', display:'block', marginBottom:8 }}>Recurrence pattern</label>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    {([["WEEKLY","Every week"],["FORTNIGHTLY","Every 2 weeks"],["CUSTOM","Custom days"]] as const).map(([val,label]) => (
                      <button key={val} type="button" onClick={() => setRecurPattern(val)}
                        style={{ padding:'7px 14px', borderRadius:8, border:'1px solid', borderColor:recurPattern===val?'#1a8c6e':'#d6e8e0', background:recurPattern===val?'#e6f4ef':'white', color:recurPattern===val?'#1a8c6e':'#4a6359', fontSize:12.5, fontWeight:500, cursor:'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {recurPattern === 'CUSTOM' && (
                    <div style={{ display:'flex', gap:6 }}>
                      {[['S',0],['M',1],['T',2],['W',3],['T',4],['F',5],['S',6]].map(([label,day]) => (
                        <button key={day} type="button" onClick={() => toggleRecurDay(day as number)}
                          style={{ width:36, height:36, borderRadius:'50%', border:'1px solid', borderColor:recurDays.includes(day as number)?'#1a8c6e':'#d6e8e0', background:recurDays.includes(day as number)?'#1a8c6e':'white', color:recurDays.includes(day as number)?'white':'#4a6359', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:12, color:'#4a6359', display:'block', marginBottom:8 }}>Generate for how many weeks?</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {[4,8,12].map(w => (
                      <button key={w} type="button" onClick={() => setRecurWeeks(w)}
                        style={{ padding:'7px 16px', borderRadius:8, border:'1px solid', borderColor:recurWeeks===w?'#1a8c6e':'#d6e8e0', background:recurWeeks===w?'#e6f4ef':'white', color:recurWeeks===w?'#1a8c6e':'#4a6359', fontSize:12.5, fontWeight:500, cursor:'pointer' }}>
                        {w} weeks{w===12?' (1 term)':''}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background:'#fef3c7', border:'1px solid #fbbf24', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12.5, color:'#92400e' }}>
                  🇰🇪 Kenya public holidays will be automatically skipped.
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Notes (applied to all sessions)</label>
                  <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional..." style={inp}/>
                </div>

                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                  <button type="button" onClick={() => setShowRecurring(false)} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', fontSize:13, cursor:'pointer', color:'#4a6359' }}>Cancel</button>
                  <button type="submit" disabled={savingRecur} style={{ padding:'9px 16px', borderRadius:8, border:'none', background:'#1a8c6e', color:'white', fontSize:13, fontWeight:500, cursor:'pointer', opacity:savingRecur?0.7:1 }}>
                    {savingRecur?'Creating...':'Generate Sessions'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'white', borderRadius:16, padding:28, width:400 }}>
            <div style={{ fontSize:16, fontWeight:600, color:'#1a2724', marginBottom:10 }}>Delete appointment?</div>
            <div style={{ fontSize:13, color:'#4a6359', marginBottom:20, lineHeight:1.6 }}>
              Permanently delete the <strong>{confirmDelete.therapyType}</strong> session for <strong>{confirmDelete.client?.fullName??'this client'}</strong>. Session notes will also be deleted.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #d6e8e0', background:'white', fontSize:13, cursor:'pointer', color:'#4a6359' }}>Cancel</button>
              <button onClick={deleteAppt} disabled={deleting} style={{ padding:'9px 16px', borderRadius:8, border:'none', background:'#d63f5c', color:'white', fontSize:13, fontWeight:500, cursor:'pointer', opacity:deleting?0.7:1 }}>
                {deleting?'Deleting...':'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}