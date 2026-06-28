"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Hourglass, BarChart3, GraduationCap, Wallet, FileText, ChevronRight, Save } from "lucide-react";
import DashboardLayout from "../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const months = (() => {
  const arr = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(d.toISOString().slice(0, 7));
  }
  return arr;
})();

export default function AccountsDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // shared data
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { window.location.href = "/"; return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*, schools(*)")
      .eq("id", user.id)
      .single();
    setProfile(prof);

    const schoolId = prof?.school_id;

    const [{ data: fr }, { data: st }, { data: fs }, { data: br }] = await Promise.all([
      supabase.from("fee_records").select("*").eq("school_id", schoolId),
      supabase.from("students").select("id, name, grade, section, branch_id, auto_id").eq("school_id", schoolId),
      supabase.from("fee_structures").select("*").eq("school_id", schoolId).order("grade"),
      supabase.from("branches").select("id, name").eq("school_id", schoolId),
    ]);

    setFeeRecords(fr || []);
    setStudents(st || []);
    setFeeStructures(fs || []);
    setBranches(br || []);
    setLoading(false);
  }

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));

  const thisMonthRecords = feeRecords.filter(r => r.month === currentMonth);
  const collected = thisMonthRecords.filter(r => r.status === "paid").reduce((sum, r) => sum + (r.net_amount || 0), 0);
  const pendingRecords = feeRecords.filter(r => r.status === "pending");
  const pendingThisMonth = thisMonthRecords.filter(r => r.status === "pending");
  const pendingAmount = pendingThisMonth.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);
  const paidCount = thisMonthRecords.filter(r => r.status === "paid").length;
  const collectionPct = thisMonthRecords.length ? Math.round((paidCount / thisMonthRecords.length) * 100) : 0;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "structures", label: "Fee Structures" },
    { key: "dues", label: "Pending Dues" },
    { key: "record", label: "Record Payment" },
    { key: "salary", label: "Staff Salary" },
  ];

  return (
    <DashboardLayout
      role="accounts"
      activePath={activeTab === 'overview' ? '/dashboard/accounts' : `/dashboard/accounts/${activeTab}`}
      onRefresh={fetchAll}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>💰 Accounts & Finance</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Manage invoices, fee structures, tuition collections, and salary disbursements.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 20, overflowX: 'auto', gap: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === t.key ? 700 : 500, fontSize: 13,
              color: activeTab === t.key ? 'var(--accent-purple)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '3px solid var(--accent-purple)' : '3px solid transparent',
              transition: 'all 0.2s', textTransform: 'capitalize', whiteSpace: 'nowrap'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading financial ledger...</div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Month Picker */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 750, color: 'var(--text-primary)' }}>Monthly Performance: {currentMonth}</span>
                <select value={currentMonth} onChange={e => setCurrentMonth(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Stats Cards */}
              <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[
                  { label: "Collection Ratio", value: `${collectionPct}%`, color: 'var(--accent-purple)' },
                  { label: "Fee Collected", value: `Rs. ${collected.toLocaleString()}`, color: 'var(--accent-emerald)' },
                  { label: "Pending This Month", value: `Rs. ${pendingAmount.toLocaleString()}`, color: 'var(--accent-rose)' },
                  { label: "Total Students", value: students.length, color: 'var(--accent-cyan)' },
                ].map((s, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Transactions list */}
              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Recent Collections Ledger</span>
                </div>
                {thisMonthRecords.length === 0 ? (
                  <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No collections logged this month.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>ID</th>
                          <th>Invoice Month</th>
                          <th>Amount</th>
                          <th>Branch</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thisMonthRecords.slice(0, 10).map(r => {
                          const stu = studentMap[r.student_id];
                          return (
                            <tr key={r.id}>
                              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stu?.name || "—"}</td>
                              <td style={{ fontFamily: 'monospace' }}>{stu?.auto_id || "—"}</td>
                              <td>{r.month}</td>
                              <td style={{ fontWeight: 800, color: r.status === 'paid' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>Rs. {r.net_amount.toLocaleString()}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{branchMap[r.branch_id] || "—"}</td>
                              <td>
                                <span className={`status-badge ${r.status === "paid" ? "active" : "inactive"}`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "structures" && (
            <StructuresTab feeStructures={feeStructures} branchMap={branchMap} profile={profile} refresh={fetchAll} />
          )}

          {activeTab === "dues" && (
            <DuesTab pendingRecords={pendingRecords} studentMap={studentMap} branchMap={branchMap} refresh={fetchAll} />
          )}

          {activeTab === "record" && (
            <RecordPaymentTab students={students} branchMap={branchMap} refresh={fetchAll} />
          )}

          {activeTab === "salary" && (
            <SalaryTab profile={profile} />
          )}
        </>
      )}
    </DashboardLayout>
  );
}

// Subcomponents definitions styled to look premium

function StructuresTab({ feeStructures, branchMap, profile, refresh }: any) {
  const [grade, setGrade] = useState("1");
  const [branchId, setBranchId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!branchId || !amount.trim()) return;
    setSubmitting(true);
    await supabase.from("fee_structures").insert({
      school_id: profile.school_id,
      branch_id: branchId,
      grade,
      admission_fee: 0,
      tuition_fee: parseFloat(amount),
    });
    setAmount("");
    await refresh();
    setSubmitting(false);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14.5, color: 'var(--text-primary)', fontWeight: 700 }}>Add Tuition Structure</h3>
        
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Branch Location</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="">Select Branch</option>
            {Object.entries(branchMap).map(([id, name]: any) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Grade Level</label>
          <select value={grade} onChange={e => setGrade(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}>
            {["1","2","3","4","5","6","7","8","9","10"].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Monthly Tuition Fee (Rs.)</label>
          <input type="number" placeholder="Enter amount..." value={amount} onChange={e => setAmount(e.target.value)}
            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
        </div>

        <button onClick={handleAdd} disabled={submitting}
          style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
          Create Structure
        </button>
      </div>

      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Tuition Fees Matrix</span>
        </div>
        {feeStructures.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No configurations created.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Branch Location</th>
                  <th>Tuition Fee (Monthly)</th>
                </tr>
              </thead>
              <tbody>
                {feeStructures.map((f: any) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 700 }}>Grade {f.grade}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{branchMap[f.branch_id] || "—"}</td>
                    <td style={{ fontWeight: 750, color: 'var(--accent-purple)' }}>Rs. {f.tuition_fee?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DuesTab({ pendingRecords, studentMap, branchMap, refresh }: any) {
  return (
    <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Outstanding Invoices</span>
      </div>
      {pendingRecords.length === 0 ? (
        <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No outstanding invoices found.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Enrollment ID</th>
                <th>Bill Month</th>
                <th>Outstanding Fee</th>
                <th>Branch Location</th>
              </tr>
            </thead>
            <tbody>
              {pendingRecords.map((r: any) => {
                const stu = studentMap[r.student_id];
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stu?.name || "—"}</td>
                    <td style={{ fontFamily: 'monospace' }}>{stu?.auto_id || "—"}</td>
                    <td>{r.month}</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-rose)' }}>Rs. {r.net_amount.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{branchMap[r.branch_id] || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecordPaymentTab({ students, branchMap, refresh }: any) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [mode, setMode] = useState("Cash");
  const [receipt, setReceipt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (selectedStudentId) fetchBills();
    else setPendingBills([]);
  }, [selectedStudentId]);

  async function fetchBills() {
    const { data } = await supabase
      .from("fee_records")
      .select("*")
      .eq("student_id", selectedStudentId)
      .eq("status", "pending");
    setPendingBills(data || []);
  }

  async function handleRecord() {
    if (!selectedBillId) return;
    setSubmitting(true);
    await supabase.from("fee_records").update({
      status: "paid",
      payment_mode: mode,
      receipt_no: receipt.trim() || null,
      paid_at: new Date().toISOString()
    }).eq("id", selectedBillId);

    setReceipt("");
    setSelectedBillId("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    await fetchBills();
    await refresh();
    setSubmitting(false);
  }

  return (
    <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24, maxWidth: 500, margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>Record Payment Receipt</h3>
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Select Student</label>
        <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="">Select student name...</option>
          {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.auto_id})</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Select Pending Invoice</label>
        <select value={selectedBillId} onChange={e => setSelectedBillId(e.target.value)} disabled={pendingBills.length === 0}
          style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="">{pendingBills.length === 0 ? "No pending invoices" : "Select month..."}</option>
          {pendingBills.map(b => <option key={b.id} value={b.id}>{b.month} — Rs. {b.net_amount.toLocaleString()}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Payment Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="JazzCash">JazzCash</option>
          <option value="Easypaisa">Easypaisa</option>
          <option value="Cheque">Cheque</option>
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Receipt / Transaction ID</label>
        <input type="text" placeholder="TXN-1029..." value={receipt} onChange={e => setReceipt(e.target.value)}
          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
      </div>

      {success && (
        <div style={{ padding: 10, background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
          ✓ Payment recorded successfully!
        </div>
      )}

      <button onClick={handleRecord} disabled={submitting || !selectedBillId}
        style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (submitting || !selectedBillId) ? 0.6 : 1 }}>
        Submit Payment
      </button>
    </div>
  );
}

function SalaryTab({ profile }: any) {
  const [records, setRecords] = useState<any[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, any>>({});
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentModes, setPaymentModes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "paid" | "all">("pending");

  useEffect(() => { fetchRecords(); }, [month]);

  async function fetchRecords() {
    setLoading(true);
    const { data: payroll } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("school_id", profile.school_id)
      .eq("month", month);

    const staffIds = Array.from(new Set((payroll || []).map((r: any) => r.staff_id)));
    let sMap: Record<string, any> = {};
    if (staffIds.length > 0) {
      const { data: staff } = await supabase
        .from("profiles")
        .select("id, name, role, auto_id")
        .in("id", staffIds);
      (staff || []).forEach((s: any) => { sMap[s.id] = s; });
    }

    setStaffMap(sMap);
    setRecords(payroll || []);
    setLoading(false);
  }

  async function markAsPaid(recordId: string) {
    setPayingId(recordId);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    await supabase
      .from("payroll_records")
      .update({
        status: "paid",
        paid_by: user?.id,
        paid_at: new Date().toISOString(),
        payment_mode: paymentModes[recordId] || "Bank Transfer",
      })
      .eq("id", recordId);

    await fetchRecords();
    setPayingId(null);
  }

  const filtered = records.filter(r => filter === "all" || r.status === filter || (!r.status && filter === "pending"));
  const totalPending = records.filter(r => r.status !== "paid").reduce((sum, r) => sum + (r.net || 0), 0);
  const totalPaid = records.filter(r => r.status === "paid").reduce((sum, r) => sum + (r.net || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 750, color: 'var(--text-primary)' }}>Salary Disbursements for {month}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
          
          <select value={filter} onChange={e => setFilter(e.target.value as any)}
            style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, borderTop: '3px solid var(--accent-rose)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Disbursements</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-rose)', marginTop: 6 }}>Rs {totalPending.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, borderTop: '3px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Paid Salaries</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 6 }}>Rs {totalPaid.toLocaleString()}</div>
        </div>
      </div>

      {/* Salary roster card */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No payroll records found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Net Payable</th>
                  <th>Payment Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const staff = staffMap[r.staff_id];
                  const isPaid = r.status === "paid";
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{staff?.name || "—"}</td>
                      <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{staff?.role || "—"}</td>
                      <td>Rs. {r.gross.toLocaleString()}</td>
                      <td style={{ color: 'var(--accent-rose)' }}>Rs. {r.deductions.toLocaleString()}</td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Rs. {r.net.toLocaleString()}</td>
                      <td>
                        {isPaid ? (
                          <span className="status-badge active">Paid ({r.payment_mode})</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select
                              value={paymentModes[r.id] || "Bank Transfer"}
                              onChange={e => setPaymentModes(prev => ({ ...prev, [r.id]: e.target.value }))}
                              style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 12 }}
                            >
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Cash">Cash</option>
                              <option value="Cheque">Cheque</option>
                            </select>
                            <button
                              onClick={() => markAsPaid(r.id)}
                              disabled={payingId === r.id}
                              style={{ padding: '6px 12px', border: 'none', background: 'var(--accent-purple)', color: '#fff', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                            >
                              {payingId === r.id ? "Processing" : "Disburse"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
