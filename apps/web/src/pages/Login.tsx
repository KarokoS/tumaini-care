import { useState } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

function errorMessage(err: unknown, fallback: string) {
  const response = (err as { response?: { data?: { message?: string; error?: string } } }).response
  return response?.data?.message ?? response?.data?.error ?? fallback
}

export default function Login() {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      const { accessToken, refreshToken, user } = res.data
      login(user, accessToken, refreshToken)
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(errorMessage(err, 'Login failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e6f4ef 0%, #f4f7f5 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: '#1a8c6e' }}>
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1a2724' }}>Tumaini Care</h1>
          <p className="text-sm mt-1" style={{ color: '#4a6359' }}>
            St. Thorlak Autism Centre — Nanyuki
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8" style={{ border: '1px solid #d6e8e0' }}>
          <h2 className="text-lg font-medium mb-6" style={{ color: '#1a2724' }}>
            Sign in to your account
          </h2>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" style={{ color: '#4a6359' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d6e8e0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1" style={{ color: '#4a6359' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d6e8e0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: loading ? '#8aab9e' : '#1a8c6e', color: 'white', padding: '10px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid #f0f4f2' }}>
            <p className="text-xs" style={{ color: '#8aab9e' }}>
              Tumaini St. Thorlak Autism Centre · Nanyuki, Kenya
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
