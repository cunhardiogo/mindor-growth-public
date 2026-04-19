import React from 'react'
import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function resolveEmail(input: string): string {
  const trimmed = input.trim()
  if (trimmed.includes('@')) return trimmed
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${slug}@mindorgrowth.com`
}

export function Login() {
  const [mode, setMode]           = useState<'login' | 'forgot'>('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember]   = useState(true)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      if (errorParam === 'account_not_found') {
        // Clean URL so refresh doesn't re-show the error
        const url = new URL(window.location.href)
        url.searchParams.delete('error')
        window.history.replaceState({}, '', url.toString())
        return 'Sua conta Google não está associada a nenhum perfil. Entre em contato com a Mindor.'
      }
    } catch { /* ignore */ }
    return null
  })
  const [success, setSuccess]     = useState<string | null>(null)
  const navigate = useNavigate()
  const { signIn, authenticated } = useAuth()

  const resetFields = () => {
    setEmail(''); setPassword('')
    setError(null); setSuccess(null)
  }

  const switchMode = (next: 'login' | 'forgot') => {
    resetFields(); setMode(next)
  }

  if (authenticated) return <Navigate to="/" replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim())        { setError('Digite seu usuário.'); return }
    if (password.length < 6)  { setError('A senha precisa ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    const { error: authError } = await signIn(resolveEmail(email), password, remember)
    setLoading(false)
    if (authError) {
      if (authError.includes('Email not confirmed') || authError.includes('email_not_confirmed')) {
        setError('E-mail não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.')
      } else if (authError.includes('Invalid login') || authError.includes('invalid_credentials')) {
        setError('E-mail ou senha incorretos.')
      } else {
        setError('Não foi possível entrar. Tente novamente.')
      }
      return
    }
    navigate('/')
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validateEmail(email)) { setError('Para recuperar a senha, digite seu e-mail completo.'); return }
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (resetError) { setError('Não foi possível enviar o e-mail. Tente novamente.'); return }
    setSuccess('E-mail enviado! Verifique sua caixa de entrada.')
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
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: '10vh' }}>
      {/* background image */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        pointerEvents: 'none',
      }} />
      {/* overlay escuro */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'none',
      }} />

      {/* card */}
      <div className="login-card" style={{
        position: 'relative',
        width: 320,
        maxWidth: '92vw',
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

        {mode === 'login' ? (
          <>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Entre com suas credenciais para acessar.
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div role="alert" style={{
                  padding: '9px 12px',
                  background: 'rgba(220,50,50,0.15)',
                  border: '1px solid rgba(220,50,50,0.4)',
                  borderRadius: 8,
                  color: '#f87171',
                  fontSize: 12,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  Usuário
                </label>
                <input
                  type="text"
                  name="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  placeholder=""
                  required
                  autoComplete="username"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#FE5000')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    style={{ fontSize: 11, color: '#FE5000', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: 0 }}
                  >
                    Esqueci a senha
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null) }}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: 40, boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#FE5000')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.15)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center',
                    }}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#FE5000', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>Lembrar de mim</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 2,
                  padding: '11px',
                  background: loading ? 'rgba(255,255,255,0.08)' : '#FE5000',
                  border: 'none',
                  borderRadius: 8,
                  color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Syne, sans-serif',
                  letterSpacing: '.04em',
                  transition: 'all .15s',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(254,80,0,.25)',
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '.05em' }}>OU</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/` },
              })}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
            >
              {/* Google icon */}
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </button>

            {/* Link to register */}
            <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>
              Não tem uma conta?{' '}
              <Link to="/register" style={{ color: '#FE5000', textDecoration: 'none', fontWeight: 600 }}>
                Criar conta
              </Link>
            </p>

          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', padding: 0, marginBottom: 20 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar
            </button>

            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              Enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div role="alert" style={{ padding: '9px 12px', background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.4)', borderRadius: 8, color: '#f87171', fontSize: 12 }}>
                  {error}
                </div>
              )}
              {success && (
                <div role="status" style={{ padding: '9px 12px', background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.4)', borderRadius: 8, color: '#34d399', fontSize: 12 }}>
                  {success}
                </div>
              )}

              {!success && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '.05em', textTransform: 'uppercase' }}>E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null) }}
                      placeholder="você@empresa.com.br"
                      required
                      autoComplete="email"
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
                    {loading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
