'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotMsg, setShowForgotMsg] = useState(false)

  // Forgot password recovery states
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingResetLink, setSendingResetLink] = useState(false)
  const [resetLinkSent, setResetLinkSent] = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function handleSendResetLink() {
    setForgotError('')
    setResetLinkSent(false)
    if (!forgotEmail.trim()) {
      setForgotError('Email address enter karen')
      return
    }
    setSendingResetLink(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/change-password`
      })
      if (error) throw error
      setResetLinkSent(true)
    } catch (err: any) {
      setForgotError(err.message || 'Link send karne mein masla ho gaya')
    }
    setSendingResetLink(false)
  }

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    if (!profile) {
      setError('Profile not found!')
      setLoading(false)
      return
    }

    if (profile.must_change_password) {
      window.location.href = '/change-password'
      return
    }

    const routes = {
      super_admin: '/dashboard/super-admin',
      school_owner: '/dashboard/school-owner',
      principal: '/dashboard/principal',
      admin: '/dashboard/admin',
      admin_hr: '/dashboard/admin',
      hr: '/dashboard/admin',
      teacher: '/dashboard/teacher',
      student: '/dashboard/student',
      parent: '/dashboard/parent',
      accounts: '/dashboard/accounts',
    } as Record<string, string>
    const target = routes[profile.role]
    if (!target) {
      setError(`No dashboard configured for role: "${profile.role}". Contact developer.`)
      setLoading(false)
      return
    }
    window.location.href = target
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#12102A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 40,
        width: 380
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            ⚡
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>
            EduCore
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            School Management System
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            marginBottom: 6
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            marginBottom: 6
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                padding: '12px 44px 12px 14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                color: 'rgba(255,255,255,0.4)',
                padding: 4,
                lineHeight: 1,
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowForgotMsg(true)}
              style={{ background: 'none', border: 'none', color: '#818CF8', fontSize: 12, cursor: 'pointer', padding: 0 }}
            >
              Forgot password?
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.15)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#FCA5A5',
            fontSize: 13,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: 14,
            background: '#4361EE',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)'
        }}>
          EduCore v1.0
        </div>
      </div>

      {showForgotMsg && (
        <div
          onClick={() => { setShowForgotMsg(false); setResetLinkSent(false); setForgotEmail(''); setForgotError('') }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#12102A', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Password Recovery</div>
            
            {resetLinkSent ? (
              <div>
                <div style={{ fontSize: 13, color: '#34D399', marginBottom: 20, lineHeight: 1.5 }}>
                  📬 Password reset link aapke email address par send kar di gayi hai! Apne inbox (ya spam folder) ko check karen.
                </div>
                <button
                  onClick={() => { setShowForgotMsg(false); setResetLinkSent(false); setForgotEmail(''); setForgotError('') }}
                  style={{ width: '100%', padding: 12, background: '#4361EE', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.5 }}>
                  Apna registered email enter karen, hum aapko password reset karne ka secure link send karenge.
                </div>
                
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                />

                {forgotError && (
                  <div style={{ fontSize: 12, color: '#FCA5A5', marginBottom: 14, textAlign: 'left' }}>{forgotError}</div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { setShowForgotMsg(false); setResetLinkSent(false); setForgotEmail(''); setForgotError('') }}
                    style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendResetLink}
                    disabled={sendingResetLink}
                    style={{ flex: 2, padding: 12, background: '#4361EE', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: sendingResetLink ? 0.6 : 1 }}
                  >
                    {sendingResetLink ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
