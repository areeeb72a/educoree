"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { FileSpreadsheet, Send, FileCheck, HelpCircle, Star, Clock } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function TeacherAppraisalPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [schoolId, setSchoolId] = useState("");
  const [appraisalsList, setAppraisalsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    objectives: "",
    self_rating: 5
  });

  useEffect(() => { fetchProfileAndAppraisals(); }, []);

  async function fetchProfileAndAppraisals() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setTeacher(user);

    const { data: prof } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (prof?.school_id) {
      setSchoolId(prof.school_id);
      
      const { data: list } = await supabase
        .from("appraisals")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
      
      setAppraisalsList(list || []);
    }
    setLoading(false);
  }

  async function handleSubmitAppraisal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.objectives.trim()) {
      setMessage("Error: Please write down your evaluation objectives.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("appraisals")
        .insert({
          school_id: schoolId,
          teacher_id: teacher.id,
          objectives: form.objectives,
          self_rating: Number(form.self_rating),
          owner_status: "pending"
        });

      if (error) throw error;

      setMessage("✅ Appraisal form submitted to Principal for review!");
      setForm({ objectives: "", self_rating: 5 });
      fetchProfileAndAppraisals();
      setTimeout(() => setMessage(""), 4000);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setSaving(false);
  }

  return (
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher"
      onRefresh={fetchProfileAndAppraisals}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📈 Staff Self Appraisal</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Submit self-evaluations and track feedback from management.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading appraisals ledger...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, alignItems: "start" }} className="appraisal-layout">
          {/* Form */}
          <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Submit Self Evaluation</h3>
            
            <form onSubmit={handleSubmitAppraisal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>My Teaching Objectives & Accomplishments *</label>
                <textarea
                  placeholder="Describe your goals, class performances, syllabus coverages, and results accomplished..."
                  value={form.objectives}
                  onChange={e => setForm({ ...form, objectives: e.target.value })}
                  rows={6}
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box', resize: "none" }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>Self Rating Score *</label>
                <select
                  value={form.self_rating}
                  onChange={e => setForm({ ...form, self_rating: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}
                >
                  {[5, 4, 3, 2, 1].map(score => (
                    <option key={score} value={score}>{score} Star{score > 1 ? 's' : ''} — {score === 5 ? 'Exceptional' : score === 4 ? 'Very Good' : score === 3 ? 'Satisfactory' : score === 2 ? 'Needs Improvement' : 'Unsatisfactory'}</option>
                  ))}
                </select>
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
                <Send size={14} /> {saving ? "Submitting..." : "Send to Principal"}
              </button>
            </form>
          </div>

          {/* History / Status list */}
          <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Evaluation History</h3>

            {appraisalsList.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={36} style={{ color: 'var(--text-muted)', marginBottom: 8, opacity: 0.5 }} />
                <p style={{ fontSize: 13 }}>No appraisals submitted yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {appraisalsList.map(app => {
                  let badgeColor = "var(--text-secondary)";
                  let badgeBg = "rgba(255,255,255,0.05)";
                  let statusText = "Pending Review";

                  if (app.owner_status === "fully_approved") {
                    badgeColor = "var(--accent-emerald)";
                    badgeBg = "rgba(16,185,129,0.1)";
                    statusText = "Fully Approved";
                  } else if (app.owner_status === "partially_approved") {
                    badgeColor = "var(--accent-purple)";
                    badgeBg = "rgba(124,58,237,0.1)";
                    statusText = "Partially Approved";
                  } else if (app.owner_status === "rejected") {
                    badgeColor = "var(--accent-rose)";
                    badgeBg = "rgba(244,63,94,0.1)";
                    statusText = "Rejected";
                  } else if (app.owner_status === "hold") {
                    badgeColor = "var(--accent-amber)";
                    badgeBg = "rgba(245,158,11,0.1)";
                    statusText = "On Hold";
                  }

                  return (
                    <div key={app.id} style={{ padding: 16, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          📅 Submitted on {new Date(app.created_at).toLocaleDateString()}
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, color: badgeColor, background: badgeBg }}>
                          {statusText}
                        </span>
                      </div>

                      <div style={{ fontSize: 13, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                        <strong>My Objectives:</strong> {app.objectives}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                        <span>Self Rating:</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          {Array.from({ length: app.self_rating }).map((_, idx) => (
                            <Star key={idx} size={12} fill="var(--accent-amber)" color="var(--accent-amber)" />
                          ))}
                        </div>
                      </div>

                      {/* Principal remarks */}
                      {(app.principal_comment || app.principal_rating) && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10, marginTop: 4, background: "rgba(255,255,255,0.01)", padding: 10, borderRadius: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-purple)", marginBottom: 4 }}>Principal Feedback:</div>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 6px" }}>{app.principal_comment || "No comment left."}</p>
                          {app.principal_rating && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted)" }}>
                              <span>Principal Rating:</span>
                              <div style={{ display: "flex", gap: 2 }}>
                                {Array.from({ length: app.principal_rating }).map((_, idx) => (
                                  <Star key={idx} size={11} fill="var(--accent-purple)" color="var(--accent-purple)" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Owner remarks */}
                      {(app.owner_comment) && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10, marginTop: 4, background: "rgba(255,255,255,0.01)", padding: 10, borderRadius: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-emerald)", marginBottom: 4 }}>Owner Decision Remarks:</div>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{app.owner_comment}</p>
                        </div>
                      )}
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
