'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Building2, GraduationCap, Users, Wallet, HourglassIcon, ClipboardList, BarChart3, ChevronRight } from 'lucide-react'
import DashboardLayout from '../DashboardLayout'

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

  const statCards = [
    { label: 'Branches', value: stats.branches, color: '#7C3AED', icon: Building2 },
    { label: 'Teachers', value: stats.teachers, color: '#10B981', icon: Users },
    { label: 'Students', value: stats.students, color: '#0891B2', icon: GraduationCap },
    { label: 'Fee Collected (This Month)', value: 'Rs ' + stats.feeCollected.toLocaleString(), color: '#059669', icon: Wallet },
    { label: 'Fee Pending (This Month)', value: 'Rs ' + stats.feePending.toLocaleString(), color: '#D97706', icon: HourglassIcon },
  ]

  const quickLinks = [
    { title: 'Branches', desc: 'Add, edit and manage branches', href: '/dashboard/school-owner/branches', icon: Building2, color: '#7C3AED' },
    { title: 'Teachers', desc: 'Teachers list, view and edit', href: '/dashboard/school-owner/teachers', icon: Users, color: '#10B981' },
    { title: 'Students', desc: 'Students database with filters', href: '/dashboard/school-owner/students', icon: GraduationCap, color: '#0891B2' },
    { title: 'Fee Overview', desc: 'Fees, records and branch totals', href: '/dashboard/school-owner/fees', icon: Wallet, color: '#059669' },
    { title: 'Attendance Overview', desc: 'School-wide attendance reports', href: '/dashboard/school-owner/attendance-overview', icon: ClipboardList, color: '#D97706' },
    { title: 'Reports & Analytics', desc: 'Trends, charts and insights', href: '/dashboard/school-owner/analytics', icon: BarChart3, color: '#6366F1' },
  ]

  return (
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner"
      onRefresh={fetchData}
    >
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>Welcome, {ownerName} 👋</h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Here is your school overview.</p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading dashboard...</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
            {statCards.map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="kpi-card" style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  padding: '18px 20px',
                  borderTop: `3px solid ${s.color}`,
                  minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>{s.label}</div>
                    <Icon size={18} style={{ color: s.color, flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: "var(--text-primary)", marginTop: 8 }}>{s.value}</div>
                </div>
              )
            })}
          </div>

          {/* Quick Access */}
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, color: "var(--text-primary)" }}>Quick Access Control</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="quick-access-grid">
            {quickLinks.map(q => {
              const Icon = q.icon
              return (
                <div
                  key={q.title}
                  onClick={() => (window.location.href = q.href)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 16,
                    padding: 20, cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.borderColor = q.color
                    e.currentTarget.style.boxShadow = `0 8px 24px -8px ${q.color}44`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${q.color}1E`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={19} style={{ color: q.color }} />
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{q.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{q.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
