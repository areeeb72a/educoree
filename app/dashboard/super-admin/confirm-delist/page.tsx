'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import DashboardLayout from '../../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

function ConfirmDelistContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const schoolId = searchParams?.get('schoolId') || ''
  const token = searchParams?.get('token') || ''

  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmInput, setConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (schoolId) {
      verifyTokenAndFetchSchool()
    } else {
      setErrorMsg('Invalid URL parameters.')
      setLoading(false)
    }
  }, [schoolId, token])

  async function verifyTokenAndFetchSchool() {
    setLoading(true)
    setErrorMsg('')

    // 1. Verify token in localStorage
    const savedDataStr = localStorage.getItem('delist_token_' + schoolId)
    if (!savedDataStr) {
      setErrorMsg('Verification link has expired or is invalid. Please request a new one.')
      setLoading(false)
      return
    }

    try {
      const savedData = JSON.parse(savedDataStr)
      if (savedData.token !== token) {
        setErrorMsg('Invalid delisting token.')
        setLoading(false)
        return
      }
      if (Date.now() > savedData.expiresAt) {
        setErrorMsg('Delisting token has expired (limit 15 minutes). Please request a new link.')
        localStorage.removeItem('delist_token_' + schoolId)
        setLoading(false)
        return
      }

      // Token is valid! Now fetch school details.
      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single()

      if (error || !schoolData) {
        setErrorMsg('School not found or already deleted.')
      } else {
        setSchool(schoolData)
        setIsValid(true)
      }
    } catch (err: any) {
      setErrorMsg('Failed to process request: ' + err.message)
    }

    setLoading(false)
  }

  async function handlePermanentDelete() {
    if (!isValid || !school) return
    if (confirmInput.trim().toUpperCase() !== school.code.toUpperCase()) {
      alert('Verification code does not match!')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/super-admin/delete-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      })
      const result = await res.json()
      if (!res.ok) {
        alert('Deletion failed: ' + result.error)
        setDeleting(false)
        return
      }

      // Cleanup token
      localStorage.removeItem('delist_token_' + schoolId)
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/super-admin')
      }, 2000)
    } catch (err: any) {
      alert('Deletion failed: ' + err.message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        Verifying security token...
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F87171', marginBottom: 8 }}>Verification Error</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{errorMsg}</p>
        <button onClick={() => router.push('/dashboard/super-admin')} style={{ padding: '8px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', padding: 32, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#34D399', marginBottom: 8 }}>School Successfully De-listed</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {school?.name} and all its data have been permanently removed. Redirecting to platform overview...
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 20 }}>
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 30 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F87171', marginBottom: 8 }}>
          Permanent De-listing Request
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
          You are about to permanently delete <strong>{school?.name}</strong>. All associated branches, staff, students, fee records, and user login credentials will be destroyed forever. This action <strong>cannot</strong> be undone.
        </p>

        <div style={{ padding: 14, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Confirm delisting by typing the School Code: <strong style={{ color: '#F87171' }}>{school?.code}</strong>
          </div>
          <input
            type="text"
            placeholder="Type school code here..."
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push(`/dashboard/super-admin/school/${schoolId}`)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handlePermanentDelete}
            disabled={confirmInput.trim().toUpperCase() !== school?.code.toUpperCase() || deleting}
            style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: (confirmInput.trim().toUpperCase() !== school?.code.toUpperCase() || deleting) ? 0.5 : 1 }}
          >
            {deleting ? '⏳ Deleting...' : '🗑️ Confirm Permanent Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmDelistPage() {
  return (
    <DashboardLayout role="super-admin" activePath="/dashboard/super-admin">
      <Suspense fallback={
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading page details...
        </div>
      }>
        <ConfirmDelistContent />
      </Suspense>
    </DashboardLayout>
  )
}
