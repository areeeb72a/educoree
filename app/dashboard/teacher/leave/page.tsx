"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, AlertCircle, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function TeacherLeavePage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [schoolId, setSchoolId] = useState("");
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    leave_type: "Paid",
    reason: ""
  });

  const approvedPaidDays = leavesList
    .filter(l => l.status === 'approved' && l.leave_type !== 'Unpaid')
    .reduce((sum, l) => sum + (l.days || 0), 0);

  const pendingPaidDays = leavesList
    .filter(l => l.status === 'pending' && l.leave_type !== 'Unpaid')
    .reduce((sum, l) => sum + (l.days || 0), 0);

  const unpaidDays = leavesList
    .filter(l => l.status === 'approved' && l.leave_type === 'Unpaid')
    .reduce((sum, l) => sum + (l.days || 0), 0);

  const leaveBalance = Math.max(0, 26 - approvedPaidDays);

  useEffect(() => { fetchProfileAndLeaves(); }, []);

  async function fetchProfileAndLeaves() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setTeacher(user);

    // Fetch school_id
    const { data: prof } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (prof?.school_id) {
      setSchoolId(prof.school_id);
      
      // Fetch leave records
      const { data: leaves } = await supabase
        .from("leave_applications")
        .select("*")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false });
      
      setLeavesList(leaves || []);
    }
    setLoading(false);
  }

  async function handleApplyLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      setMessage("Error: Please fill in all fields.");
      return;
    }

    if (new Date(form.start_date) > new Date(form.end_date)) {
      setMessage("Error: Start date cannot be after end date.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const fromVal = new Date(form.start_date);
      const toVal = new Date(form.end_date);
      const diffTime = Math.abs(toVal.getTime() - fromVal.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const availablePaid = leaveBalance - pendingPaidDays;
      if (form.leave_type === "Paid" && diffDays > availablePaid) {
        setMessage(`Error: You requested ${diffDays} days, but you only have ${Math.max(0, availablePaid)} paid leave days available (including pending requests). Please apply for Unpaid / Without Pay leave.`);
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("leave_applications")
        .insert({
          school_id: schoolId,
          applicant_id: teacher.id,
          from_date: form.start_date,
          to_date: form.end_date,
          days: diffDays,
          leave_type: form.leave_type,
          reason: form.reason,
          status: "pending"
        });

      if (error) throw error;

      setMessage("✅ Leave application submitted successfully!");
      setForm({ start_date: "", end_date: "", leave_type: "Paid", reason: "" });
      fetchProfileAndLeaves();
      setTimeout(() => setMessage(""), 4000);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setSaving(false);
  }

  async function handleCancelLeave(leaveId: string) {
    if (!confirm("Are you sure you want to cancel this leave application?")) return;
    try {
      const { error } = await supabase
        .from("leave_applications")
        .delete()
        .eq("id", leaveId)
        .eq("status", "pending");

      if (error) throw error;
      setLeavesList(prev => prev.filter(l => l.id !== leaveId));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  return (
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher"
      onRefresh={fetchProfileAndLeaves}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📅 Leave Applications</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Apply for leave and track your application status.</p>
        </div>
      </div>

      {!loading && (
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          <div className="kpi-card violet" style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid Leave Balance</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6 }}>{leaveBalance} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/ 26 Days</span></div>
          </div>
          <div className="kpi-card emerald" style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved Paid Leaves</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 6 }}>{approvedPaidDays} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Days Taken</span></div>
          </div>
          <div className="kpi-card amber" style={{ background: 'var(--bg-card)', padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Without Pay (Unpaid)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-amber)', marginTop: 6 }}>{unpaidDays} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Days Taken</span></div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading leave applications...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, alignItems: "start" }} className="leave-layout">
          {/* Apply Form */}
          <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Request Leave</h3>
            
            <form onSubmit={handleApplyLeave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Start Date *</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>End Date *</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Leave Type *</label>
                <select
                  value={form.leave_type}
                  onChange={e => setForm({ ...form, leave_type: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="Paid">Paid Leave (Remaining: {leaveBalance} Days)</option>
                  <option value="Unpaid">Without Pay (Unpaid) Leave</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>Reason / Description *</label>
                <textarea
                  placeholder="State the reason for leave..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box', resize: "none" }}
                />
              </div>

              {message && (
                <div style={{ padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 600, background: message.includes('Error') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', color: message.includes('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}
              >
                <Calendar size={14} /> {saving ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>

          {/* History */}
          <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Application History</h3>

            {leavesList.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={36} style={{ color: 'var(--text-muted)', marginBottom: 8, opacity: 0.5 }} />
                <p style={{ fontSize: 13 }}>No leave applications submitted yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {leavesList.map(leave => {
                  let badgeColor = "var(--text-secondary)";
                  let badgeBg = "rgba(255,255,255,0.05)";
                  let Icon = Clock;

                  if (leave.status === "approved") {
                    badgeColor = "var(--accent-emerald)";
                    badgeBg = "rgba(16,185,129,0.1)";
                    Icon = CheckCircle2;
                  } else if (leave.status === "rejected") {
                    badgeColor = "var(--accent-rose)";
                    badgeBg = "rgba(244,63,94,0.1)";
                    Icon = XCircle;
                  }

                  return (
                    <div key={leave.id} style={{ padding: 14, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{leave.reason}</span>
                          <span style={{
                            fontSize: "10px", fontWeight: 700,
                            padding: "2px 6px", borderRadius: "6px",
                            background: leave.leave_type === "Unpaid" ? "rgba(217,119,6,0.12)" : "rgba(124,58,237,0.12)",
                            color: leave.leave_type === "Unpaid" ? "var(--accent-amber)" : "var(--accent-purple)"
                          }}>{leave.leave_type === "Unpaid" ? "Without Pay" : "Paid"}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                          📅 {leave.from_date || leave.start_date} to {leave.to_date || leave.end_date} ({leave.days || 1} {leave.days === 1 ? 'day' : 'days'})
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: badgeColor, background: badgeBg }}>
                          <Icon size={12} /> {leave.status}
                        </span>

                        {leave.status === "pending" && (
                          <button
                            onClick={() => handleCancelLeave(leave.id)}
                            style={{ background: "none", border: "none", color: "var(--accent-rose)", cursor: "pointer", padding: 4 }}
                            title="Cancel Request"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
