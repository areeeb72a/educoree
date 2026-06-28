'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, CheckCircle2, ClipboardList, UserPlus, FileEdit, Megaphone, Wallet, BarChart3, ChevronRight, Search, GraduationCap, Crown, MoreVertical } from 'lucide-react'
import DashboardLayout from '../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

const CHRONIC_THRESHOLD = 75 // %

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
    emergency_phone: '', joining_date: '', photo_url: '',
  })
  const [formError, setFormError] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')
  const ROLE_OPTIONS = ['teacher', 'admin', 'accounts', 'principal', 'school_owner']

  // reset password tab state
  const [resetUsers, setResetUsers] = useState<any[]>([])
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSearch, setResetSearch] = useState('')
  const [selectedResetUser, setSelectedResetUser] = useState<any>(null)
  const [newResetPassword, setNewResetPassword] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetError, setResetError] = useState('')
  const [resettingUser, setResettingUser] = useState(false)

  // notice ticker tab state
  const [tickerText, setTickerText] = useState('')
  const [tickerColor, setTickerColor] = useState('#ffffff')
  const [tickerBg, setTickerBg] = useState('#DC2626')
  const [tickerFontSize, setTickerFontSize] = useState('14px')
  const [tickerDirection, setTickerDirection] = useState('ltr')
  const [tickerFontFamily, setTickerFontFamily] = useState('system-ui')
  const [tickerActive, setTickerActive] = useState(true)
  const [savingTicker, setSavingTicker] = useState(false)
  const [tickerMsg, setTickerMsg] = useState('')

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (activeTab === 'staff' && !staffLoaded) fetchStaff() }, [activeTab])
  useEffect(() => { if (activeTab === 'reset-password') fetchResetUsers() }, [activeTab, profile])
  useEffect(() => { if (activeTab === 'notice-ticker') fetchTicker() }, [activeTab, profile])
  useEffect(() => { if (activeTab === 'students' && !studentsLoaded) fetchStudents() }, [activeTab])

  // students tab states
  const [studentsList, setStudentsList] = useState<any[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [studentsSearch, setStudentsSearch] = useState('')
  const [studentBranchFilter, setStudentBranchFilter] = useState('all')
  const [studentGradeFilter, setStudentGradeFilter] = useState('all')
  const [viewStudent, setViewStudent] = useState<any | null>(null)
  const [editStudent, setEditStudent] = useState<any | null>(null)
  const [editStudentForm, setEditStudentForm] = useState({ name: '', grade: '', section: '', branch_id: '', dob: '', blood_group: '', discount_pct: '0' })
  const [showAddStudentForm, setShowAddStudentForm] = useState(false)
  const [addStudentForm, setAddStudentForm] = useState({
    name: '', dob: '', blood_group: '', grade: '1', section: 'A', roll_number: '', branch_id: '',
    guardian_name: '', guardian_gr: '', guardian_phone: '', discount_pct: '0', photo_url: ''
  })
  const [savingStudent, setSavingStudent] = useState(false)
  const [studentMsg, setStudentMsg] = useState('')
  const [uploadingStudentPhoto, setUploadingStudentPhoto] = useState(false)

  async function fetchStudents() {
    if (!profile?.school_id) return
    setStudentsLoading(true)
    const { data } = await supabase
      .from('students')
      .select('id, auto_id, name, dob, blood_group, grade, section, roll_number, branch_id, guardian_id, sibling_order, discount_pct, emergency_phone, active, photo_url, branches(name), guardians(name, gr_number, phone)')
      .eq('school_id', profile.school_id)
      .order('grade')
      .order('name')
    setStudentsList(data || [])
    setStudentsLoading(false)
    setStudentsLoaded(true)
  }

  async function toggleStudentActive(student: any) {
    const nextVal = !(student.active ?? true)
    const { error } = await supabase
      .from('students')
      .update({ active: nextVal })
      .eq('id', student.id)
    if (!error) {
      setStudentsList(prev => prev.map(s => s.id === student.id ? { ...s, active: nextVal } : s))
    }
  }

  async function saveEditStudent() {
    if (!editStudent) return
    setSavingStudent(true)
    setStudentMsg('')
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: editStudentForm.name,
          grade: editStudentForm.grade || null,
          section: editStudentForm.section || 'A',
          branch_id: editStudentForm.branch_id || null,
          dob: editStudentForm.dob || null,
          blood_group: editStudentForm.blood_group || null,
          discount_pct: Number(editStudentForm.discount_pct || 0)
        })
         .eq('id', editStudent.id)
      if (error) throw error
      setStudentMsg('Student successfully updated!')
      fetchStudents()
      setTimeout(() => setEditStudent(null), 1000)
    } catch (err: any) {
      setStudentMsg('Error: ' + err.message)
    }
    setSavingStudent(false)
  }

  async function handleStudentPhotoUpload(e: any) {
    if (!viewStudent) return
    const file = e.target.files[0]
    if (!file) return
    setUploadingStudentPhoto(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        const { error } = await supabase
          .from('students')
          .update({ photo_url: base64 })
          .eq('id', viewStudent.id)
        if (error) throw error
        
        const updatedStudent = { ...viewStudent, photo_url: base64 }
        setViewStudent(updatedStudent)
        setStudentsList(prev => prev.map(s => s.id === viewStudent.id ? updatedStudent : s))
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      alert('Photo upload failed: ' + err.message)
    }
    setUploadingStudentPhoto(false)
  }

  async function handleAddStudent() {
    setStudentMsg('')
    if (!addStudentForm.name.trim()) { setStudentMsg('Error: Name is required'); return }
    if (!addStudentForm.guardian_name.trim()) { setStudentMsg('Error: Guardian Name is required'); return }
    
    setSavingStudent(true)
    try {
      // 1. Insert guardian
      const { data: guardian, error: gErr } = await supabase
        .from('guardians')
        .insert({
          school_id: profile.school_id,
          name: addStudentForm.guardian_name,
          gr_number: addStudentForm.guardian_gr || `GR-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: addStudentForm.guardian_phone || null
        })
        .select()
        .single()
      if (gErr) throw gErr

      // 2. Insert student
      const { error: sErr } = await supabase
        .from('students')
        .insert({
          school_id: profile.school_id,
          branch_id: addStudentForm.branch_id || profile.branch_id,
          guardian_id: guardian.id,
          name: addStudentForm.name,
          dob: addStudentForm.dob || null,
          blood_group: addStudentForm.blood_group || null,
          grade: addStudentForm.grade || null,
          section: addStudentForm.section || 'A',
          roll_number: addStudentForm.roll_number ? Number(addStudentForm.roll_number) : null,
          discount_pct: Number(addStudentForm.discount_pct || 0),
          photo_url: addStudentForm.photo_url || null,
          active: true,
          auto_id: `STUDENT-ST${Math.floor(10000 + Math.random() * 90000)}`
        })
      if (sErr) throw sErr

      setStudentMsg('Success: Student added successfully!')
      setShowAddStudentForm(false)
      setAddStudentForm({
        name: '', dob: '', blood_group: '', grade: '1', section: 'A', roll_number: '', branch_id: '',
        guardian_name: '', guardian_gr: '', guardian_phone: '', discount_pct: '0', photo_url: ''
      })
      fetchStudents()
    } catch (err: any) {
      setStudentMsg('Error: ' + err.message)
    }
    setSavingStudent(false)
  }

  async function fetchTicker() {
    if (!profile?.school_id) return
    const { data, error } = await supabase
      .from('school_tickers')
      .select('*')
      .eq('school_id', profile.school_id)
      .maybeSingle()
    if (!error && data) {
      setTickerText(data.text)
      setTickerColor(data.color)
      setTickerBg(data.bg_color)
      setTickerFontSize(data.font_size)
      setTickerDirection(data.direction)
      setTickerFontFamily(data.font_family)
      setTickerActive(data.active)
    }
  }

  async function saveTicker() {
    if (!profile?.school_id) return
    setSavingTicker(true)
    setTickerMsg('')
    try {
      const { data: existing } = await supabase
        .from('school_tickers')
        .select('id')
        .eq('school_id', profile.school_id)
        .maybeSingle()

      const payload = {
        school_id: profile.school_id,
        text: tickerText,
        color: tickerColor,
        bg_color: tickerBg,
        font_size: tickerFontSize,
        direction: tickerDirection,
        font_family: tickerFontFamily,
        active: tickerActive
      }

      let error;
      if (existing) {
        const { error: err } = await supabase
          .from('school_tickers')
          .update(payload)
          .eq('id', existing.id)
        error = err
      } else {
        const { error: err } = await supabase
          .from('school_tickers')
          .insert(payload)
        error = err
      }

      if (error) throw error
      setTickerMsg('Success: Notice ticker has been telecast globally!')
    } catch (err: any) {
      setTickerMsg('Error: ' + err.message + ' (Note: Make sure to run the Supabase database migration for school_tickers table)')
    }
    setSavingTicker(false)
  }

  async function fetchResetUsers() {
    if (!profile?.school_id) return
    setResetLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, phone, auto_id, active')
      .eq('school_id', profile.school_id)
      .in('role', ['accounts', 'teacher', 'student', 'parent'])
      .order('name')
    if (!error) {
      setResetUsers(data || [])
    }
    setResetLoading(false)
  }

  async function handleResetPassword() {
    setResetError('')
    setResetSuccess('')
    if (!selectedResetUser) return
    if (!newResetPassword || newResetPassword.length < 6) {
      setResetError('Error: Password kam az kam 6 characters ka ho')
      return
    }
    setResettingUser(true)
    try {
      const res = await fetch('/dashboard/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedResetUser.id, newPassword: newResetPassword }),
      })
      const result = await res.json()
      if (!res.ok) {
        setResetError('Error: ' + result.error)
        setResettingUser(false)
        return
      }
      setResetSuccess(`Password successfully reset ho gaya for ${selectedResetUser.name}!`)
      setNewResetPassword('')
      setTimeout(() => { setSelectedResetUser(null); setResetSuccess('') }, 2500)
    } catch (err: any) {
      setResetError('Error: ' + err.message)
    }
    setResettingUser(false)
  }
  const [viewTeacher, setViewTeacher] = useState<any | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  async function handlePhotoUpload(e: any) {
    if (!viewTeacher) return
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        const { error } = await supabase
          .from('profiles')
          .update({ photo_url: base64 })
          .eq('id', viewTeacher.id)
        if (error) throw error
        
        const updatedTeacher = { ...viewTeacher, photo_url: base64 }
        setViewTeacher(updatedTeacher)
        setStaffList(prev => prev.map(s => s.id === viewTeacher.id ? { ...s, photo_url: base64 } : s))
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      alert('Photo upload failed: ' + err.message)
    }
    setUploadingPhoto(false)
  }

  async function fetchStaff() {
    if (!profile?.school_id) return
    setStaffLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, phone, joining_date, active, auto_id, branch_id, photo_url')
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
      emergency_phone: '', joining_date: '', photo_url: '',
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
    { value: 'present', label: 'Present', color: 'rgba(16,185,129,0.1)', activeColor: 'var(--accent-emerald)' },
    { value: 'absent', label: 'Absent', color: 'rgba(244,63,94,0.1)', activeColor: 'var(--accent-rose)' },
    { value: 'late', label: 'Late', color: 'rgba(245,158,11,0.1)', activeColor: 'var(--accent-amber)' },
    { value: 'leave', label: 'Leave', color: 'rgba(59,130,246,0.1)', activeColor: 'var(--accent-purple)' },
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
        if (!structMap[s.staff_id]) structMap[s.staff_id] = s
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

  const tabs = ['overview', 'staff', 'students', 'attendance', 'leave', 'recruitment', 'payroll', 'reset-password', 'notice-ticker']
  const todayPct = stats.totalStaff ? Math.round((stats.presentToday / stats.totalStaff) * 100) : 0

  return (
    <DashboardLayout
      role="admin"
      activePath={activeTab === 'overview' ? '/dashboard/admin' : `/dashboard/admin/${activeTab}`}
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>👥 Admin & HR Command</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Principal command for faculty logs, leave approvals, recruitment posts, and payroll processing.</p>
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
            {tab === 'reset-password' ? '🔑 Reset Password' : tab === 'notice-ticker' ? '📣 Notice Ticker' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading HR command...</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Stats Cards */}
              <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { label: 'Total Faculty', value: stats.totalStaff, color: 'var(--accent-purple)' },
                  { label: 'Faculty Present Today', value: stats.presentToday, color: 'var(--accent-emerald)' },
                  { label: 'On Leave', value: stats.onLeave, color: 'var(--accent-amber)' },
                  { label: 'New Job Applications', value: stats.newApplications, color: 'var(--accent-cyan)' },
                ].map((s, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Actions Grid */}
              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>Quick Actions Portal</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Add Faculty Member', color: 'var(--accent-purple)', tab: 'staff' },
                    { label: 'Staff Attendance', color: 'var(--accent-emerald)', tab: 'attendance' },
                    { label: 'Review Leave requests', color: 'var(--accent-amber)', tab: 'leave' },
                    { label: 'Manage Recruitment', color: 'var(--accent-cyan)', tab: 'recruitment' },
                    { label: 'Process Payroll structured', color: 'var(--accent-purple)', tab: 'payroll' },
                  ].map((action, i) => (
                    <button key={i} onClick={() => setActiveTab(action.tab)}
                      style={{
                        padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        borderRadius: 12, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.18s ease',
                      }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NAVIGATE TO</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{action.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Active Faculty staff roster</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="🔍 Search name or ID..."
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                  />
                  <button onClick={() => { setShowAddForm(!showAddForm); resetForm(); setFormSuccess('') }}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    {showAddForm ? '✕ Cancel' : '+ Add Staff'}
                  </button>
                </div>
              </div>

              {showAddForm && (
                <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Add Staff Profile</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <input placeholder="Full Name *" type="text" value={formData.name} onChange={e => updateForm('name', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                    
                    <select value={formData.role} onChange={e => updateForm('role', e.target.value)}
                      style={{ padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <input placeholder="Email *" type="email" value={formData.email} onChange={e => updateForm('email', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                    
                    <input placeholder="Password (min 6 chars) *" type="password" value={formData.password} onChange={e => updateForm('password', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <input placeholder="Phone" type="text" value={formData.phone} onChange={e => updateForm('phone', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                    
                    <input placeholder="Father's Name" type="text" value={formData.father_name} onChange={e => updateForm('father_name', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Profile Picture:</label>
                      <input type="file" accept="image/*" onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => updateForm('photo_url', reader.result as string)
                          reader.readAsDataURL(file)
                        }
                      }} style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                      {formData.photo_url && <span style={{ color: 'var(--accent-emerald)', fontSize: 12, fontWeight: 700 }}>✓ Uploaded</span>}
                    </div>
                  </div>

                  {formError && <div style={{ fontSize: 12, color: 'var(--accent-rose)', marginBottom: 8 }}>{formError}</div>}
                  {formSuccess && <div style={{ fontSize: 12, color: 'var(--accent-emerald)', marginBottom: 8 }}>{formSuccess}</div>}

                  <button onClick={handleAddStaff} disabled={formSaving}
                    style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: formSaving ? 0.6 : 1 }}>
                    {formSaving ? 'Saving...' : 'Add Member'}
                  </button>
                </div>
              )}

              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                {staffLoading ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading faculty members...</p>
                ) : filteredStaff.length === 0 ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No faculty matching criteria.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Contact</th>
                          <th>Faculty ID</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</td>
                            <td style={{ textTransform: 'capitalize' }}>{s.role}</td>
                            <td>{s.phone || '—'}</td>
                            <td style={{ fontFamily: 'monospace' }}>{s.auto_id || '—'}</td>
                            <td>
                              <span className={`status-badge ${s.active ? 'active' : 'inactive'}`}>
                                {s.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button onClick={() => setViewTeacher(s)} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>
                                View Card
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* View Staff Details Modal (Premium Staff Card style) */}
              {viewTeacher && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                  <div style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden', position: 'relative' }}>
                    
                    {/* ID Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 14, marginBottom: 18 }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-purple)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>EduCore Faculty System</span>
                        <h4 style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#fff' }}>STAFF ID CARD</h4>
                      </div>
                      <span style={{ fontSize: 20 }}>⚡</span>
                    </div>

                    {/* Profile Photo Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.3)', padding: 3, background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {viewTeacher.photo_url ? (
                            <img src={viewTeacher.photo_url} alt={viewTeacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.15)' }}>
                              {viewTeacher.name ? viewTeacher.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'TF'}
                            </span>
                          )}
                        </div>
                        {/* Upload Photo Button Overlay */}
                        <label style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--accent-purple)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '2px solid #0f172a' }}>
                          <span style={{ fontSize: 12 }}>📷</span>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                        {uploadingPhoto ? 'Uploading photo...' : 'Click camera to change photo'}
                      </span>
                    </div>

                    {/* Card Info Fields Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Full Name</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{viewTeacher.name}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Staff ID</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#34D399', fontFamily: 'monospace' }}>{viewTeacher.auto_id || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Designation / Role</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{viewTeacher.role || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Phone Number</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{viewTeacher.phone || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Branch Assigned</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewTeacher.branches?.name || 'No Branch'}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Status</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: (viewTeacher.active ?? true) ? '#34D399' : '#F87171' }}>
                          {(viewTeacher.active ?? true) ? 'Active Faculty' : 'Inactive / Disabled'}
                        </div>
                      </div>
                    </div>

                    {/* Simulated ID Card Barcode */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.45, marginBottom: 20 }}>
                      <div style={{ display: 'flex', gap: 2, height: 24, width: '100%', maxWidth: 200, background: '#fff', padding: '3px 10px', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                        {[1, 4, 2, 1, 3, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1].map((w, i) => (
                          <div key={i} style={{ width: w, height: '100%', background: '#000', flexShrink: 0 }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 9, color: '#fff', fontFamily: 'monospace' }}>*TF-{viewTeacher.id.slice(0, 8).toUpperCase()}*</span>
                    </div>

                    <button
                      onClick={() => setViewTeacher(null)}
                      style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >Close Details</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Student Enrollment Registry</span>
                <button onClick={() => { setShowAddStudentForm(!showAddStudentForm); setStudentMsg('') }}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  {showAddStudentForm ? '✕ Cancel' : '+ Enroll Student'}
                </button>
              </div>

              {showAddStudentForm && (
                <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Enroll New Student</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <input placeholder="Student Full Name *" type="text" value={addStudentForm.name} onChange={e => setAddStudentForm({ ...addStudentForm, name: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                    
                    <input placeholder="Date of Birth" type="date" value={addStudentForm.dob} onChange={e => setAddStudentForm({ ...addStudentForm, dob: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <select value={addStudentForm.grade} onChange={e => setAddStudentForm({ ...addStudentForm, grade: e.target.value })}
                      style={{ padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                      {['1','2','3','4','5','6','7','8','9','10'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>

                    <input placeholder="Section (e.g. A, B)" type="text" value={addStudentForm.section} onChange={e => setAddStudentForm({ ...addStudentForm, section: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <input placeholder="Roll Number" type="text" value={addStudentForm.roll_number} onChange={e => setAddStudentForm({ ...addStudentForm, roll_number: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <input placeholder="Blood Group (e.g. O+, A-)" type="text" value={addStudentForm.blood_group} onChange={e => setAddStudentForm({ ...addStudentForm, blood_group: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <input placeholder="Discount % (0-100)" type="number" value={addStudentForm.discount_pct} onChange={e => setAddStudentForm({ ...addStudentForm, discount_pct: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <input placeholder="Guardian Full Name *" type="text" value={addStudentForm.guardian_name} onChange={e => setAddStudentForm({ ...addStudentForm, guardian_name: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <input placeholder="Guardian GR Number (e.g. GR-9812)" type="text" value={addStudentForm.guardian_gr} onChange={e => setAddStudentForm({ ...addStudentForm, guardian_gr: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <input placeholder="Guardian Phone Number" type="text" value={addStudentForm.guardian_phone} onChange={e => setAddStudentForm({ ...addStudentForm, guardian_phone: e.target.value })}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                      <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Profile Photo:</label>
                      <input type="file" accept="image/*" onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => setAddStudentForm({ ...addStudentForm, photo_url: reader.result as string })
                          reader.readAsDataURL(file)
                        }
                      }} style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                      {addStudentForm.photo_url && <span style={{ color: 'var(--accent-emerald)', fontSize: 12, fontWeight: 700 }}>✓ Uploaded</span>}
                    </div>
                  </div>

                  {studentMsg && <div style={{ fontSize: 12, color: studentMsg.startsWith('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginBottom: 8 }}>{studentMsg}</div>}

                  <button onClick={handleAddStudent} disabled={savingStudent}
                    style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: savingStudent ? 0.6 : 1 }}>
                    {savingStudent ? 'Enrolling...' : 'Enroll Student'}
                  </button>
                </div>
              )}

              {/* Filters & Search */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Search student name or ID..."
                  value={studentsSearch}
                  onChange={e => setStudentsSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
                
                <select value={studentGradeFilter} onChange={e => setStudentGradeFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
                  <option value="all">All Grades</option>
                  {['1','2','3','4','5','6','7','8','9','10'].map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              {/* Students Table */}
              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                {studentsLoading ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading students registry...</p>
                ) : studentsList.length === 0 ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No students enrolled.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>ID</th>
                          <th>Class</th>
                          <th>Guardian Name</th>
                          <th>Guardian Phone</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsList
                          .filter(s => !studentsSearch || s.name?.toLowerCase().includes(studentsSearch.toLowerCase()) || s.auto_id?.toLowerCase().includes(studentsSearch.toLowerCase()))
                          .filter(s => studentGradeFilter === 'all' || s.grade === studentGradeFilter)
                          .map(s => (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</td>
                              <td style={{ fontFamily: 'monospace' }}>{s.auto_id || '—'}</td>
                              <td>Grade {s.grade} - {s.section || 'A'}</td>
                              <td>{s.guardians?.name || '—'}</td>
                              <td>{s.guardians?.phone || '—'}</td>
                              <td>
                                <span className={`status-badge ${s.active ? 'active' : 'inactive'}`}>
                                  {s.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button onClick={() => setViewStudent(s)} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>
                                    View Card
                                  </button>
                                  <button onClick={() => {
                                    setEditStudent(s)
                                    setEditStudentForm({
                                      name: s.name,
                                      grade: s.grade || '',
                                      section: s.section || '',
                                      branch_id: s.branch_id || '',
                                      dob: s.dob || '',
                                      blood_group: s.blood_group || '',
                                      discount_pct: String(s.discount_pct || 0)
                                    })
                                    setStudentMsg('')
                                  }} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>
                                    Edit
                                  </button>
                                  <button onClick={() => toggleStudentActive(s)} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: s.active ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                                    {s.active ? 'Disable' : 'Enable'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* View Student Details Modal (Premium ID Card style) */}
              {viewStudent && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                  <div style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden', position: 'relative' }}>
                    
                    {/* ID Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 14, marginBottom: 18 }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-purple)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>EduCore ID System</span>
                        <h4 style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#fff' }}>STUDENT ID CARD</h4>
                      </div>
                      <span style={{ fontSize: 20 }}>⚡</span>
                    </div>

                    {/* Profile Photo Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.3)', padding: 3, background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {viewStudent.photo_url ? (
                            <img src={viewStudent.photo_url} alt={viewStudent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.15)' }}>
                              {viewStudent.name ? viewStudent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
                            </span>
                          )}
                        </div>
                        {/* Upload Photo Button Overlay */}
                        <label style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--accent-purple)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', border: '2px solid #0f172a' }}>
                          <span style={{ fontSize: 12 }}>📷</span>
                          <input type="file" accept="image/*" onChange={handleStudentPhotoUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                        {uploadingStudentPhoto ? 'Uploading photo...' : 'Click camera to change photo'}
                      </span>
                    </div>

                    {/* Card Info Fields Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Full Name</span>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{viewStudent.name}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Student ID</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#34D399', fontFamily: 'monospace' }}>{viewStudent.auto_id || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Class & Section</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Grade {viewStudent.grade || '—'} - {viewStudent.section || 'A'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Blood Group</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#FCA5A5' }}>{viewStudent.blood_group || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Branch</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewStudent.branches?.name || '—'}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Guardian Name & GR</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{viewStudent.guardians?.name || '—'} (GR: {viewStudent.guardians?.gr_number || '—'})</div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Guardian Phone</span>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{viewStudent.guardians?.phone || '—'}</div>
                      </div>
                    </div>

                    {/* Simulated ID Card Barcode */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.45, marginBottom: 20 }}>
                      <div style={{ display: 'flex', gap: 2, height: 24, width: '100%', maxWidth: 200, background: '#fff', padding: '3px 10px', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                        {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 1, 4, 1, 2].map((w, i) => (
                          <div key={i} style={{ width: w, height: '100%', background: '#000', flexShrink: 0 }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 9, color: '#fff', fontFamily: 'monospace' }}>*ST-{viewStudent.id.slice(0, 8).toUpperCase()}*</span>
                    </div>

                    <button
                      onClick={() => setViewStudent(null)}
                      style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >Close Details</button>
                  </div>
                </div>
              )}

              {/* Edit Student Modal */}
              {editStudent && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
                    <h3 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>Edit Student</h3>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Full Name</label>
                      <input
                        value={editStudentForm.name}
                        onChange={e => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Grade</label>
                        <select value={editStudentForm.grade} onChange={e => setEditStudentForm({ ...editStudentForm, grade: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                          {['1','2','3','4','5','6','7','8','9','10'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Section</label>
                        <input
                          value={editStudentForm.section}
                          onChange={e => setEditStudentForm({ ...editStudentForm, section: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>DOB</label>
                        <input
                          type="date"
                          value={editStudentForm.dob}
                          onChange={e => setEditStudentForm({ ...editStudentForm, dob: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Blood Group</label>
                        <input
                          value={editStudentForm.blood_group}
                          onChange={e => setEditStudentForm({ ...editStudentForm, blood_group: e.target.value })}
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {studentMsg && <div style={{ fontSize: 12, color: studentMsg.startsWith('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginBottom: 12 }}>{studentMsg}</div>}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setEditStudent(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                      <button onClick={saveEditStudent} disabled={savingStudent}
                        style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        {savingStudent ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Staff Attendance log sheet</span>
                <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 4 }}>
                  <button onClick={() => setAttView('mark')}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: attView === 'mark' ? 'var(--accent-purple)' : 'transparent', color: '#fff' }}>
                    Mark Daily
                  </button>
                  <button onClick={() => setAttView('history')}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: attView === 'history' ? 'var(--accent-purple)' : 'transparent', color: '#fff' }}>
                    History log
                  </button>
                </div>
              </div>

              {attView === 'mark' ? (
                <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Date Log:</label>
                    <input type="date" value={attDate} max={new Date().toISOString().split('T')[0]} onChange={e => setAttDate(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }} />
                  </div>
                  {attLoading ? (
                    <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading list...</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th>Staff Member</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'center' }}>Mark Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attStaffList.map(s => {
                            const record = attRecords[s.id]
                            const currentStatus = record?.status
                            return (
                              <tr key={s.id}>
                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</td>
                                <td style={{ textTransform: 'capitalize' }}>{s.role}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    {STATUS_OPTS.map(opt => {
                                      const isActive = currentStatus === opt.value
                                      return (
                                        <button key={opt.value} onClick={() => markAttendance(s.id, opt.value)} disabled={attSaving === s.id}
                                          style={{
                                            padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                            background: isActive ? opt.activeColor : opt.color,
                                            color: isActive ? '#fff' : 'var(--text-secondary)'
                                          }}>
                                          {opt.label}
                                        </button>
                                      );
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
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select value={histStaffId} onChange={e => setHistStaffId(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}>
                      {attStaffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="month" value={histMonth} onChange={e => setHistMonth(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }} />
                  </div>

                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                    {histLoading ? (
                      <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading history...</p>
                    ) : histRecords.length === 0 ? (
                      <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No records logged for this month.</p>
                    ) : (
                      <div className="table-wrap">
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {histRecords.map((r, idx) => (
                              <tr key={idx}>
                                <td>{r.date}</td>
                                <td>
                                  <span className={`status-badge ${r.status === 'present' ? 'active' : r.status === 'absent' ? 'inactive' : 'pending'}`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td>{r.remarks || '—'}</td>
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

          {activeTab === 'leave' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Faculty Leave Requests</span>
                <select value={leaveFilter} onChange={e => setLeaveFilter(e.target.value as any)}
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}>
                  <option value="all">All Request</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                {leaveLoading ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading applications...</p>
                ) : filteredLeaves.length === 0 ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No leave records.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Staff Applicant</th>
                          <th>Role</th>
                          <th>Dates Requested</th>
                          <th>Reason for Leave</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeaves.map(l => {
                          const applicant = applicantMap[l.applicant_id]
                          return (
                            <tr key={l.id}>
                              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{applicant?.name || '—'}</td>
                              <td style={{ textTransform: 'capitalize' }}>{applicant?.role || '—'}</td>
                              <td>{l.start_date} to {l.end_date}</td>
                              <td>{l.reason}</td>
                              <td>
                                <span className={`status-badge ${l.status === 'approved' ? 'active' : l.status === 'rejected' ? 'inactive' : 'pending'}`}>
                                  {l.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {l.status === 'pending' && (
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button onClick={() => updateLeaveStatus(l.id, 'approved')} disabled={leaveSaving === l.id}
                                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent-emerald)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                                      Approve
                                    </button>
                                    <button onClick={() => updateLeaveStatus(l.id, 'rejected')} disabled={leaveSaving === l.id}
                                      style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent-rose)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                                      Reject
                                    </button>
                                  </div>
                                )}
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

          {activeTab === 'recruitment' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Recruitment Vacancies board</span>
                <button onClick={() => { setShowJobForm(!showJobForm); resetJobForm() }}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  {showJobForm ? '✕ Cancel' : '+ Post Job'}
                </button>
              </div>

              {showJobForm && (
                <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Add Job Vacancy</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <input placeholder="Job Title *" type="text" value={jobForm.title} onChange={e => updateJobForm('title', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                    
                    <input placeholder="Department" type="text" value={jobForm.department} onChange={e => updateJobForm('department', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                    
                    <input placeholder="Vacancies count" type="number" value={jobForm.vacancies} onChange={e => updateJobForm('vacancies', e.target.value)}
                      style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }} />
                  </div>

                  <textarea placeholder="Job Description" value={jobForm.description} onChange={e => updateJobForm('description', e.target.value)} rows={2}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }} />

                  {jobFormError && <div style={{ fontSize: 12, color: 'var(--accent-rose)', marginBottom: 8 }}>{jobFormError}</div>}

                  <button onClick={handlePostJob} disabled={jobSaving}
                    style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: jobSaving ? 0.6 : 1 }}>
                    Post Job
                  </button>
                </div>
              )}

              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                {jobsLoading ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading postings...</p>
                ) : filteredJobs.length === 0 ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No jobs posted.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18 }}>
                    {filteredJobs.map(job => {
                      const isOpen = job.status === 'open'
                      return (
                        <div key={job.id} style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 16, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary)' }}>{job.title}</h4>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => toggleJobStatus(job.id, job.status)} disabled={jobToggling === job.id}
                                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: isOpen ? 'var(--accent-rose)' : 'var(--accent-purple)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                                {isOpen ? 'Close Post' : 'Re-open'}
                              </button>
                              <button onClick={() => toggleApplicants(job.id)}
                                style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 11, cursor: 'pointer' }}>
                                Applicants list
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Department: {job.department || '—'} · Vacancies: {job.vacancies}</p>

                          {expandedJob === job.id && (
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-card)', padding: 10, borderRadius: 8 }}>
                              {loadingApplicants === job.id ? (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading applicants...</p>
                              ) : (applicantsByJob[job.id] || []).length === 0 ? (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No applications received yet.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {(applicantsByJob[job.id] || []).map(app => (
                                    <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: 10, borderRadius: 6 }}>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{app.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email: {app.email} · Phone: {app.phone}</div>
                                      </div>
                                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span className={`status-badge ${app.status === 'hired' ? 'active' : app.status === 'rejected' ? 'inactive' : 'pending'}`}>{app.status}</span>
                                        {app.status === 'applied' && (
                                          <>
                                            <button onClick={() => updateApplicantStatus(job.id, app.id, 'shortlisted')}
                                              style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--accent-cyan)', color: '#fff', fontSize: 10, border: 'none', cursor: 'pointer' }}>
                                              Shortlist
                                            </button>
                                            <button onClick={() => updateApplicantStatus(job.id, app.id, 'hired')}
                                              style={{ padding: '3px 8px', borderRadius: 4, background: 'var(--accent-emerald)', color: '#fff', fontSize: 10, border: 'none', cursor: 'pointer' }}>
                                              Hire
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
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
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Staff Salary Payroll ledger</span>
                <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 4 }}>
                  <button onClick={() => setPayrollView('structure')}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: payrollView === 'structure' ? 'var(--accent-purple)' : 'transparent', color: '#fff' }}>
                    Structures
                  </button>
                  <button onClick={() => setPayrollView('process')}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: payrollView === 'process' ? 'var(--accent-purple)' : 'transparent', color: '#fff' }}>
                    Process Monthly
                  </button>
                </div>
              </div>

              {payrollLoading ? (
                <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading payroll details...</p>
              ) : payrollView === 'structure' ? (
                <div style={{ display: 'grid', gridTemplateColumns: editingStaffId ? '360px 1fr' : '1fr', gap: 20 }}>
                  {editingStaffId && (
                    <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, height: 'fit-content' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Edit Salary structure</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                        {['basic', 'medical', 'mobile', 'transport', 'other'].map(f => (
                          <div key={f}>
                            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize', marginBottom: 4 }}>{f} Allowance (Rs.)</label>
                            <input type="number" value={(structureForm as any)[f]} onChange={e => setStructureForm(prev => ({ ...prev, [f]: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-primary)' }} />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveStructure} disabled={savingStructure}
                          style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                          {savingStructure ? 'Saving...' : 'Save Structure'}
                        </button>
                        <button onClick={() => setEditingStaffId(null)}
                          style={{ padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 12.5, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                    <div className="table-wrap">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th>Staff Member</th>
                            <th>Role</th>
                            <th>Basic Salary</th>
                            <th>Allowances Total</th>
                            <th>Gross Total</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollStaffList.map(s => {
                            const struct = salaryStructures[s.id]
                            const gross = structureTotal(s.id)
                            return (
                              <tr key={s.id}>
                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</td>
                                <td style={{ textTransform: 'capitalize' }}>{s.role}</td>
                                <td>Rs. {struct?.basic?.toLocaleString() || 0}</td>
                                <td>Rs. {((struct?.medical || 0) + (struct?.mobile || 0) + (struct?.transport || 0) + (struct?.other || 0)).toLocaleString()}</td>
                                <td style={{ fontWeight: 750, color: 'var(--accent-purple)' }}>Rs. {gross.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => openStructureEdit(s.id)}
                                    style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 11, cursor: 'pointer' }}>
                                    Configure
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Month Ledger:</span>
                    <input type="month" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }} />
                  </div>

                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                    <div className="table-wrap">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th>Staff Member</th>
                            <th>Gross Salary</th>
                            <th>Deductions (Rs.)</th>
                            <th>Net Payable</th>
                            <th>Disbursement Status</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollStaffList.map(s => {
                            const record = payrollRecords[s.id]
                            const gross = structureTotal(s.id)
                            const isProcessed = !!record
                            return (
                              <tr key={s.id}>
                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</td>
                                <td>Rs. {gross.toLocaleString()}</td>
                                <td>
                                  {isProcessed ? (
                                    <span>Rs. {record.deductions.toLocaleString()}</span>
                                  ) : (
                                    <input type="number" placeholder="Deductions" value={deductionInputs[s.id] || ''} onChange={e => setDeductionInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                                      style={{ width: 100, padding: '6px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12 }} />
                                  )}
                                </td>
                                <td style={{ fontWeight: 800, color: 'var(--accent-purple)' }}>Rs. {isProcessed ? record.net.toLocaleString() : (gross - (parseFloat(deductionInputs[s.id] || '0') || 0)).toLocaleString()}</td>
                                <td>
                                  <span className={`status-badge ${isProcessed ? 'active' : 'inactive'}`}>
                                    {isProcessed ? `Processed (${record.status})` : 'Unprocessed'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => processPayroll(s.id)} disabled={processingStaffId === s.id}
                                    style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: 'var(--accent-purple)', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                                    {processingStaffId === s.id ? 'Processing' : isProcessed ? 'Reprocess' : 'Process'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reset-password' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    placeholder="🔍 Search user by name or ID..."
                    value={resetSearch}
                    onChange={e => setResetSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                {resetLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>User Info</th>
                          <th>Auto ID</th>
                          <th>Role</th>
                          <th>Phone</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resetUsers
                          .filter(u => {
                            const q = resetSearch.toLowerCase()
                            return !q || u.name?.toLowerCase().includes(q) || u.auto_id?.toLowerCase().includes(q)
                          })
                          .map(u => (
                            <tr key={u.id}>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{u.auto_id || '—'}</td>
                              <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{u.phone || '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    setSelectedResetUser(u)
                                    setNewResetPassword('')
                                    setResetError('')
                                    setResetSuccess('')
                                  }}
                                  className="row-btn"
                                  style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}
                                >
                                  🔑 Reset Password
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedResetUser && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
                    <h2 style={{ margin: '0 0 16px', color: 'var(--text-primary)', fontSize: 17, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                      🔑 Reset Password
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                      Resetting password for <strong>{selectedResetUser.name}</strong> ({selectedResetUser.role}).
                    </p>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Naya Password</label>
                      <input
                        type="text"
                        placeholder="Naya password (min 6 characters)"
                        value={newResetPassword}
                        onChange={e => setNewResetPassword(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>

                    {resetError && (
                      <div style={{ fontSize: 12.5, color: '#F87171', marginBottom: 12 }}>{resetError}</div>
                    )}
                    {resetSuccess && (
                      <div style={{ fontSize: 12.5, color: '#34D399', marginBottom: 12 }}>{resetSuccess}</div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setSelectedResetUser(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                      <button onClick={handleResetPassword} disabled={resettingUser}
                        style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                        {resettingUser ? '⏳ Resetting...' : '🔑 Reset Password'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notice-ticker' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28, maxWidth: 650 }}>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 18 }}>📣 Notice Ticker Settings</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Configure the scrolling notice bar that will appear at the very top of all portals for your school.</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Ticker Text (English and/or Urdu)</label>
                <textarea
                  placeholder="Enter scrolling notice here (Urdu text is fully supported, e.g. کل سکول بند رہے گا)..."
                  value={tickerText}
                  onChange={e => setTickerText(e.target.value)}
                  style={{ width: '100%', height: 90, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Text Direction / Language</label>
                  <select
                    value={tickerDirection}
                    onChange={e => setTickerDirection(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="ltr">English (Left to Right)</option>
                    <option value="rtl">Urdu (Right to Left)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Font Style</label>
                  <select
                    value={tickerFontFamily}
                    onChange={e => setTickerFontFamily(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="system-ui">Modern Sans (default)</option>
                    <option value="'Inter', sans-serif">Inter</option>
                    <option value="'Raleway', sans-serif">Raleway</option>
                    <option value="'Jameel Noori Nastaleeq', cursive, Arial">Nastaleeq (Urdu font)</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Text Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={tickerColor}
                      onChange={e => setTickerColor(e.target.value)}
                      style={{ width: 36, height: 36, border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={tickerColor}
                      onChange={e => setTickerColor(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Background Color</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={tickerBg}
                      onChange={e => setTickerBg(e.target.value)}
                      style={{ width: 36, height: 36, border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={tickerBg}
                      onChange={e => setTickerBg(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Font Size</label>
                  <select
                    value={tickerFontSize}
                    onChange={e => setTickerFontSize(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="12px">Small (12px)</option>
                    <option value="14px">Normal (14px)</option>
                    <option value="16px">Medium (16px)</option>
                    <option value="18px">Large (18px)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="tickerActive"
                  checked={tickerActive}
                  onChange={e => setTickerActive(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="tickerActive" style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
                  Enable Telecast (Show this notice to all portals)
                </label>
              </div>

              {tickerMsg && (
                <div style={{ fontSize: 13, color: tickerMsg.startsWith('Error') ? '#F87171' : '#34D399', marginBottom: 16 }}>
                  {tickerMsg}
                </div>
              )}

              <button
                onClick={saveTicker}
                disabled={savingTicker}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >
                {savingTicker ? '⏳ Telecasting...' : '📣 Telecast Ticker Globally'}
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}
