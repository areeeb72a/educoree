'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Wallet, CheckCircle2, Hourglass, BarChart3 } from 'lucide-react'
import DashboardLayout from '../../DashboardLayout'

const supabase = createClient(
  'https://nmnfurisfmpqgzdwynvj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM'
)

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function FeesPage() {
  const [records, setRecords] = useState<any[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filterBranch, setFilterBranch] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'overview'|'records'|'branches'>('overview')

  useEffect(() => { fetchData() }, [selectedMonth, selectedYear])

  function fetchData() {
    setLoading(true)
    const branchNames = ['Main Campus', 'North Branch', 'East Campus']
    setBranches(branchNames)
    const names = ['Ali Hassan','Sara Khan','Ahmed Raza','Fatima Malik','Usman Ali','Ayesha Butt','Omar Sheikh','Zara Ahmed']
    const methods = ['Cash','Bank Transfer','JazzCash','EasyPaisa']
    const data = Array.from({ length: 40 }, (_, i) => {
      const total = 5000 + (i % 5) * 1000
      const s = i % 3 === 0 ? 'unpaid' : i % 3 === 1 ? 'partial' : 'paid'
      const paid = s === 'paid' ? total : s === 'partial' ? Math.floor(total * 0.5) : 0
      return {
        id: String(i + 1),
        student_name: names[i % 8],
        roll_number: `2024-${String(i + 1).padStart(3, '0')}`,
        class_name: `Class ${(i % 10) + 1}`,
        branch_name: branchNames[i % 3],
        total_fee: total,
        paid_amount: paid,
        due_amount: total - paid,
        status: s,
        payment_method: s !== 'unpaid' ? methods[i % 4] : null,
      }
    })
    setRecords(data)
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const matchSearch = r.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.roll_number?.includes(searchQuery)
    const matchBranch = filterBranch === 'all' || r.branch_name === filterBranch
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchBranch && matchStatus
  })

  const totalBilled = records.reduce((s, r) => s + r.total_fee, 0)
  const totalCollected = records.reduce((s, r) => s + r.paid_amount, 0)
  const totalPending = records.reduce((s, r) => s + r.due_amount, 0)
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0

  const feeBg: Record<string, string> = { paid: 'rgba(16,185,129,0.1)', unpaid: 'rgba(244,63,94,0.1)', partial: 'rgba(245,158,11,0.1)' }
  const feeColor: Record<string, string> = { paid: 'var(--accent-emerald)', unpaid: 'var(--accent-rose)', partial: 'var(--accent-amber)' }

  const branchSummaries = branches.map(name => {
    const br = records.filter(r => r.branch_name === name)
    return {
      name,
      total: br.length,
      billed: br.reduce((s, r) => s + r.total_fee, 0),
      collected: br.reduce((s, r) => s + r.paid_amount, 0),
      pending: br.reduce((s, r) => s + r.due_amount, 0),
      paid: br.filter(r => r.status === 'paid').length,
      unpaid: br.filter(r => r.status !== 'paid').length,
    }
  })

  return (
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner/fees"
      onSearchChange={(v) => setSearchQuery(v)}
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>💰 Fee Overview</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Monthly fee billing, collections and branches summary.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {MONTHS.map((m, i) => <option key={m} value={i} style={{ color: 'var(--text-primary)' }}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {[2023,2024,2025,2026].map(y => <option key={y} value={y} style={{ color: 'var(--text-primary)' }}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Billed', value: `Rs. ${(totalBilled/1000).toFixed(0)}K`, color: 'var(--accent-purple)', icon: Wallet, name: 'violet' },
          { label: 'Collected', value: `Rs. ${(totalCollected/1000).toFixed(0)}K`, color: 'var(--accent-emerald)', icon: CheckCircle2, name: 'emerald' },
          { label: 'Pending', value: `Rs. ${(totalPending/1000).toFixed(0)}K`, color: 'var(--accent-rose)', icon: Hourglass, name: 'amber' },
          { label: 'Collection Rate', value: `${collectionRate}%`, color: 'var(--accent-cyan)', icon: BarChart3, name: 'cyan' },
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

      {/* Progress Bar */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, overflow: 'hidden', height: 8, marginBottom: 24 }}>
        <div style={{ width: `${collectionRate}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-emerald), #34D399)', borderRadius: 10 }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20 }}>
        {(['overview','records','branches'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-secondary)', borderBottom: activeTab === tab ? '3px solid var(--accent-purple)' : '3px solid transparent', transition: 'all 0.2s' }}>
            {tab === 'overview' ? '📊 Overview' : tab === 'records' ? '📋 Records' : '🏫 By Branch'}
          </button>
        ))}
      </div>

      {/* Content Tabs */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading fee ledger...</p>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Breakdown */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>📊 Fee Status Breakdown</h3>
                {[
                  { label: 'Fully Paid', count: records.filter(r => r.status === 'paid').length, color: 'var(--accent-emerald)' },
                  { label: 'Partially Paid', count: records.filter(r => r.status === 'partial').length, color: 'var(--accent-amber)' },
                  { label: 'Unpaid', count: records.filter(r => r.status === 'unpaid').length, color: 'var(--accent-rose)' },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: item.color }}>{item.count} students ({Math.round((item.count / records.length) * 100)}%)</span>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${(item.count / records.length) * 100}%`, height: '100%', background: item.color, borderRadius: 6 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Methods */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>💳 Payment Methods</h3>
                {['Cash','Bank Transfer','JazzCash','EasyPaisa'].map((method, i) => {
                  const count = records.filter(r => r.payment_method === method).length
                  const colors = ['#3b82f6','#8b5cf6','#ef4444','#10b981']
                  return (
                    <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i] }} />
                        <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{method}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5 }}>{count} payments</span>
                    </div>
                  )
                })}
              </div>

              {/* Defaulters Table */}
              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', gridColumn: '1/-1' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>⚠️ Critical Defaulters (Unpaid)</h3>
                </div>
                <div className="table-wrap">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Roll No</th>
                        <th>Class</th>
                        <th>Branch</th>
                        <th>Due Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.filter(r => r.status === 'unpaid').slice(0, 6).map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.student_name}</td>
                          <td style={{ color: 'var(--accent-purple)', fontFamily: 'monospace' }}>{r.roll_number}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{r.class_name}</td>
                          <td>{r.branch_name}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>Rs. {r.due_amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <input placeholder="🔍 Search student name..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
                  <option value="all">All Branches</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Roll No</th>
                        <th>Class</th>
                        <th>Branch</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.student_name}</td>
                          <td style={{ color: 'var(--accent-purple)', fontFamily: 'monospace' }}>{r.roll_number}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{r.class_name}</td>
                          <td>{r.branch_name}</td>
                          <td style={{ fontWeight: 600 }}>Rs. {r.total_fee.toLocaleString()}</td>
                          <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Rs. {r.paid_amount.toLocaleString()}</td>
                          <td style={{ color: r.due_amount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600 }}>
                            {r.due_amount > 0 ? `Rs. ${r.due_amount.toLocaleString()}` : '✅'}
                          </td>
                          <td>
                            <span style={{ background: feeBg[r.status], color: feeColor[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.status}</span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{r.payment_method || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branches' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {branchSummaries.map(b => {
                const rate = b.billed > 0 ? Math.round((b.collected / b.billed) * 100) : 0
                const hoverColor = rate >= 80 ? 'var(--accent-emerald)' : rate >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                return (
                  <div key={b.name}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 16,
                      padding: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 220,
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.borderColor = hoverColor
                      e.currentTarget.style.boxShadow = `0 8px 24px -8px ${hoverColor}33`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🏫 {b.name}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>{b.total} students billed</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: rate >= 80 ? 'var(--accent-emerald)' : rate >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{rate}%</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Collected</div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? 'var(--accent-emerald)' : rate >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)', borderRadius: 6 }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Billed', value: `Rs. ${(b.billed/1000).toFixed(0)}K`, color: 'var(--text-primary)' },
                        { label: 'Collected', value: `Rs. ${(b.collected/1000).toFixed(0)}K`, color: 'var(--accent-emerald)' },
                        { label: 'Pending', value: `Rs. ${(b.pending/1000).toFixed(0)}K`, color: 'var(--accent-rose)' },
                        { label: 'Paid/Unpaid', value: `${b.paid}/${b.unpaid}`, color: 'var(--accent-purple)' },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: stat.color, marginTop: 2 }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}