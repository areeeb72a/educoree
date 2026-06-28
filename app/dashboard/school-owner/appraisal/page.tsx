"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { FileSpreadsheet, Check, X, ShieldAlert, Star, Play, Pause } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function OwnerAppraisalPage() {
  const [owner, setOwner] = useState<any>(null);
  const [schoolId, setSchoolId] = useState("");
  const [appraisalsList, setAppraisalsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<any | null>(null);
  const [ownerComment, setOwnerComment] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { fetchOwnerAndAppraisals(); }, []);

  async function fetchOwnerAndAppraisals() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setOwner(user);

    // Fetch school_id of owner
    const { data: prof } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (prof?.school_id) {
      setSchoolId(prof.school_id);
      
      // Fetch all appraisals of this school
      const { data: list } = await supabase
        .from("appraisals")
        .select("*, profiles!teacher_id(name, role, auto_id)")
        .eq("school_id", prof.school_id)
        .order("created_at", { ascending: false });
      
      setAppraisalsList(list || []);
    }
    setLoading(false);
  }

  async function handleAppraisalDecision(status: "fully_approved" | "partially_approved" | "rejected" | "hold") {
    if (!selectedAppraisal) return;
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("appraisals")
        .update({
          owner_status: status,
          owner_comment: ownerComment,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedAppraisal.id);

      if (error) throw error;

      setMessage(`✅ Appraisal status updated to ${status.replace('_', ' ')} successfully!`);
      setOwnerComment("");
      setSelectedAppraisal(null);
      fetchOwnerAndAppraisals();
      setTimeout(() => setMessage(""), 4000);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setSaving(false);
  }

  return (
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner"
      onRefresh={fetchOwnerAndAppraisals}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📈 Teacher Appraisals Ledger</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Review teacher evaluations, principal remarks, and approve or reject performance appraisals.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading appraisals data...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }} className="appraisal-grid">
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {appraisalsList.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, color: 'var(--text-muted)' }}>
                No teacher appraisal records submitted yet.
              </div>
            ) : (
              appraisalsList.map(app => {
                const isActive = selectedAppraisal?.id === app.id;
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
                  <div key={app.id} onClick={() => { setSelectedAppraisal(app); setOwnerComment(app.owner_comment || ""); setMessage("") }}
                    style={{
                      background: isActive ? "var(--bg-elevated)" : "var(--bg-card)",
                      border: `1px solid ${isActive ? "var(--accent-purple)" : "var(--border-subtle)"}`,
                      borderRadius: 16, padding: 18, cursor: "pointer", transition: "all 0.18s", display: "flex", flexDirection: "column", gap: 10
                    }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 14, color: "var(--text-primary)" }}>{app.profiles?.name || 'Teacher'}</strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>({app.profiles?.auto_id})</span>
                      </div>
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, color: badgeColor, background: badgeBg }}>
                        {statusText}
                      </span>
                    </div>

                     <div style={{ fontSize: 13, color: "var(--text-secondary)", background: "rgba(255,255,255,0.01)", padding: 12, borderRadius: 8 }}>
                      <strong>Evaluation Remarks:</strong> {app.principal_comment || app.objectives}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 10 }}>
                      <div>Principal Evaluation Rating: <strong>{app.principal_rating || 5} Stars</strong></div>
                      <div>Date: <strong>{new Date(app.created_at).toLocaleDateString()}</strong></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action sidebar panel */}
          <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20, position: "sticky", top: 20 }}>
            {!selectedAppraisal ? (
              <p style={{ padding: 40, textAlign: "center", margin: 0, color: "var(--text-muted)", fontSize: 13 }}>Select a teacher appraisal from the list to make a decision.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Appraisal Action Panel</h4>

                <div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Teacher Name:</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", marginTop: 2 }}>{selectedAppraisal.profiles?.name}</div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "var(--text-secondary)" }}>Owner Remarks / Comments</label>
                  <textarea
                    placeholder="Write owner approval or decision comments here..."
                    value={ownerComment}
                    onChange={e => setOwnerComment(e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', boxSizing: 'border-box', resize: "none" }}
                  />
                </div>

                {message && (
                  <div style={{ padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 600, background: message.includes('Error') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', color: message.includes('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                    {message}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={() => handleAppraisalDecision("fully_approved")} disabled={saving}
                    style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--accent-emerald)", color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5 }}>
                    <Check size={14} /> Fully Approve
                  </button>

                  <button onClick={() => handleAppraisalDecision("partially_approved")} disabled={saving}
                    style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--accent-purple)", color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5 }}>
                    <Play size={14} /> Partially Approve
                  </button>

                  <button onClick={() => handleAppraisalDecision("hold")} disabled={saving}
                    style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--accent-amber)", color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5 }}>
                    <Pause size={14} /> Put On Hold
                  </button>

                  <button onClick={() => handleAppraisalDecision("rejected")} disabled={saving}
                    style={{ padding: "10px", borderRadius: 8, border: "none", background: "var(--accent-rose)", color: "#fff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5 }}>
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
