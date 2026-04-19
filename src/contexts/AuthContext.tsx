import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface ClientRow {
  id: string
  name: string | null
  slug: string | null
  act_id: string | null
  ig_user_id: string | null
  ig_page_id: string | null
  status: number | null
}

export interface AuthProfile {
  id: string
  client_id: string | null
  full_name: string | null
  username: string | null
  avatar_url: string | null
  email: string | null
  role: 'client' | 'admin'
  client: ClientRow | null
}

interface AuthState {
  profile: AuthProfile | null
  loading: boolean
  authenticated: boolean
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function fetchProfile(userId: string, email?: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, client:clients(*)')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    client_id: data.client_id,
    full_name: data.full_name,
    username: (data as any).username ?? null,
    avatar_url: (data as any).avatar_url ?? null,
    email: email ?? null,
    role: data.role as 'client' | 'admin',
    client: (data.client as ClientRow) ?? null,
  }
}

function isRecoveryFlow(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.location.hash.includes('type=recovery') ||
    window.location.pathname === '/reset-password'
  )
}

function clearSbKeys() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sb-')) localStorage.removeItem(key)
  }
}



export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let loadingDone = false
    const finishLoading = () => {
      if (!loadingDone) { loadingDone = true; setLoading(false) }
    }
    const safetyTimeout = setTimeout(finishLoading, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'PASSWORD_RECOVERY') {
          if (window.location.pathname !== '/reset-password') {
            window.location.replace('/reset-password')
          }
          return
        }

        if (window.location.pathname === '/reset-password') {
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') return
        }

        if (session?.user) {
          const uid = session.user.id

          if (event === 'INITIAL_SESSION') {
            if (isRecoveryFlow()) {
              if (window.location.pathname !== '/reset-password') {
                window.location.replace('/reset-password' + window.location.hash)
              }
              return
            }
          }

          setAuthenticated(true)

          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            try {
              const p = await fetchProfile(uid, session.user.email)
              if (!p && event === 'SIGNED_IN') {
                await supabase.auth.signOut()
                setAuthenticated(false)
                setProfile(null)
                window.location.href = '/login?error=account_not_found'
                return
              }
              if (p) {
                setProfile(p)
              }
            } catch { /* network error — stay authenticated, profile stays null */ }
          }
        } else {
          setAuthenticated(false)
          setProfile(null)
        }
      } finally {
        finishLoading()
      }
    })

    return () => { subscription.unsubscribe(); clearTimeout(safetyTimeout) }
  }, [])

  const signIn = async (email: string, password: string, remember = true) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    if (data.user) {
      const p = await fetchProfile(data.user.id, data.user.email)
      if (!p) {
        await supabase.auth.signOut()
        return { error: 'Perfil não encontrado. Contate o administrador.' }
      }

      setAuthenticated(true)
      setProfile(p)
      setLoading(false)
    }
    return { error: null }
  }

  const signOut = async () => {

    clearSbKeys()
    setAuthenticated(false)
    setProfile(null)
    supabase.auth.signOut().catch(() => {})
    window.location.replace('/login')
  }

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const p = await fetchProfile(session.user.id, session.user.email)
    if (p) setProfile(p)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, authenticated, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
