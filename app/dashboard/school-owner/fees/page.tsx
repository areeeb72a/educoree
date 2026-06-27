'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

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

  const feeBg: Record<string, string> = { paid: '#dcfce7', unpaid: '#fee2e2', partial: '#fef3c7' }
  const feeColor: Record<string, string> = { paid: '#16a34a', unpaid: '#dc2626', partial: '#d97706' }

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
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)', color: '#fff', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Link href="/dashboard/school-owner" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
              <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700 }}>💰 Fee Overview</h1>
              <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: 14 }}>Monthly fee collection across all branches</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                {MONTHS.map((m, i) => <option key={m} value={i} style={{ color: '#1e293b' }}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                {[2023,2024,2025,2026].map(y => <option key={y} value={y} style={{ color: '#1e293b' }}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
            {[
              { label: 'Total Billed', value: `Rs. ${(totalBilled/1000).toFixed(0)}K`, icon: '📋' },
              { label: 'Collected', value: `Rs. ${(totalCollected/1000).toFixed(0)}K`, icon: '✅' },
              { label: 'Pending', value: `Rs. ${(totalPending/1000).toFixed(0)}K`, icon: '⏳' },
              { label: 'Collection Rate', value: `${collectionRate}%`, icon: '📊' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 24 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', height: 10 }}>
            <div style={{ width: `${collectionRate}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 10 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, opacity: 0.7 }}>
            <span>0%</span><span>{collectionRate}% collected</span><span>100%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex' }}>
          {(['overview','records','branches'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '16px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: activeTab === tab ? '#1e3a5f' : '#64748b', borderBottom: activeTab === tab ? '3px solid #1e3a5f' : '3px solid transparent' }}>
              {tab === 'overview' ? '📊 Overview' : tab === 'records' ? '📋 Records' : '🏫 By Branch'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Fee Status Breakdown */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, color: '#1e293b' }}>📊 Fee Status Breakdown</h3>
              {[
                { label: 'Fully Paid', count: records.filter(r => r.status === 'paid').length, color: '#10b981' },
                { label: 'Partially Paid', count: records.filter(r => r.status === 'partial').length, color: '#f59e0b' },
                { label: 'Unpaid', count: records.filter(r => r.status === 'unpaid').length, color: '#ef4444' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                    <span style={{ color: '#64748b' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.count} students</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(item.count / records.length) * 100}%`, height: '100%', background: item.color, borderRadius: 6 }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{Math.round((item.count / records.length) * 100)}%</div>
                </div>
              ))}
            </div>

            {/* Payment Methods */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, color: '#1e293b' }}>💳 Payment Methods</h3>
              {['Cash','Bank Transfer','JazzCash','EasyPaisa'].map((method, i) => {
                const count = records.filter(r => r.payment_method === method).length
                const colors = ['#3b82f6','#8b5cf6','#ef4444','#10b981']
                return (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i] }} />
                      <span style={{ fontSize: 14, color: '#64748b' }}>{method}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{count} payments</span>
                  </div>
                )
              })}
            </div>

            {/* Defaulters */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', gridColumn: '1/-1' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>⚠️ Fee Defaulters</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fef3c7' }}>
                    {['Student','Roll No.','Class','Branch','Due Amount'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#92400e' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.filter(r => r.status === 'unpaid').slice(0, 6).map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 14 }}>{r.student_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6366f1' }}>{r.roll_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{r.class_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{r.branch_name}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>Rs. {r.due_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RECORDS TAB */}
        {activeTab === 'records' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input placeholder="🔍 Search student..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#fff' }}>
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: '#fff' }}>
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Student','Roll No.','Class','Branch','Total','Paid','Due','Status','Method'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>{r.student_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#6366f1' }}>{r.roll_number}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{r.class_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{r.branch_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>Rs. {r.total_fee.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#16a34a', fontWeight: 600 }}>Rs. {r.paid_amount.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: r.due_amount > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                        {r.due_amount > 0 ? `Rs. ${r.due_amount.toLocaleString()}` : '✅'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: feeBg[r.status], color: feeColor[r.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{r.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{r.payment_method || '—'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BRANCHES TAB */}
        {activeTab === 'branches' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {branchSummaries.map(b => {
              const rate = b.billed > 0 ? Math.round((b.collected / b.billed) * 100) : 0
              return (
                <div key={b.name} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🏫 {b.name}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{b.total} students</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626' }}>{rate}%</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>collected</div>
                    </div>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 6 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Billed', value: `Rs. ${(b.billed/1000).toFixed(0)}K`, color: '#1e293b' },
                      { label: 'Collected', value: `Rs. ${(b.collected/1000).toFixed(0)}K`, color: '#16a34a' },
                      { label: 'Pending', value: `Rs. ${(b.pending/1000).toFixed(0)}K`, color: '#dc2626' },
                      { label: 'Paid/Unpaid', value: `${b.paid}/${b.unpaid}`, color: '#6366f1' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{stat.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}