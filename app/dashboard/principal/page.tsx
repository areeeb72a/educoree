'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, GraduationCap, BookOpen, ClipboardList } from 'lucide-react'
import DashboardLayout from '../DashboardLayout'

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

  // appraisals tab state
  const [appraisalsList, setAppraisalsList] = useState<any[]>([])
  const [appraisalsLoading, setAppraisalsLoading] = useState(false)
  const [appraisalsLoaded, setAppraisalsLoaded] = useState(false)
  const [selectedAppraisal, setSelectedAppraisal] = useState<any | null>(null)
  const [principalComment, setPrincipalComment] = useState('')
  const [principalRating, setPrincipalRating] = useState(5)
  const [savingAppraisal, setSavingAppraisal] = useState(false)
  const [appraisalMsg, setAppraisalMsg] = useState('')

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (activeTab === 'attendance' && !attLoaded) fetchAttendanceSummary() }, [activeTab])
  useEffect(() => { if (activeTab === 'teachers' && !teachersLoaded) fetchTeachers() }, [activeTab])
  useEffect(() => { if (activeTab === 'students' && !studentsLoaded) fetchStudents() }, [activeTab])
  useEffect(() => { if (activeTab === 'classes' && !classesLoaded) fetchClasses() }, [activeTab])
  useEffect(() => { if (activeTab === 'reports' && !reportsLoaded) fetchReports() }, [activeTab])
  useEffect(() => { if (activeTab === 'appraisal' && !appraisalsLoaded) fetchAppraisals() }, [activeTab])

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

  async function fetchAppraisals() {
    if (!branchId) return
    setAppraisalsLoading(true)
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('*, profiles!teacher_id(name, role, auto_id)')
        .eq('school_id', branch?.school_id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setAppraisalsList(data || [])
      setAppraisalsLoaded(true)
    } catch (err: any) {
      console.error('Error fetching appraisals:', err.message)
    }
    setAppraisalsLoading(false)
  }

  async function submitPrincipalFeedback() {
    if (!selectedAppraisal) return
    setSavingAppraisal(true)
    setAppraisalMsg('')
    try {
      const { error } = await supabase
        .from('appraisals')
        .update({
          principal_comment: principalComment,
          principal_rating: Number(principalRating),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAppraisal.id)
      if (error) throw error
      setAppraisalMsg('Success: Feedback submitted successfully!')
      setPrincipalComment('')
      setPrincipalRating(5)
      setSelectedAppraisal(null)
      fetchAppraisals()
    } catch (err: any) {
      setAppraisalMsg('Error: ' + err.message)
    }
    setSavingAppraisal(false)
  }

  async function fetchClasses() {
    if (!branchId) return
    setClassesLoading(true)

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

    const { data: rangeRecords } = await supabase
      .from('attendance')
      .select('student_id, date, status')
      .in('student_id', studentIds)
      .gte('date', dateFrom)
      .lte('date', dateTo)

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

  const tabs = ['overview', 'teachers', 'students', 'classes', 'attendance', 'appraisal', 'reports']
  const todayPct = todayStats.total ? Math.round((todayStats.present / todayStats.total) * 100) : 0

  return (
    <DashboardLayout
      role="principal"
      activePath={activeTab === 'overview' ? '/dashboard/principal' : `/dashboard/principal/${activeTab}`}
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>🏫 {branch?.name || 'Branch'} Command</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Principal control panel · Branch Code: {branch?.code || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20, overflowX: 'auto', gap: 4 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 500, fontSize: 13,
              color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '3px solid var(--accent-purple)' : '3px solid transparent',
              transition: 'all 0.2s', textTransform: 'capitalize', whiteSpace: 'nowrap'
            }}>
            {tab === 'appraisal' ? '📈 Appraisal Reviews' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading branch details...</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* KPI Cards */}
              <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { label: 'Active Teachers', value: stats.teachers, color: 'var(--accent-purple)', icon: Users },
                  { label: 'Enrolled Students', value: stats.students, color: 'var(--accent-emerald)', icon: GraduationCap },
                  { label: 'Total Classrooms', value: stats.classes, color: 'var(--accent-cyan)', icon: BookOpen },
                  { label: 'Daily Attendance', value: `${todayPct}%`, color: 'var(--accent-amber)', icon: ClipboardList },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
                        <Icon size={16} style={{ color: s.color }} />
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{s.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Branch overview */}
              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>🏫 Branch Information</h3>
                {[
                  { label: 'Branch Name', value: branch?.name },
                  { label: 'Code', value: branch?.code },
                  { label: 'Address', value: branch?.address },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Faculty Directory ({filteredTeachers.length})</span>
                <input
                  type="text"
                  placeholder="🔍 Search teachers..."
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
              </div>

              {teachersLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : filteredTeachers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No teachers found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredTeachers.map(t => {
                    const isExpanded = expandedTeacher === t.id
                    const assignments = teacherAssignments[t.id] || []
                    return (
                      <div key={t.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
                        <div onClick={() => toggleTeacherDetail(t.id)} style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent-purple)' }}>
                              {(t.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phone: {t.phone || '—'} · ID: {t.auto_id || '—'}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple)' }}>{isExpanded ? 'Collapse ▲' : 'Details ▼'}</span>
                        </div>

                        {isExpanded && (
                          <div style={{ background: 'var(--bg-elevated)', padding: 18, borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                              <div style={{ background: 'var(--bg-card)', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Joining Date</div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                                  {t.joining_date ? new Date(t.joining_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                </div>
                              </div>
                              <div style={{ background: 'var(--bg-card)', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Employment Status</div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.active ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginTop: 2 }}>
                                  {t.active ? 'Active' : 'Inactive'}
                                </div>
                              </div>
                            </div>

                            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Class & Subject Assignments</div>
                            {loadingAssignments === t.id ? (
                              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading assignments...</p>
                            ) : assignments.length === 0 ? (
                              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active class assignments.</p>
                            ) : (
                              <div className="table-wrap">
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr>
                                      <th>Grade</th>
                                      <th>Section</th>
                                      <th>Subject</th>
                                      <th>Class Incharge</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {assignments.map((a, idx) => (
                                      <tr key={idx}>
                                        <td style={{ fontWeight: 700 }}>{a.grade}</td>
                                        <td>{a.section}</td>
                                        <td>{a.subject}</td>
                                        <td>{a.is_incharge ? '✅ Yes' : '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Student Enrollment List ({filteredStudents.length})</span>
                <input
                  type="text"
                  placeholder="🔍 Search students..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
              </div>

              {studentsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : gradeKeys.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No student records.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {gradeKeys.map(gradeKey => {
                    const isGradeOpen = expandedGrade === gradeKey
                    const sections = Object.keys(gradeTree[gradeKey]).sort()
                    return (
                      <div key={gradeKey} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
                        <div onClick={() => toggleGrade(gradeKey)} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{gradeKey}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({totalInGrade(gradeKey)} students · {sections.length} sections)</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-purple)' }}>{isGradeOpen ? 'Collapse ▲' : 'Sections ▼'}</span>
                        </div>

                        {isGradeOpen && (
                          <div style={{ background: 'var(--bg-elevated)', padding: 10, display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-subtle)' }}>
                            {sections.map(section => {
                              const sectionKey = `${gradeKey}-${section}`
                              const isSectionOpen = expandedSection === sectionKey
                              const sectionStudents = gradeTree[gradeKey][section]
                              return (
                                <div key={sectionKey} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
                                  <div onClick={() => toggleSection(sectionKey)} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Section {section}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sectionStudents.length} students {isSectionOpen ? '▲' : '▼'}</span>
                                  </div>

                                  {isSectionOpen && (
                                    <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                                      {sectionStudents.map(s => (
                                        <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 10 }}>
                                          <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-primary)' }}>{s.name}</div>
                                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Roll: {s.roll_number || '—'} · ID: {s.auto_id}</div>
                                          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6 }}>
                                            Guardian: {s.guardianName}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div>
              {classesLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : classesList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No classrooms created.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {classesList.map((c, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Grade {c.grade} - {c.section}</div>
                        <span className="status-badge active" style={{ fontSize: 11 }}>{c.studentCount} Students</span>
                      </div>

                      {c.incharge ? (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 12, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Class Incharge</div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{c.incharge.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Phone: {c.incharge.phone || '—'}</div>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(244,63,94,0.06)', borderRadius: 10, padding: 12, fontSize: 12, color: 'var(--accent-rose)' }}>
                          ⚠️ No Incharge assigned.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Attendance Summary</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 12 }} />
                  <span style={{ color: 'var(--text-muted)' }}>to</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 12 }} />
                  <button onClick={applyDateFilter}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: 8, background: 'var(--accent-purple)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Apply
                  </button>
                </div>
              </div>

              {attLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Today glance metrics */}
                  <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                    {[
                      { label: "Today's Ratio", value: `${todayPct}%`, color: 'var(--accent-purple)' },
                      { label: "Present count", value: todayStats.present, color: 'var(--accent-emerald)' },
                      { label: "Absent count", value: todayStats.absent, color: 'var(--accent-rose)' },
                      { label: "Late count", value: todayStats.late, color: 'var(--accent-amber)' },
                    ].map((k, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Trend chart */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>Attendance Trend Logs</div>
                    {trendData.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No records inside selected range.</div>
                    ) : (
                      <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} unit="%" />
                            <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                            <Line type="monotone" dataKey="pct" name="Attendance Ratio %" stroke="var(--accent-purple)" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Class-wise logs */}
                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Class-wise Attendance Ratio (Today)</span>
                    </div>
                    {classBreakdown.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No daily records logged today.</div>
                    ) : (
                      <div className="table-wrap">
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th>Grade</th>
                              <th>Section</th>
                              <th>Present</th>
                              <th>Absent</th>
                              <th>Late</th>
                              <th>Ratio %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classBreakdown.map((c, i) => {
                              const pct = c.total ? Math.round((c.present / c.total) * 100) : 0
                              return (
                                <tr key={i}>
                                  <td style={{ fontWeight: 700 }}>Grade {c.grade}</td>
                                  <td>Section {c.section}</td>
                                  <td style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{c.present}</td>
                                  <td style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>{c.absent}</td>
                                  <td style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>{c.late}</td>
                                  <td>
                                    <span className={`status-badge ${pct >= 75 ? 'active' : 'inactive'}`}>{pct}%</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Chronic absentees */}
                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', background: 'rgba(244,63,94,0.06)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--accent-rose)' }}>⚠️ Chronic Absentees (&lt;{CHRONIC_THRESHOLD}% attendance)</span>
                    </div>
                    {chronicList.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No students falling under threshold.</div>
                    ) : (
                      <div className="table-wrap">
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Grade / Section</th>
                              <th>Roll Number</th>
                              <th>Ratio present/total</th>
                              <th>Ratio %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chronicList.map((s, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</td>
                                <td>Grade {s.grade}-{s.section}</td>
                                <td style={{ color: 'var(--accent-purple)', fontFamily: 'monospace' }}>{s.roll_number}</td>
                                <td>{s.present} / {s.total} logs</td>
                                <td style={{ color: 'var(--accent-rose)', fontWeight: 800 }}>{s.pct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appraisal' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Teacher Performance Appraisals</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Evaluate and add principal ratings for school teachers.</span>
              </div>

              {appraisalsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading appraisals...</div>
              ) : appraisalsList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, color: 'var(--text-muted)' }}>
                  No teacher appraisal applications found.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
                  {/* List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {appraisalsList.map(app => {
                      const teacherName = app.profiles?.name || 'Teacher';
                      const teacherId = app.profiles?.auto_id || 'TH';
                      const isActive = selectedAppraisal?.id === app.id;

                      let statusBadge = 'Pending';
                      let badgeColor = 'var(--text-muted)';
                      if (app.owner_status === 'fully_approved') { statusBadge = 'Fully Approved'; badgeColor = 'var(--accent-emerald)'; }
                      else if (app.owner_status === 'partially_approved') { statusBadge = 'Partially Approved'; badgeColor = 'var(--accent-purple)'; }
                      else if (app.owner_status === 'rejected') { statusBadge = 'Rejected'; badgeColor = 'var(--accent-rose)'; }
                      else if (app.owner_status === 'hold') { statusBadge = 'Hold'; badgeColor = 'var(--accent-amber)'; }

                      return (
                        <div key={app.id} onClick={() => { setSelectedAppraisal(app); setPrincipalComment(app.principal_comment || ''); setPrincipalRating(app.principal_rating || 5); setAppraisalMsg('') }}
                          style={{
                            background: isActive ? 'var(--bg-elevated)' : 'var(--bg-card)',
                            border: `1px solid ${isActive ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                            borderRadius: 16, padding: 18, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 10
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{teacherName}</strong>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>({teacherId})</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor }}>{statusBadge}</span>
                          </div>

                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 8 }}>
                            <strong>Objectives:</strong> {app.objectives}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)' }}>
                            <span>Self Rating: {app.self_rating} Stars</span>
                            {app.principal_rating && <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Principal Evaluated: {app.principal_rating} Stars</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sidebar evaluation panel */}
                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, position: 'sticky', top: 20 }}>
                    {!selectedAppraisal ? (
                      <p style={{ margin: 0, textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                        Select a teacher self-evaluation card to submit principal comments and rating score.
                      </p>
                    ) : (
                      <div>
                        <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Principal Comments & Evaluation</h4>
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Teacher:</span>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 }}>{selectedAppraisal.profiles?.name}</div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Principal Comment Remarks *</label>
                          <textarea rows={4} value={principalComment} onChange={e => setPrincipalComment(e.target.value)} placeholder="Write teacher performance feedback remarks..."
                            style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', resize: 'none', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Evaluation Rating *</label>
                          <select value={principalRating} onChange={e => setPrincipalRating(Number(e.target.value))}
                            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                          </select>
                        </div>

                        {appraisalMsg && <div style={{ fontSize: 12, color: appraisalMsg.startsWith('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginBottom: 12 }}>{appraisalMsg}</div>}

                        <button onClick={submitPrincipalFeedback} disabled={savingAppraisal}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          {savingAppraisal ? 'Saving...' : 'Submit Feedback'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              {reportsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Summary row */}
                  <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-purple)' }}>{reportAttendancePct}%</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Attendance Ratio (30 Days)</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-cyan)' }}>{reportMarksAvg}%</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Average Marks (Yearly)</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        {reportFees.totalNet ? Math.round((reportFees.collected / reportFees.totalNet) * 100) : 0}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Fees Collection Ratio</div>
                    </div>
                  </div>

                  {/* Breakdown tables */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>Subject-wise average</h3>
                      {reportSubjectAvg.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No published report cards.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {reportSubjectAvg.map((s, idx) => (
                            <div key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{s.subject}</span>
                                <span style={{ fontWeight: 700, color: s.avg >= 60 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{s.avg}%</span>
                              </div>
                              <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, height: 6, overflow: 'hidden' }}>
                                <div style={{ width: `${s.avg}%`, height: '100%', background: s.avg >= 60 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>Fee Collections (Monthly)</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>✅ Collected</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-emerald)' }}>Rs. {reportFees.collected.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>⏳ Pending</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-rose)' }}>Rs. {reportFees.pending.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Total Expected</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Rs. {reportFees.totalNet.toLocaleString()}</span>
                        </div>
                        {reportFees.totalNet === 0 && (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, marginTop: 10 }}>
                            No billing records logged for this month.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
