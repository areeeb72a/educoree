'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ClipboardList, BarChart3, Wallet, MessageCircle, ChevronRight } from 'lucide-react'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

const gradeColor: Record<string, string> = {
  "A+": "#059669", "A": "#059669",
  "B+": "#2563EB", "B": "#2563EB",
  "C": "#D97706", "D": "#EA580C",
  "F": "#DC2626",
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
  useEffect(() => { if ((activeTab === 'overview' || activeTab === 'marks' || activeTab === 'fees' || activeTab === 'timetable' || activeTab === 'attendance') && !marksLoaded) fetchGuardianAndChildren() }, [activeTab])
  useEffect(() => { if (selectedChild && activeTab === 'marks') fetchResults() }, [selectedChild, activeTab])
  useEffect(() => { if (selectedChild && activeTab === 'fees') fetchFees() }, [selectedChild, activeTab])
  useEffect(() => { if (selectedChild && activeTab === 'timetable') fetchTimetable() }, [selectedChild, activeTab])
  useEffect(() => { if (selectedChild && activeTab === 'attendance') fetchAttendance() }, [selectedChild, activeTab, attMonth])
  useEffect(() => { if (selectedChild && activeTab === 'overview') fetchOverviewSummary() }, [selectedChild, activeTab])

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
      const { data: kids } = await supabase.from('students').select('id, name, grade, section').eq('guardian_id', guardianData.id).order('name')
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
    // Last 30 days attendance %
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

    // Average marks (published)
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

  const tabs = ['overview', 'attendance', 'marks', 'fees', 'timetable', 'communication', 'messages']
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
  const DAY_LABELS: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri' }
  const ttPeriods = Array.from(new Set(timetableEntries.map(e => e.period_no))).sort((a, b) => a - b)
  const ttGrid: Record<number, Record<string, any>> = {}
  timetableEntries.forEach(e => { if (!ttGrid[e.period_no]) ttGrid[e.period_no] = {}; ttGrid[e.period_no][e.day_of_week] = e })

  return (
    <div style={{ minHeight: '100vh', background: '#07050F', fontFamily: 'sans-serif', color: '#fff' }}>
      <div style={{ background: '#12102A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>👨‍👩‍👧</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{profile?.name || 'Parent'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Parent Portal · {profile?.schools?.name || ''}</div>
          </div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Sign Out</button>
      </div>

      <div style={{ background: '#12102A', padding: '0 24px', display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => tab === 'communication' ? (window.location.href = '/dashboard/parent/diary') : tab === 'messages' ? (window.location.href = '/dashboard/parent/messages') : setActiveTab(tab)} style={{
            padding: '12px 18px',
            background: activeTab === tab ? 'rgba(124,58,237,0.12)' : 'none',
            border: 'none',
            borderRadius: activeTab === tab ? '10px 10px 0 0' : 0,
            color: activeTab === tab ? '#C4B5FD' : 'rgba(255,255,255,0.55)',
            fontSize: 13,
            fontWeight: activeTab === tab ? 700 : 500,
            cursor: 'pointer',
            position: 'relative',
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s, color 0.15s',
          }}>
            {tab === 'communication' ? 'Diary' : tab}
            {activeTab === tab && (
              <span style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: '#A78BFA', borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
      ) : (
        <div style={{ padding: '20px 24px' }}>
          {activeTab === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  {
                    label: "Child's Attendance", icon: ClipboardList, color: '#34D399',
                    value: overviewAttPct !== null ? `${overviewAttPct}%` : '-',
                  },
                  {
                    label: 'Average Marks', icon: BarChart3, color: '#A78BFA',
                    value: overviewMarksPct !== null ? `${overviewMarksPct}%` : '-',
                  },
                  {
                    label: 'Fee Status', icon: Wallet, color: marksLoaded && totalDue > 0 ? '#FBBF24' : '#4ADE80',
                    value: marksLoaded ? (totalDue > 0 ? 'Pending' : 'No Dues') : '-',
                  },
                  { label: 'New Messages', icon: MessageCircle, color: '#60A5FA', value: 0 },
                ].map((k, i) => {
                  const Icon = k.icon
                  return (
                    <div key={i} style={{ background: '#12102A', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)', borderTop: `3px solid ${k.color}`, boxShadow: `0 0 16px -4px ${k.color}66`, minHeight: 116, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${k.color}1E`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={17} style={{ color: k.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.03em' }}>{k.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: k.color, letterSpacing: '-0.02em' }}>{k.value}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#12102A', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>My Profile</div>
                  {[
                    { label: 'Name', value: profile?.name },
                    { label: 'Parent ID', value: profile?.auto_id },
                    { label: 'School', value: profile?.schools?.name },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0, minWidth: 70 }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value || '-'}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#12102A', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Quick Links</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Attendance', icon: ClipboardList, color: '#34D399', tab: 'attendance' },
                      { label: 'Marks', icon: BarChart3, color: '#A78BFA', tab: 'marks' },
                      { label: 'Pay Fees', icon: Wallet, color: '#FBBF24', tab: 'fees' },
                      { label: 'Diary / Homework', icon: ClipboardList, color: '#F472B6', tab: 'communication' },
                      { label: 'Message Teacher', icon: MessageCircle, color: '#60A5FA', tab: 'messages' },
                    ].map((action, i) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={i}
                          onClick={() => action.tab === 'communication' ? (window.location.href = '/dashboard/parent/diary') : action.tab === 'messages' ? (window.location.href = '/dashboard/parent/messages') : setActiveTab(action.tab)}
                          style={{
                            padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12, color: '#fff', cursor: 'pointer', textAlign: 'left',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-3px)'
                            e.currentTarget.style.border = `1px solid ${action.color}99`
                            e.currentTarget.style.boxShadow = `0 8px 20px -8px ${action.color}55`
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${action.color}1E`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={15} style={{ color: action.color }} />
                            </div>
                            <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.25)' }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{action.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'attendance' && (
            <div>
              {!marksLoaded ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
              ) : !guardian ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Guardian profile not found. Contact admin.
                </div>
              ) : children.length === 0 ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Koi student aapke account se linked nahi hai. Contact admin.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {currentChild ? `${currentChild.name} · Grade ${currentChild.grade}-${currentChild.section}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {children.length > 1 && (
                        <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
                          style={{ background: '#12102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13 }}>
                          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                      <input type="month" value={attMonth} max={new Date().toISOString().slice(0, 7)} onChange={e => setAttMonth(e.target.value)}
                        className="[color-scheme:dark]"
                        style={{ background: '#12102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13 }} />
                    </div>
                  </div>

                  {(() => {
                    const total = attendanceRecords.length
                    const present = attendanceRecords.filter(r => r.status === 'present').length
                    const absent = attendanceRecords.filter(r => r.status === 'absent').length
                    const late = attendanceRecords.filter(r => r.status === 'late').length
                    const pct = total ? Math.round((present / total) * 100) : 0
                    return (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                          {[
                            { label: 'Attendance %', value: `${pct}%`, color: pct >= 75 ? '#34D399' : '#F87171', icon: '📊' },
                            { label: 'Present', value: present, color: '#34D399', icon: '✅' },
                            { label: 'Absent', value: absent, color: '#F87171', icon: '❌' },
                            { label: 'Late', value: late, color: '#FBBF24', icon: '⏰' },
                          ].map((k, i) => (
                            <div key={i} style={{ background: '#12102A', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                              <div style={{ fontSize: 18, marginBottom: 6 }}>{k.icon}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                            </div>
                          ))}
                        </div>

                        {pct < 75 && total > 0 && (
                          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#F87171' }}>
                            ⚠️ Attendance 75% se neeche hai is mahine.
                          </div>
                        )}
                      </>
                    )
                  })()}

                  <div style={{ background: '#12102A', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    {attendanceRecords.length === 0 ? (
                      <div style={{ padding: 50, textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Is mahine ka koi record nahi mila.</div>
                      </div>
                    ) : (
                      <table style={{ width: '100%', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {['Date', 'Day', 'Status', 'Remarks'].map(h => (
                              <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Status' ? 'center' : 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceRecords.map((r, i) => {
                            const d = new Date(r.date)
                            const statusColor: Record<string, string> = { present: '#34D399', absent: '#F87171', late: '#FBBF24' }
                            return (
                              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '10px 16px' }}>{d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>{d.toLocaleDateString('en-PK', { weekday: 'short' })}</td>
                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                  <span style={{ background: `${statusColor[r.status]}22`, color: statusColor[r.status], padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span>
                                </td>
                                <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.4)' }}>{r.remarks || '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'marks' && (
            <div>
              {!marksLoaded ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
              ) : !guardian ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Guardian profile not found. Contact admin.
                </div>
              ) : children.length === 0 ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Koi student aapke account se linked nahi hai. Contact admin.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {currentChild ? `${currentChild.name} · Grade ${currentChild.grade}-${currentChild.section}` : ''}
                    </div>
                    {children.length > 1 && (
                      <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
                        style={{ background: '#12102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13 }}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>

                  {terms.length === 0 ? (
                    <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Abhi tak koi result published nahi hua.</div>
                    </div>
                  ) : (
                    terms.map(term => {
                      const records = byTerm[term]
                      const avg = Math.round(records.reduce((sum, r) => sum + (r.marks / r.total_marks) * 100, 0) / records.length)
                      return (
                        <div key={term} style={{ background: '#12102A', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 16 }}>
                          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 14, fontWeight: 800 }}>{term}</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>{avg}% average</span>
                          </div>
                          <table style={{ width: '100%', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                {['Subject', 'Marks', '%', 'Grade'].map(h => (
                                  <th key={h} style={{ padding: '8px 20px', textAlign: h === 'Subject' ? 'left' : 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((r, i) => (
                                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '10px 20px' }}>{r.subject}</td>
                                  <td style={{ padding: '10px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{r.marks} / {r.total_marks}</td>
                                  <td style={{ padding: '10px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{Math.round((r.marks / r.total_marks) * 100)}%</td>
                                  <td style={{ padding: '10px 20px', textAlign: 'center' }}>
                                    <span style={{ background: `${gradeColor[r.grade] || '#666'}22`, color: gradeColor[r.grade] || '#999', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{r.grade}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'fees' && (
            <div>
              {!marksLoaded ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
              ) : !guardian ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Guardian profile not found. Contact admin.
                </div>
              ) : children.length === 0 ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Koi student aapke account se linked nahi hai. Contact admin.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {currentChild ? `${currentChild.name} · Grade ${currentChild.grade}-${currentChild.section}` : ''}
                    </div>
                    {children.length > 1 && (
                      <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
                        style={{ background: '#12102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13 }}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: '#12102A', borderRadius: 14, padding: 18, border: `1px solid ${totalDue > 0 ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Total Pending</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: totalDue > 0 ? '#F87171' : '#34D399' }}>Rs {totalDue.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#12102A', borderRadius: 14, padding: 18, border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Total Paid</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#34D399' }}>Rs {totalPaid.toLocaleString()}</div>
                    </div>
                  </div>

                  {pendingFees.length > 0 && (
                    <div style={{ background: '#12102A', borderRadius: 16, border: '1px solid rgba(220,38,38,0.2)', overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(220,38,38,0.15)', background: 'rgba(220,38,38,0.08)' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#F87171' }}>⏳ Pending Dues ({pendingFees.length})</span>
                      </div>
                      <table style={{ width: '100%', fontSize: 13 }}>
                        <tbody>
                          {pendingFees.map(r => (
                            <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '10px 20px' }}>{r.month}</td>
                              <td style={{ padding: '10px 20px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{r.fee_type}</td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 700, color: '#F87171' }}>Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ background: '#12102A', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>Payment History</span>
                    </div>
                    {paidFees.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Abhi tak koi payment record nahi hai.</div>
                    ) : (
                      <table style={{ width: '100%', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {['Month', 'Fee Type', 'Amount', 'Mode', 'Paid On'].map(h => (
                              <th key={h} style={{ padding: '8px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paidFees.map(r => (
                            <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '10px 20px' }}>{r.month}</td>
                              <td style={{ padding: '10px 20px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{r.fee_type}</td>
                              <td style={{ padding: '10px 20px', fontWeight: 700, color: '#34D399' }}>Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                              <td style={{ padding: '10px 20px', color: 'rgba(255,255,255,0.5)' }}>{r.payment_mode || '-'}</td>
                              <td style={{ padding: '10px 20px', color: 'rgba(255,255,255,0.4)' }}>{r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'timetable' && (
            <div>
              {!marksLoaded ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
              ) : !guardian ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Guardian profile not found. Contact admin.
                </div>
              ) : children.length === 0 ? (
                <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  Koi student aapke account se linked nahi hai. Contact admin.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {currentChild ? `${currentChild.name} · Grade ${currentChild.grade}-${currentChild.section}` : ''}
                    </div>
                    {children.length > 1 && (
                      <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
                        style={{ background: '#12102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13 }}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>

                  {ttPeriods.length === 0 ? (
                    <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🗓️</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Abhi timetable set nahi hua.</div>
                    </div>
                  ) : (
                    <div style={{ background: '#12102A', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: 560, fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', width: 60 }}>Period</th>
                            {DAYS.map(d => (
                              <th key={d} style={{ padding: '10px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase' }}>{DAY_LABELS[d]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ttPeriods.map(p => (
                            <tr key={p} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>P{p}</td>
                              {DAYS.map(d => {
                                const entry = ttGrid[p]?.[d]
                                return (
                                  <td key={d} style={{ padding: '6px 6px', textAlign: 'center' }}>
                                    {entry ? (
                                      <div style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, padding: '6px 4px', fontSize: 11, fontWeight: 700, color: '#C4B5FD' }}>
                                        {entry.subject}
                                      </div>
                                    ) : (
                                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'attendance' && activeTab !== 'marks' && activeTab !== 'fees' && activeTab !== 'timetable' && activeTab !== 'communication' && activeTab !== 'messages' && (
            <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {{attendance: '📋'}[activeTab]}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, textTransform: 'capitalize' }}>{activeTab}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Coming soon — agle update mein!</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
