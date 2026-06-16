import { useEffect, useState } from 'react'
import api from '../lib/api'

const HOURS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const COLORS: Record<string, string> = {
  OT: '#3b82f6', SPEECH: '#22c55e', ABA: '#a855f7',
  SENSORY: '#f97316', GROUP: '#eab308', PSYCH: '#ec4899'
}

const NAV = [
  ['Dashboard', '/dashboard'],
  ['Clients', '/clients'],
  ['Schedule', '/schedule'],
  ['Sessions', '/sessions'],
  ['Therapy Plans', '/plans'],
  ['Billing', '/billing'],
  ['Staff', '/staff'],
  ['Reports', '/reports'],
]

export default function Schedule() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [clientId, setClientId] = useState('')
  const [therapistId, setTherapistId] = useState('')
  const [therapyType, setTherapyType] = useState('OT')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMin, setDurationMin] = useState('50')
  const [notes, setNotes] = useState('')

  useEffect(() => { loadData() }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      api.get('/appointments').catch(() => ({ data: [] })),
      api.get('/clients').catch(() => ({ data: [] })),
      api.get('/staff').catch(() => ({ data: [] })),
    ]).then(([a, c, s]) => {
      setAppointments(a.data)
      setClients(c.data)
      setStaff(s.data)
    }).finally(() => setLoading(false))
  }

  function getWeekDates() {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    const diff = day === 0 ? 6 : day - 1
    monday.setDate(now.getDate() - diff + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)
    return DAYS.map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  function getApptForSlot(date: Date, hour: string) {
    const slotHour = parseInt(hour.split(':')[0])
    return appointments.filter(a => {
      const d = new Date(a.scheduledAt)
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate() &&
        d.getHours() === slotHour
      )
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/appointments', {
        clientId,
        therapistId,
        therapyType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMin: parseInt(durationMin),
        notes,
      })
      setShowForm(false)
      setClientId('')
      setTherapistId('')
      setTherapyType('OT')
      setScheduledAt('')
      setDurationMin('50')
      setNotes('')
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to book appointment')
    } finally {
      setSaving(false)
    }
  }

  const weekDates = getWeekDates()
  const todayStr = new Date().toDateString()
  const path = window.location.pathname

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f5' }}>
      <aside style={{ width: 224, background: 'white', borderRight: '1px solid #d6e8e0', position: 'fixed', top: 0, left: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #d6e8e0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#1a8c6e', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>T</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a8c6e' }}>Tumaini</div>
            <div style={{ fontSize: 10, color: '#8aab9e' }}>St. Thorlak Centre</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: 12 }}>
          {NAV.map((item, idx) => (
            <a
              key={idx}
              href={item[1]}
              style={{
                display: 'block',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                color: path === item[1] ? '#1a8c6e' : '#4a6359',
                background: path === item[1] ? '#e6f4ef' : 'transparent',
                fontWeight: path === item[1] ? 600 : 400,
                textDecoration: 'none',
                marginBottom: 2
              }}
            >
              {item[0]}
            </a>
          ))}
        </nav>
      </aside>

      <main style={{ marginLeft: 224, flex: 1, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a2724', margin: 0 }}>Schedule</h1>
            <p style={{ fontSize: 13, color: '#8aab9e', margin: '4px 0 0' }}>
              Week of {weekDates[0].toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d6e8e0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Prev</button>
            <button onClick={() => setWeekOffset(0)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d6e8e0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Today</button>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d6e8e0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Next</button>
            <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1a8c6e', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>+ Book Session</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8aab9e' }}>Loading schedule...</div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #d6e8e0', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 60, padding: '10px 12px', borderBottom: '2px solid #d6e8e0', borderRight: '1px solid #d6e8e0', color: '#8aab9e' }}></th>
                  {weekDates.map((d, i) => (
                    <th key={i} style={{ padding: '10px 12px', borderBottom: '2px solid #d6e8e0', borderRight: '1px solid #eee', textAlign: 'center', fontWeight: 600, color: d.toDateString() === todayStr ? '#1a8c6e' : '#1a2724', background: d.toDateString() === todayStr ? '#e6f4ef' : 'transparent' }}>
                      <div style={{ fontSize: 13 }}>{DAYS[i]}</div>
                      <div style={{ fontSize: 11, fontWeight: 400, color: '#8aab9e', marginTop: 2 }}>{d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, hi) => (
                  <tr key={hi}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f4f2', borderRight: '1px solid #d6e8e0', color: '#8aab9e', fontSize: 11, whiteSpace: 'nowrap', verticalAlign: 'top', fontWeight: 500 }}>
                      {hour}
                    </td>
                    {weekDates.map((d, di) => {
                      const slots = getApptForSlot(d, hour)
                      return (
                        <td key={di} style={{ padding: 4, borderBottom: '1px solid #f0f4f2', borderRight: '1px solid #f0f4f2', minWidth: 130, verticalAlign: 'top', height: 44 }}>
                          {slots.map((a, ai) => (
                            <div key={ai} style={{ background: (COLORS[a.therapyType] ?? '#888') + '22', border: '1px solid ' + (COLORS[a.therapyType] ?? '#888') + '66', borderRadius: 6, padding: '3px 7px', marginBottom: 2 }}>
                              <div style={{ fontWeight: 600, color: COLORS[a.therapyType] ?? '#888', fontSize: 11 }}>
                                {a.client ? a.client.fullName : 'Client'}
                              </div>
                              <div style={{ fontSize: 10, color: '#4a6359' }}>
                                {a.therapyType}
                              </div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a2724', margin: 0 }}>Book Session</h2>
              <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#8aab9e' }}>x</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Client</label>
                  <select required value={clientId} onChange={e => setClientId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">Select client...</option>
                    {clients.map((c, i) => (
                      <option key={i} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Therapist</label>
                  <select required value={therapistId} onChange={e => setTherapistId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">Select therapist...</option>
                    {staff.filter(s => s.role === 'THERAPIST').map((s, i) => (
                      <option key={i} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Therapy type</label>
                  <select value={therapyType} onChange={e => setTherapyType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="OT">Occupational Therapy</option>
                    <option value="SPEECH">Speech Therapy</option>
                    <option value="ABA">ABA</option>
                    <option value="SENSORY">Sensory</option>
                    <option value="GROUP">Group</option>
                    <option value="PSYCH">Psychology</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Duration (min)</label>
                  <input type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Date and time</label>
                <input required type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #d6e8e0', background: 'white', fontSize: 13, cursor: 'pointer', color: '#4a6359' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#1a8c6e', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Book Session'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}