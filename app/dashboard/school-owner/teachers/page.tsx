'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Search } from 'lucide-react'
import DashboardLayout from '../../DashboardLayout'

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
  role?: string | null
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

  // reset password state
  const [selectedResetUser, setSelectedResetUser] = useState<Teacher | null>(null)
  const [newResetPassword, setNewResetPassword] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetError, setResetError] = useState('')
  const [resettingUser, setResettingUser] = useState(false)

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

  useEffect(() => { fetchData() }, [])

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

    const [tRes, bRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, role, auto_id, phone, branch_id, active, branches(name)')
        .eq('school_id', schoolId)
        .in('role', ['teacher', 'admin', 'accounts', 'principal'])
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
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner/teachers"
      onSearchChange={(v) => setSearch(v)}
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>👥 Staff & Teachers Management</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>View, assign branches and manage profiles for all school staff (Admin, Accounts, Principal, Teachers).</p>
        </div>
      </div>

      {errMsg && (
        <div style={{ padding: 12, background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', borderRadius: 10, marginBottom: 16 }}>
          {errMsg}
        </div>
      )}

      {/* Stats row */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card violet" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '18px 20px',
          borderTop: `3px solid var(--accent-purple)`,
          minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>Total Teachers</div>
            <Users size={18} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{teachers.length}</div>
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
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>Filtered Count</div>
            <Search size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{filtered.length}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            placeholder="🔍 Search by name, ID, phone..."
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
      </div>

      {/* Data Table */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading teachers list...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No teachers found match requirements.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Staff Info</th>
                  <th>Staff ID</th>
                  <th>Phone</th>
                  <th>Assigned Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                      <div style={{ textTransform: 'capitalize', fontSize: 11, color: 'var(--text-muted)' }}>{t.role}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{t.auto_id || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.phone || '—'}</td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {t.branches?.name || 'No Branch'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${(t.active ?? true) ? 'active' : 'inactive'}`}>
                        {(t.active ?? true) ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewTeacher(t)} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>View</button>
                        <button onClick={() => openEdit(t)} className="row-btn" style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}>Edit</button>
                        <button
                          onClick={() => {
                            setSelectedResetUser(t)
                            setNewResetPassword('')
                            setResetError('')
                            setResetSuccess('')
                          }}
                          className="row-btn"
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)' }}
                        >
                          🔑 Reset
                        </button>
                        <button onClick={() => toggleActive(t)} className="row-btn" style={{
                          background: (t.active ?? true) ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                          color: (t.active ?? true) ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                          border: 'none'
                        }}>
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

      {/* View Details Modal */}
      {viewTeacher && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>Teacher Details</h3>
            {[
              ['Full Name', viewTeacher.name || '—'],
              ['Staff ID', viewTeacher.auto_id || '—'],
              ['Phone', viewTeacher.phone || '—'],
              ['Branch Assigned', viewTeacher.branches?.name || '—'],
              ['Status', (viewTeacher.active ?? true) ? 'Active' : 'Inactive'],
            ].map(([k, v]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>{k}</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
              </div>
            ))}
            <button
              onClick={() => setViewTeacher(null)}
              style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >Close Details</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTeacher && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>Edit Teacher Profile</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Phone</label>
              <input
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}
              />
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
              <button onClick={() => setEditTeacher(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
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
    </DashboardLayout>
  )
}
