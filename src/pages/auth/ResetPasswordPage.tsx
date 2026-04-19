import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function ResetPassword() {
  const navigate = useNavigate()
  const [status, setStatus]     = useState<'loading' | 'ready' | 'invalid'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let resolved = false

    function resolve() {
      if (resolved) return
      resolved = true
      if (timerRef.current) clearTimeout(timerRef.current)
      setStatus('ready')
    }

    // Listen for PASSWORD_RECOVERY or SIGNED_IN (some Supabase versions emit SIGNED_IN instead)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { resolve(); return }
      // SIGNED_IN after a recovery link also means we have a valid session
      if (event === 'SIGNED_IN' && session && window.location.hash.includes('type=recovery')) {
        resolve()
      }
    })

    // Check if session already exists (Supabase may process the hash before this effect runs)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) resolve()
    })

    // Generous timeout — production cold starts can be slow
    timerRef.current = setTimeout(
      () => setStatus(s => s === 'loading' ? 'invalid' : s),
      12000
    )

    return () => {
      subscription.unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    setLoading(true)

    // Ensure we still have a live recovery session before calling updateUser.
    const { data: { session: activeSession } } = await supabase.auth.getSession()
    if (!activeSession) {
      setLoading(false)
      setError('Sua sessão de recuperação expirou. Solicite um novo link de redefinição.')
      setStatus('invalid')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setLoading(false)
      const msg = updateError.message || ''
      if (msg.includes('same password') || msg.includes('should be different')) {
        setError('A nova senha deve ser diferente da anterior.')
      } else if (msg.includes('session') || msg.includes('expired') || msg.includes('JWT')) {
        setError('Sua sessão de recuperação expirou. Solicite um novo link de redefinição.')
        setStatus('invalid')
      } else if (msg.toLowerCase().includes('weak') || msg.toLowerCase().includes('password')) {
        setError('Senha muito fraca. Use pelo menos 6 caracteres.')
      } else {
        setError('Não foi possível atualizar a senha. Tente solicitar um novo link.')
      }
      return
    }

    // Mark success synchronously so the UI confirms before we touch the session.
    setSuccess(true)
    setLoading(false)

    // Sign out the recovery session so the user lands on /login cleanly,
    // and the AuthContext listener doesn't promote this recovery session
    // into a fully-authenticated profile (which would cause /login to
    // redirect to / with a half-valid session).
    try { await supabase.auth.signOut() } catch { /* ignore */ }

    // Redirect after a short delay so the user can read the success message.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => navigate('/login', { replace: true }), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    transition: 'border-color .15s',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: '10vh' }}>
      {/* background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/reset-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'none',
      }} />

      {/* card */}
      <div style={{
        position: 'relative',
        width: 320,
        background: 'rgba(10,10,12,0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <img
            src="/logo.jpg"
            alt="Mindor"
            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-.3px', fontFamily: 'Syne, sans-serif' }}>Mindor</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '.06em' }}>Growth Portal</p>
          </div>
        </div>

        {/* loading */}
        {status === 'loading' && !success && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center', padding: '20px 0' }}>
            Verificando link...
          </p>
        )}

        {/* link inválido */}
        {status === 'invalid' && !success && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div role="alert" style={{ padding: '12px 14px', background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.4)', borderRadius: 8, color: '#f87171', fontSize: 13, lineHeight: 1.6 }}>
              Este link expirou ou já foi utilizado. Solicite um novo na tela de login.
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                padding: '11px', background: '#FE5000', border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Syne, sans-serif', letterSpacing: '.04em',
                boxShadow: '0 4px 20px rgba(254,80,0,.25)',
              }}
            >
              Voltar ao login
            </button>
          </div>
        )}

        {/* sucesso */}
        {success && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div role="status" style={{ padding: '12px 14px', background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.4)', borderRadius: 8, color: '#34d399', fontSize: 13, lineHeight: 1.6 }}>
              Senha redefinida com sucesso! Redirecionando para o login...
            </div>
            <button
              type="button"
              onClick={() => {
                if (timerRef.current) clearTimeout(timerRef.current)
                navigate('/login', { replace: true })
              }}
              style={{
                padding: '11px', background: '#FE5000', border: 'none',
                borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Syne, sans-serif', letterSpacing: '.04em',
                boxShadow: '0 4px 20px rgba(254,80,0,.25)',
              }}
            >
              Ir para o login agora
            </button>
          </div>
        )}

        {/* formulário */}
        {status === 'ready' && !success && (
          <>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Escolha uma nova senha para sua conta.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div role="alert" style={{ padding: '9px 12px', background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.4)', borderRadius: 8, color: '#f87171', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '.05em', textTransform: 'uppercase' }}>Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#FE5000')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '.05em', textTransform: 'uppercase' }}>Confirmar senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(null) }}
                  placeholder="Repita a senha"
                  required
                  autoComplete="new-password"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#FE5000')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6, padding: '11px',
                  background: loading ? 'rgba(255,255,255,0.08)' : '#FE5000',
                  border: 'none', borderRadius: 8,
                  color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Syne, sans-serif', letterSpacing: '.04em',
                  transition: 'all .15s',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(254,80,0,.25)',
                }}
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
