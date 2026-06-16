import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/clients')
      .then(res => setClients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f5' }}>

      <aside style={{ width: 224, background: 'white', borderRight: '1px solid #d6e8e0', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100%' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #d6e8e0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#1a8c6e', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>T</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a8c6e' }}>Tumaini</div>
            <div style={{ fontSize: 10, color: '#8aab9e' }}>St. Thorlak Centre</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: 12 }}>
          <a href="/dashboard" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#1a8c6e', background: '#e6f4ef', fontWeight: 600, textDecoration: 'none', marginBottom: 2 }}>Dashboard</a>
          <a href="/clients" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#4a6359', textDecoration: 'none', marginBottom: 2 }}>Clients</a>
          <a href="/schedule" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#4a6359', textDecoration: 'none', marginBottom: 2 }}>Schedule</a>
          <a href="/sessions" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#4a6359', textDecoration: 'none', marginBottom: 2 }}>Sessions</a>
          <a href="/plans" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#4a6359', textDecoration: 'none', marginBottom: 2 }}>Therapy Plans</a>
          <a href="/billing" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#4a6359', textDecoration: 'none', marginBottom: 2 }}>Billing</a>
          <a href="/staff" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#4a6359', textDecoration: 'none', marginBottom: 2 }}>Staff</a>
          <a href="/reports" style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, color: '#4a6359', textDecoration: 'none', marginBottom: 2 }}>Reports</a>
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid #d6e8e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1a8c6e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 600 }}>
              {user?.fullName?.charAt(0) ?? 'U'}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1a2724' }}>{user?.fullName}</div>
              <div style={{ fontSize: 10, color: '#8aab9e' }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', fontSize: 12, color: '#d63f5c', padding: '6px 8px', borderRadius: 8, border: 'none', background: '#fde8ed', cursor: 'pointer', textAlign: 'left' }}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 224, flex: 1, padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a2724', margin: 0 }}>
            Good morning, {user?.fullName?.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 13, color: '#4a6359', marginTop: 4, marginBottom: 0 }}>
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #d6e8e0', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8aab9e', textTransform: 'uppercase', marginBottom: 8 }}>Active Clients</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#1a8c6e' }}>{loading ? '...' : clients.filter(c => c.status === 'ACTIVE').length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #d6e8e0', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8aab9e', textTransform: 'uppercase', marginBottom: 8 }}>Total Clients</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#2563a8' }}>{loading ? '...' : clients.length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #d6e8e0', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8aab9e', textTransform: 'uppercase', marginBottom: 8 }}>Sessions Today</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#d97706' }}>0</div>
          </div>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #d6e8e0', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8aab9e', textTransform: 'uppercase', marginBottom: 8 }}>Pending Invoices</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#d63f5c' }}>0</div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #d6e8e0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #d6e8e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2724' }}>Recent Clients</div>
              <div style={{ fontSize: 11, color: '#8aab9e', marginTop: 2 }}>{clients.length} registered</div>
            </div>
            <a href="/clients" style={{ fontSize: 12, color: '#1a8c6e', fontWeight: 500 }}>View all</a>
          </div>

          {loading && (
            <div style={{ padding: 32, textAlign: 'center', color: '#8aab9e', fontSize: 13 }}>Loading...</div>
          )}

          {!loading && clients.slice(0, 5).map(client => (
            <div
              key={client.id}
              onClick={() => { window.location.href = '/clients/' + client.id }}
              style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f4f2', cursor: 'pointer' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e6f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a8c6e', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {client.fullName.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2724' }}>{client.fullName}</div>
                <div style={{ fontSize: 11, color: '#8aab9e' }}>{client.diagnosis ?? 'No diagnosis recorded'}</div>
              </div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: client.status === 'ACTIVE' ? '#e6f4ef' : '#f0f4f2', color: client.status === 'ACTIVE' ? '#1a8c6e' : '#8aab9e' }}>
                {client.status}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}