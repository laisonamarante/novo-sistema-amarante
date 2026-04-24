import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AUTH_PERSIST_KEY,
  clearStoredAuth,
  syncStoredAuthToken,
} from './auth-storage'

interface Usuario {
  id: number
  nome: string
  login: string
  perfil: string
  parceiroId?: number | null
  corretorId?: number | null
  imobiliariaId?: number | null
  constutoraId?: number | null
  subestabelecidoId?: number | null
}

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
        clearStoredAuth()
        set({ token: null, usuario: null })
      },
    }),
    {
      name: AUTH_PERSIST_KEY,
      onRehydrateStorage: () => (state) => {
        syncStoredAuthToken(state?.token)
      },
    }
  )
)

useAuth.subscribe((state) => {
  syncStoredAuthToken(state.token)
})
