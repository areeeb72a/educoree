'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

  const card: React.CSSProperties = {
    background: '#12102A',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
  }

  const totalCollected = feeTrend.reduce((s, m) => s + m.collected, 0)
  const totalPending = feeTrend.reduce((s, m) => s + m.pending, 0)
  const avgAttendance = branchAttendance.length
    ? Math.round(branchAttendance.reduce((s, b) => s + b.pct, 0) / branchAttendance.length)
    : 0

  return (
    <div style={{ minHeight: '100vh', background: '#07050F', fontFamily: 'sans-serif', color: '#fff' }}>
      <div style={{ background: '#12102A', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <a href="/dashboard/school-owner" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Back
        </a>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>📊 Reports & Analytics</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>School-wide trends and insights</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading analytics...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
              {[
                { label: '6-Month Fee Collected', value: 'Rs ' + totalCollected.toLocaleString(), color: '#4ADE80' },
                { label: '6-Month Fee Pending', value: 'Rs ' + totalPending.toLocaleString(), color: '#FBBF24' },
                { label: 'Avg Attendance (30 days)', value: avgAttendance + '%', color: avgAttendance >= 75 ? '#34D399' : '#F87171' },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: '18px 20px', borderTop: `3px solid ${s.color}`, boxShadow: `0 0 16px -4px ${s.color}66` }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Fee Collection Trend (Last 6 Months)</div>
              {feeTrend.every(m => m.collected === 0 && m.pending === 0) ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Koi fee record nahi mila.</div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={feeTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#12102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="collected" name="Collected" stroke="#4ADE80" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pending" name="Pending" stroke="#FBBF24" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Branch-wise Attendance (Last 30 Days)</div>
              {branchAttendance.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Koi attendance record nahi mila.</div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchAttendance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} domain={[0, 100]} unit="%" />
                      <Tooltip contentStyle={{ background: '#12102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="pct" name="Attendance %" fill="#8B7CF6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
