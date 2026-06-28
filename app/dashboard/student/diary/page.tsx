"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const TYPE_META: Record<string, { label: string; cls: string }> = {
  homework: { label: "Homework", cls: "bg-purple-500/10 text-purple-400" },
  classwork: { label: "Classwork", cls: "bg-blue-500/10 text-blue-400" },
  notice: { label: "Notice", cls: "bg-yellow-500/10 text-yellow-400" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Not Submitted", cls: "bg-gray-500/10 text-gray-400" },
  submitted: { label: "Submitted — Review Pending", cls: "bg-blue-500/10 text-blue-400" },
  approved: { label: "Approved", cls: "bg-green-500/10 text-green-400" },
  rejected: { label: "Rejected — Resubmit", cls: "bg-red-500/10 text-red-400" },
};

export default function StudentDiaryPage() {
  const [student, setStudent] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "homework" | "classwork" | "notice">("all");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: stu } = await supabase
      .from("students")
      .select("id, name, grade, section, branch_id")
      .eq("user_id", user.id)
      .single();
    setStudent(stu);

    if (!stu) { setLoading(false); return; }

    const { data: diaryEntries } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("grade", stu.grade)
      .eq("section", stu.section)
      .eq("branch_id", stu.branch_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setEntries(diaryEntries || []);

    const { data: subs } = await supabase
      .from("diary_submissions")
      .select("*")
      .eq("student_id", stu.id);

    const subMap: Record<string, any> = {};
    (subs || []).forEach((s) => { subMap[s.diary_entry_id] = s; });
    setSubmissions(subMap);

    setLoading(false);
  }

  const filteredEntries = entries.filter((e) => filter === "all" || e.type === filter);

  return (
    <DashboardLayout
      role="student"
      activePath="/dashboard/student/diary"
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📔 Diary & Homework</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { value: "all", label: "All Records" },
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
      ) : !student ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Student profile profile not found.</div>
      ) : filteredEntries.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No diary logs recorded.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredEntries.map((entry) => {
            const typeMeta = TYPE_META[entry.type] || TYPE_META.notice;
            const submission = submissions[entry.id];
            const status = submission?.status || "pending";
            const statusMeta = STATUS_META[status];
            const isExpanded = expandedEntry === entry.id;

            return (
              <div key={entry.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', background: typeMeta.cls.split(' ')[0], color: typeMeta.cls.split(' ')[1] }}>
                      {typeMeta.label}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{entry.subject} · {entry.date}</span>
                  </div>

                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{entry.title}</h4>
                  {entry.body && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{entry.body}</p>}

                  {entry.attachment_url && (
                    <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600, marginTop: 8 }}>
                      📎 Download Attachment file
                    </a>
                  )}

                  {entry.type === "homework" && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, borderTop: '1px solid var(--border-subtle)', paddingTop: 14, flexWrap: 'wrap', gap: 10 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', background: statusMeta.cls.split(' ')[0], color: statusMeta.cls.split(' ')[1] }}>
                        {statusMeta.label}
                      </span>
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                        style={{ padding: '6px 12px', border: 'none', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                      >
                        {(status === "pending" || status === "rejected") ? "Submit Work" : "View Details"} {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && entry.type === "homework" && (
                  <SubmitPanel student={student} entry={entry} submission={submission} onSubmitted={fetchData} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

function SubmitPanel({ student, entry, submission, onSubmitted }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState(submission?.submission_note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const status = submission?.status || "pending";
  const isLocked = status === "submitted" || status === "approved";

  async function handleSubmit() {
    setError("");
    if (!file && !note.trim()) {
      setError("Please write note or upload file.");
      return;
    }
    setSaving(true);

    try {
      let fileUrl: string | null = submission?.submission_file_url || null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${student.id}/${entry.id}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("diary-submissions")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data: signed } = await supabase.storage
          .from("diary-submissions")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        fileUrl = signed?.signedUrl || path;
      }

      if (submission) {
        const { error: updErr } = await supabase
          .from("diary_submissions")
          .update({
            submission_file_url: fileUrl,
            submission_note: note.trim() || null,
            status: "submitted",
            submitted_at: new Date().toISOString(),
            teacher_remarks: null,
            reviewed_by: null,
            reviewed_at: null,
          })
          .eq("id", submission.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("diary_submissions").insert({
          diary_entry_id: entry.id,
          student_id: student.id,
          school_id: entry.school_id,
          branch_id: entry.branch_id,
          submission_file_url: fileUrl,
          submission_note: note.trim() || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });
        if (insErr) throw insErr;
      }

      await onSubmitted();
    } catch (err: any) {
      setError(err.message || "Submit failed, please retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: 16 }}>
      {isLocked ? (
        <div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Your work has been submitted. Review results will display here.
          </p>
          {submission?.submission_file_url && (
            <a href={submission.submission_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600 }}>
              📎 View submitted file
            </a>
          )}
          {submission?.submission_note && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>Submission Note: "{submission.submission_note}"</p>
          )}
        </div>
      ) : (
        <>
          {status === "rejected" && submission?.teacher_remarks && (
            <div style={{ fontSize: 12.5, color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.1)', padding: '10px 12px', borderRadius: 8, marginBottom: 12 }}>
              Teacher Remarks: "{submission.teacher_remarks}" — Please correct and resubmit.
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', background: 'var(--bg-card)', marginBottom: 12 }}>
            📎 {file ? file.name : "Upload assignment file (PDF/Image/Word)"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <textarea
            placeholder="Add comments / note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'none', marginBottom: 12 }}
          />

          {error && <p style={{ fontSize: 12, color: 'var(--accent-rose)', marginBottom: 8 }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-purple)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Submitting..." : "Submit Homework"}
          </button>
        </>
      )}
    </div>
  );
}
