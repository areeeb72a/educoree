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
    if (!email.trim() || !password) {
      setError('Please email aur password enter karen')
      return
    }

    const lowerEmail = email.trim().toLowerCase()
    if (!lowerEmail.endsWith('@educore.pk') && !lowerEmail.endsWith('@fza.pk')) {
      setError('Ghalat email domain! Sirf @educore.pk ya @fza.pk domains allowed hain.')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) throw authError

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        setError('Profile not found!')
        setLoading(false)
        return
      }

      if (profile.must_change_password) {
        window.location.href = '/change-password'
        return
      }

      const routes: Record<string, string> = {
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
      }
      
      const target = routes[profile.role]
      if (!target) {
        setError(`No dashboard configured for role: "${profile.role}". Contact developer.`)
        setLoading(false)
        return
      }
      window.location.href = target
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700;800&family=Raleway:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes kb0 { from { transform: scale(1); } to { transform: scale(1.05); } }
        .kb-0 { animation: kb0 10s ease-out forwards; }
        input { outline: none; }
        input::placeholder { color: #A1A8B5; font-size: 14px; }
        .iw { display: flex; align-items: center; gap: 10px; border: 1.5px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 13px 15px; background: rgba(255,255,255,0.04); transition: border-color 0.2s, background 0.2s; }
        .iw:focus-within { border-color: #059669; background: rgba(5,150,105,0.05); }
        .iw input { border: none; background: transparent; font-size: 14px; font-family: 'Inter', sans-serif; color: #fff; width: 100%; font-weight: 400; min-width: 0; }
        .btn { width: 100%; background: #059669; color: #fff; border: none; border-radius: 12px; padding: 15px; font-size: 14px; font-weight: 700; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background 0.2s, transform 0.1s; }
        .btn:hover:not(:disabled) { background: #047857; }
        .btn:active:not(:disabled) { transform: scale(0.99); }
        .btn:disabled { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.3); cursor: not-allowed; }
        .ibtn { background: transparent; border: none; cursor: pointer; display: flex; align-items: center; color: rgba(255,255,255,0.4); padding: 0; transition: color 0.15s; flex-shrink: 0; }
        .ibtn:hover { color: #fff; }
        .lbl { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
        .forgot-text { background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #34D399; font-family: 'Inter', sans-serif; padding: 0; transition: opacity 0.15s; }
        .forgot-text:hover { opacity: 0.8; }
      `}</style>

      {/* Left panel: Background Illustration (52% width) */}
      <div style={{ width: '52%', position: 'relative', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <img src="/school_login_bg.png" alt="School Login Background" className="kb-0" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(160deg, rgba(6,11,24,0.85) 0%, rgba(5,150,105,0.65) 60%, rgba(6,11,24,0.9) 100%)' }}></div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', zIndex: 2, background: 'linear-gradient(to top, rgba(6,11,24,0.95) 0%, transparent 100%)' }}></div>
        
        {/* Left top brand info */}
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(5,150,105,0.3)' }}>
            <span style={{ fontSize: 22, color: '#fff', fontWeight: 800 }}>⚡</span>
          </div>
          <div>
            <p style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '0.1em' }}>EDUCORE</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Grades · Intervention · Scheduling</p>
          </div>
        </div>

        {/* Left bottom copyright info */}
        <div style={{ position: 'relative', zIndex: 3 }}>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600, fontSize: 14, color: '#fff' }}>EduCore Management Portal</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Basic & Secondary Education Department</p>
        </div>
      </div>

      {/* Right panel: Light-Dark clean layout (48% width) */}
      <div style={{ flex: 1, background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3.5rem', overflow: 'hidden', position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>
          
          <div style={{ marginBottom: '2.25rem' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 10 }}>
              Good to see<br />
              <span style={{ color: '#34D399' }}>you again.</span>
            </p>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Use your <strong style={{ color: '#fff' }}>@educore.pk</strong> or <strong style={{ color: '#fff' }}>@fza.pk</strong> email to continue.
            </p>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="lbl">Email</label>
            <div className="iw">
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>✉️</span>
              <input 
                type="email" 
                placeholder="name@educore.pk" 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label className="lbl">Password</label>
            <div className="iw">
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>🔒</span>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button onClick={() => setShowPassword(!showPassword)} className="ibtn">
                <span style={{ fontSize: 14 }}>{showPassword ? '🙈' : '👁️'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '10px 14px', color: '#FCA5A5', fontSize: 12.5, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <button onClick={handleLogin} disabled={loading} className="btn">
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => setShowForgotMsg(true)} className="forgot-text">Forgot password?</button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            EduCore Portal v1.0
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotMsg && (
        <div
          onClick={() => { setShowForgotMsg(false); setResetLinkSent(false); setForgotEmail(''); setForgotError('') }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0D1526', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Password Recovery</div>
            
            {resetLinkSent ? (
              <div>
                <div style={{ fontSize: 13, color: '#34D399', marginBottom: 20, lineHeight: 1.5 }}>
                  📬 Password reset link aapke email address par send kar di gayi hai! Apne inbox (ya spam folder) ko check karen.
                </div>
                <button
                  onClick={() => { setShowForgotMsg(false); setResetLinkSent(false); setForgotEmail(''); setForgotError('') }}
                  style={{ width: '100%', padding: 12, background: '#059669', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.5 }}>
                  Apna registered email enter karen, hum aapko password reset karne ka secure link send karenge.
                </div>
                
                <input
                  type="email"
                  placeholder="name@educore.pk"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                />

                {forgotError && (
                  <div style={{ fontSize: 12, color: '#FCA5A5', marginBottom: 14, textAlign: 'left' }}>{forgotError}</div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { setShowForgotMsg(false); setResetLinkSent(false); setForgotEmail(''); setForgotError('') }}
                    style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendResetLink}
                    disabled={sendingResetLink}
                    style={{ flex: 2, padding: 12, background: '#059669', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: sendingResetLink ? 0.6 : 1 }}
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
