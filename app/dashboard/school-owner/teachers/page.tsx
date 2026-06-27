'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

type Teacher = {
  id: string
  name: string
  auto_id: string | null
  phone: string | null
  branch_id: string | null
  active: boolean | null
  branches?: { name: string } | null
}

type Branch = { id: string; name: string }

export default function TeachersManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState('')
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null)
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', branch_id: '' })
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
    if (!schoolId) { setErrMsg('School ID nahi mili — apne profile ka school_id check karein.'); setLoading(false); return }

    const [tRes, bRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, auto_id, phone, branch_id, active, branches(name)')
        .eq('school_id', schoolId)
        .eq('role', 'teacher')
        .order('name'),
      supabase
        .from('branches')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name'),
    ])

    if (tRes.error) setErrMsg(tRes.error.message)
    setTeachers((tRes.data as any) || [])
    setBranches(bRes.data || [])
    setLoading(false)
  }

  function openEdit(t: Teacher) {
    setEditTeacher(t)
    setEditForm({
      name: t.name || '',
      phone: t.phone || '',
      branch_id: t.branch_id || '',
    })
    setMsg('')
  }

  async function saveEdit() {
    if (!editTeacher) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        name: editForm.name,
        phone: editForm.phone || null,
        branch_id: editForm.branch_id || null,
      })
      .eq('id', editTeacher.id)
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setEditTeacher(null)
    fetchData()
  }

  async function toggleActive(t: Teacher) {
    await supabase
      .from('profiles')
      .update({ active: !(t.active ?? true) })
      .eq('id', t.id)
    fetchData()
  }

  const filtered = teachers.filter(t => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (t.name || '').toLowerCase().includes(q) ||
      (t.auto_id || '').toLowerCase().includes(q) ||
      (t.phone || '').toLowerCase().includes(q)
    const matchBranch = branchFilter === 'all' || t.branch_id === branchFilter
    return matchSearch && matchBranch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-slate-700 to-blue-800 px-4 md:px-6 pt-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <a href="/dashboard/school-owner" className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-white mb-3 font-medium">
            <span aria-hidden="true">←</span> Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
            👨‍🏫 Teachers Management
          </h1>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-3xl font-bold text-white">{teachers.length}</div>
              <div className="text-blue-200 text-xs mt-0.5">Total Teachers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">🔍</div>
              <div className="text-3xl font-bold text-white">{filtered.length}</div>
              <div className="text-blue-200 text-xs mt-0.5">Showing</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 -mt-2">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap mb-5">
          <input
            placeholder="🔍 Search by name, ID, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[220px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          />
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
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
            <div className="p-10 text-center text-gray-400">Loading teachers...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No teachers found. Try a different search or branch filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name', 'Staff ID', 'Phone', 'Branch', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                            {(t.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{t.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.auto_id || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{t.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{t.branches?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          (t.active ?? true) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(t.active ?? true) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewTeacher(t)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                          >View</button>
                          <button
                            onClick={() => openEdit(t)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >Edit</button>
                          <button
                            onClick={() => toggleActive(t)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              (t.active ?? true) ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {(t.active ?? true) ? 'Disable' : 'Enable'}
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
      {viewTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewTeacher(null)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Teacher Details</h2>
            {[
              ['Name', viewTeacher.name || '—'],
              ['Staff ID', viewTeacher.auto_id || '—'],
              ['Phone', viewTeacher.phone || '—'],
              ['Branch', viewTeacher.branches?.name || '—'],
              ['Status', (viewTeacher.active ?? true) ? 'Active' : 'Inactive'],
            ].map(([k, v]) => (
              <div key={k} className="mb-3">
                <span className="text-xs text-gray-400 block mb-0.5">{k}</span>
                <div className="text-sm font-medium text-gray-900">{v}</div>
              </div>
            ))}
            <button
              onClick={() => setViewTeacher(null)}
              className="w-full mt-3 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >Close</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditTeacher(null)}>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Teacher</h2>

            <div className="mb-3">
              <label className="text-xs text-gray-400 block mb-1">Full Name</label>
              <input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-400 block mb-1">Phone</label>
              <input
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Branch</label>
              <select
                value={editForm.branch_id}
                onChange={e => setEditForm({ ...editForm, branch_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >{saving ? 'Saving...' : 'Save Changes'}</button>
              <button
                onClick={() => setEditTeacher(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
