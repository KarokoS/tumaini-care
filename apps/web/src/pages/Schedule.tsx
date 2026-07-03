import { useEffect, useState } from 'react'
import Layout from "../components/Layout"
import api from '../lib/api'

const HOURS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const COLORS: Record<string, string> = {
  OT:      '#3b82f6',
  SPEECH:  '#22c55e',
  ABA:     '#a855f7',
  SENSORY: '#f97316',
  GROUP:   '#eab308',
  PSYCH:   '#ec4899',
  PHYSIO:  '#0891b2',
}

type Client = { id: string; fullName: string }
type StaffMember = { id: string; fullName: string; role: string }
type Appointment = {
  id: string
  scheduledAt: string
  therapyType: string
  status: string
  client?: Client | null
  therapist?: { fullName: string } | null
}
type ApiList<T> = { data: T[] }

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string; error?: string } } }).response
  return response?.data?.message ?? response?.data?.error ?? fallback
}

export default function Schedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
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

  useEffect(() => {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      api.get<Appointment[]>('/appointments').catch((): ApiList<Appointment> => ({ data: [] })),
      api.get<Client[]>('/clients').catch((): ApiList<Client> => ({ data: [] })),
      api.get<StaffMember[]>('/staff').catch((): ApiList<StaffMember> => ({ data: [] })),
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
    } catch (err: unknown) {
      alert(errorMessage(err, 'Failed to book appointment'))
    } finally {
      setSaving(false)
    }
  }

  const weekDates = getWeekDates()
  const todayStr = new Date().toDateString()
  const therapists = staff.filter(member => member.role === 'THERAPIST')

  return (
    <Layout title="Schedule" action={
      <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1a8c6e', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>+ Book Session</button>
    }>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#8aab9e' }}>
          Week of {weekDates[0].toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d6e8e0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Prev</button>
          <button onClick={() => setWeekOffset(0)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d6e8e0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Today</button>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d6e8e0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Next</button>
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
                {weekDates.map((date, index) => (
                  <th key={date.toISOString()} style={{ padding: '10px 12px', borderBottom: '2px solid #d6e8e0', borderRight: '1px solid #eee', textAlign: 'center', fontWeight: 600, color: date.toDateString() === todayStr ? '#1a8c6e' : '#1a2724', background: date.toDateString() === todayStr ? '#e6f4ef' : 'transparent' }}>
                    <div style={{ fontSize: 13 }}>{DAYS[index]}</div>
                    <div style={{ fontSize: 11, fontWeight: 400, color: '#8aab9e', marginTop: 2 }}>{date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour}>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f4f2', borderRight: '1px solid #d6e8e0', color: '#8aab9e', fontSize: 11, whiteSpace: 'nowrap', verticalAlign: 'top', fontWeight: 500 }}>
                    {hour}
                  </td>
                  {weekDates.map(date => {
                    const slots = getApptForSlot(date, hour)
                    return (
                      <td key={`${date.toISOString()}-${hour}`} style={{ padding: 4, borderBottom: '1px solid #f0f4f2', borderRight: '1px solid #f0f4f2', minWidth: 130, verticalAlign: 'top', height: 48 }}>
                        {slots.map(appointment => {
                          const color = COLORS[appointment.therapyType] ?? '#8aab9e'
                          return (
                            <div key={appointment.id} style={{ background: color + '22', border: '1px solid ' + color + '66', borderRadius: 6, padding: '4px 7px', marginBottom: 3 }}>
                              <div style={{ fontWeight: 600, color, fontSize: 11 }}>{appointment.client?.fullName ?? 'Client'}</div>
                              <div style={{ fontSize: 10, color: '#4a6359' }}>{appointment.therapyType} · {appointment.therapist?.fullName ?? 'Therapist'}</div>
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
                    {clients.map(client => <option key={client.id} value={client.id}>{client.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Therapist</label>
                  <select required value={therapistId} onChange={e => setTherapistId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">Select therapist...</option>
                    {therapists.map(member => <option key={member.id} value={member.id}>{member.fullName}</option>)}
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
                    <option value="PHYSIO">Physiotherapy</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#4a6359', display: 'block', marginBottom: 4 }}>Duration (min)</label>
                  <input type="number" min="1" value={durationMin} onChange={e => setDurationMin(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d6e8e0', fontSize: 13, boxSizing: 'border-box' }} />
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
    </Layout>
  )
}
