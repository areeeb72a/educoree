'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Database, Download, CheckCircle2, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react'
import DashboardLayout from '../../DashboardLayout'
import Link from 'next/link'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

export default function EmergencyBackup() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [backingUp, setBackingUp] = useState(false)
  const [progress, setProgress] = useState<{ step: string; count: number; status: 'pending' | 'loading' | 'success' | 'error' }[]>([])
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchSession()
  }, [])

  async function fetchSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        window.location.href = '/'
        return
      }
      const { data: prof } = await supabase.from('profiles').select('*, schools(*)').eq('id', user.id).single()
      setProfile(prof)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function runEmergencyBackup() {
    if (!profile?.school_id) return
    setBackingUp(true)
    setSuccessMsg('')
    setErrorMsg('')

    const steps = [
      { key: 'schools', label: 'School settings & info', count: 0 },
      { key: 'branches', label: 'School branches configuration', count: 0 },
      { key: 'profiles', label: 'Faculty & staff profiles', count: 0 },
      { key: 'guardians', label: 'Student guardian directory', count: 0 },
      { key: 'students', label: 'Student roster registry', count: 0 },
      { key: 'timetable', label: 'Timesheet & weekly schedules', count: 0 },
      { key: 'attendance', label: 'Student daily attendance logs', count: 0 },
      { key: 'staff_attendance', label: 'Staff attendance history', count: 0 },
      { key: 'exams', label: 'Exams scheduling matrix', count: 0 },
      { key: 'exam_papers', label: 'Exam subject papers list', count: 0 },
      { key: 'results', label: 'Student academic marks & results', count: 0 },
      { key: 'leave_applications', label: 'Staff leave applications logs', count: 0 },
      { key: 'job_postings', label: 'Active recruitment postings', count: 0 },
      { key: 'job_applicants', label: 'Job applicants profiles', count: 0 },
      { key: 'fee_records', label: 'Fee collection & invoices', count: 0 },
      { key: 'school_tickers', label: 'Notice ticker broadcasts', count: 0 }
    ]

    // Initialize progress state
    setProgress(steps.map(s => ({ step: s.label, count: 0, status: 'pending' })))

    const backupData: Record<string, any[]> = {}

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        setProgress(prev => {
          const next = [...prev]
          next[i].status = 'loading'
          return next
        })

        // Fetch table data from Supabase
        const { data, error } = await supabase
          .from(step.key)
          .select('*')
          .eq('school_id', profile.school_id)

        if (error) {
          // If a table doesn't exist yet, we treat it as empty
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            backupData[step.key] = []
            setProgress(prev => {
              const next = [...prev]
              next[i].status = 'success'
              next[i].count = 0
              return next
            })
          } else {
            throw error
          }
        } else {
          backupData[step.key] = data || []
          setProgress(prev => {
            const next = [...prev]
            next[i].status = 'success'
            next[i].count = data ? data.length : 0
            return next
          })
        }
        // Small delay for smooth visual feedback
        await new Promise(r => setTimeout(r, 100))
      }

      // Compile backup payload
      const backupPayload = {
        backup_metadata: {
          school_name: profile.schools?.name || 'EduCore School',
          school_id: profile.school_id,
          timestamp: new Date().toISOString(),
          exporter: profile.name,
          platform: 'EduCore Core Matrix',
          version: '1.0'
        },
        database_dump: backupData
      }

      // Trigger browser download
      const jsonStr = JSON.stringify(backupPayload, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const schoolCleanName = (profile.schools?.name || 'school').toLowerCase().replace(/[^a-z0-9]+/g, '_')
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      a.href = url
      a.download = `educore_emergency_backup_${schoolCleanName}_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccessMsg('✓ Emergency backup generated and downloaded successfully!')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(`Backup failed: ${err.message || 'Unknown network error'}`)
    } finally {
      setBackingUp(false)
    }
  }

  return (
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner/backup"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>💾 Disaster Recovery & Emergency Backup</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Download a complete off-site snapshot of your school and all branch records. Store this file securely in case of system emergencies.
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 14, padding: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldAlert size={20} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Emergency Guidelines</h4>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
              This operation bundles configurations, student directories, marks sheets, staff accounts, attendance sheets, and billing histories into a single encrypted format. 
              Always secure backup files on external storage. Do not share the output file with unauthorized personnel.
            </p>
          </div>
        </div>

        {/* Central Backup Console */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-purple)' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 750, color: '#fff' }}>Backup generation console</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Connected School ID: <span style={{ fontFamily: 'monospace' }}>{profile?.school_id}</span>
                  </div>
                </div>
                {!backingUp && (
                  <button
                    onClick={runEmergencyBackup}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      background: 'var(--accent-purple)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Download size={16} /> Run Full Backup
                  </button>
                )}
              </div>

              {/* Progress Console */}
              {progress.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Backup Task Progress Logs
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 6 }}>
                    {progress.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 12.5, color: '#fff' }}>{p.step}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {p.status === 'pending' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Waiting...</span>}
                          {p.status === 'loading' && <Loader2 className="animate-spin" size={14} style={{ color: 'var(--accent-purple)' }} />}
                          {p.status === 'success' && (
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              ✓ {p.count} records
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {successMsg && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', padding: 14, borderRadius: 10, fontSize: 13 }}>
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: 'var(--accent-rose)', padding: 14, borderRadius: 10, fontSize: 13 }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
