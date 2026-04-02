import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Usuario { id: number; nome: string; login: string; perfil: string }

interface AuthStore {
  token:   string | null
  usuario: Usuario | null
  setAuth: (token: string, usuario: Usuario) => void
  logout:  () => void
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      token:   null,
      usuario: null,
      setAuth: (token, usuario) => set({ token, usuario }),
      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('amarante-auth')
        set({ token: null, usuario: null })
      },
    }),
    {
      name: 'amarante-auth',
      onRehydrateStorage: () => (state) => {
        // Sync token to localStorage for trpc.ts
        if (state?.token) localStorage.setItem('token', state.token)
        else localStorage.removeItem('token')
      },
    }
  )
)

// Subscribe to keep localStorage 'token' in sync
useAuth.subscribe((state) => {
  if (state.token) localStorage.setItem('token', state.token)
  else localStorage.removeItem('token')
})
