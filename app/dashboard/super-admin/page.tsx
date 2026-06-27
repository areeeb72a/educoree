'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { School, CheckCircle2, Crown, DollarSign, ArrowRight } from 'lucide-react'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

const PLAN_TIERS: Record<string, { label: string; maxBranches: number; price: number }> = {
  basic: { label: 'Basic', maxBranches: 1, price: 15000 },
  pro: { label: 'Pro', maxBranches: 5, price: 20000 },
  premium: { label: 'Premium', maxBranches: 10, price: 30000 },
  unlimited: { label: 'Unlimited', maxBranches: 99, price: 50000 },
}

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboard, setShowOnboard] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [schoolCity, setSchoolCity] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [plan, setPlan] = useState('pro')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchSchools() }, [])

  async function fetchSchools() {
    const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false })
    setSchools(data || [])
    setLoading(false)
  }

  async function onboardSchool() {
    setSaving(true)
    setMsg('')
    try {
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert({ name: schoolName, code: schoolCode.toUpperCase(), plan, city: schoolCity, max_branches: PLAN_TIERS[plan].maxBranches, active: true })
        .select().single()
      if (schoolError) throw schoolError
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: ownerEmail, password: ownerPassword })
      if (authError) throw authError
      await supabase.from('profiles').insert({ id: authData.user!.id, school_id: school.id, role: 'school_owner', auto_id: schoolCode.toUpperCase() + '-OWN-001', name: ownerName })
      await supabase.from('schools').update({ owner_id: authData.user!.id }).eq('id', school.id)
      setMsg('School onboarded!')
      setSchoolName(''); setSchoolCode(''); setSchoolCity(''); setOwnerName(''); setOwnerEmail(''); setOwnerPassword('')
      fetchSchools()
      setTimeout(() => setShowOnboard(false), 1500)
    } catch (err: any) {
      setMsg('Error: ' + err.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07050F', fontFamily: 'sans-serif', color: '#fff' }}>
      <div style={{ background: '#12102A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>EduCore</span>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Super Admin</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowOnboard(true)} style={{ padding: '8px 16px', background: '#7C3AED', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Onboard School</button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '20px 24px 0' }}>
        {[
          { label: 'Total Schools', value: schools.length, color: '#A78BFA', icon: School },
          { label: 'Active Schools', value: schools.filter(s => s.active).length, color: '#34D399', icon: CheckCircle2 },
          { label: 'Pro Plan', value: schools.filter(s => s.plan === 'pro').length, color: '#FBBF24', icon: Crown },
          { label: 'MRR (PKR)', value: schools.filter(s => s.active).reduce((sum, s) => sum + (PLAN_TIERS[s.plan]?.price || 0), 0).toLocaleString(), color: '#60A5FA', icon: DollarSign },
        ].map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} style={{ background: '#12102A', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)', borderTop: `3px solid ${k.color}`, boxShadow: `0 0 16px -4px ${k.color}66`, minHeight: 116, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${k.color}1E`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} style={{ color: k.color }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.03em' }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: k.color, letterSpacing: '-0.02em' }}>{k.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>All Schools</div>
        {loading ? <div style={{ color: 'rgba(255,255,255,0.4)', padding: 40, textAlign: 'center' }}>Loading...</div> :
         schools.length === 0 ? (
          <div style={{ background: '#12102A', borderRadius: 16, padding: 40, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Koi school nahi - pehla school onboard karo!</div>
            <button onClick={() => setShowOnboard(true)} style={{ padding: '10px 24px', background: '#7C3AED', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Onboard First School</button>
          </div>
         ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {schools.map(school => {
              const accentColor = school.active ? '#A78BFA' : '#F87171'
              return (
                <a
                  key={school.id}
                  href={`/dashboard/super-admin/school/${school.id}`}
                  style={{
                    background: '#12102A', borderRadius: 14, padding: 18, border: '1px solid rgba(255,255,255,0.07)',
                    textDecoration: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.border = `1px solid ${accentColor}99`
                    e.currentTarget.style.boxShadow = `0 8px 20px -8px ${accentColor}55`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{school.name}</span>
                    <ArrowRight size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 10px', background: 'rgba(124,58,237,0.2)', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#C4B5FD' }}>{school.plan?.toUpperCase()}</span>
                    {!school.active && (
                      <span style={{ padding: '3px 10px', background: 'rgba(220,38,38,0.15)', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#F87171' }}>SUSPENDED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Code: {school.code} - {school.city}</div>
                </a>
              )
            })}
          </div>
         )}
      </div>

      {showOnboard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#12102A', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Onboard New School</div>
            {[
              { label: 'School Name', value: schoolName, set: setSchoolName, type: 'text' },
              { label: 'School Code', value: schoolCode, set: setSchoolCode, type: 'text' },
              { label: 'City', value: schoolCity, set: setSchoolCity, type: 'text' },
              { label: 'Owner Name', value: ownerName, set: setOwnerName, type: 'text' },
              { label: 'Owner Email', value: ownerEmail, set: setOwnerEmail, type: 'email' },
              { label: 'Password', value: ownerPassword, set: setOwnerPassword, type: 'password' },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{f.label}</div>
                <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Plan</div>
              <select value={plan} onChange={e => setPlan(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#1a1830', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14 }}>
                {Object.entries(PLAN_TIERS).map(([key, tier]) => (
                  <option key={key} value={key}>{tier.label} — {tier.maxBranches} branch{tier.maxBranches !== 1 ? 'es' : ''} — Rs. {tier.price.toLocaleString()}/mo</option>
                ))}
              </select>
            </div>
            {msg && <div style={{ padding: 12, background: msg.includes('Error') ? 'rgba(220,38,38,0.1)' : 'rgba(5,150,105,0.1)', borderRadius: 10, marginBottom: 12, fontSize: 13 }}>{msg}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowOnboard(false)} style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={onboardSchool} disabled={saving} style={{ flex: 2, padding: 12, background: '#7C3AED', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Onboard School'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}