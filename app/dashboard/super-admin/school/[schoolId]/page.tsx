'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import DashboardLayout from '../../../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

const PLAN_TIERS: Record<string, { label: string; maxBranches: number; price: number }> = {
  basic: { label: 'Basic', maxBranches: 1, price: 15000 },
  pro: { label: 'Pro', maxBranches: 5, price: 20000 },
  premium: { label: 'Premium', maxBranches: 10, price: 30000 },
  unlimited: { label: 'Unlimited', maxBranches: 99, price: 50000 },
}

export default function SchoolDetailPage() {
  const params = useParams()
  const schoolId = params?.schoolId as string

  const [school, setSchool] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [stats, setStats] = useState({ students: 0, teachers: 0, branches: 0 })
  const [loading, setLoading] = useState(true)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // add branch form
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [branchCity, setBranchCity] = useState('')
  const [branchAddress, setBranchAddress] = useState('')
  const [savingBranch, setSavingBranch] = useState(false)
  const [branchMsg, setBranchMsg] = useState('')

  // reset owner password
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [newOwnerPassword, setNewOwnerPassword] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resettingPwd, setResettingPwd] = useState(false)

  // edit school info
  const [editingSchool, setEditingSchool] = useState(false)
  const [schoolForm, setSchoolForm] = useState({ name: '', city: '', plan: 'pro' })
  const [savingSchool, setSavingSchool] = useState(false)

  // edit/create owner
  const [editingOwner, setEditingOwner] = useState(false)
  const [ownerForm, setOwnerForm] = useState({ name: '', phone: '', email: '' })
  const [savingOwner, setSavingOwner] = useState(false)

  // create new owner (when none assigned)
  const [showCreateOwner, setShowCreateOwner] = useState(false)
  const [newOwnerForm, setNewOwnerForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [creatingOwner, setCreatingOwner] = useState(false)
  const [createOwnerMsg, setCreateOwnerMsg] = useState('')

  // delist school states
  const [showDelistModal, setShowDelistModal] = useState(false)
  const [generatedDelistLink, setGeneratedDelistLink] = useState('')

  function requestSchoolDelist() {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const savedData = { token, expiresAt: Date.now() + 15 * 60 * 1000 }
    localStorage.setItem('delist_token_' + schoolId, JSON.stringify(savedData))

    const confirmLink = `${window.location.origin}/dashboard/super-admin/confirm-delist?token=${token}&schoolId=${schoolId}`
    setGeneratedDelistLink(confirmLink)
    setShowDelistModal(true)
  }

  useEffect(() => { fetchData() }, [schoolId])

  async function fetchData() {
    setLoading(true)

    const { data: schoolData } = await supabase.from('schools').select('*').eq('id', schoolId).single()
    setSchool(schoolData)

    if (schoolData?.owner_id) {
      const { data: ownerData } = await supabase.from('profiles').select('name, auto_id, phone').eq('id', schoolData.owner_id).single()
      let ownerEmail = ''
      try {
        const emailRes = await fetch(`/dashboard/super-admin/get-user-email?userId=${schoolData.owner_id}`)
        const emailResult = await emailRes.json()
        ownerEmail = emailResult.email || ''
      } catch {}
      setOwner(ownerData ? { ...ownerData, email: ownerEmail } : null)
    }

    const { data: branchData } = await supabase.from('branches').select('*').eq('school_id', schoolId).order('created_at')
    setBranches(branchData || [])

    const [studentsCount, teachersCount] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('active', true),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('school_id', schoolId).eq('role', 'teacher'),
    ])

    setStats({
      students: studentsCount.count || 0,
      teachers: teachersCount.count || 0,
      branches: (branchData || []).length,
    })

    setLoading(false)
  }

  async function toggleSchoolStatus() {
    setTogglingStatus(true)
    await supabase.from('schools').update({ active: !school.active }).eq('id', schoolId)
    await fetchData()
    setTogglingStatus(false)
  }

  async function resetOwnerPassword() {
    setResetMsg('')
    if (!newOwnerPassword || newOwnerPassword.length < 6) {
      setResetMsg('Error: Password kam az kam 6 characters ka ho')
      return
    }
    setResettingPwd(true)
    try {
      const res = await fetch('/dashboard/super-admin/reset-owner-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: school.owner_id, newPassword: newOwnerPassword }),
      })
      const result = await res.json()
      if (!res.ok) {
        setResetMsg('Error: ' + result.error)
        setResettingPwd(false)
        return
      }
      setResetMsg('Password reset successful! Notify the owner to set a new password upon logging in.')
      setNewOwnerPassword('')
      setTimeout(() => { setShowResetPwd(false); setResetMsg('') }, 3000)
    } catch (err: any) {
      setResetMsg('Error: ' + err.message)
    }
    setResettingPwd(false)
  }

  function openEditSchool() {
    setSchoolForm({ name: school.name || '', city: school.city || '', plan: school.plan || 'pro' })
    setEditingSchool(true)
  }

  async function saveSchoolEdit() {
    setSavingSchool(true)
    await supabase.from('schools').update({
      name: schoolForm.name.trim(),
      city: schoolForm.city.trim(),
      plan: schoolForm.plan,
      max_branches: PLAN_TIERS[schoolForm.plan].maxBranches,
    }).eq('id', schoolId)
    setEditingSchool(false)
    await fetchData()
    setSavingSchool(false)
  }

  function openEditOwner() {
    setOwnerForm({ name: owner?.name || '', phone: owner?.phone || '', email: owner?.email || '' })
    setEditingOwner(true)
  }

  async function saveOwnerEdit() {
    if (!school.owner_id) return
    setSavingOwner(true)

    await supabase.from('profiles').update({
      name: ownerForm.name.trim(),
      phone: ownerForm.phone.trim() || null,
    }).eq('id', school.owner_id)

    if (ownerForm.email.trim() && ownerForm.email.trim() !== owner.email) {
      try {
        const res = await fetch('/dashboard/super-admin/update-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: school.owner_id, newEmail: ownerForm.email.trim() }),
        })
        const result = await res.json()
        if (!res.ok) {
          setSavingOwner(false)
          alert('Naam/phone save ho gaye, lekin email update mein masla: ' + result.error)
          await fetchData()
          return
        }
      } catch (err: any) {
        setSavingOwner(false)
        alert('Email update nahi ho saka: ' + err.message)
        await fetchData()
        return
      }
    }

    setEditingOwner(false)
    await fetchData()
    setSavingOwner(false)
  }

  async function handleCreateOwner() {
    setCreateOwnerMsg('')
     if (!newOwnerForm.name.trim() || !newOwnerForm.email.trim() || !newOwnerForm.password) {
      setCreateOwnerMsg('Error: Name, email, and password are required')
      return
    }
    if (newOwnerForm.password.length < 6) {
      setCreateOwnerMsg('Error: Password must be at least 6 characters')
      return
    }
    setCreatingOwner(true)
    try {
      const res = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOwnerForm.name.trim(),
          email: newOwnerForm.email.trim(),
          password: newOwnerForm.password,
          phone: newOwnerForm.phone.trim() || null,
          role: 'school_owner',
          school_id: schoolId,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setCreateOwnerMsg('Error: ' + result.error)
        setCreatingOwner(false)
        return
      }

      await supabase.from('schools').update({ owner_id: result.profile.id }).eq('id', schoolId)
      setCreateOwnerMsg('Owner created successfully! ID: ' + result.profile.auto_id)
      setNewOwnerForm({ name: '', email: '', password: '', phone: '' })
      await fetchData()
      setTimeout(() => { setShowCreateOwner(false); setCreateOwnerMsg('') }, 2500)
    } catch (err: any) {
      setCreateOwnerMsg('Error: ' + err.message)
    }
    setCreatingOwner(false)
  }

  async function handleAddBranch() {
    setBranchMsg('')

    if (branches.length >= school.max_branches) {
      setBranchMsg(`Error: Your "${PLAN_TIERS[school.plan]?.label || school.plan}" plan only allows up to ${school.max_branches} branch${school.max_branches !== 1 ? 'es' : ''}. Please upgrade your plan to create a new branch.`)
      return
    }

    if (!branchName.trim() || !branchCode.trim()) {
      setBranchMsg('Error: Branch name and code are required')
      return
    }
    setSavingBranch(true)

    const { error } = await supabase.from('branches').insert({
      school_id: schoolId,
      name: branchName.trim(),
      code: branchCode.toUpperCase().trim(),
      city: branchCity.trim() || null,
      address: branchAddress.trim() || null,
      active: true,
    })

    if (error) {
      setBranchMsg('Error: ' + error.message)
      setSavingBranch(false)
      return
    }

    setBranchName(''); setBranchCode(''); setBranchCity(''); setBranchAddress('')
    setBranchMsg('Branch added!')
    await fetchData()
    setTimeout(() => { setShowAddBranch(false); setBranchMsg('') }, 1200)
    setSavingBranch(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07050F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  if (!school) {
    return (
      <div style={{ minHeight: '100vh', background: '#07050F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <div>School nahi mila.</div>
        <a href="/dashboard/super-admin" style={{ color: '#7C3AED', fontSize: 13 }}>← Back to Dashboard</a>
      </div>
    )
  }

  return (
    <DashboardLayout
      role="super-admin"
      activePath="/dashboard/super-admin"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <a href="/dashboard/super-admin" style={{ color: "var(--accent-purple)", fontSize: 13, textDecoration: "none", fontWeight: "600" }}>← Back to Dashboard</a>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>{school.name}</h2>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Code: {school.code} · {school.city || 'No city'}</div>
        </div>
        <span style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: school.active ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
          color: school.active ? '#34D399' : '#F87171',
        }}>
          {school.active ? '● Active' : '● Suspended'}
        </span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Branches', value: stats.branches, color: '#7C3AED', icon: '🏢' },
            { label: 'Teachers', value: stats.teachers, color: '#059669', icon: '👨‍🏫' },
            { label: 'Students', value: stats.students, color: '#D97706', icon: '🎓' },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 18, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{k.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* School + Owner info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 20, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>School Information</div>
              <button
                onClick={() => editingSchool ? setEditingSchool(false) : openEditSchool()}
                style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(67,97,238,0.15)', color: '#818CF8', border: 'none', cursor: 'pointer' }}
              >
                {editingSchool ? '✕ Cancel' : '✏️ Edit'}
              </button>
            </div>

            {editingSchool ? (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
                <input value={schoolForm.name} onChange={e => setSchoolForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />

                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>City</label>
                <input value={schoolForm.city} onChange={e => setSchoolForm(p => ({ ...p, city: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />

                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Plan</label>
                <select value={schoolForm.plan} onChange={e => setSchoolForm(p => ({ ...p, plan: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 8 }}>
                  {Object.entries(PLAN_TIERS).map(([key, tier]) => (
                    <option key={key} value={key}>{tier.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#818CF8', marginBottom: 14, padding: '6px 10px', background: 'rgba(67,97,238,0.08)', borderRadius: 8 }}>
                  → {PLAN_TIERS[schoolForm.plan].maxBranches} branch{PLAN_TIERS[schoolForm.plan].maxBranches !== 1 ? 'es' : ''} max · Rs. {PLAN_TIERS[schoolForm.plan].price.toLocaleString()}/month
                </div>

                <button
                  onClick={saveSchoolEdit}
                  disabled={savingSchool}
                  style={{ width: '100%', padding: 10, background: '#4361EE', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: savingSchool ? 0.6 : 1 }}
                >
                  {savingSchool ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <>
                {[
                  { label: 'Name', value: school.name },
                  { label: 'Code', value: school.code },
                  { label: 'City', value: school.city },
                  { label: 'Plan', value: PLAN_TIERS[school.plan]?.label?.toUpperCase() || school.plan?.toUpperCase() },
                  { label: 'Price', value: PLAN_TIERS[school.plan] ? `Rs. ${PLAN_TIERS[school.plan].price.toLocaleString()}/mo` : '-' },
                  { label: 'Max Branches', value: school.max_branches },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{f.value || '-'}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 20, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>School Owner</div>
              {owner && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => editingOwner ? setEditingOwner(false) : openEditOwner()}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(67,97,238,0.15)', color: '#818CF8', border: 'none', cursor: 'pointer' }}
                  >
                    {editingOwner ? '✕' : '✏️ Edit'}
                  </button>
                  <button
                    onClick={() => { setShowResetPwd(!showResetPwd); setResetMsg(''); setNewOwnerPassword('') }}
                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(67,97,238,0.15)', color: '#818CF8', border: 'none', cursor: 'pointer' }}
                  >
                    {showResetPwd ? '✕' : '🔑 Reset Password'}
                  </button>
                </div>
              )}
            </div>

            {owner ? (
              editingOwner ? (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
                  <input value={ownerForm.name} onChange={e => setOwnerForm(p => ({ ...p, name: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />

                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email (login)</label>
                  <input type="email" value={ownerForm.email} onChange={e => setOwnerForm(p => ({ ...p, email: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />

                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Phone</label>
                  <input value={ownerForm.phone} onChange={e => setOwnerForm(p => ({ ...p, phone: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' }} />

                  <button
                    onClick={saveOwnerEdit}
                    disabled={savingOwner}
                    style={{ width: '100%', padding: 10, background: '#4361EE', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: savingOwner ? 0.6 : 1 }}
                  >
                    {savingOwner ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Name</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{owner.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{owner.email || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Login ID</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{owner.auto_id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: showResetPwd ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phone</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{owner.phone || '-'}</span>
                  </div>

                  {showResetPwd && (
                    <div style={{ marginTop: 12, paddingTop: 12 }}>
                      <input
                        type="text"
                        placeholder="Naya password (min 6 characters)"
                        value={newOwnerPassword}
                        onChange={e => setNewOwnerPassword(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }}
                      />
                      {resetMsg && (
                        <div style={{ fontSize: 12, color: resetMsg.includes('Error') ? '#F87171' : '#34D399', marginBottom: 10 }}>{resetMsg}</div>
                      )}
                      <button
                        onClick={resetOwnerPassword}
                        disabled={resettingPwd}
                        style={{ width: '100%', padding: 10, background: '#4361EE', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: resettingPwd ? 0.6 : 1 }}
                      >
                        {resettingPwd ? 'Resetting...' : 'Set New Password'}
                      </button>
                    </div>
                  )}
                </>
              )
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Assign an owner to manage this school's administrative functions.
                </div>
                {!showCreateOwner ? (
                  <button
                    onClick={() => setShowCreateOwner(true)}
                    style={{ width: '100%', padding: 10, background: '#7C3AED', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ➕ Create Owner
                  </button>
                ) : (
                  <div>
                    <input placeholder="Full Name *" value={newOwnerForm.name} onChange={e => setNewOwnerForm(p => ({ ...p, name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                    <input placeholder="Email *" type="email" value={newOwnerForm.email} onChange={e => setNewOwnerForm(p => ({ ...p, email: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                    <input placeholder="Password (min 6 chars) *" type="text" value={newOwnerForm.password} onChange={e => setNewOwnerForm(p => ({ ...p, password: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                    <input placeholder="Phone" value={newOwnerForm.phone} onChange={e => setNewOwnerForm(p => ({ ...p, phone: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />
                    {createOwnerMsg && (
                      <div style={{ fontSize: 12, color: createOwnerMsg.includes('Error') ? '#F87171' : '#34D399', marginBottom: 10 }}>{createOwnerMsg}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setShowCreateOwner(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                      <button
                        onClick={handleCreateOwner}
                        disabled={creatingOwner}
                        style={{ flex: 2, padding: 10, background: '#7C3AED', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: creatingOwner ? 0.6 : 1 }}
                      >
                        {creatingOwner ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Suspend/Activate action */}
        <div style={{
          background: school.active ? 'rgba(220,38,38,0.06)' : 'rgba(5,150,105,0.06)',
          border: `1px solid ${school.active ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}`,
          borderRadius: 16, padding: 18, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
              {school.active ? 'Suspend this school' : 'Reactivate this school'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {school.active ? 'Sab logins is school ke disable ho jayenge.' : 'School dobara active ho jayega, sab logins kaam karenge.'}
            </div>
          </div>
          <button
            onClick={toggleSchoolStatus}
            disabled={togglingStatus}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: school.active ? '#DC2626' : '#059669', color: '#fff', opacity: togglingStatus ? 0.6 : 1,
            }}
          >
            {togglingStatus ? 'Processing...' : school.active ? 'Suspend School' : 'Reactivate School'}
          </button>
        </div>

        {/* Danger Zone: Delist School */}
        <div style={{
          background: 'rgba(220,38,38,0.03)',
          border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: 16, padding: 18, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F87171', marginBottom: 2 }}>
              🔴 Danger Zone: De-list School
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              School aur uske saare branches/records ko permanently system se remove karne ke liye verification request send karen.
            </div>
          </div>
          <button
            onClick={requestSchoolDelist}
            style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid #DC2626', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: 'transparent', color: '#DC2626',
            }}
          >
            🗑️ De-list School
          </button>
        </div>

        {/* Branches */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Branches ({branches.length} / {school.max_branches})</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {PLAN_TIERS[school.plan]?.label || school.plan} plan
            </div>
          </div>
          <button
            onClick={() => {
              if (branches.length >= school.max_branches) {
                setBranchMsg(`Error: Your "${PLAN_TIERS[school.plan]?.label || school.plan}" plan only allows up to ${school.max_branches} branch${school.max_branches !== 1 ? 'es' : ''}. Please upgrade your plan to create a new branch.`)
                setShowAddBranch(true)
                return
              }
              setShowAddBranch(!showAddBranch)
            }}
            style={{ padding: '8px 16px', background: branches.length >= school.max_branches ? 'rgba(255,255,255,0.05)' : 'var(--accent-purple)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {showAddBranch ? '✕ Cancel' : '➕ Add Branch'}
          </button>
        </div>

        {branches.length >= school.max_branches && !showAddBranch && (
          <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: '#FBBF24' }}>
            ⚠️ Branch limit reach ho gayi hai is plan mein. Naya branch banane ke liye plan upgrade karen.
          </div>
        )}

        {showAddBranch && (
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 20, border: '1px solid var(--border-subtle)', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input placeholder="Branch Name *" value={branchName} onChange={e => setBranchName(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
              <input placeholder="Branch Code * (e.g. B2)" value={branchCode} onChange={e => setBranchCode(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
              <input placeholder="City" value={branchCity} onChange={e => setBranchCity(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
              <input placeholder="Address" value={branchAddress} onChange={e => setBranchAddress(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 13 }} />
            </div>
            {branchMsg && (
              <div style={{
                fontSize: 12, marginBottom: 10, padding: '10px 12px', borderRadius: 8,
                color: branchMsg.includes('Error') ? '#F87171' : '#34D399',
                background: branchMsg.includes('upgrade') ? 'rgba(217,119,6,0.1)' : 'transparent',
              }}>
                {branchMsg.includes('upgrade') && '⚠️ '}{branchMsg.replace('Error: ', '')}
              </div>
            )}
            <button
              onClick={handleAddBranch}
              disabled={savingBranch || branches.length >= school.max_branches}
              style={{ padding: '10px 20px', background: 'var(--accent-purple)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (savingBranch || branches.length >= school.max_branches) ? 0.5 : 1 }}
            >
              {savingBranch ? 'Saving...' : 'Add Branch'}
            </button>
          </div>
        )}

        {branches.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 40, textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏢</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No branches found.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {branches.map(b => (
              <div key={b.id} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 16, border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>🏢 {b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Code: {b.code} {b.city ? `· ${b.city}` : ''}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: b.active ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
                  color: b.active ? '#34D399' : '#F87171',
                }}>
                  {b.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delist Verification Link Modal (Email Simulation) */}
      {showDelistModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,11,24,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>📬</span>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800 }}>
                Verification Link Generated!
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
              We have sent a verification email to **`admin@educore.pk`** for platform security.
            </p>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Simulated Email Content:
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                Hi Admin,<br />
                A request has been made to de-list **{school.name}** ({school.code}). Please click the link below to verify and complete this action:
                <div style={{ marginTop: 10, wordBreak: 'break-all' }}>
                  <a href={generatedDelistLink} style={{ color: 'var(--accent-purple)', fontWeight: 700, textDecoration: 'underline' }}>
                    Verify & De-list School
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDelistModal(false)}
              style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
