import { create } from 'zustand'

interface User {
  id: string
  email: string
  fullName: string
  role: string
  branchId: string
  branchName: string
}
interface User {
  id: string
  email: string
  fullName: string
  role: string
  branchId: string
  branchName: string
  mustChangePassword?: boolean
}
interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  initialize: () => {
    const token = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ user, isAuthenticated: true })
      } catch {
        localStorage.clear()
      }
    }
  },
}))