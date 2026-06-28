'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Wallet, Hourglass, ClipboardList } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardLayout from '../../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

export default function SchoolOwnerAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [feeTrend, setFeeTrend] = useState<any[]>([])
  const [branchAttendance, setBranchAttendance] = useState<any[]>([])
  const [branchMap, setBranchMap] = useState<Record<string, string>>({})

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    const schoolId = profile?.school_id
    if (!schoolId) { setLoading(false); return }

    const { data: branches } = await supabase.from('branches').select('id, name').eq('school_id', schoolId)
    const bMap: Record<string, string> = {}
    ;(branches || []).forEach((b: any) => { bMap[b.id] = b.name })
    setBranchMap(bMap)

    // Fee collection trend - last 6 months
    const months: string[] = []
    const d = new Date()
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
      months.push(m.toISOString().slice(0, 7))
    }

    const { data: feeRecords } = await supabase
      .from('fee_records')
      .select('month, net_amount, status')
      .eq('school_id', schoolId)
      .in('month', months)

    const trend = months.map(m => {
      const recs = (feeRecords || []).filter((f: any) => f.month === m)
      const collected = recs.filter((f: any) => f.status === 'paid').reduce((s: number, f: any) => s + Number(f.net_amount || 0), 0)
      const pending = recs.filter((f: any) => f.status !== 'paid').reduce((s: number, f: any) => s + Number(f.net_amount || 0), 0)
      return {
        month: new Date(m + '-01').toLocaleDateString('en-PK', { month: 'short' }),
        collected, pending,
      }
    })
    setFeeTrend(trend)

    // Branch-wise attendance - last 30 days
    const since = new Date()
    since.setDate(since.getDate() - 29)
    const sinceStr = since.toISOString().split('T')[0]

    const { data: attRecords } = await supabase
      .from('attendance')
      .select('branch_id, status')
      .eq('school_id', schoolId)
      .gte('date', sinceStr)

    const grouped: Record<string, { present: number; total: number }> = {}
    ;(attRecords || []).forEach((r: any) => {
      if (!grouped[r.branch_id]) grouped[r.branch_id] = { present: 0, total: 0 }
      grouped[r.branch_id].total++
      if (r.status === 'present') grouped[r.branch_id].present++
    })

    const branchAtt = Object.entries(grouped).map(([bid, v]) => ({
      name: bMap[bid] || 'Unknown',
      pct: v.total ? Math.round((v.present / v.total) * 100) : 0,
    }))
    setBranchAttendance(branchAtt)

    setLoading(false)
  }

  const totalCollected = feeTrend.reduce((s, m) => s + m.collected, 0)
  const totalPending = feeTrend.reduce((s, m) => s + m.pending, 0)
  const avgAttendance = branchAttendance.length
    ? Math.round(branchAttendance.reduce((s, b) => s + b.pct, 0) / branchAttendance.length)
    : 0

  return (
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner/analytics"
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📊 Reports & Analytics</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>System-wide reports, collections trends and monthly logs.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics charts...</div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: '6-Month Fee Collected', value: 'Rs ' + totalCollected.toLocaleString(), color: 'var(--accent-emerald)', icon: Wallet, name: 'emerald' },
              { label: '6-Month Fee Pending', value: 'Rs ' + totalPending.toLocaleString(), color: 'var(--accent-rose)', icon: Hourglass, name: 'amber' },
              { label: 'Avg Attendance (30 days)', value: avgAttendance + '%', color: avgAttendance >= 75 ? 'var(--accent-emerald)' : 'var(--accent-rose)', icon: ClipboardList, name: avgAttendance >= 75 ? 'emerald' : 'amber' },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className={`kpi-card ${s.name}`} style={{
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
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{s.value}</div>
                </div>
              )
            })}
          </div>

          {/* Line Chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>Fee Collection Trend (Last 6 Months)</div>
            {feeTrend.every(m => m.collected === 0 && m.pending === 0) ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No fee data logs.</div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={feeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                    <Line type="monotone" dataKey="collected" name="Collected" stroke="var(--accent-emerald)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="pending" name="Pending" stroke="var(--accent-rose)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>Branch-wise Attendance (Last 30 Days)</div>
            {branchAttendance.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No attendance records found.</div>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                    <Bar dataKey="pct" name="Attendance Ratio %" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
