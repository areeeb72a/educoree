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
  pending: { label: "Pending", cls: "bg-gray-500/10 text-gray-400" },
  submitted: { label: "Submitted", cls: "bg-blue-500/10 text-blue-400" },
  approved: { label: "Approved", cls: "bg-green-500/10 text-green-400" },
  rejected: { label: "Rejected", cls: "bg-red-500/10 text-red-400" },
};

export default function TeacherDiaryPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  const [type, setType] = useState("homework");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  const [entries, setEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [submissionsByEntry, setSubmissionsByEntry] = useState<Record<string, any[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<string | null>(null);
  const [savingRemark, setSavingRemark] = useState<string | null>(null);

  useEffect(() => { fetchTeacherData(); }, []);
  useEffect(() => { if (teacher) fetchEntries(); }, [teacher]);

  async function fetchTeacherData() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { window.location.href = "/"; return; }
    setTeacher(user);

    const { data: incharge } = await supabase
      .from("teacher_assignments")
      .select("grade, section, branch_id, school_id, subject, is_incharge")
      .eq("teacher_id", user.id)
      .eq("is_incharge", true)
      .order("grade");

    if (incharge && incharge.length > 0) {
      setAssignments(incharge);
      setSelectedClass(incharge[0]);
      setSubject(incharge[0].subject || "");
      return;
    }

    const { data: all } = await supabase
      .from("teacher_assignments")
      .select("grade, section, branch_id, school_id, subject, is_incharge")
      .eq("teacher_id", user.id)
      .order("grade");

    const seen = new Set();
    const unique = (all || []).filter((a) => {
      const key = `${a.grade}-${a.section}-${a.branch_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setAssignments(unique);
    if (unique.length > 0) {
      setSelectedClass(unique[0]);
      setSubject(unique[0].subject || "");
    }
  }

  async function fetchEntries() {
    setLoadingEntries(true);
    const { data } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("teacher_id", teacher.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setEntries(data || []);
    setLoadingEntries(false);
  }

  function resetForm() {
    setTitle("");
    setBody("");
    setFile(null);
    setType("homework");
  }

  async function createEntry() {
    setFormError("");
    if (!selectedClass) { setFormError("Class select karen"); return; }
    if (!subject.trim()) { setFormError("Subject likhen"); return; }
    if (!title.trim()) { setFormError("Title likhen"); return; }

    setSaving(true);
    let attachmentUrl: string | null = null;

    try {
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${teacher.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("diary-attachments")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data: signed } = await supabase.storage
          .from("diary-attachments")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        attachmentUrl = signed?.signedUrl || path;
      }

      const { error } = await supabase.from("diary_entries").insert({
        school_id: selectedClass.school_id,
        branch_id: selectedClass.branch_id,
        teacher_id: teacher.id,
        grade: selectedClass.grade,
        section: selectedClass.section,
        subject: subject.trim(),
        type,
        title: title.trim(),
        body: body.trim(),
        date,
        attachment_url: attachmentUrl,
      });
      if (error) throw error;

      setSaved(true);
      resetForm();
      fetchEntries();
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setFormError("Error: " + err.message);
    }
    setSaving(false);
  }

  async function toggleSubmissions(entryId: string) {
    if (expandedEntry === entryId) {
      setExpandedEntry(null);
      return;
    }
    setExpandedEntry(entryId);
    setLoadingSubmissions(entryId);

    try {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;

      const { data: classStudents } = await supabase
        .from("students")
        .select("id, name, roll_number")
        .eq("grade", entry.grade)
        .eq("section", entry.section)
        .eq("branch_id", entry.branch_id)
        .eq("active", true)
        .order("roll_number");

      const studentIds = (classStudents || []).map((s) => s.id);
      const { data: subs } = await supabase
        .from("diary_submissions")
        .select("*")
        .eq("entry_id", entryId)
        .in("student_id", studentIds.length ? studentIds : ["__none__"]);

      const rows = (classStudents || []).map((student) => {
        const submission = (subs || []).find((s) => s.student_id === student.id);
        return { student, submission };
      });

      setSubmissionsByEntry((prev) => ({ ...prev, [entryId]: rows }));
    } catch (e) {
      console.error(e);
    }
    setLoadingSubmissions(null);
  }

  async function updateSubmissionStatus(
    entryId: string,
    studentId: string,
    submissionId: string | undefined,
    status: "approved" | "rejected",
    remarks: string
  ) {
    if (!submissionId) return;
    setSavingRemark(studentId);
    try {
      const { error } = await supabase
        .from("diary_submissions")
        .update({ status, teacher_remarks: remarks })
        .eq("id", submissionId);

      if (error) throw error;

      setSubmissionsByEntry((prev) => {
        const old = prev[entryId] || [];
        const updated = old.map((row) => {
          if (row.student.id === studentId) {
            return {
              ...row,
              submission: { ...row.submission, status, teacher_remarks: remarks },
            };
          }
          return row;
        });
        return { ...prev, [entryId]: updated };
      });
    } catch (err) {
      console.error(err);
    }
    setSavingRemark(null);
  }

  // Filter entry state
  const [filterType, setFilterType] = useState("all");
  const currentEntries = entries.filter((e) => filterType === "all" || e.type === filterType);

  return (
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher/diary"
      onRefresh={fetchEntries}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📚 Class Diary / Homework</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Add classwork, homework entries and evaluate student submissions.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
        {/* Left Column: Form */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 24, height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>New Diary Entry</h3>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Class Assignment</label>
            <select
              value={selectedClass ? `${selectedClass.grade}__${selectedClass.section}__${selectedClass.branch_id}` : ""}
              onChange={e => {
                const [grade, section, branch_id] = e.target.value.split("__");
                const found = assignments.find(a => a.grade === grade && a.section === section && a.branch_id === branch_id);
                setSelectedClass(found);
                if (found) setSubject(found.subject || "");
              }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', color: 'var(--text-primary)' }}
            >
              {assignments.map((a, i) => (
                <option key={i} value={`${a.grade}__${a.section}__${a.branch_id}`}>
                  Grade {a.grade} — Section {a.section}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', color: 'var(--text-primary)' }}>
                <option value="homework">Homework</option>
                <option value="classwork">Classwork</option>
                <option value="notice">Notice Board</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Title / Topic *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 4 Exercise"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Details / Instructions</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write instructions..."
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'none' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Attachment File (Optional)</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ width: '100%', fontSize: 12, color: 'var(--text-secondary)' }} />
          </div>

          {formError && (
            <div style={{ padding: 10, background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              {formError}
            </div>
          )}

          {saved && (
            <div style={{ padding: 10, background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
              ✓ Entry saved successfully!
            </div>
          )}

          <button onClick={createEntry} disabled={saving}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Post Entry'}
          </button>
        </div>

        {/* Right Column: Entries list */}
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Diary Ledger</div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
              <option value="all">All Types</option>
              <option value="homework">Homework Only</option>
              <option value="classwork">Classwork Only</option>
              <option value="notice">Notices Only</option>
            </select>
          </div>

          {loadingEntries ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading entries list...</p>
          ) : currentEntries.length === 0 ? (
            <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
              No entries found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {currentEntries.map((entry) => {
                const typeMeta = TYPE_META[entry.type] || TYPE_META.notice;
                const isExpanded = expandedEntry === entry.id;
                const subs = submissionsByEntry[entry.id] || [];

                return (
                  <div key={entry.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', background: typeMeta.cls.split(' ')[0], color: typeMeta.cls.split(' ')[1] }}>
                              {typeMeta.label}
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{entry.subject} · {entry.date} · Grade {entry.grade}-{entry.section}</span>
                          </div>
                          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{entry.title}</h4>
                          {entry.body && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{entry.body}</p>}
                          {entry.attachment_url && (
                            <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600, marginTop: 8 }}>
                              📎 View Attachment File
                            </a>
                          )}
                        </div>

                        {entry.type === "homework" && (
                          <button
                            onClick={() => toggleSubmissions(entry.id)}
                            style={{ padding: '8px 12px', border: 'none', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                          >
                            Submissions {isExpanded ? "▲" : "▼"}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: 16 }}>
                        {loadingSubmissions === entry.id ? (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Loading submissions...</p>
                        ) : subs.length === 0 ? (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No student profiles in this class.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {subs.map(({ student, submission }: any) => (
                              <SubmissionRow
                                key={student.id}
                                student={student}
                                submission={submission}
                                saving={savingRemark === student.id}
                                onApprove={(remarks: string) => updateSubmissionStatus(entry.id, student.id, submission?.id, "approved", remarks)}
                                onReject={(remarks: string) => updateSubmissionStatus(entry.id, student.id, submission?.id, "rejected", remarks)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function SubmissionRow({ student, submission, saving, onApprove, onReject }: any) {
  const [remarks, setRemarks] = useState(submission?.teacher_remarks || "");
  const status = submission?.status || "pending";
  const meta = STATUS_META[status];

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{student.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Roll #{student.roll_number}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 20, textTransform: 'uppercase', background: meta.cls.split(' ')[0], color: meta.cls.split(' ')[1] }}>
              {meta.label}
            </span>
          </div>
          {submission?.submission_file_url && (
            <a href={submission.submission_file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 600, marginTop: 4 }}>
              📎 View submitted file
            </a>
          )}
          {submission?.submission_note && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>"{submission.submission_note}"</p>
          )}
        </div>

        {submission && status === "submitted" && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
            />
            <button onClick={() => onApprove(remarks)} disabled={saving}
              style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'var(--accent-emerald)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
            <button onClick={() => onReject(remarks)} disabled={saving}
              style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'var(--accent-rose)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {status === "pending" && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏰ Not submitted yet</span>
        )}

        {(status === "approved" || status === "rejected") && submission?.teacher_remarks && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{submission.teacher_remarks}"</p>
        )}
      </div>
    </div>
  );
}
