'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Building2, CheckCircle2, GraduationCap, Users } from 'lucide-react'
import DashboardLayout from '../../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBranch, setEditBranch] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', phone: '',
    active: true, principal_id: ''
  })
  const [principals, setPrincipals] = useState<any[]>([])

  useEffect(() => { fetchBranches(); fetchPrincipals() }, [])

  async function fetchPrincipals() {
    const { data } = await supabase.from('profiles').select('id, name').eq('role', 'principal')
    setPrincipals(data || [])
  }

  async function fetchBranches() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { loadDemo(); return }
    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
    if (profile?.school_id) {
      const { data } = await supabase.from('branches').select('*').eq('school_id', profile.school_id).order('created_at', { ascending: false })
      setBranches(data || [])
    } else { loadDemo() }
    setLoading(false)
  }

  function loadDemo() {
    setBranches([
      { id: '1', name: 'Main Campus', code: 'FZA-B1', address: '123 Education St', city: 'Karachi', phone: '021-1234567', principal_id: 'Dr. Ahmed', active: true, student_count: 450, teacher_count: 32 },
      { id: '2', name: 'North Branch', code: 'FZA-B2', address: '45 Knowledge Ave', city: 'Lahore', phone: '042-7654321', principal_id: 'Ms. Fatima', active: true, student_count: 320, teacher_count: 24 },
      { id: '3', name: 'East Campus', code: 'FZA-B3', address: '78 Scholar Road', city: 'Islamabad', phone: '051-9988776', principal_id: 'Mr. Hassan', active: false, student_count: 180, teacher_count: 15 },
    ])
    setLoading(false)
  }

  const filtered = branches.filter(b =>
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function openAdd() {
    setEditBranch(null)
    setForm({ name: '', code: '', address: '', city: '', phone: '', active: true, principal_id: '' })
    setShowModal(true)
  }

  function openEdit(b: any) {
    setEditBranch(b)
    setForm({
      name: b.name ?? '',
      code: b.code ?? '',
      address: b.address ?? '',
      city: b.city ?? '',
      phone: b.phone ?? '',
      active: b.active ?? true,
      principal_id: b.principal_id ?? ''
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user!.id).single()
      const payload = { ...form, principal_id: form.principal_id || null }
      if (editBranch) {
        await supabase.from('branches').update(payload).eq('id', editBranch.id)
      } else {
        await supabase.from('branches').insert([{ ...payload, school_id: profile?.school_id }])
      }
      setShowModal(false)
      fetchBranches()
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function toggleStatus(b: any) {
    const newActive = !b.active
    await supabase.from('branches').update({ active: newActive }).eq('id', b.id)
    setBranches(prev => prev.map(br => br.id === b.id ? { ...br, active: newActive } : br))
  }

  return (
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner/branches"
      onSearchChange={(v) => setSearchQuery(v)}
      onRefresh={fetchBranches}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>🏫 Branch Management</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Add, edit and manage branches of your school system.</p>
        </div>
        <button onClick={openAdd} style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>+</span> Add Branch
        </button>
      </div>

      {/* Stats Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Branches', value: branches.length, icon: Building2, color: 'var(--accent-purple)', name: 'violet' },
          { label: 'Active', value: branches.filter(b => b.active).length, icon: CheckCircle2, color: 'var(--accent-emerald)', name: 'emerald' },
          { label: 'Total Students', value: branches.reduce((s, b) => s + (b.student_count || 0), 0), icon: GraduationCap, color: 'var(--accent-cyan)', name: 'cyan' },
          { label: 'Total Teachers', value: branches.reduce((s, b) => s + (b.teacher_count || 0), 0), icon: Users, color: 'var(--accent-purple)', name: 'violet' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`kpi-card ${s.name}`} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '18px 20px',
              borderTop: `3px solid ${s.color}`,
              minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>{s.label}</div>
                <Icon size={18} style={{ color: s.color, flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{s.value}</div>
            </div>
          )
        })}
      </div>
 
       {loading ? (
         <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading branches list...</p>
       ) : (
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
           {filtered.map(b => (
             <div key={b.id}
               style={{
                 background: 'var(--bg-card)',
                 border: '1px solid var(--border-subtle)',
                 borderRadius: 16,
                 padding: 24,
                 position: 'relative',
                 overflow: 'hidden',
                 display: 'flex',
                 flexDirection: 'column',
                 justifyContent: 'space-between',
                 minHeight: 180,
                 transition: 'all 0.18s ease'
               }}
               onMouseEnter={e => {
                 e.currentTarget.style.transform = 'translateY(-3px)'
                 e.currentTarget.style.borderColor = b.active ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                 e.currentTarget.style.boxShadow = b.active ? '0 8px 24px -8px rgba(16,185,129,0.2)' : '0 8px 24px -8px rgba(244,63,94,0.15)'
               }}
               onMouseLeave={e => {
                 e.currentTarget.style.transform = 'translateY(0)'
                 e.currentTarget.style.borderColor = 'var(--border-subtle)'
                 e.currentTarget.style.boxShadow = 'none'
               }}
             >
               <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: b.active ? 'var(--accent-emerald, #10b981)' : 'var(--text-muted)' }} />
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-start' }}>
                 <div>
                   <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</h3>
                   <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12.5 }}>📍 {b.city} {b.code ? `• ${b.code}` : ''}</p>
                 </div>
                 <span className={`status-badge ${b.active ? 'active' : 'inactive'}`}>
                   {b.active ? 'active' : 'inactive'}
                 </span>
               </div>
               <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                 <div>🎓 Principal: <strong style={{ color: 'var(--text-primary)' }}>{principals.find(p => p.id === b.principal_id)?.name || 'Not assigned'}</strong></div>
                 <div>📞 Phone: <span style={{ color: 'var(--text-primary)' }}>{b.phone || '—'}</span></div>
                 <div>🏠 Address: <span style={{ color: 'var(--text-primary)' }}>{b.address || '—'}</span></div>
               </div>
               <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                 <button onClick={() => openEdit(b)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>✏️ Edit</button>
                 <button onClick={() => toggleStatus(b)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: b.active ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', color: b.active ? 'var(--accent-rose)' : 'var(--accent-emerald)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                   {b.active ? '⏸ Deactivate' : '▶ Activate'}
                 </button>
               </div>
             </div>
           ))}
         </div>
       )}

      {/* Modal Dialog */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 450, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>{editBranch ? '✏️ Edit Branch' : '➕ Add Branch'}</h2>
            {[
              { label: 'Branch Name', key: 'name' },
              { label: 'Branch Code', key: 'code' },
              { label: 'City', key: 'city' },
              { label: 'Address', key: 'address' },
              { label: 'Phone', key: 'phone' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>{f.label}</label>
                <input value={(form as any)[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Principal</label>
              <select value={form.principal_id} onChange={e => setForm(p => ({ ...p, principal_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}>
                <option value="">— Not assigned —</option>
                {principals.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Status</label>
              <select value={form.active ? 'active' : 'inactive'} onChange={e => setForm(p => ({ ...p, active: e.target.value === 'active' }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, boxSizing: 'border-box', outline: 'none', color: 'var(--text-primary)' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                {saving ? '⏳ Saving...' : editBranch ? '✅ Update' : '➕ Add Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
