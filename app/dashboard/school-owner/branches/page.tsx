'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

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
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', color: '#fff', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Link href="/dashboard/school-owner" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
              <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700 }}>🏫 Branch Management</h1>
            </div>
            <button onClick={openAdd} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>+ Add Branch</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
            {[
              { label: 'Total Branches', value: branches.length, icon: '🏫' },
              { label: 'Active', value: branches.filter(b => b.active).length, icon: '✅' },
              { label: 'Total Students', value: branches.reduce((s, b) => s + (b.student_count || 0), 0), icon: '👨‍🎓' },
              { label: 'Total Teachers', value: branches.reduce((s, b) => s + (b.teacher_count || 0), 0), icon: '👩‍🏫' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px' }}>
        <input placeholder="🔍 Search branches..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', marginBottom: 20, boxSizing: 'border-box' }} />

        {loading ? <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading...</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtered.map(b => (
              <div key={b.id} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: b.active ? '#10b981' : '#e2e8f0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{b.name}</h3>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>📍 {b.city} {b.code ? `• ${b.code}` : ''}</p>
                  </div>
                  <span style={{ background: b.active ? '#dcfce7' : '#fee2e2', color: b.active ? '#16a34a' : '#dc2626', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, height: 'fit-content' }}>{b.active ? 'active' : 'inactive'}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  <div>🎓 Principal: <strong>{principals.find(p => p.id === b.principal_id)?.name || 'Not assigned'}</strong></div>
                  <div>📞 {b.phone || '—'}</div>
                  <div>🏠 {b.address || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(b)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✏️ Edit</button>
                  <button onClick={() => toggleStatus(b)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: b.active ? '#fee2e2' : '#dcfce7', color: b.active ? '#dc2626' : '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {b.active ? '⏸ Deactivate' : '▶ Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px', color: '#1e3a5f' }}>{editBranch ? '✏️ Edit Branch' : '➕ Add Branch'}</h2>
            {[
              { label: 'Branch Name', key: 'name' },
              { label: 'Branch Code', key: 'code' },
              { label: 'City', key: 'city' },
              { label: 'Address', key: 'address' },
              { label: 'Phone', key: 'phone' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>{f.label}</label>
                <input value={(form as any)[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Principal</label>
              <select value={form.principal_id} onChange={e => setForm(p => ({ ...p, principal_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}>
                <option value="">— Not assigned —</option>
                {principals.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Status</label>
              <select value={form.active ? 'active' : 'inactive'} onChange={e => setForm(p => ({ ...p, active: e.target.value === 'active' }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1e3a5f, #2d6a9f)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                {saving ? '⏳ Saving...' : editBranch ? '✅ Update' : '➕ Add Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
