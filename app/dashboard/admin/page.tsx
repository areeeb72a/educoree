'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, CheckCircle2, Plane, ClipboardList, UserPlus, FileEdit, Megaphone, Wallet, BarChart3, ChevronRight, Search, GraduationCap, Crown, Phone, MoreVertical } from 'lucide-react'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ totalStaff: 0, presentToday: 0, onLeave: 0, newApplications: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // staff tab state
  const [staffList, setStaffList] = useState<any[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'teacher', phone: '',
    father_name: '', address: '', blood_group: '', emergency_name: '',
    emergency_phone: '', joining_date: '',
  })
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')

  const ROLE_OPTIONS = ['teacher', 'admin', 'accounts', 'principal', 'school_owner']

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (activeTab === 'staff' && !staffLoaded) fetchStaff() }, [activeTab])

  async function fetchStaff() {
    if (!profile?.school_id) return
    setStaffLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, phone, joining_date, active, auto_id, branch_id')
      .eq('school_id', profile.school_id)
      .neq('role', 'student')
      .order('name')
    setStaffList(data || [])
    setStaffLoading(false)
    setStaffLoaded(true)
  }

  function updateForm(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setFormData({
      name: '', email: '', password: '', role: 'teacher', phone: '',
      father_name: '', address: '', blood_group: '', emergency_name: '',
      emergency_phone: '', joining_date: '',
    })
    setFormError('')
  }

  async function handleAddStaff() {
    setFormError('')
    setFormSuccess('')

    if (!formData.name.trim()) { setFormError('Naam likhen'); return }
    if (!formData.email.trim()) { setFormError('Email likhen'); return }
    if (!formData.password || formData.password.length < 6) { setFormError('Password kam az kam 6 characters ka ho'); return }

    setFormSaving(true)
    try {
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          school_id: profile.school_id,
          branch_id: profile.branch_id,
        }),
      })
      const result = await res.json()

      if (!res.ok) {
        setFormError(result.error || 'Kuch ghalat ho gaya')
        return
      }

      setFormSuccess(`${formData.name} ka account ban gaya! Auto ID: ${result.profile.auto_id}`)
      resetForm()
      setStaffLoaded(false)
      fetchStaff()
      setTimeout(() => { setShowAddForm(false); setFormSuccess('') }, 2500)
    } catch (err: any) {
      setFormError(err.message || 'Network error')
    } finally {
      setFormSaving(false)
    }
  }

  const filteredStaff = staffList.filter(s =>
    !staffSearch || s.name?.toLowerCase().includes(staffSearch.toLowerCase()) || s.auto_id?.toLowerCase().includes(staffSearch.toLowerCase())
  )

  // staff attendance tab state
  const [attView, setAttView] = useState<'mark' | 'history'>('mark')
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])
  const [attStaffList, setAttStaffList] = useState<any[]>([])
  const [attRecords, setAttRecords] = useState<Record<string, any>>({})
  const [attLoading, setAttLoading] = useState(false)
  const [attLoaded, setAttLoaded] = useState(false)
  const [attSaving, setAttSaving] = useState<string | null>(null)

  // history view state
  const [histMonth, setHistMonth] = useState(new Date().toISOString().slice(0, 7))
  const [histStaffId, setHistStaffId] = useState('')
  const [histRecords, setHistRecords] = useState<any[]>([])
  const [histLoading, setHistLoading] = useState(false)

  useEffect(() => { if (activeTab === 'attendance' && !attLoaded) fetchStaffForAttendance() }, [activeTab])
  useEffect(() => { if (activeTab === 'attendance' && attLoaded) fetchAttendanceForDate() }, [attDate, attLoaded])
  useEffect(() => { if (activeTab === 'attendance' && attView === 'history' && histStaffId) fetchHistory() }, [histMonth, histStaffId, attView])

  async function fetchStaffForAttendance() {
    if (!profile?.school_id) return
    setAttLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, auto_id, branch_id')
      .eq('school_id', profile.school_id)
      .neq('role', 'student')
      .eq('active', true)
      .order('name')
    setAttStaffList(data || [])
    if (data && data.length > 0 && !histStaffId) setHistStaffId(data[0].id)
    setAttLoaded(true)
    setAttLoading(false)
  }

  async function fetchAttendanceForDate() {
    setAttLoading(true)
    const { data } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('date', attDate)
      .in('staff_id', attStaffList.map(s => s.id))

    const map: Record<string, any> = {}
    ;(data || []).forEach(r => { map[r.staff_id] = r })
    setAttRecords(map)
    setAttLoading(false)
  }

  async function markAttendance(staffId: string, status: string) {
    setAttSaving(staffId)
    const staff = attStaffList.find(s => s.id === staffId)
    const existing = attRecords[staffId]

    const payload = {
      school_id: profile.school_id,
      branch_id: staff?.branch_id || profile.branch_id,
      staff_id: staffId,
      date: attDate,
      status,
      marked_by: profile.id,
    }

    if (existing) {
      await supabase.from('staff_attendance').update({ status, marked_by: profile.id }).eq('id', existing.id)
    } else {
      await supabase.from('staff_attendance').insert(payload)
    }

    await fetchAttendanceForDate()
    setAttSaving(null)
  }

  async function fetchHistory() {
    setHistLoading(true)
    const startDate = `${histMonth}-01`
    const endDate = new Date(histMonth + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const endStr = endDate.toISOString().split('T')[0]

    const { data } = await supabase
      .from('staff_attendance')
      .select('date, status, remarks')
      .eq('staff_id', histStaffId)
      .gte('date', startDate)
      .lt('date', endStr)
      .order('date', { ascending: false })

    setHistRecords(data || [])
    setHistLoading(false)
  }

  const STATUS_OPTS = [
    { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700', activeColor: 'bg-green-600 text-white' },
    { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700', activeColor: 'bg-red-600 text-white' },
    { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-700', activeColor: 'bg-yellow-600 text-white' },
    { value: 'leave', label: 'Leave', color: 'bg-blue-100 text-blue-700', activeColor: 'bg-blue-600 text-white' },
  ]

  const histSummary = {
    present: histRecords.filter(r => r.status === 'present').length,
    absent: histRecords.filter(r => r.status === 'absent').length,
    late: histRecords.filter(r => r.status === 'late').length,
    leave: histRecords.filter(r => r.status === 'leave').length,
  }

  // leave tab state
  const [leaveList, setLeaveList] = useState<any[]>([])
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [leaveLoaded, setLeaveLoaded] = useState(false)
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [leaveSaving, setLeaveSaving] = useState<string | null>(null)
  const [applicantMap, setApplicantMap] = useState<Record<string, any>>({})

  useEffect(() => { if (activeTab === 'leave' && !leaveLoaded) fetchLeaveApplications() }, [activeTab])

  async function fetchLeaveApplications() {
    if (!profile?.school_id) return
    setLeaveLoading(true)

    const { data } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })

    const applicantIds = Array.from(new Set((data || []).map(l => l.applicant_id).filter(Boolean)))
    let appMap: Record<string, any> = {}
    if (applicantIds.length > 0) {
      const { data: applicants } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', applicantIds)
      ;(applicants || []).forEach(a => { appMap[a.id] = a })
    }

    setApplicantMap(appMap)
    setLeaveList(data || [])
    setLeaveLoading(false)
    setLeaveLoaded(true)
  }

  async function updateLeaveStatus(leaveId: string, newStatus: 'approved' | 'rejected') {
    setLeaveSaving(leaveId)
    await supabase
      .from('leave_applications')
      .update({ status: newStatus, reviewed_by: profile.id })
      .eq('id', leaveId)
    await fetchLeaveApplications()
    setLeaveSaving(null)
  }

  const filteredLeaves = leaveList.filter(l => leaveFilter === 'all' || l.status === leaveFilter)

  const LEAVE_STATUS_META: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  // recruitment tab state
  const [jobsList, setJobsList] = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [jobFilter, setJobFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [showJobForm, setShowJobForm] = useState(false)
  const [jobForm, setJobForm] = useState({ title: '', department: '', description: '', requirements: '', vacancies: '1' })
  const [jobFormError, setJobFormError] = useState('')
  const [jobSaving, setJobSaving] = useState(false)
  const [jobToggling, setJobToggling] = useState<string | null>(null)

  useEffect(() => { if (activeTab === 'recruitment' && !jobsLoaded) fetchJobs() }, [activeTab])

  async function fetchJobs() {
    if (!profile?.school_id) return
    setJobsLoading(true)
    const { data } = await supabase
      .from('job_postings')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false })
    setJobsList(data || [])
    setJobsLoading(false)
    setJobsLoaded(true)
  }

  function updateJobForm(field: string, value: string) {
    setJobForm(prev => ({ ...prev, [field]: value }))
  }

  function resetJobForm() {
    setJobForm({ title: '', department: '', description: '', requirements: '', vacancies: '1' })
    setJobFormError('')
  }

  async function handlePostJob() {
    setJobFormError('')
    if (!jobForm.title.trim()) { setJobFormError('Job title likhen'); return }

    setJobSaving(true)
    const { error } = await supabase.from('job_postings').insert({
      school_id: profile.school_id,
      branch_id: profile.branch_id,
      title: jobForm.title.trim(),
      department: jobForm.department.trim() || null,
      description: jobForm.description.trim() || null,
      requirements: jobForm.requirements.trim() || null,
      vacancies: parseInt(jobForm.vacancies) || 1,
      status: 'open',
      posted_by: profile.id,
    })

    if (error) {
      setJobFormError(error.message)
      setJobSaving(false)
      return
    }

    resetJobForm()
    setShowJobForm(false)
    setJobsLoaded(false)
    fetchJobs()
    setJobSaving(false)
  }

  async function toggleJobStatus(jobId: string, currentStatus: string) {
    setJobToggling(jobId)
    const newStatus = currentStatus === 'open' ? 'closed' : 'open'
    await supabase.from('job_postings').update({ status: newStatus }).eq('id', jobId)
    await fetchJobs()
    setJobToggling(null)
  }

  const filteredJobs = jobsList.filter(j => jobFilter === 'all' || j.status === jobFilter)

  // applicants tracking
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [applicantsByJob, setApplicantsByJob] = useState<Record<string, any[]>>({})
  const [loadingApplicants, setLoadingApplicants] = useState<string | null>(null)
  const [updatingApplicant, setUpdatingApplicant] = useState<string | null>(null)
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null)

  async function toggleApplicants(jobId: string) {
    if (expandedJob === jobId) { setExpandedJob(null); return }
    setExpandedJob(jobId)
    if (!applicantsByJob[jobId]) await loadApplicants(jobId)
  }

  async function loadApplicants(jobId: string) {
    setLoadingApplicants(jobId)
    const { data } = await supabase
      .from('job_applicants')
      .select('*')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false })
    setApplicantsByJob(prev => ({ ...prev, [jobId]: data || [] }))
    setLoadingApplicants(null)
  }

  async function updateApplicantStatus(jobId: string, applicantId: string, newStatus: string) {
    setUpdatingApplicant(applicantId)
    await supabase
      .from('job_applicants')
      .update({ status: newStatus, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
      .eq('id', applicantId)
    await loadApplicants(jobId)
    setUpdatingApplicant(null)
  }

  function copyApplyLink(jobId: string) {
    const link = `${window.location.origin}/careers/apply/${jobId}`
    navigator.clipboard.writeText(link)
    setCopiedJobId(jobId)
    setTimeout(() => setCopiedJobId(null), 2000)
  }

  const APPLICANT_STATUS_META: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    hired: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  // payroll tab state
  const [payrollView, setPayrollView] = useState<'structure' | 'process'>('structure')
  const [payrollStaffList, setPayrollStaffList] = useState<any[]>([])
  const [salaryStructures, setSalaryStructures] = useState<Record<string, any>>({})
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [payrollLoaded, setPayrollLoaded] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [structureForm, setStructureForm] = useState({ basic: '', medical: '', mobile: '', transport: '', other: '' })
  const [savingStructure, setSavingStructure] = useState(false)

  // process payroll state
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7))
  const [payrollRecords, setPayrollRecords] = useState<Record<string, any>>({})
  const [deductionInputs, setDeductionInputs] = useState<Record<string, string>>({})
  const [processingStaffId, setProcessingStaffId] = useState<string | null>(null)

  useEffect(() => { if (activeTab === 'payroll' && !payrollLoaded) fetchPayrollData() }, [activeTab])
  useEffect(() => { if (activeTab === 'payroll' && payrollView === 'process' && payrollLoaded) fetchPayrollRecordsForMonth() }, [payrollMonth, payrollView, payrollLoaded])

  async function fetchPayrollData() {
    if (!profile?.school_id) return
    setPayrollLoading(true)

    const { data: staff } = await supabase
      .from('profiles')
      .select('id, name, role, auto_id')
      .eq('school_id', profile.school_id)
      .neq('role', 'student')
      .eq('active', true)
      .order('name')

    setPayrollStaffList(staff || [])

    const staffIds = (staff || []).map(s => s.id)
    if (staffIds.length > 0) {
      const { data: structures } = await supabase
        .from('salary_structures')
        .select('*')
        .in('staff_id', staffIds)
        .order('effective_from', { ascending: false })

      const structMap: Record<string, any> = {}
      ;(structures || []).forEach(s => {
        if (!structMap[s.staff_id]) structMap[s.staff_id] = s // latest first due to ordering
      })
      setSalaryStructures(structMap)
    }

    setPayrollLoading(false)
    setPayrollLoaded(true)
  }

  function openStructureEdit(staffId: string) {
    const existing = salaryStructures[staffId]
    setStructureForm({
      basic: existing?.basic?.toString() || '',
      medical: existing?.medical?.toString() || '',
      mobile: existing?.mobile?.toString() || '',
      transport: existing?.transport?.toString() || '',
      other: existing?.other?.toString() || '',
    })
    setEditingStaffId(staffId)
  }

  async function saveStructure() {
    if (!editingStaffId) return
    setSavingStructure(true)

    const payload = {
      school_id: profile.school_id,
      staff_id: editingStaffId,
      basic: parseFloat(structureForm.basic) || 0,
      medical: parseFloat(structureForm.medical) || 0,
      mobile: parseFloat(structureForm.mobile) || 0,
      transport: parseFloat(structureForm.transport) || 0,
      other: parseFloat(structureForm.other) || 0,
      effective_from: new Date().toISOString().split('T')[0],
    }

    const existing = salaryStructures[editingStaffId]
    if (existing) {
      await supabase.from('salary_structures').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('salary_structures').insert(payload)
    }

    setEditingStaffId(null)
    setPayrollLoaded(false)
    fetchPayrollData()
    setSavingStructure(false)
  }

  function structureTotal(staffId: string) {
    const s = salaryStructures[staffId]
    if (!s) return 0
    return (s.basic || 0) + (s.medical || 0) + (s.mobile || 0) + (s.transport || 0) + (s.other || 0)
  }

  async function fetchPayrollRecordsForMonth() {
    const staffIds = payrollStaffList.map(s => s.id)
    if (staffIds.length === 0) return

    const { data } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('month', payrollMonth)
      .in('staff_id', staffIds)

    const map: Record<string, any> = {}
    ;(data || []).forEach(r => { map[r.staff_id] = r })
    setPayrollRecords(map)
  }

  async function processPayroll(staffId: string) {
    setProcessingStaffId(staffId)
    const gross = structureTotal(staffId)
    const deductions = parseFloat(deductionInputs[staffId] || '0') || 0
    const net = gross - deductions

    const existing = payrollRecords[staffId]
    const payload = {
      school_id: profile.school_id,
      staff_id: staffId,
      month: payrollMonth,
      gross,
      deductions,
      net,
      processed_by: profile.id,
      processed_at: new Date().toISOString(),
    }

    if (existing) {
      await supabase.from('payroll_records').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('payroll_records').insert(payload)
    }

    await fetchPayrollRecordsForMonth()
    setProcessingStaffId(null)
  }

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { window.location.href = '/'; return }
    const { data: prof } = await supabase.from('profiles').select('*, schools(*)').eq('id', user.id).single()
    setProfile(prof)
    if (prof?.school_id) {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact' }).eq('school_id', prof.school_id).neq('role', 'student')
      setStats(s => ({ ...s, totalStaff: count || 0 }))
    }
    setLoading(false)
  }

  const tabs = ['overview', 'staff', 'attendance', 'leave', 'recruitment', 'payroll']

  return (
    <div style={{ minHeight: '100vh', background: '#07050F', fontFamily: 'sans-serif', color: '#fff' }}>
      {/* Header */}
      <div style={{ background: '#12102A', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>👥</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{profile?.schools?.name || 'EduCore'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Admin / HR Dashboard</div>
          </div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Sign Out</button>
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
                  { label: 'Total Staff', value: stats.totalStaff, color: '#A78BFA', icon: Users },
                  { label: 'Present Today', value: stats.presentToday, color: '#34D399', icon: CheckCircle2 },
                  { label: 'On Leave', value: stats.onLeave, color: '#FBBF24', icon: Plane },
                  { label: 'New Applications', value: stats.newApplications, color: '#60A5FA', icon: ClipboardList },
                ].map((k, i) => {
                  const Icon = k.icon
                  return (
                    <div key={i} style={{ background: '#12102A', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.07)', borderTop: `3px solid ${k.color}`, boxShadow: `0 0 16px -4px ${k.color}66`, minHeight: 116, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <Icon size={22} style={{ color: k.color }} />
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Add Staff', icon: UserPlus, color: '#A78BFA', tab: 'staff' },
                    { label: 'Mark Attendance', icon: FileEdit, color: '#34D399', tab: 'attendance' },
                    { label: 'Approve Leave', icon: CheckCircle2, color: '#FBBF24', tab: 'leave' },
                    { label: 'Post Job', icon: Megaphone, color: '#F472B6', tab: 'recruitment' },
                    { label: 'Process Payroll', icon: Wallet, color: '#4ADE80', tab: 'payroll' },
                    { label: 'View Reports', icon: BarChart3, color: '#60A5FA', tab: 'overview' },
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
            </>
          )}

          {activeTab === 'staff' && (
            <div style={{ margin: '-20px -24px', minHeight: 'calc(100vh - 113px)', background: '#0b0a14' }}>
              {/* Header (transparent, matches body background) */}
              <div className="px-6 pt-6 pb-8 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
                  <Users size={20} style={{ color: '#A78BFA' }} /> Staff
                </h2>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4">
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(167,139,250,0.15)' }} className="flex items-center justify-center mb-2">
                      <Users size={15} style={{ color: '#A78BFA' }} />
                    </div>
                    <div className="text-2xl font-extrabold text-white">{staffList.length}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Total Staff</div>
                  </div>
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4">
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(96,165,250,0.15)' }} className="flex items-center justify-center mb-2">
                      <Search size={15} style={{ color: '#60A5FA' }} />
                    </div>
                    <div className="text-2xl font-extrabold text-white">{filteredStaff.length}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Showing</div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-12">
              <div className="flex justify-end items-center mb-4 flex-wrap gap-3">
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] min-w-[200px] placeholder-gray-500"
                  />
                  <button
                    onClick={() => { setShowAddForm(!showAddForm); resetForm(); setFormSuccess('') }}
                    style={{ background: '#4f46e5' }}
                    className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    {showAddForm ? '✕ Cancel' : <><UserPlus size={14} /> Add Staff</>}
                  </button>
                </div>
              </div>

              {showAddForm && (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-5 mb-5">
                  <h3 className="text-sm font-bold text-white mb-4">New Staff Member</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {[
                      { key: 'name', placeholder: 'Full Name *', type: 'text' },
                      null, // role select handled separately
                      { key: 'email', placeholder: 'Email *', type: 'email' },
                      { key: 'password', placeholder: 'Password (min 6 chars) *', type: 'password' },
                      { key: 'phone', placeholder: 'Phone', type: 'text' },
                      { key: 'father_name', placeholder: "Father's Name", type: 'text' },
                      { key: 'blood_group', placeholder: 'Blood Group (e.g. O+)', type: 'text' },
                      { key: 'joining_date', placeholder: 'Joining Date', type: 'date' },
                      { key: 'emergency_name', placeholder: 'Emergency Contact Name', type: 'text' },
                      { key: 'emergency_phone', placeholder: 'Emergency Contact Phone', type: 'text' },
                    ].map((f, idx) => f ? (
                      <input key={f.key} placeholder={f.placeholder} type={f.type} value={(formData as any)[f.key]} onChange={e => updateForm(f.key, e.target.value)}
                        style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                        className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] placeholder-gray-500" />
                    ) : (
                      <select key="role" value={formData.role} onChange={e => updateForm('role', e.target.value)}
                        style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                        className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]">
                        {ROLE_OPTIONS.map(r => <option key={r} value={r} style={{ background: '#121124' }}>{r.replace('_', ' ')}</option>)}
                      </select>
                    ))}
                  </div>
                  <textarea placeholder="Address" value={formData.address} onChange={e => updateForm('address', e.target.value)} rows={2}
                    style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                    className="w-full rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] resize-none placeholder-gray-500" />

                  {formError && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>{formError}</p>}
                  {formSuccess && <p className="text-xs mb-2" style={{ color: '#10b981' }}>✅ {formSuccess}</p>}

                  <button
                    onClick={handleAddStaff}
                    disabled={formSaving}
                    style={{ background: '#4f46e5' }}
                    className="text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {formSaving ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              )}

              {staffLoading ? (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a', color: 'rgba(255,255,255,0.4)' }} className="rounded-xl p-8 text-center">Loading...</div>
              ) : filteredStaff.length === 0 ? (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-12 text-center">
                  <Users size={40} style={{ color: '#3a3650', margin: '0 auto 16px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">Koi staff nahi mila.</p>
                </div>
              ) : (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 640 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e1b3a' }}>
                        {['Name', 'Role', 'Contact', 'Staff ID', ''].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs uppercase" style={{ color: '#5b5775' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((s, idx) => {
                        const RoleIcon = { teacher: GraduationCap, admin: UserPlus, accounts: Wallet, principal: ClipboardList, school_owner: Crown }[s.role] || Users
                        return (
                          <tr key={s.id} style={{ borderBottom: idx < filteredStaff.length - 1 ? '1px solid #1e1b3a' : 'none' }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div style={{ background: 'rgba(99,102,241,0.15)' }} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                  <RoleIcon size={14} style={{ color: '#A78BFA' }} />
                                </div>
                                <span className="font-bold text-white whitespace-nowrap">{s.name}</span>
                                {!s.active && (
                                  <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }} className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">Inactive</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 capitalize whitespace-nowrap" style={{ color: '#94a3b8' }}>{s.role.replace('_', ' ')}</td>
                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#94a3b8' }}>{s.phone || '-'}</td>
                            <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: '#94a3b8' }}>{s.auto_id || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <button style={{ color: '#5b5775' }} className="hover:text-white transition-colors">
                                <MoreVertical size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div style={{ margin: '-20px -24px', minHeight: 'calc(100vh - 113px)', background: '#0b0a14' }}>
              <div className="px-6 pt-6 pb-8 mb-6">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ClipboardList size={20} style={{ color: '#34D399' }} /> Staff Attendance
                  </h2>
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="flex gap-1 rounded-lg p-1">
                    <button
                      onClick={() => setAttView('mark')}
                      style={attView === 'mark' ? { background: '#4f46e5', color: '#fff' } : { color: '#94a3b8' }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    >
                      Mark Today
                    </button>
                    <button
                      onClick={() => setAttView('history')}
                      style={attView === 'history' ? { background: '#4f46e5', color: '#fff' } : { color: '#94a3b8' }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    >
                      History
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-12">

              {attView === 'mark' ? (
                <>
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4 mb-4 flex items-center gap-3">
                    <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>Date:</label>
                    <input
                      type="date"
                      value={attDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setAttDate(e.target.value)}
                      style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                      className="rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] [color-scheme:dark]"
                    />
                  </div>

                  {attLoading ? (
                    <div style={{ background: '#121124', border: '1px solid #1e1b3a', color: 'rgba(255,255,255,0.4)' }} className="rounded-xl p-8 text-center">Loading...</div>
                  ) : attStaffList.length === 0 ? (
                    <div style={{ background: '#121124', border: '1px solid #1e1b3a', color: 'rgba(255,255,255,0.4)' }} className="rounded-xl p-12 text-center">Koi staff nahi mila.</div>
                  ) : (
                    <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl overflow-hidden overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 560 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #1e1b3a' }}>
                            {['Name', 'Role', 'Status'].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 text-xs uppercase" style={{ color: '#5b5775' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {attStaffList.map((s, idx) => {
                            const record = attRecords[s.id]
                            const currentStatus = record?.status
                            const RoleIcon = { teacher: GraduationCap, admin: UserPlus, accounts: Wallet, principal: ClipboardList, school_owner: Crown }[s.role] || Users
                            return (
                              <tr key={s.id} style={{ borderBottom: idx < attStaffList.length - 1 ? '1px solid #1e1b3a' : 'none' }}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div style={{ background: 'rgba(52,211,153,0.15)' }} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                      <RoleIcon size={14} style={{ color: '#34D399' }} />
                                    </div>
                                    <span className="font-bold text-white whitespace-nowrap">{s.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 capitalize whitespace-nowrap" style={{ color: '#94a3b8' }}>{s.role.replace('_', ' ')}</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1.5">
                                    {STATUS_OPTS.map(opt => {
                                      const isActive = currentStatus === opt.value
                                      const statusStyles: Record<string, { bg: string; color: string }> = {
                                        present: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                                        absent: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
                                        late: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
                                        leave: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
                                      }
                                      const st = statusStyles[opt.value] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8' }
                                      return (
                                        <button
                                          key={opt.value}
                                          onClick={() => markAttendance(s.id, opt.value)}
                                          disabled={attSaving === s.id}
                                          style={isActive ? { background: st.color, color: '#0b0a14' } : { background: st.bg, color: st.color }}
                                          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                                        >
                                          {opt.label}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4 mb-4 flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>Staff:</label>
                    <select
                      value={histStaffId}
                      onChange={e => setHistStaffId(e.target.value)}
                      style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                      className="rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
                    >
                      {attStaffList.map(s => <option key={s.id} value={s.id} style={{ background: '#121124' }}>{s.name}</option>)}
                    </select>
                    <label className="text-sm font-medium ml-2" style={{ color: '#94a3b8' }}>Month:</label>
                    <input
                      type="month"
                      value={histMonth}
                      max={new Date().toISOString().slice(0, 7)}
                      onChange={e => setHistMonth(e.target.value)}
                      style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                      className="rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] [color-scheme:dark]"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Present', value: histSummary.present, bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', color: '#10b981' },
                      { label: 'Absent', value: histSummary.absent, bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', color: '#ef4444' },
                      { label: 'Late', value: histSummary.late, bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b' },
                      { label: 'Leave', value: histSummary.leave, bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', color: '#6366f1' },
                    ].map(c => (
                      <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}` }} className="rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
                        <div className="text-xs" style={{ color: '#94a3b8' }}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl overflow-hidden">
                    {histLoading ? (
                      <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</div>
                    ) : histRecords.length === 0 ? (
                      <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Is mahine ka koi record nahi mila.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid #1e1b3a' }}>
                            {['Date', 'Day', 'Status'].map(h => (
                              <th key={h} className={`px-4 py-3 text-xs uppercase ${h === 'Status' ? 'text-center' : 'text-left'}`} style={{ color: '#5b5775' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {histRecords.map((r, i) => {
                            const d = new Date(r.date)
                            const statusStyles: Record<string, { bg: string; color: string }> = {
                              present: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                              absent: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
                              late: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
                              leave: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
                            }
                            const st = statusStyles[r.status] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8' }
                            return (
                              <tr key={i} style={{ borderBottom: i < histRecords.length - 1 ? '1px solid #1e1b3a' : 'none' }}>
                                <td className="px-4 py-3 font-medium text-white">
                                  {d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{d.toLocaleDateString('en-PK', { weekday: 'short' })}</td>
                                <td className="px-4 py-3 text-center">
                                  <span style={{ background: st.bg, color: st.color }} className="text-xs px-3 py-1 rounded-full font-medium capitalize">{r.status}</span>
                                </td>
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
            </div>
          )}

          {activeTab === 'leave' && (
            <div style={{ margin: '-20px -24px', minHeight: 'calc(100vh - 113px)', background: '#0b0a14' }}>
              <div className="px-6 pt-6 pb-8 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
                  <Plane size={20} style={{ color: '#FBBF24' }} /> Leave Applications
                </h2>
                <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="flex gap-1 rounded-lg p-1 flex-wrap max-w-md">
                  {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLeaveFilter(f)}
                      style={leaveFilter === f ? { background: '#4f46e5', color: '#fff' } : { color: '#94a3b8' }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-12">
              <div className="text-sm font-bold text-white mb-4">{filteredLeaves.length} applications</div>

              {leaveLoading ? (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a', color: 'rgba(255,255,255,0.4)' }} className="rounded-xl p-8 text-center">Loading...</div>
              ) : filteredLeaves.length === 0 ? (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-12 text-center">
                  <Plane size={40} style={{ color: '#3a3650', margin: '0 auto 16px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">Koi leave application nahi mili.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLeaves.map(l => {
                    const applicant = applicantMap[l.applicant_id]
                    const statusStyles: Record<string, { bg: string; color: string }> = {
                      pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
                      approved: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                      rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
                    }
                    const st = statusStyles[l.status] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8' }
                    return (
                      <div key={l.id} style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4">
                        <div className="flex justify-between items-start flex-wrap gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-sm text-white">{applicant?.name || 'Unknown'}</span>
                              <span className="text-xs capitalize" style={{ color: '#5b5775' }}>{applicant?.role?.replace('_', ' ')}</span>
                              <span style={{ background: st.bg, color: st.color }} className="text-xs px-2.5 py-0.5 rounded-full font-bold capitalize">
                                {l.status}
                              </span>
                            </div>
                            <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>
                              <span className="font-medium capitalize">{l.leave_type}</span> leave ·{' '}
                              {new Date(l.from_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                              {' to '}
                              {new Date(l.to_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}{l.days} day{l.days !== 1 ? 's' : ''}
                            </div>
                            {l.reason && <p className="text-xs italic" style={{ color: '#5b5775' }}>"{l.reason}"</p>}
                          </div>

                          {l.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateLeaveStatus(l.id, 'approved')}
                                disabled={leaveSaving === l.id}
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => updateLeaveStatus(l.id, 'rejected')}
                                disabled={leaveSaving === l.id}
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              </div>
            </div>
          )}

          {activeTab === 'recruitment' && (
            <div style={{ margin: '-20px -24px', minHeight: 'calc(100vh - 113px)', background: '#0b0a14' }}>
              <div className="px-6 pt-6 pb-8 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">
                  <Megaphone size={20} style={{ color: '#F472B6' }} /> Job Postings
                </h2>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4 max-w-[160px]">
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,114,182,0.15)' }} className="flex items-center justify-center mb-2">
                      <ClipboardList size={15} style={{ color: '#F472B6' }} />
                    </div>
                    <div className="text-2xl font-extrabold text-white">{jobsList.length}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Total Postings</div>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="flex gap-1 rounded-lg p-1">
                      {(['open', 'closed', 'all'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setJobFilter(f)}
                          style={jobFilter === f ? { background: '#4f46e5', color: '#fff' } : { color: '#94a3b8' }}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setShowJobForm(!showJobForm); resetJobForm() }}
                      style={{ background: '#4f46e5' }}
                      className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      {showJobForm ? '✕ Cancel' : '➕ Post Job'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-12">

              {showJobForm && (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-5 mb-5">
                  <h3 className="text-sm font-bold text-white mb-4">New Job Posting</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input placeholder="Job Title * (e.g. Math Teacher)" value={jobForm.title} onChange={e => updateJobForm('title', e.target.value)}
                      style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                      className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] placeholder-gray-500" />
                    <input placeholder="Department (e.g. Teaching)" value={jobForm.department} onChange={e => updateJobForm('department', e.target.value)}
                      style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                      className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] placeholder-gray-500" />
                    <input placeholder="Vacancies" type="number" min="1" value={jobForm.vacancies} onChange={e => updateJobForm('vacancies', e.target.value)}
                      style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                      className="rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] placeholder-gray-500" />
                  </div>
                  <textarea placeholder="Job Description" value={jobForm.description} onChange={e => updateJobForm('description', e.target.value)} rows={3}
                    style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                    className="w-full rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] resize-none placeholder-gray-500" />
                  <textarea placeholder="Requirements / Qualifications" value={jobForm.requirements} onChange={e => updateJobForm('requirements', e.target.value)} rows={3}
                    style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                    className="w-full rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] resize-none placeholder-gray-500" />

                  {jobFormError && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>{jobFormError}</p>}

                  <button
                    onClick={handlePostJob}
                    disabled={jobSaving}
                    style={{ background: '#4f46e5' }}
                    className="text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {jobSaving ? 'Posting...' : 'Post Job'}
                  </button>
                </div>
              )}

              {jobsLoading ? (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a', color: 'rgba(255,255,255,0.4)' }} className="rounded-xl p-8 text-center">Loading...</div>
              ) : filteredJobs.length === 0 ? (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-12 text-center">
                  <Megaphone size={40} style={{ color: '#3a3650', margin: '0 auto 16px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.4)' }} className="text-sm">Koi job posting nahi mili.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredJobs.map(j => {
                    const isExpanded = expandedJob === j.id
                    const applicants = applicantsByJob[j.id] || []
                    return (
                      <div key={j.id} style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl overflow-hidden">
                        <div className="p-4">
                          <div className="flex justify-between items-start flex-wrap gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-sm text-white">{j.title}</span>
                                {j.department && <span className="text-xs" style={{ color: '#5b5775' }}>· {j.department}</span>}
                                <span style={j.status === 'open' ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' } : { background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }} className="text-xs px-2.5 py-0.5 rounded-full font-bold capitalize">
                                  {j.status}
                                </span>
                              </div>
                              {j.description && <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>{j.description}</p>}
                              {j.requirements && (
                                <p className="text-xs mt-1" style={{ color: '#5b5775' }}><span className="font-medium">Requirements:</span> {j.requirements}</p>
                              )}
                              <div className="text-xs mt-2" style={{ color: '#5b5775' }}>
                                {j.vacancies} vacancy{j.vacancies !== 1 ? 'ies' : ''} · Posted {new Date(j.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              <button
                                onClick={() => toggleJobStatus(j.id, j.status)}
                                disabled={jobToggling === j.id}
                                style={j.status === 'open' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : { background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity whitespace-nowrap"
                              >
                                {j.status === 'open' ? 'Close Job' : 'Reopen'}
                              </button>
                              {j.status === 'open' && (
                                <button
                                  onClick={() => copyApplyLink(j.id)}
                                  style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap"
                                >
                                  {copiedJobId === j.id ? '✓ Copied!' : '🔗 Copy Apply Link'}
                                </button>
                              )}
                              <button
                                onClick={() => toggleApplicants(j.id)}
                                style={{ background: 'rgba(244,114,182,0.15)', color: '#F472B6' }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap"
                              >
                                👥 Applicants {isExpanded ? '▲' : '▼'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #1e1b3a', background: '#0d0c1d' }} className="p-3">
                            {loadingApplicants === j.id ? (
                              <p className="text-xs text-center py-4" style={{ color: '#5b5775' }}>Loading applicants...</p>
                            ) : applicants.length === 0 ? (
                              <p className="text-xs text-center py-4" style={{ color: '#5b5775' }}>Abhi tak koi applicant nahi aaya.</p>
                            ) : (
                              <div className="space-y-2">
                                {applicants.map((a) => {
                                  const appStatusStyles: Record<string, { bg: string; color: string }> = {
                                    applied: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
                                    shortlisted: { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA' },
                                    hired: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                                    rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
                                  }
                                  const ast = appStatusStyles[a.status] || { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8' }
                                  return (
                                    <div key={a.id} style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-lg p-3">
                                      <div className="flex justify-between items-start flex-wrap gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm text-white">{a.name}</span>
                                            <span style={{ background: ast.bg, color: ast.color }} className="text-xs px-2 py-0.5 rounded-full font-bold capitalize">
                                              {a.status}
                                            </span>
                                          </div>
                                          <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                                            📞 {a.phone} {a.email ? `· ✉️ ${a.email}` : ''}
                                          </div>
                                          {a.cover_note && <p className="text-xs mt-1 italic" style={{ color: '#5b5775' }}>"{a.cover_note}"</p>}
                                          {a.resume_url && (
                                            <a href={a.resume_url} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }} className="text-xs hover:underline inline-flex items-center gap-1 mt-1">
                                              📎 View Resume
                                            </a>
                                          )}
                                        </div>

                                        {a.status === 'applied' || a.status === 'shortlisted' ? (
                                          <div className="flex gap-1.5 flex-wrap">
                                            {a.status === 'applied' && (
                                              <button
                                                onClick={() => updateApplicantStatus(j.id, a.id, 'shortlisted')}
                                                disabled={updatingApplicant === a.id}
                                                style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}
                                                className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80 disabled:opacity-50"
                                              >
                                                Shortlist
                                              </button>
                                            )}
                                            <button
                                              onClick={() => updateApplicantStatus(j.id, a.id, 'hired')}
                                              disabled={updatingApplicant === a.id}
                                              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                                              className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80 disabled:opacity-50"
                                            >
                                              Hire
                                            </button>
                                            <button
                                              onClick={() => updateApplicantStatus(j.id, a.id, 'rejected')}
                                              disabled={updatingApplicant === a.id}
                                              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                                              className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80 disabled:opacity-50"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  )
                                })}
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
            </div>
          )}

          {activeTab === 'payroll' && (
            <div style={{ margin: '-20px -24px', minHeight: 'calc(100vh - 113px)', background: '#0b0a14' }}>
              <div className="px-6 pt-6 pb-8 mb-6">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Wallet size={20} style={{ color: '#4ADE80' }} /> Payroll
                  </h2>
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="flex gap-1 rounded-lg p-1">
                    <button
                      onClick={() => setPayrollView('structure')}
                      style={payrollView === 'structure' ? { background: '#4f46e5', color: '#fff' } : { color: '#94a3b8' }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    >
                      Salary Structure
                    </button>
                    <button
                      onClick={() => setPayrollView('process')}
                      style={payrollView === 'process' ? { background: '#4f46e5', color: '#fff' } : { color: '#94a3b8' }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                    >
                      Process Payroll
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-12">

              {payrollLoading ? (
                <div style={{ background: '#121124', border: '1px solid #1e1b3a', color: 'rgba(255,255,255,0.4)' }} className="rounded-xl p-8 text-center">Loading...</div>
              ) : payrollView === 'structure' ? (
                <div className="space-y-2.5">
                  {payrollStaffList.map(s => {
                    const structure = salaryStructures[s.id]
                    const isEditing = editingStaffId === s.id
                    const RoleIcon = { teacher: GraduationCap, admin: UserPlus, accounts: Wallet, principal: ClipboardList, school_owner: Crown }[s.role] || Users
                    return (
                      <div key={s.id} style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl overflow-hidden">
                        <div className="p-4 flex justify-between items-center flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div style={{ background: 'rgba(74,222,128,0.15)' }} className="w-9 h-9 rounded-full flex items-center justify-center">
                              <RoleIcon size={16} style={{ color: '#4ADE80' }} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{s.name}</div>
                              <div className="text-xs capitalize" style={{ color: '#94a3b8' }}>{s.role.replace('_', ' ')}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {structure ? (
                              <span className="text-sm font-bold" style={{ color: '#10b981' }}>Rs. {structureTotal(s.id).toLocaleString()}/mo</span>
                            ) : (
                              <span className="text-xs" style={{ color: '#5b5775' }}>No structure set</span>
                            )}
                            <button
                              onClick={() => isEditing ? setEditingStaffId(null) : openStructureEdit(s.id)}
                              style={{ background: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                            >
                              {isEditing ? '✕ Cancel' : structure ? 'Edit' : '➕ Set Structure'}
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div style={{ borderTop: '1px solid #1e1b3a', background: '#0d0c1d' }} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                              {[
                                { key: 'basic', label: 'Basic' },
                                { key: 'medical', label: 'Medical' },
                                { key: 'mobile', label: 'Mobile' },
                                { key: 'transport', label: 'Transport' },
                                { key: 'other', label: 'Other' },
                              ].map(f => (
                                <div key={f.key}>
                                  <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>{f.label}</label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={(structureForm as any)[f.key]}
                                    onChange={e => setStructureForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                    style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                                    className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] placeholder-gray-500"
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={saveStructure}
                              disabled={savingStructure}
                              style={{ background: '#4f46e5' }}
                              className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                              {savingStructure ? 'Saving...' : 'Save Structure'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <>
                  <div style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4 mb-4 flex items-center gap-3">
                    <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>Month:</label>
                    <input
                      type="month"
                      value={payrollMonth}
                      onChange={e => setPayrollMonth(e.target.value)}
                      style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                      className="rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] [color-scheme:dark]"
                    />
                  </div>

                  <div className="space-y-2.5">
                    {payrollStaffList.map(s => {
                      const gross = structureTotal(s.id)
                      const record = payrollRecords[s.id]
                      const isProcessed = !!record
                      const RoleIcon = { teacher: GraduationCap, admin: UserPlus, accounts: Wallet, principal: ClipboardList, school_owner: Crown }[s.role] || Users
                      return (
                        <div key={s.id} style={{ background: '#121124', border: '1px solid #1e1b3a' }} className="rounded-xl p-4 flex justify-between items-center flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div style={{ background: 'rgba(74,222,128,0.15)' }} className="w-9 h-9 rounded-full flex items-center justify-center">
                              <RoleIcon size={16} style={{ color: '#4ADE80' }} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{s.name}</div>
                              <div className="text-xs" style={{ color: '#94a3b8' }}>Gross: Rs. {gross.toLocaleString()}</div>
                            </div>
                          </div>

                          {gross === 0 ? (
                            <span className="text-xs" style={{ color: '#5b5775' }}>No salary structure set</span>
                          ) : isProcessed ? (
                            <div className="text-right">
                              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }} className="text-xs font-bold px-2.5 py-1 rounded-full">✓ Processed</span>
                              <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>Net: Rs. {record.net.toLocaleString()}</div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Deductions"
                                value={deductionInputs[s.id] || ''}
                                onChange={e => setDeductionInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                                style={{ background: '#090810', border: '1px solid #221f3b', color: '#fff' }}
                                className="w-28 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] placeholder-gray-500"
                              />
                              <button
                                onClick={() => processPayroll(s.id)}
                                disabled={processingStaffId === s.id}
                                style={{ background: '#4f46e5' }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                              >
                                {processingStaffId === s.id ? 'Processing...' : 'Process'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              </div>
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'staff' && activeTab !== 'attendance' && activeTab !== 'leave' && activeTab !== 'recruitment' && activeTab !== 'payroll' && (
            <div style={{ background: '#12102A', borderRadius: 16, padding: 60, textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {('' as any)[activeTab]}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, textTransform: 'capitalize' }}>{activeTab} Management</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Coming soon — agle update mein!</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
