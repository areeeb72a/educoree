'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Users, GraduationCap, BookOpen, ClipboardList, BarChart3, ChevronRight } from 'lucide-react'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

const CHRONIC_THRESHOLD = 75 // %

export default function PrincipalDashboard() {
  const [branch, setBranch] = useState<any>(null)
  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0, attendance: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [branchId, setBranchId] = useState<string | null>(null)

  // attendance tab state
  const [attLoading, setAttLoading] = useState(false)
  const [attLoaded, setAttLoaded] = useState(false)
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, late: 0, total: 0 })
  const [classBreakdown, setClassBreakdown] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [chronicList, setChronicList] = useState<any[]>([])
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  // teachers tab state
  const [teachersLoading, setTeachersLoading] = useState(false)
  const [teachersLoaded, setTeachersLoaded] = useState(false)
  const [teachersList, setTeachersList] = useState<any[]>([])
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, any[]>>({})
  const [loadingAssignments, setLoadingAssignments] = useState<string | null>(null)
  const [teacherSearch, setTeacherSearch] = useState('')

  // students tab state
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [studentsList, setStudentsList] = useState<any[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // classes tab state
  const [classesLoading, setClassesLoading] = useState(false)
  const [classesLoaded, setClassesLoaded] = useState(false)
  const [classesList, setClassesList] = useState<any[]>([])

  // reports tab state
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsLoaded, setReportsLoaded] = useState(false)
  const [reportAttendancePct, setReportAttendancePct] = useState(0)
  const [reportMarksAvg, setReportMarksAvg] = useState(0)
  const [reportSubjectAvg, setReportSubjectAvg] = useState<any[]>([])
  const [reportFees, setReportFees] = useState({ collected: 0, pending: 0, totalNet: 0 })

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (activeTab === 'attendance' && !attLoaded) fetchAttendanceSummary() }, [activeTab])
  useEffect(() => { if (activeTab === 'teachers' && !teachersLoaded) fetchTeachers() }, [activeTab])
  useEffect(() => { if (activeTab === 'students' && !studentsLoaded) fetchStudents() }, [activeTab])
  useEffect(() => { if (activeTab === 'classes' && !classesLoaded) fetchClasses() }, [activeTab])
  useEffect(() => { if (activeTab === 'reports' && !reportsLoaded) fetchReports() }, [activeTab])

  async function fetchReports() {
    if (!branchId) return
    setReportsLoading(true)

    const { data: branchStudents } = await supabase
      .from('students')
      .select('id')
      .eq('branch_id', branchId)
      .eq('active', true)

    const studentIds = (branchStudents || []).map(s => s.id)
    if (studentIds.length === 0) {
      setReportAttendancePct(0)
      setReportMarksAvg(0)
      setReportSubjectAvg([])
      setReportFees({ collected: 0, pending: 0, totalNet: 0 })
      setReportsLoading(false)
      setReportsLoaded(true)
      return
    }

    // Attendance: last 30 days
    const since = new Date()
    since.setDate(since.getDate() - 29)
    const sinceStr = since.toISOString().split('T')[0]

    const { data: attRecords } = await supabase
      .from('attendance')
      .select('status')
      .in('student_id', studentIds)
      .gte('date', sinceStr)

    const attTotal = attRecords?.length || 0
    const attPresent = (attRecords || []).filter(r => r.status === 'present').length
    setReportAttendancePct(attTotal ? Math.round((attPresent / attTotal) * 100) : 0)

    // Marks: published results, current year
    const year = new Date().getFullYear()
    const { data: results } = await supabase
      .from('results')
      .select('subject, marks, total_marks, student_id')
      .in('student_id', studentIds)
      .eq('year', year)
      .eq('status', 'published')

    if (results && results.length > 0) {
      const overallPct = results.reduce((sum, r) => sum + (r.marks / r.total_marks) * 100, 0) / results.length
      setReportMarksAvg(Math.round(overallPct))

      const subjectMap: Record<string, { sum: number; count: number }> = {}
      results.forEach(r => {
        if (!subjectMap[r.subject]) subjectMap[r.subject] = { sum: 0, count: 0 }
        subjectMap[r.subject].sum += (r.marks / r.total_marks) * 100
        subjectMap[r.subject].count++
      })
      const subjectAvgs = Object.entries(subjectMap)
        .map(([subject, v]) => ({ subject, avg: Math.round(v.sum / v.count) }))
        .sort((a, b) => b.avg - a.avg)
      setReportSubjectAvg(subjectAvgs)
    } else {
      setReportMarksAvg(0)
      setReportSubjectAvg([])
    }

    // Fees: current month, this branch's students
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { data: feeRecords } = await supabase
      .from('fee_records')
      .select('net_amount, status, student_id, month')
      .in('student_id', studentIds)

    const thisMonthFees = (feeRecords || []).filter(f => f.month?.startsWith(currentMonth))
    const collected = thisMonthFees.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.net_amount || 0), 0)
    const pending = thisMonthFees.filter(f => f.status !== 'paid').reduce((sum, f) => sum + (f.net_amount || 0), 0)
    setReportFees({ collected, pending, totalNet: collected + pending })

    setReportsLoading(false)
    setReportsLoaded(true)
  }

  async function fetchClasses() {
    if (!branchId) return
    setClassesLoading(true)

    // 1. Get student counts per grade-section
    const { data: students } = await supabase
      .from('students')
      .select('grade, section')
      .eq('branch_id', branchId)
      .eq('active', true)

    const countMap: Record<string, number> = {}
    ;(students || []).forEach(s => {
      const key = `${s.grade}-${s.section}`
      countMap[key] = (countMap[key] || 0) + 1
    })

    // 2. Get class incharges
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('grade, section, teacher_id, is_incharge')
      .eq('branch_id', branchId)
      .eq('is_incharge', true)

    const inchargeIds = Array.from(new Set((assignments || []).map(a => a.teacher_id)))
    let teacherMap: Record<string, { name: string; phone: string }> = {}
    if (inchargeIds.length > 0) {
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', inchargeIds)
      ;(teachers || []).forEach(t => { teacherMap[t.id] = { name: t.name, phone: t.phone } })
    }

    const inchargeMap: Record<string, { name: string; phone: string }> = {}
    ;(assignments || []).forEach(a => {
      const key = `${a.grade}-${a.section}`
      if (teacherMap[a.teacher_id]) inchargeMap[key] = teacherMap[a.teacher_id]
    })

    // 3. Build merged class list (union of grade-sections from students and assignments)
    const allKeys = new Set([...Object.keys(countMap), ...Object.keys(inchargeMap)])
    const classes = Array.from(allKeys).map(key => {
      const [grade, section] = key.split('-')
      return {
        grade,
        section,
        studentCount: countMap[key] || 0,
        incharge: inchargeMap[key] || null,
      }
    }).sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }) || a.section.localeCompare(b.section))

    setClassesList(classes)
    setClassesLoading(false)
    setClassesLoaded(true)
  }

  async function fetchStudents() {
    if (!branchId) return
    setStudentsLoading(true)
    const { data } = await supabase
      .from('students')
      .select('id, name, grade, section, roll_number, auto_id, guardian_id, active')
      .eq('branch_id', branchId)
      .eq('active', true)
      .order('grade')
      .order('section')
      .order('roll_number')

    const guardianIds = Array.from(new Set((data || []).map(s => s.guardian_id).filter(Boolean)))
    let guardianMap: Record<string, string> = {}
    if (guardianIds.length > 0) {
      const { data: guardians } = await supabase
        .from('guardians')
        .select('id, name')
        .in('id', guardianIds)
      ;(guardians || []).forEach(g => { guardianMap[g.id] = g.name })
    }

    const enriched = (data || []).map(s => ({ ...s, guardianName: s.guardian_id ? guardianMap[s.guardian_id] || '-' : '-' }))
    setStudentsList(enriched)
    setStudentsLoading(false)
    setStudentsLoaded(true)
  }

  const filteredStudents = studentsList.filter(s =>
    !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.auto_id?.toLowerCase().includes(studentSearch.toLowerCase())
  )

  // Nested structure: { "Grade 1": { "A": [students], "B": [students] } }
  const gradeTree: Record<string, Record<string, any[]>> = {}
  filteredStudents.forEach(s => {
    const gradeKey = `Grade ${s.grade}`
    if (!gradeTree[gradeKey]) gradeTree[gradeKey] = {}
    if (!gradeTree[gradeKey][s.section]) gradeTree[gradeKey][s.section] = []
    gradeTree[gradeKey][s.section].push(s)
  })
  const gradeKeys = Object.keys(gradeTree).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  function totalInGrade(gradeKey: string) {
    return Object.values(gradeTree[gradeKey] || {}).reduce((sum, arr) => sum + arr.length, 0)
  }

  function toggleGrade(gradeKey: string) {
    setExpandedGrade(expandedGrade === gradeKey ? null : gradeKey)
    setExpandedSection(null)
  }

  function toggleSection(sectionKey: string) {
    setExpandedSection(expandedSection === sectionKey ? null : sectionKey)
  }

  useEffect(() => {
    if (studentSearch && gradeKeys.length > 0) {
      const firstGrade = gradeKeys[0]
      setExpandedGrade(firstGrade)
      const sections = Object.keys(gradeTree[firstGrade] || {})
      if (sections.length > 0) setExpandedSection(sections[0])
    }
  }, [studentSearch])

  async function fetchTeachers() {
    if (!branchId) return
    setTeachersLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, phone, joining_date, photo_url, active, auto_id')
      .eq('branch_id', branchId)
      .eq('role', 'teacher')
      .order('name')
    setTeachersList(data || [])
    setTeachersLoading(false)
    setTeachersLoaded(true)
  }

  async function toggleTeacherDetail(teacherId: string) {
    if (expandedTeacher === teacherId) { setExpandedTeacher(null); return }
    setExpandedTeacher(teacherId)
    if (!teacherAssignments[teacherId]) await loadTeacherAssignments(teacherId)
  }

  async function loadTeacherAssignments(teacherId: string) {
    setLoadingAssignments(teacherId)
    const { data } = await supabase
      .from('teacher_assignments')
      .select('grade, section, subject, is_incharge')
      .eq('teacher_id', teacherId)
      .order('grade')
    setTeacherAssignments(prev => ({ ...prev, [teacherId]: data || [] }))
    setLoadingAssignments(null)
  }

  const filteredTeachers = teachersList.filter(t =>
    !teacherSearch || t.name?.toLowerCase().includes(teacherSearch.toLowerCase()) || t.auto_id?.toLowerCase().includes(teacherSearch.toLowerCase())
  )

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, branches(*), schools(*)')
      .eq('id', user.id)
      .single()

    if (profile?.branches) setBranch(profile.branches)
    setBranchId(profile?.branch_id || null)

    const bId = profile?.branch_id
    if (bId) {
      const [teachers, students, classRows] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('branch_id', bId).eq('role', 'teacher'),
        supabase.from('students').select('id', { count: 'exact' }).eq('branch_id', bId).eq('active', true),
        supabase.from('students').select('grade, section').eq('branch_id', bId).eq('active', true),
      ])
      const distinctClasses = new Set((classRows.data || []).map((s: any) => `${s.grade}-${s.section}`))
      setStats({
        teachers: teachers.count || 0,
        students: students.count || 0,
        classes: distinctClasses.size,
        attendance: 0,
      })
    }
    setLoading(false)
  }

  async function fetchAttendanceSummary() {
    if (!branchId) return
    setAttLoading(true)

    // 1. All active students in this branch
    const { data: branchStudents } = await supabase
      .from('students')
      .select('id, name, grade, section, roll_number')
      .eq('branch_id', branchId)
      .eq('active', true)

    const studentIds = (branchStudents || []).map(s => s.id)
    if (studentIds.length === 0) {
      setTodayStats({ present: 0, absent: 0, late: 0, total: 0 })
      setClassBreakdown([])
      setTrendData([])
      setChronicList([])
      setAttLoading(false)
      setAttLoaded(true)
      return
    }

    // 2. Today's attendance
    const today = new Date().toISOString().split('T')[0]
    const { data: todayRecords } = await supabase
      .from('attendance')
      .select('student_id, status, grade, section')
      .in('student_id', studentIds)
      .eq('date', today)

    const present = (todayRecords || []).filter(r => r.status === 'present').length
    const absent = (todayRecords || []).filter(r => r.status === 'absent').length
    const late = (todayRecords || []).filter(r => r.status === 'late').length
    setTodayStats({ present, absent, late, total: todayRecords?.length || 0 })

    // 3. Class-wise breakdown for today
    const classMap: Record<string, { grade: string; section: string; present: number; absent: number; late: number; total: number }> = {}
    ;(todayRecords || []).forEach(r => {
      const key = `${r.grade}-${r.section}`
      if (!classMap[key]) classMap[key] = { grade: r.grade, section: r.section, present: 0, absent: 0, late: 0, total: 0 }
      classMap[key].total++
      if (r.status === 'present') classMap[key].present++
      if (r.status === 'absent') classMap[key].absent++
      if (r.status === 'late') classMap[key].late++
    })
    const breakdown = Object.values(classMap).sort((a, b) => a.grade.localeCompare(b.grade) || a.section.localeCompare(b.section))
    setClassBreakdown(breakdown)

    // 4. Date range attendance (for trend chart + chronic absentees)
    const { data: rangeRecords } = await supabase
      .from('attendance')
      .select('student_id, date, status')
      .in('student_id', studentIds)
      .gte('date', dateFrom)
      .lte('date', dateTo)

    // Trend: group by date
    const dateMap: Record<string, { present: number; total: number }> = {}
    ;(rangeRecords || []).forEach(r => {
      if (!dateMap[r.date]) dateMap[r.date] = { present: 0, total: 0 }
      dateMap[r.date].total++
      if (r.status === 'present') dateMap[r.date].present++
    })
    const trend = Object.entries(dateMap)
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
        rawDate: date,
        pct: v.total ? Math.round((v.present / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    setTrendData(trend)

    // Chronic absentees: per-student attendance % over range
    const studentMap: Record<string, { present: number; total: number }> = {}
    ;(rangeRecords || []).forEach(r => {
      if (!studentMap[r.student_id]) studentMap[r.student_id] = { present: 0, total: 0 }
      studentMap[r.student_id].total++
      if (r.status === 'present') studentMap[r.student_id].present++
    })

    const chronic = (branchStudents || [])
      .map(s => {
        const rec = studentMap[s.id]
        if (!rec || rec.total === 0) return null
        const pct = Math.round((rec.present / rec.total) * 100)
        return { ...s, pct, total: rec.total, present: rec.present }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null && s.pct < CHRONIC_THRESHOLD)
      .sort((a, b) => a.pct - b.pct)

    setChronicList(chronic)
    setAttLoading(false)
    setAttLoaded(true)
  }

  function applyDateFilter() {
    fetchAttendanceSummary()
  }

  const tabs = ['overview', 'teachers', 'students', 'classes', 'attendance', 'reports']
  const todayPct = todayStats.total ? Math.round((todayStats.present / todayStats.total) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#07050F', fontFamily: 'sans-serif', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#12102A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🏫</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{branch?.name || 'Branch'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Principal Dashboard · {branch?.code || ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#12102A', padding: '0 24px', display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
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
            {tab}
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
                  { label: 'Teachers', value: stats.teachers, color: '#34D399', icon: Users },
                  { label: 'Students', value: stats.students, color: '#FBBF24', icon: GraduationCap },
                  { label: 'Classes', value: stats.classes, color: '#A78BFA', icon: BookOpen },
                  { label: 'Attendance %', value: stats.attendance + '%', color: '#60A5FA', icon: ClipboardList },
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

              {/* Quick Actions */}
              <div style={{ background: '#12102A', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Quick Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="principal-quick-grid">
                  <style>{`
                    @media (max-width: 900px) {
                      .principal-quick-grid { grid-template-columns: repeat(3, 1fr) !important; }
                    }
                    @media (max-width: 700px) {
                      .principal-quick-grid { grid-template-columns: repeat(2, 1fr) !important; }
                    }
                    @media (max-width: 460px) {
                      .principal-quick-grid { grid-template-columns: 1fr !important; }
                    }
                  `}</style>
                  {[
                    { label: 'Teachers', icon: Users, color: '#34D399', tab: 'teachers' },
                    { label: 'Students', icon: GraduationCap, color: '#FBBF24', tab: 'students' },
                    { label: 'Classes', icon: BookOpen, color: '#A78BFA', tab: 'classes' },
                    { label: 'Attendance', icon: ClipboardList, color: '#60A5FA', tab: 'attendance' },
                    { label: 'Reports', icon: BarChart3, color: '#F472B6', tab: 'reports' },
                  ].map((action, i) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveTab(action.tab)}
                        style={{
                          padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${action.color}1E`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={17} style={{ color: action.color }} />
                          </div>
                          <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{action.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Branch Info */}
              <div style={{ background: '#12102A', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Branch Information</div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                    background: branch?.active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: branch?.active ? '#34D399' : '#F87171',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: branch?.active ? '#34D399' : '#F87171' }} />
                    {branch?.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Branch Name</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{branch?.name || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Branch Code</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{branch?.code || '-'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, padding: '12px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>City</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{branch?.city || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Address</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{branch?.address || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-gray-50 text-gray-900 -m-6 min-h-[calc(100vh-113px)]">
              {attLoading ? (
                <div className="text-center py-16 text-gray-400">Loading attendance data...</div>
              ) : (
                <>
                  {/* Gradient header banner */}
                  <div className="bg-gradient-to-r from-teal-700 to-cyan-800 px-6 pt-6 pb-8 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">📋 Today's Attendance</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Attendance %', value: todayPct + '%', icon: '📊' },
                        { label: 'Present', value: todayStats.present, icon: '✅' },
                        { label: 'Absent', value: todayStats.absent, icon: '❌' },
                        { label: 'Late', value: todayStats.late, icon: '⏰' },
                      ].map((k, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                          <div className="text-xl mb-1">{k.icon}</div>
                          <div className="text-2xl font-extrabold text-white">{k.value}</div>
                          <div className="text-teal-100 text-xs mt-0.5">{k.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 pb-6">

                  {/* Class-wise breakdown */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="px-5 py-3.5 border-b border-gray-100">
                      <span className="text-sm font-extrabold text-gray-800">Class-wise Breakdown (Today)</span>
                    </div>
                    {classBreakdown.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        Aaj ka attendance abhi mark nahi hua kisi class mein.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            {['Grade', 'Section', 'Present', 'Absent', 'Late', '%'].map(h => (
                              <th key={h} className="px-5 py-2 text-left text-xs text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {classBreakdown.map((c, i) => {
                            const pct = c.total ? Math.round((c.present / c.total) * 100) : 0
                            return (
                              <tr key={i}>
                                <td className="px-5 py-2.5 font-bold text-gray-900">{c.grade}</td>
                                <td className="px-5 py-2.5 text-gray-700">{c.section}</td>
                                <td className="px-5 py-2.5 text-green-600">{c.present}</td>
                                <td className="px-5 py-2.5 text-red-600">{c.absent}</td>
                                <td className="px-5 py-2.5 text-yellow-600">{c.late}</td>
                                <td className={`px-5 py-2.5 font-bold ${pct >= 75 ? 'text-green-600' : 'text-red-600'}`}>{pct}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Date range filter + trend chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                      <span className="text-sm font-extrabold text-gray-800">Attendance Trend</span>
                      <div className="flex gap-2 items-center flex-wrap">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        <span className="text-gray-400 text-xs">to</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        <button onClick={applyDateFilter} className="bg-teal-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold hover:bg-teal-800 transition-colors">
                          Apply
                        </button>
                      </div>
                    </div>

                    {trendData.length === 0 ? (
                      <div className="p-10 text-center text-gray-400 text-sm">
                        Is date range mein koi attendance record nahi mila.
                      </div>
                    ) : (
                      <div className="w-full h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                            <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} unit="%" />
                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                            <Line type="monotone" dataKey="pct" name="Attendance %" stroke="#0f766e" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Chronic absentees */}
                  <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-red-100 bg-red-50">
                      <span className="text-sm font-extrabold text-red-600">
                        ⚠️ Chronic Absentees ({'<'}{CHRONIC_THRESHOLD}% in selected range) — {chronicList.length}
                      </span>
                    </div>
                    {chronicList.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        Koi student {CHRONIC_THRESHOLD}% se neeche nahi hai is range mein. 🎉
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            {['Student', 'Grade', 'Roll #', 'Present/Total', '%'].map(h => (
                              <th key={h} className="px-5 py-2 text-left text-xs text-gray-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {chronicList.map((s, i) => (
                            <tr key={i}>
                              <td className="px-5 py-2.5 font-semibold text-gray-900">{s.name}</td>
                              <td className="px-5 py-2.5 text-gray-700">{s.grade}-{s.section}</td>
                              <td className="px-5 py-2.5 text-gray-500">{s.roll_number}</td>
                              <td className="px-5 py-2.5 text-gray-500">{s.present}/{s.total}</td>
                              <td className="px-5 py-2.5 font-bold text-red-600">{s.pct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="bg-gray-50 text-gray-900 -m-6 min-h-[calc(100vh-113px)]">
              {teachersLoading ? (
                <div className="text-center py-16 text-gray-400">Loading...</div>
              ) : (
                <>
                  {/* Gradient header banner */}
                  <div className="bg-gradient-to-r from-slate-700 to-blue-800 px-6 pt-6 pb-8 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">👨‍🏫 Teachers</h2>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-xl mb-1">👥</div>
                        <div className="text-2xl font-extrabold text-white">{teachersList.length}</div>
                        <div className="text-blue-200 text-xs mt-0.5">Total Teachers</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-xl mb-1">🔍</div>
                        <div className="text-2xl font-extrabold text-white">{filteredTeachers.length}</div>
                        <div className="text-blue-200 text-xs mt-0.5">Showing</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                  <div className="flex justify-end mb-4">
                    <input
                      type="text"
                      placeholder="🔍 Search by name or ID..."
                      value={teacherSearch}
                      onChange={e => setTeacherSearch(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px] bg-white shadow-sm"
                    />
                  </div>

                  {filteredTeachers.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-14 text-center">
                      <div className="text-5xl mb-4">👨‍🏫</div>
                      <div className="text-gray-400 text-sm">Koi teacher nahi mila.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {filteredTeachers.map(t => {
                        const isExpanded = expandedTeacher === t.id
                        const assignments = teacherAssignments[t.id] || []
                        return (
                          <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                              onClick={() => toggleTeacherDetail(t.id)}
                              className="px-5 py-4 flex justify-between items-center cursor-pointer flex-wrap gap-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-base font-bold text-blue-700">
                                  {(t.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{t.name}</div>
                                  <div className="text-xs text-gray-400">{t.phone || 'No phone'} {t.auto_id ? `· ${t.auto_id}` : ''}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                {!t.active && (
                                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600">Inactive</span>
                                )}
                                <span className="text-xs text-blue-600">{isExpanded ? '▲' : '▼'}</span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50 p-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                  {[
                                    { label: 'Full Name', value: t.name },
                                    { label: 'Phone', value: t.phone },
                                    { label: 'Joining Date', value: t.joining_date ? new Date(t.joining_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
                                    { label: 'Status', value: t.active ? '● Active' : '● Inactive' },
                                  ].filter(f => f.value).map((f, i) => (
                                    <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
                                      <div className="text-xs text-gray-400 mb-1">{f.label}</div>
                                      <div className="text-sm font-semibold text-gray-900">{f.value}</div>
                                    </div>
                                  ))}
                                </div>

                                <div className="text-xs font-bold text-gray-600 mb-2">
                                  Assigned Classes & Subjects
                                </div>

                                {loadingAssignments === t.id ? (
                                  <div className="text-xs text-gray-400 p-3">Loading...</div>
                                ) : assignments.length === 0 ? (
                                  <div className="text-xs text-gray-400 p-3">Koi class assign nahi hai abhi.</div>
                                ) : (
                                  <div className="rounded-lg overflow-hidden border border-gray-100 bg-white">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          {['Grade', 'Section', 'Subject', 'Incharge'].map(h => (
                                            <th key={h} className="px-3.5 py-2 text-left text-gray-400 uppercase text-[10px]">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                        {assignments.map((a, i) => (
                                          <tr key={i}>
                                            <td className="px-3.5 py-2 font-bold text-gray-900">{a.grade}</td>
                                            <td className="px-3.5 py-2 text-gray-700">{a.section}</td>
                                            <td className="px-3.5 py-2 text-gray-700">{a.subject}</td>
                                            <td className="px-3.5 py-2">
                                              {a.is_incharge ? <span className="text-green-600">✓ Yes</span> : <span className="text-gray-300">—</span>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="bg-gray-50 text-gray-900 -m-6 min-h-[calc(100vh-113px)]">
              {studentsLoading ? (
                <div className="text-center py-16 text-gray-400">Loading...</div>
              ) : (
                <>
                  {/* Gradient header banner */}
                  <div className="bg-gradient-to-r from-orange-800 to-amber-800 px-6 pt-6 pb-8 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">🎓 Students</h2>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-xl mb-1">👥</div>
                        <div className="text-2xl font-extrabold text-white">{studentsList.length}</div>
                        <div className="text-orange-200 text-xs mt-0.5">Total Students</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-xl mb-1">🔍</div>
                        <div className="text-2xl font-extrabold text-white">{filteredStudents.length}</div>
                        <div className="text-orange-200 text-xs mt-0.5">Showing</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                  <div className="flex justify-end mb-5">
                    <input
                      type="text"
                      placeholder="🔍 Search by name or ID..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[220px] bg-white shadow-sm"
                    />
                  </div>

                  {gradeKeys.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-14 text-center">
                      <div className="text-5xl mb-4">🎓</div>
                      <div className="text-gray-400 text-sm">Koi student nahi mila.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {gradeKeys.map(gradeKey => {
                        const isGradeOpen = expandedGrade === gradeKey
                        const sections = Object.keys(gradeTree[gradeKey]).sort()
                        return (
                          <div key={gradeKey} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                              onClick={() => toggleGrade(gradeKey)}
                              className="px-5 py-3.5 flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">📘</span>
                                <span className="text-sm font-extrabold text-gray-800">{gradeKey}</span>
                                <span className="text-xs text-gray-400">({totalInGrade(gradeKey)} students · {sections.length} sections)</span>
                              </div>
                              <span className="text-xs text-orange-600">{isGradeOpen ? '▲' : '▼'}</span>
                            </div>

                            {isGradeOpen && (
                              <div className="border-t border-gray-100 p-2.5 flex flex-col gap-2">
                                {sections.map(section => {
                                  const sectionKey = `${gradeKey}-${section}`
                                  const isSectionOpen = expandedSection === sectionKey
                                  const sectionStudents = gradeTree[gradeKey][section]
                                  return (
                                    <div key={sectionKey} className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                                      <div
                                        onClick={() => toggleSection(sectionKey)}
                                        className="px-4 py-2.5 flex justify-between items-center cursor-pointer"
                                      >
                                        <span className="text-sm font-bold text-orange-700">Section {section}</span>
                                        <div className="flex items-center gap-2.5">
                                          <span className="text-xs text-gray-400">{sectionStudents.length} students</span>
                                          <span className="text-xs text-orange-600">{isSectionOpen ? '▲' : '▼'}</span>
                                        </div>
                                      </div>

                                      {isSectionOpen && (
                                        <div className="border-t border-gray-100 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {sectionStudents.map(s => (
                                            <div key={s.id} className="bg-white rounded-lg border border-gray-100 p-3">
                                              <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-6.5 h-6.5 rounded-full bg-orange-100 flex items-center justify-center text-xs">
                                                  🎓
                                                </div>
                                                <div className="text-xs font-bold text-gray-900">{s.name}</div>
                                              </div>
                                              <div className="text-[10px] text-gray-400 flex justify-between">
                                                <span>Roll #{s.roll_number || '-'}</span>
                                                <span>{s.auto_id}</span>
                                              </div>
                                              <div className="text-[10px] text-gray-500 mt-1 pt-1 border-t border-gray-50">
                                                👤 {s.guardianName}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="bg-gray-50 text-gray-900 -m-6 min-h-[calc(100vh-113px)]">
              {classesLoading ? (
                <div className="text-center py-16 text-gray-400">Loading...</div>
              ) : (
                <>
                  {/* Gradient header banner */}
                  <div className="bg-gradient-to-r from-purple-800 to-violet-900 px-6 pt-6 pb-8 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">📚 Classes</h2>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-[180px]">
                      <div className="text-xl mb-1">📘</div>
                      <div className="text-2xl font-extrabold text-white">{classesList.length}</div>
                      <div className="text-purple-200 text-xs mt-0.5">Total Classes</div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">

                  {classesList.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-14 text-center">
                      <div className="text-5xl mb-4">📚</div>
                      <div className="text-gray-400 text-sm">Koi class nahi mili.</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {classesList.map((c, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4.5">
                          <div className="flex justify-between items-center mb-3">
                            <div className="text-base font-extrabold text-gray-800">📘 Grade {c.grade} - {c.section}</div>
                            <div className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                              {c.studentCount} students
                            </div>
                          </div>

                          {c.incharge ? (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs text-gray-400 mb-1">Class Incharge</div>
                              <div className="text-sm font-bold text-gray-900">👨‍🏫 {c.incharge.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">📞 {c.incharge.phone || 'No phone'}</div>
                            </div>
                          ) : (
                            <div className="bg-red-50 rounded-lg p-3 text-xs text-red-600">
                              ⚠️ Koi class incharge assign nahi hai
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-gray-50 text-gray-900 -m-6 min-h-[calc(100vh-113px)]">
              {reportsLoading ? (
                <div className="text-center py-16 text-gray-400">Loading...</div>
              ) : (
                <>
                  {/* Gradient header banner */}
                  <div className="bg-gradient-to-r from-indigo-800 to-blue-900 px-6 pt-6 pb-8 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">📊 School Performance Overview</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-xl mb-1">📋</div>
                        <div className="text-2xl font-extrabold text-white">{reportAttendancePct}%</div>
                        <div className="text-indigo-200 text-xs mt-0.5">Attendance (30 days)</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-xl mb-1">📊</div>
                        <div className="text-2xl font-extrabold text-white">{reportMarksAvg}%</div>
                        <div className="text-indigo-200 text-xs mt-0.5">Avg Marks (this year)</div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-xl mb-1">💰</div>
                        <div className="text-2xl font-extrabold text-white">
                          {reportFees.totalNet ? Math.round((reportFees.collected / reportFees.totalNet) * 100) : 0}%
                        </div>
                        <div className="text-indigo-200 text-xs mt-0.5">Fee Collected (this month)</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Subject-wise marks */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-gray-100">
                        <span className="text-sm font-extrabold text-gray-800">Subject-wise Average</span>
                      </div>
                      {reportSubjectAvg.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                          Abhi koi result published nahi hua is saal.
                        </div>
                      ) : (
                        <div className="px-5 py-4 flex flex-col gap-2.5">
                          {reportSubjectAvg.map((s, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">{s.subject}</span>
                                <span className={`font-bold ${s.avg >= 60 ? 'text-green-600' : 'text-red-600'}`}>{s.avg}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${s.avg >= 60 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${s.avg}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fee breakdown */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-gray-100">
                        <span className="text-sm font-extrabold text-gray-800">Fee Collection (this month)</span>
                      </div>
                      <div className="p-5 flex flex-col gap-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">✅ Collected</span>
                          <span className="text-base font-extrabold text-green-600">Rs. {reportFees.collected.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">⏳ Pending</span>
                          <span className="text-base font-extrabold text-red-600">Rs. {reportFees.pending.toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-gray-100" />
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-600">Total Expected</span>
                          <span className="text-base font-extrabold text-gray-900">Rs. {reportFees.totalNet.toLocaleString()}</span>
                        </div>
                        {reportFees.totalNet === 0 && (
                          <div className="text-xs text-gray-400 text-center pt-2">
                            Is mahine ka koi fee record nahi mila.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'attendance' && activeTab !== 'teachers' && activeTab !== 'students' && activeTab !== 'classes' && activeTab !== 'reports' && (
            <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {('' as any)[activeTab]}
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
