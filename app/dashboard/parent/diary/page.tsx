"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  homework: { label: "Homework", bg: "rgba(168,85,247,0.1)", color: "var(--accent-purple)" },
  classwork: { label: "Classwork", bg: "rgba(59,130,246,0.1)", color: "var(--accent-cyan)" },
  notice: { label: "Notice", bg: "rgba(245,158,11,0.1)", color: "var(--accent-amber)" },
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Not Submitted", bg: "var(--bg-elevated)", color: "var(--text-muted)" },
  submitted: { label: "Submitted — Review Pending", bg: "rgba(59,130,246,0.1)", color: "var(--accent-cyan)" },
  approved: { label: "Approved", bg: "rgba(16,185,129,0.1)", color: "var(--accent-emerald)" },
  rejected: { label: "Rejected", bg: "rgba(244,63,94,0.1)", color: "var(--accent-rose)" },
};

export default function ParentDiaryPage() {
  const [guardian, setGuardian] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [entries, setEntries] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<"all" | "homework" | "classwork" | "notice">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGuardianAndChildren(); }, []);
  useEffect(() => { if (selectedChild) fetchDiaryData(); }, [selectedChild]);

  async function fetchGuardianAndChildren() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }

    const { data: guardianData } = await supabase
      .from("guardians")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setGuardian(guardianData);

    if (!guardianData) { setLoading(false); return; }

    const { data: kids } = await supabase
      .from("students")
      .select("id, name, grade, section, branch_id")
      .eq("guardian_id", guardianData.id)
      .order("name");

    setChildren(kids || []);
    if (kids && kids.length > 0) setSelectedChild(kids[0].id);
    else setLoading(false);
  }

  async function fetchDiaryData() {
    setLoading(true);
    const child = children.find((c) => c.id === selectedChild);
    if (!child) { setLoading(false); return; }

    const { data: diaryEntries } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("grade", child.grade)
      .eq("section", child.section)
      .eq("branch_id", child.branch_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setEntries(diaryEntries || []);

    const { data: subs } = await supabase
      .from("diary_submissions")
      .select("*")
      .eq("student_id", child.id);

    const subMap: Record<string, any> = {};
    (subs || []).forEach((s) => { subMap[s.diary_entry_id] = s; });
    setSubmissions(subMap);

    setLoading(false);
  }

  const currentChild = children.find((c) => c.id === selectedChild);
  const filteredEntries = entries.filter((e) => filter === "all" || e.type === filter);

  return (
    <DashboardLayout
      role="parent"
      activePath="/dashboard/parent/diary"
      onRefresh={fetchDiaryData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📔 Child Diary / Homework</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentChild ? `${currentChild.name} · Grade ${currentChild.grade}-${currentChild.section}` : "Loading..."}
          </p>
        </div>
        {children.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id} style={{ color: 'var(--text-primary)' }}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: "all", label: "All Logs" },
          { value: "homework", label: "📔 Homework" },
          { value: "classwork", label: "✏️ Classwork" },
          { value: "notice", label: "📌 Notice Board" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            style={{
              padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, transition: 'all 0.2s',
              background: filter === f.value ? 'var(--accent-purple)' : 'var(--bg-card)',
              color: filter === f.value ? '#fff' : 'var(--text-secondary)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Loading entries...</div>
      ) : !guardian ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Guardian profile not found.</div>
      ) : children.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No student profiles linked to this parent account.</div>
      ) : filteredEntries.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No diary entries logged.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredEntries.map((entry) => {
            const typeMeta = TYPE_META[entry.type] || TYPE_META.notice;
            const submission = submissions[entry.id];
            const status = submission?.status || "pending";
            const statusMeta = STATUS_META[status];

            return (
              <div key={entry.id} className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: typeMeta.bg, color: typeMeta.color }}>
                    {typeMeta.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{entry.subject} · {entry.date}</span>
                </div>

                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{entry.title}</h4>
                {entry.body && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>{entry.body}</p>}

                {entry.attachment_url && (
                  <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600, marginTop: 8 }}>
                    📎 View Teacher's attachment file
                  </a>
                )}

                {entry.type === "homework" && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)", display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: statusMeta.bg, color: statusMeta.color }}>
                        {statusMeta.label}
                      </span>
                    </div>

                    {submission?.submission_file_url && (
                      <div style={{ marginTop: 4 }}>
                        <a href={submission.submission_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 650 }}>
                          📎 View child's submitted work file
                        </a>
                      </div>
                    )}

                    {submission?.submission_note && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Student Comments: "{submission.submission_note}"</div>
                    )}

                    {(status === "approved" || status === "rejected") && submission?.teacher_remarks && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>
                        Teacher Remarks: "{submission.teacher_remarks}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
