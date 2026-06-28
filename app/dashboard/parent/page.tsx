'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ClipboardList, BarChart3, Wallet, MessageCircle, ChevronRight, Calendar, Award } from 'lucide-react'
import DashboardLayout from '../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

const gradeColor: Record<string, string> = {
  "A+": "text-green-400 bg-green-500/10", "A": "text-green-400 bg-green-500/10",
  "B+": "text-blue-400 bg-blue-500/10", "B": "text-blue-400 bg-blue-500/10",
  "C": "text-yellow-400 bg-yellow-500/10", "D": "text-orange-400 bg-orange-500/10",
  "F": "text-red-400 bg-red-500/10",
}

const ttSubjectColor: Record<string, string> = {
  Mathematics: "rgba(59,130,246,0.1) rgba(59,130,246,0.3) #3b82f6",
  Science: "rgba(16,185,129,0.1) rgba(16,185,129,0.3) #10b981",
  English: "rgba(139,92,246,0.1) rgba(139,92,246,0.3) #8b5cf6",
  Urdu: "rgba(245,158,11,0.1) rgba(245,158,11,0.3) #f59e0b",
  Islamiat: "rgba(6,182,212,0.1) rgba(6,182,212,0.3) #06b6d4",
  "Social Studies": "rgba(236,72,153,0.1) rgba(236,72,153,0.3) #ec4899",
  Arts: "rgba(224,242,254,0.1) rgba(14,165,233,0.3) #0ea5e9",
  Computer: "rgba(99,102,241,0.1) rgba(99,102,241,0.3) #6366f1",
};

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function ParentDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // marks tab state
  const [guardian, setGuardian] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [marksLoaded, setMarksLoaded] = useState(false)

  // fees tab state
  const [feeRecords, setFeeRecords] = useState<any[]>([])

  // timetable tab state
  const [timetableEntries, setTimetableEntries] = useState<any[]>([])

  // attendance tab state
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [attMonth, setAttMonth] = useState(new Date().toISOString().slice(0, 7))

  // overview summary state
  const [overviewAttPct, setOverviewAttPct] = useState<number | null>(null)
  const [overviewMarksPct, setOverviewMarksPct] = useState<number | null>(null)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (!marksLoaded) fetchGuardianAndChildren() }, [])
  useEffect(() => { if (selectedChild) fetchResults() }, [selectedChild])
  useEffect(() => { if (selectedChild) fetchFees() }, [selectedChild])
  useEffect(() => { if (selectedChild) fetchTimetable() }, [selectedChild])
  useEffect(() => { if (selectedChild) fetchAttendance() }, [selectedChild, attMonth])
  useEffect(() => { if (selectedChild) fetchOverviewSummary() }, [selectedChild])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    const { data: prof } = await supabase.from('profiles').select('*, schools(*)').eq('id', user.id).single()
    setProfile(prof)
    setLoading(false)
  }

  async function fetchGuardianAndChildren() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: guardianData } = await supabase.from('guardians').select('*').eq('user_id', user.id).single()
    setGuardian(guardianData)
    if (guardianData) {
      const { data: kids } = await supabase.from('students').select('id, name, grade, section, school_id, branch_id').eq('guardian_id', guardianData.id).order('name')
      setChildren(kids || [])
      if (kids && kids.length > 0) setSelectedChild(kids[0].id)
    }
    setMarksLoaded(true)
  }

  async function fetchResults() {
    const { data } = await supabase
      .from('results')
      .select('subject, term, marks, total_marks, grade, year')
      .eq('student_id', selectedChild)
      .eq('status', 'published')
      .order('term')
    setResults(data || [])
  }

  async function fetchFees() {
    const { data } = await supabase
      .from('fee_records')
      .select('*')
      .eq('student_id', selectedChild)
      .order('month', { ascending: false })
    setFeeRecords(data || [])
  }

  async function fetchTimetable() {
    const child = children.find(c => c.id === selectedChild)
    if (!child) return
    const { data } = await supabase
      .from('timetable')
      .select('*')
      .eq('grade', child.grade)
      .eq('section', child.section)
      .eq('branch_id', child.branch_id)
      .order('period_no')
    setTimetableEntries(data || [])
  }

  async function fetchAttendance() {
    const startDate = `${attMonth}-01`
    const endDate = new Date(attMonth + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const endStr = endDate.toISOString().split('T')[0]

    const { data } = await supabase
      .from('attendance')
      .select('date, status, remarks')
      .eq('student_id', selectedChild)
      .gte('date', startDate)
      .lt('date', endStr)
      .order('date', { ascending: false })
    setAttendanceRecords(data || [])
  }

  async function fetchOverviewSummary() {
    const since = new Date()
    since.setDate(since.getDate() - 29)
    const sinceStr = since.toISOString().split('T')[0]

    const { data: attData } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', selectedChild)
      .gte('date', sinceStr)

    const total = attData?.length || 0
    const present = (attData || []).filter(r => r.status === 'present').length
    setOverviewAttPct(total ? Math.round((present / total) * 100) : null)

    const { data: resultsData } = await supabase
      .from('results')
      .select('marks, total_marks')
      .eq('student_id', selectedChild)
      .eq('status', 'published')

    if (resultsData && resultsData.length > 0) {
      const avg = Math.round(resultsData.reduce((sum, r) => sum + (r.marks / r.total_marks) * 100, 0) / resultsData.length)
      setOverviewMarksPct(avg)
    } else {
      setOverviewMarksPct(null)
    }
  }

  function termAverage(records: any[]) {
    if (!records || records.length === 0) return 0
    const sum = records.reduce((acc, r) => acc + (r.marks / r.total_marks) * 100, 0)
    return Math.round(sum / records.length)
  }

  const tabs = ['overview', 'attendance', 'marks', 'fees', 'timetable', 'diary', 'messages']
  const currentChild = children.find(c => c.id === selectedChild)
  const termOrder = ['Term 1', 'Term 2', 'Term 3', 'Final']
  const byTerm: Record<string, any[]> = {}
  results.forEach(r => { if (!byTerm[r.term]) byTerm[r.term] = []; byTerm[r.term].push(r) })
  const terms = Object.keys(byTerm).sort((a, b) => termOrder.indexOf(a) - termOrder.indexOf(b))
  const pendingFees = feeRecords.filter(r => r.status === 'pending')
  const paidFees = feeRecords.filter(r => r.status === 'paid')
  const totalDue = pendingFees.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0)
  const totalPaid = paidFees.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0)

  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const DAY_LABELS: Record<string, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday' }
  const ttPeriods = Array.from(new Set(timetableEntries.map(e => e.period_no))).sort((a, b) => a - b)
  const ttGrid: Record<number, Record<string, any>> = {}
  timetableEntries.forEach(e => { if (!ttGrid[e.period_no]) ttGrid[e.period_no] = {}; ttGrid[e.period_no][e.day_of_week] = e })

  return (
    <DashboardLayout
      role="parent"
      activePath={activeTab === 'overview' ? '/dashboard/parent' : `/dashboard/parent/${activeTab}`}
      onRefresh={fetchOverviewSummary}
    >
      {/* Top Selector bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>👨‍👩‍👧 Parent Control Panel</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentChild ? `${currentChild.name} · Grade ${currentChild.grade}-${currentChild.section}` : 'Loading...'}
          </p>
        </div>
        {children.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id} style={{ color: 'var(--text-primary)' }}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20, overflowX: 'auto', gap: 4 }}>
        {tabs.map(tab => (
          <button key={tab}
            onClick={() => tab === 'diary' ? (window.location.href = '/dashboard/parent/diary') : tab === 'messages' ? (window.location.href = '/dashboard/parent/messages') : setActiveTab(tab)}
            style={{
              padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 500, fontSize: 13,
              color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '3px solid var(--accent-purple)' : '3px solid transparent',
              transition: 'all 0.2s', textTransform: 'capitalize', whiteSpace: 'nowrap'
            }}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading child metrics...</p>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* KPI metrics */}
              <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { label: "Child's Attendance", value: overviewAttPct !== null ? `${overviewAttPct}%` : '-', color: 'var(--accent-emerald)' },
                  { label: 'Average Marks', value: overviewMarksPct !== null ? `${overviewMarksPct}%` : '-', color: 'var(--accent-purple)' },
                  { label: 'Fee Status', value: marksLoaded ? (totalDue > 0 ? 'Pending' : 'Fully Paid') : '-', color: totalDue > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' },
                  { label: 'Unread Messages', value: '0', color: 'var(--accent-cyan)' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Profiles grid info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>My Parent Account Info</h3>
                  {[
                    { label: 'Name', value: profile?.name },
                    { label: 'Parent ID', value: profile?.auto_id },
                    { label: 'School Portal', value: profile?.schools?.name },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value || '—'}</span>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>Quick Actions Portal</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Attendance logs', color: 'var(--accent-emerald)', tab: 'attendance' },
                      { label: 'Marks card', color: 'var(--accent-purple)', tab: 'marks' },
                      { label: 'Pay tuition fees', color: 'var(--accent-amber)', tab: 'fees' },
                      { label: 'Child diary', color: 'var(--accent-cyan)', tab: 'diary' },
                    ].map((action, i) => (
                      <button
                        key={i}
                        onClick={() => action.tab === 'diary' ? (window.location.href = '/dashboard/parent/diary') : setActiveTab(action.tab)}
                        style={{
                          padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                          borderRadius: 10, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                          display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.18s ease',
                        }}
                      >
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NAVIGATE TO</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{action.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 750, color: 'var(--text-primary)' }}>Attendance Logs for {attMonth}</span>
                <input type="month" value={attMonth} max={new Date().toISOString().slice(0, 7)} onChange={e => setAttMonth(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
              </div>

              {(() => {
                const total = attendanceRecords.length
                const present = attendanceRecords.filter(r => r.status === 'present').length
                const absent = attendanceRecords.filter(r => r.status === 'absent').length
                const late = attendanceRecords.filter(r => r.status === 'late').length
                const pct = total ? Math.round((present / total) * 100) : 0
                return (
                  <>
                    <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                      {[
                        { label: 'Attendance Ratio', value: `${pct}%`, color: pct >= 75 ? 'var(--accent-emerald)' : 'var(--accent-rose)' },
                        { label: 'Present Days', value: present, color: 'var(--accent-emerald)' },
                        { label: 'Absent Days', value: absent, color: 'var(--accent-rose)' },
                        { label: 'Late Days', value: late, color: 'var(--accent-amber)' },
                      ].map((k, i) => (
                        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{k.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                      {attendanceRecords.length === 0 ? (
                        <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded for this month.</p>
                      ) : (
                        <div className="table-wrap">
                          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceRecords.map((r, i) => {
                                const d = new Date(r.date)
                                return (
                                  <tr key={i}>
                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                      {d.toLocaleDateString("en-PK", { weekday: "long" })}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className={`status-badge ${r.status === "present" ? "active" : r.status === "absent" ? "inactive" : "pending"}`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{r.remarks || "—"}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {activeTab === 'marks' && (
            <div>
              {terms.length === 0 ? (
                <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center' }}>
                  <Award style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No report card records published yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {terms.map(term => (
                    <div key={term} className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{term}</span>
                        <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent-purple)' }}>{termAverage(byTerm[term])}% Average</span>
                      </div>
                      <div className="table-wrap">
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th style={{ textAlign: 'center' }}>Marks</th>
                              <th style={{ textAlign: 'center' }}>Percentage %</th>
                              <th style={{ textAlign: 'center' }}>Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {byTerm[term].map((r, i) => (
                              <tr key={i}>
                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.subject}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{r.marks} / {r.total_marks}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round((r.marks / r.total_marks) * 100)}%</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${gradeColor[r.grade]?.split(' ')[0] || "text-gray-400"} ${gradeColor[r.grade]?.split(' ')[1] || "bg-gray-500/10"}`}>{r.grade}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'fees' && (
            <div>
              {/* Fee breakdown row */}
              <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, borderTop: `3px solid ${totalDue > 0 ? "var(--accent-rose)" : "var(--accent-emerald)"}` }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Pending Dues</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: totalDue > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginTop: 6 }}>Rs {totalDue.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, borderTop: '3px solid var(--accent-emerald)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid Fees</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 6 }}>Rs {totalPaid.toLocaleString()}</div>
                </div>
              </div>

              {pendingFees.length > 0 && (
                <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '14px 20px', background: 'rgba(244,63,94,0.06)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--accent-rose)' }}>⏳ Pending Dues ({pendingFees.length})</span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {pendingFees.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 700 }}>{r.month}</td>
                            <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.fee_type}</td>
                            <td style={{ fontWeight: 800, color: 'var(--accent-rose)', textAlign: 'right' }}>Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: 850, fontSize: 14, color: 'var(--text-primary)' }}>Payment History ledger</span>
                </div>
                {paidFees.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No payment logs recorded.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Fee Type</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Receipt #</th>
                          <th>Paid On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidFees.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 750 }}>{r.month}</td>
                            <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.fee_type}</td>
                            <td style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                            <td>{r.payment_mode || "—"}</td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{r.receipt_no || "—"}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {r.paid_at ? new Date(r.paid_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
              {ttPeriods.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Calendar style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Class timetable schedule not published yet.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Period</th>
                        {DAYS.map(d => (
                          <th key={d} style={{ textAlign: 'center' }}>{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ttPeriods.map(p => {
                        const sample = Object.values(ttGrid[p])[0] as any;
                        return (
                          <tr key={p}>
                            <td style={{ verticalAlign: 'top', padding: '14px 16px' }}>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14.5 }}>Period {p}</div>
                              {sample && (
                                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap' }}>
                                  {fmtTime(sample.start_time)} – {fmtTime(sample.end_time)}
                                </div>
                              )}
                            </td>
                            {DAYS.map(d => {
                              const entry = ttGrid[p]?.[d];
                              let bg = 'var(--bg-elevated)';
                              let border = '1px solid var(--border-subtle)';
                              let color = 'var(--text-primary)';
                              if (entry && ttSubjectColor[entry.subject]) {
                                const parts = ttSubjectColor[entry.subject].split(' ');
                                bg = parts[0];
                                border = `1px solid ${parts[1]}`;
                                color = parts[2];
                              }
                              return (
                                <td key={d} style={{ verticalAlign: 'top', padding: '8px 10px' }}>
                                  {entry ? (
                                    <div style={{ background: bg, border: border, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                      <div style={{ fontSize: 13, fontWeight: 800, color: color }}>{entry.subject}</div>
                                    </div>
                                  ) : (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>—</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
