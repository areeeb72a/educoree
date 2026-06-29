'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { GraduationCap, CheckCircle2, Search } from 'lucide-react'
import DashboardLayout from '../../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

type Student = {
  id: string
  auto_id: string | null
  name: string
  dob: string | null
  blood_group: string | null
  grade: string | null
  section: string | null
  roll_number: number | null
  branch_id: string | null
  guardian_id: string | null
  sibling_order: number | null
  discount_pct: number | null
  emergency_phone: string | null
  active: boolean | null
  photo_url?: string | null
  branches?: { name: string } | null
  guardians?: { name: string; gr_number: string; phone: string } | null
}

type Branch = { id: string; name: string }

const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

export default function StudentsManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState('')
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [viewStudent, setViewStudent] = useState<Student | null>(null)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ name: '', grade: '', section: '', branch_id: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [search, branchFilter, gradeFilter])

  useEffect(() => { fetchData() }, [])

  async function handlePhotoUpload(e: any) {
    if (!viewStudent) return
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
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
        setStudents(prev => prev.map(s => s.id === viewStudent.id ? updatedStudent : s))
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      alert('Photo upload failed: ' + err.message)
    }
    setUploadingPhoto(false)
  }

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const schoolId = profile?.school_id
    if (!schoolId) { setErrMsg('School ID not found.'); setLoading(false); return }

    const [sRes, bRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, auto_id, name, dob, blood_group, grade, section, roll_number, branch_id, guardian_id, sibling_order, discount_pct, emergency_phone, active, photo_url, branches(name), guardians(name, gr_number, phone)')
        .eq('school_id', schoolId)
        .order('grade')
        .order('name'),
      supabase
        .from('branches')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name'),
    ])

    if (sRes.error) setErrMsg(sRes.error.message)
    setStudents((sRes.data as any) || [])
    setBranches(bRes.data || [])
    setLoading(false)
  }

  function openEdit(s: Student) {
    setEditStudent(s)
    setEditForm({
      name: s.name || '',
      grade: s.grade || '',
      section: s.section || 'A',
      branch_id: s.branch_id || '',
    })
    setMsg('')
  }

  async function saveEdit() {
    if (!editStudent) return
    setSaving(true)
    const { error } = await supabase
      .from('students')
      .update({
        name: editForm.name,
        grade: editForm.grade,
        section: editForm.section,
        branch_id: editForm.branch_id || null,
      })
      .eq('id', editStudent.id)
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setEditStudent(null)
    fetchData()
  }

  async function toggleActive(s: Student) {
    await supabase
      .from('students')
      .update({ active: !(s.active ?? true) })
      .eq('id', s.id)
    fetchData()
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.auto_id || '').toLowerCase().includes(q) ||
      (s.guardians?.name || '').toLowerCase().includes(q) ||
      (s.guardians?.gr_number || '').toLowerCase().includes(q)
    const matchBranch = branchFilter === 'all' || s.branch_id === branchFilter
    const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter
    return matchSearch && matchBranch && matchGrade
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filtered.length)
  const paginated = filtered.slice(startIndex, endIndex)

  return (
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner/students"
      onSearchChange={(v) => setSearch(v)}
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>🎓 Students Management</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Manage school system students database, profiles and active states.</p>
        </div>
      </div>

      {errMsg && (
        <div style={{ padding: 12, background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', borderRadius: 10, marginBottom: 16 }}>
          {errMsg}
        </div>
      )}

      {/* Stats KPI */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card violet" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '18px 20px',
          borderTop: `3px solid var(--accent-purple)`,
          minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>Total Students</div>
            <GraduationCap size={18} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{students.length}</div>
        </div>
        <div className="kpi-card emerald" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '18px 20px',
          borderTop: `3px solid var(--accent-emerald)`,
          minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>Active Students</div>
            <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{students.filter(s => s.active).length}</div>
        </div>
        <div className="kpi-card cyan" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '18px 20px',
          borderTop: `3px solid var(--accent-cyan)`,
          minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>Filtered List</div>
            <Search size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{filtered.length}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            placeholder="🔍 Search name, GR number, guardian name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div>
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          >
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          >
            <option value="all">All Grades</option>
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading student records...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No students match database filters.</div>
        ) : (
          <>
            <div className="table-container style-scrollbar" style={{ maxHeight: '450px', overflowY: 'auto', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Student Info</th>
                    <th>ID / Roll</th>
                    <th>Grade & Sec</th>
                    <th>Guardian</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {s.auto_id || '—'} {s.roll_number !== null ? `(Roll: ${s.roll_number})` : ''}
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          Grade {s.grade || '—'} - {s.section || 'A'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s.guardians?.name || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GR: {s.guardians?.gr_number || '—'}</div>
                      </td>
                      <td>{s.branches?.name || '—'}</td>
                      <td>
                        <span className={`status-badge ${(s.active ?? true) ? 'active' : 'inactive'}`}>
                          {(s.active ?? true) ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setViewStudent(s)} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>View</button>
                          <button onClick={() => openEdit(s)} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>Edit</button>
                          <button onClick={() => toggleActive(s)} className="row-btn" style={{
                            background: (s.active ?? true) ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                            color: (s.active ?? true) ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                            border: 'none'
                          }}>
                            {(s.active ?? true) ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-muted)', paddingLeft: 16, paddingRight: 16, paddingBottom: 16 }}>
              <span>Showing {filtered.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filtered.length} Students</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  className="row-btn"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, background: 'transparent', border: '1px solid var(--border-subtle)' }}
                >
                  Prev
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="row-btn"
                  style={{ opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1, background: 'transparent', border: '1px solid var(--border-subtle)' }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Student Modal (Premium ID Card style) */}
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
                      {viewStudent.name ? viewStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
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
            <h3 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>Edit Student Info</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Grade</label>
                <select
                  value={editForm.grade}
                  onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}
                >
                  {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Section</label>
                <input
                  value={editForm.section}
                  onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Branch</label>
              <select
                value={editForm.branch_id}
                onChange={e => setEditForm({ ...editForm, branch_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}
              >
                <option value="">No Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {msg && <div style={{ color: 'var(--accent-rose)', fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditStudent(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
