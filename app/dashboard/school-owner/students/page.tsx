'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

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

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single()

    const schoolId = profile?.school_id
    if (!schoolId) { setErrMsg('School ID nahi mili.'); setLoading(false); return }

    const [sRes, bRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, auto_id, name, dob, blood_group, grade, section, roll_number, branch_id, guardian_id, sibling_order, discount_pct, emergency_phone, active, branches(name), guardians(name, gr_number, phone)')
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-orange-800 to-amber-800 px-4 md:px-6 pt-6 pb-8">
        <div className="max-w-6xl mx-auto">
          <a href="/dashboard/school-owner" className="inline-flex items-center gap-1 text-sm text-orange-200 hover:text-white mb-3 font-medium">
            <span aria-hidden="true">←</span> Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
            🎓 Students Management
          </h1>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-3xl font-bold text-white">{students.length}</div>
              <div className="text-orange-200 text-xs mt-0.5">Total Students</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">🔍</div>
              <div className="text-3xl font-bold text-white">{filtered.length}</div>
              <div className="text-orange-200 text-xs mt-0.5">Showing</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">👨‍👩‍👧</div>
              <div className="text-3xl font-bold text-white">{students.filter(s => (s.discount_pct || 0) > 0).length}</div>
              <div className="text-orange-200 text-xs mt-0.5">Sibling Discount</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 -mt-2">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap mb-5">
          <input
            placeholder="🔍 Search by name, ID, guardian, GR#..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[220px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-sm"
          />
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-sm"
          >
            <option value="all">All Grades</option>
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-sm"
          >
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {errMsg && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-3.5 mb-4 text-red-600 text-sm">
            {errMsg}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading students...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No students found. Try a different search or filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name', 'Student ID', 'Class', 'Guardian (GR#)', 'Branch', 'Discount', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-700 flex-shrink-0">
                            {(s.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.auto_id || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.grade ? `${s.grade}-${s.section || ''}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.guardians ? (
                          <>
                            {s.guardians.name}
                            <div className="text-xs text-gray-400 font-mono">{s.guardians.gr_number}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.branches?.name || '—'}</td>
                      <td className="px-4 py-3">
                        {(s.discount_pct || 0) > 0 ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
                            {s.discount_pct}% 👨‍👩‍👧
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          (s.active ?? true) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(s.active ?? true) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewStudent(s)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                          >View</button>
                          <button
                            onClick={() => openEdit(s)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                          >Edit</button>
                          <button
                            onClick={() => toggleActive(s)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              (s.active ?? true) ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {(s.active ?? true) ? 'Disable' : 'Enable'}
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
      </div>

      {/* View Modal */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewStudent(null)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Student Details</h2>
            {[
              ['Name', viewStudent.name],
              ['Student ID', viewStudent.auto_id || '—'],
              ['Class', viewStudent.grade ? `Grade ${viewStudent.grade} — Section ${viewStudent.section || ''}` : '—'],
              ['Roll Number', viewStudent.roll_number?.toString() || '—'],
              ['Date of Birth', viewStudent.dob || '—'],
              ['Blood Group', viewStudent.blood_group || '—'],
              ['Guardian', viewStudent.guardians ? `${viewStudent.guardians.name} (${viewStudent.guardians.gr_number})` : '—'],
              ['Guardian Phone', viewStudent.guardians?.phone || '—'],
              ['Branch', viewStudent.branches?.name || '—'],
              ['Sibling Order', viewStudent.sibling_order?.toString() || '—'],
              ['Sibling Discount', (viewStudent.discount_pct || 0) > 0 ? `${viewStudent.discount_pct}%` : 'None'],
              ['Emergency Phone', viewStudent.emergency_phone || '—'],
              ['Status', (viewStudent.active ?? true) ? 'Active' : 'Inactive'],
            ].map(([k, v]) => (
              <div key={k} className="mb-3">
                <span className="text-xs text-gray-400 block mb-0.5">{k}</span>
                <div className="text-sm font-medium text-gray-900">{v}</div>
              </div>
            ))}
            <button
              onClick={() => setViewStudent(null)}
              className="w-full mt-3 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >Close</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditStudent(null)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Student</h2>

            <div className="mb-3">
              <label className="text-xs text-gray-400 block mb-1">Full Name</label>
              <input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Grade</label>
                <select
                  value={editForm.grade}
                  onChange={e => setEditForm({ ...editForm, grade: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Section</label>
                <input
                  value={editForm.section}
                  onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Branch</label>
              <select
                value={editForm.branch_id}
                onChange={e => setEditForm({ ...editForm, branch_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">No Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {msg && <div className="text-red-600 text-sm mb-3">{msg}</div>}

            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >{saving ? 'Saving...' : 'Save Changes'}</button>
              <button
                onClick={() => setEditStudent(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
