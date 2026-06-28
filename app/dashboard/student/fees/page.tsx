"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function StudentFeesPage() {
  const [student, setStudent] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: studentData } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setStudent(studentData);

    if (!studentData) { setLoading(false); return; }

    const { data } = await supabase
      .from("fee_records")
      .select("*")
      .eq("student_id", studentData.id)
      .order("month", { ascending: false });

    setRecords(data || []);
    setLoading(false);
  }

  const pending = records.filter(r => r.status === "pending");
  const paid = records.filter(r => r.status === "paid");
  const totalDue = pending.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);
  const totalPaid = paid.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);

  return (
    <DashboardLayout
      role="student"
      activePath="/dashboard/student/fees"
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>💰 Fee Ledger Status</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Loading billing data...</div>
      ) : !student ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Student profile not found.</div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18,
              borderTop: `3px solid ${totalDue > 0 ? "var(--accent-rose)" : "var(--accent-emerald)"}`
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Pending Dues</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: totalDue > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginTop: 6 }}>Rs {totalDue.toLocaleString()}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, borderTop: '3px solid var(--accent-emerald)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid Fees</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 6 }}>Rs {totalPaid.toLocaleString()}</div>
            </div>
          </div>

          {/* Pending Dues card */}
          {pending.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '14px 20px', background: 'rgba(244,63,94,0.06)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--accent-rose)' }}>⏳ Pending Dues ({pending.length})</span>
              </div>
              <div className="table-wrap">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {pending.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700 }}>{r.month}</td>
                        <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.fee_type}</td>
                        <td style={{ fontWeight: 800, color: 'var(--accent-rose)', textAlign: 'right' }}>Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment History card */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 850, fontSize: 14, color: 'var(--text-primary)' }}>Payment History ledger</span>
            </div>
            {paid.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No payment logs recorded.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Fee Type</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Receipt #</th>
                      <th>Paid On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paid.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 750 }}>{r.month}</td>
                        <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.fee_type}</td>
                        <td style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                        <td>{r.payment_mode || "—"}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{r.receipt_no || "—"}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {r.paid_at ? new Date(r.paid_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
