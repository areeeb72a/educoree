'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Building2, GraduationCap, Users, Wallet, HourglassIcon, ClipboardList, BarChart3, ChevronRight } from 'lucide-react'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

export default function SchoolOwnerDashboard() {
  const [school, setSchool] = useState<any>(null)
  const [ownerName, setOwnerName] = useState('')
  const [stats, setStats] = useState({ branches: 0, teachers: 0, students: 0, feeCollected: 0, feePending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, schools(*)')
      .eq('id', user.id)
      .single()

    if (profile?.schools) setSchool(profile.schools)
    setOwnerName(profile?.name || 'School Owner')

    const schoolId = profile?.school_id
    if (schoolId) {
      const month = new Date().toISOString().slice(0, 7) // e.g. "2026-06"
      const [branches, teachers, students, fees] = await Promise.all([
        supabase.from('branches').select('id', { count: 'exact' }).eq('school_id', schoolId),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('role', 'teacher'),
        supabase.from('students').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('active', true),
        supabase.from('fee_records').select('net_amount, status').eq('school_id', schoolId).eq('month', month),
      ])

      let collected = 0, pending = 0
      ;(fees.data || []).forEach((f: any) => {
        if (f.status === 'paid') collected += Number(f.net_amount || 0)
        else pending += Number(f.net_amount || 0)
      })

      setStats({
        branches: branches.count || 0,
        teachers: teachers.count || 0,
        students: students.count || 0,
        feeCollected: collected,
        feePending: pending,
      })
    }
    setLoading(false)
  }

  const card: React.CSSProperties = {
    background: '#12102A',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
  }
  const btn: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  }

  const statCards = [
    { label: 'Branches', value: stats.branches, color: '#8B7CF6', icon: Building2 },
    { label: 'Teachers', value: stats.teachers, color: '#34D399', icon: Users },
    { label: 'Students', value: stats.students, color: '#38BDF8', icon: GraduationCap },
    { label: 'Fee Collected', sub: '(This Month)', value: 'Rs ' + stats.feeCollected.toLocaleString(), color: '#4ADE80', icon: Wallet },
    { label: 'Fee Pending', sub: '(This Month)', value: 'Rs ' + stats.feePending.toLocaleString(), color: '#FBBF24', icon: HourglassIcon },
  ]

  const quickLinks = [
    { title: 'Branches', desc: 'Add, edit and manage branches', href: '/dashboard/school-owner/branches', icon: Building2, color: '#8B7CF6' },
    { title: 'Teachers', desc: 'Teachers list, view and edit', href: '/dashboard/school-owner/teachers', icon: Users, color: '#34D399' },
    { title: 'Students', desc: 'Students database with filters', href: '/dashboard/school-owner/students', icon: GraduationCap, color: '#38BDF8' },
    { title: 'Fee Overview', desc: 'Fees, records and branch totals', href: '/dashboard/school-owner/fees', icon: Wallet, color: '#4ADE80' },
    { title: 'Attendance Overview', desc: 'School-wide attendance reports', href: '/dashboard/school-owner/attendance-overview', icon: ClipboardList, color: '#FB923C' },
    { title: 'Reports & Analytics', desc: 'Trends, charts and insights', href: '/dashboard/school-owner/analytics', icon: BarChart3, color: '#F472B6' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#07050F', fontFamily: 'sans-serif', color: '#fff' }}>
      <style>{`
        @media (max-width: 900px) {
          .quick-access-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .quick-access-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ background: '#12102A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6C5CE7, #0984E3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>E</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{school?.name || 'EduCore'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>School Owner Dashboard</div>
          </div>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
          style={btn}
        >Sign Out</button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading dashboard...</div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Welcome, {ownerName} 👋</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Here is your school overview.</div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
              {statCards.map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} style={{
                    ...card, padding: '18px 20px', borderTop: `3px solid ${s.color}`,
                    boxShadow: `0 0 16px -4px ${s.color}66`,
                    minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>{s.label}</div>
                        {s.sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.sub}</div>}
                      </div>
                      <Icon size={18} style={{ color: s.color, flexShrink: 0 }} />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</div>
                  </div>
                )
              })}
            </div>

            {/* Quick Access */}
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Quick Access</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="quick-access-grid">
              {quickLinks.map(q => {
                const Icon = q.icon
                return (
                  <div
                    key={q.title}
                    onClick={() => (window.location.href = q.href)}
                    style={{
                      ...card, padding: 20, cursor: 'pointer',
                      transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.border = `1px solid ${q.color}99`
                      e.currentTarget.style.boxShadow = `0 8px 24px -8px ${q.color}55`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${q.color}1E`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={19} style={{ color: q.color }} />
                      </div>
                      <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.25)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{q.title}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{q.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
