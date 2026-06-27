"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const TYPE_META: Record<string, { label: string; cls: string }> = {
  homework: { label: "Homework", cls: "bg-purple-100 text-purple-700" },
  classwork: { label: "Classwork", cls: "bg-blue-100 text-blue-700" },
  notice: { label: "Notice", cls: "bg-yellow-100 text-yellow-700" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-gray-100 text-gray-500" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
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
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setFormError(err.message || "Kuch ghalat ho gaya, dobara koshish karen");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubmissions(entryId: string) {
    if (expandedEntry === entryId) { setExpandedEntry(null); return; }
    setExpandedEntry(entryId);
    if (!submissionsByEntry[entryId]) await loadSubmissions(entryId);
  }

  async function loadSubmissions(entryId: string) {
    setLoadingSubmissions(entryId);
    const entry = entries.find((e) => e.id === entryId);

    const { data: students } = await supabase
      .from("students")
      .select("id, name, roll_number, auto_id")
      .eq("grade", entry.grade)
      .eq("section", entry.section)
      .eq("branch_id", entry.branch_id)
      .eq("active", true)
      .order("roll_number");

    const { data: subs } = await supabase
      .from("diary_submissions")
      .select("*")
      .eq("diary_entry_id", entryId);

    const subMap: Record<string, any> = {};
    (subs || []).forEach((s) => { subMap[s.student_id] = s; });

    const merged = (students || []).map((s) => ({ student: s, submission: subMap[s.id] || null }));
    setSubmissionsByEntry((prev) => ({ ...prev, [entryId]: merged }));
    setLoadingSubmissions(null);
  }

  async function updateSubmissionStatus(
    entryId: string,
    studentId: string,
    submissionId: string | null,
    newStatus: "approved" | "rejected",
    remarks: string
  ) {
    setSavingRemark(studentId);
    if (submissionId) {
      await supabase
        .from("diary_submissions")
        .update({
          status: newStatus,
          teacher_remarks: remarks,
          reviewed_by: teacher.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
    }
    await loadSubmissions(entryId);
    setSavingRemark(null);
  }

  const currentEntries = entries.filter(
    (e) => !selectedClass || (e.grade === selectedClass.grade && e.section === selectedClass.section)
  );

  const homeworkCount = currentEntries.filter((e) => e.type === "homework").length;
  const noticeCount = currentEntries.filter((e) => e.type === "notice").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-fuchsia-700 to-pink-800 px-4 md:px-6 pt-6 pb-8">
        <div className="max-w-3xl mx-auto">
          <a href="/dashboard/teacher" className="inline-flex items-center gap-1 text-sm text-fuchsia-200 hover:text-white mb-3 font-medium">
            <span aria-hidden="true">←</span> Back to Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
            📔 Diary / Homework
          </h1>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">📋</div>
              <div className="text-2xl font-extrabold text-white">{currentEntries.length}</div>
              <div className="text-fuchsia-200 text-xs mt-0.5">Total Entries</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">📔</div>
              <div className="text-2xl font-extrabold text-white">{homeworkCount}</div>
              <div className="text-fuchsia-200 text-xs mt-0.5">Homework</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">📌</div>
              <div className="text-2xl font-extrabold text-white">{noticeCount}</div>
              <div className="text-fuchsia-200 text-xs mt-0.5">Notices</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 -mt-2">
        <p className="text-gray-500 text-sm mb-4">Homework, classwork ya notice assign karen aur submissions dekhen</p>

        {/* Create form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3">New Entry</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <select
              value={selectedClass ? `${selectedClass.grade}__${selectedClass.section}__${selectedClass.branch_id}` : ""}
              onChange={(e) => {
                const [grade, section, branch_id] = e.target.value.split("__");
                const found = assignments.find((a) => a.grade === grade && a.section === section && a.branch_id === branch_id);
                setSelectedClass(found);
                if (found?.subject) setSubject(found.subject);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              {assignments.map((a, i) => (
                <option key={i} value={`${a.grade}__${a.section}__${a.branch_id}`}>
                  Grade {a.grade} — Section {a.section}
                </option>
              ))}
            </select>

            <select value={type} onChange={(e) => setType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
              {Object.entries(TYPE_META).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Subject (e.g. Mathematics)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="text"
            placeholder="Title (e.g. Chapter 5 — Fractions)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />

          <textarea
            placeholder="Details / instructions likhen..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 resize-none"
          />

          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
              📎 {file ? file.name : "Attach file (PDF/JPEG/DOC)"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
            )}
          </div>

          {formError && <p className="text-xs text-red-600 mb-2">{formError}</p>}

          <button
            onClick={createEntry}
            disabled={saving}
            className="bg-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-fuchsia-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Assigning..." : saved ? "✅ Assigned!" : "Assign"}
          </button>
        </div>

        {/* Entries list */}
        <h2 className="text-sm font-bold text-gray-800 mb-3">Recent Entries</h2>

        {loadingEntries ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : currentEntries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            Abhi tak koi entry nahi banayi
          </div>
        ) : (
          <div className="space-y-3">
            {currentEntries.map((entry) => {
              const typeMeta = TYPE_META[entry.type] || TYPE_META.notice;
              const isExpanded = expandedEntry === entry.id;
              const subs = submissionsByEntry[entry.id] || [];

              return (
                <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${typeMeta.cls}`}>
                            {typeMeta.label}
                          </span>
                          <span className="text-xs text-gray-400">{entry.subject} · {entry.date}</span>
                        </div>
                        <div className="font-medium text-sm text-gray-900">{entry.title}</div>
                        {entry.body && <p className="text-xs text-gray-500 mt-1">{entry.body}</p>}
                        {entry.attachment_url && (
                          <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                            📎 Attachment
                          </a>
                        )}
                      </div>

                      {entry.type === "homework" && (
                        <button
                          onClick={() => toggleSubmissions(entry.id)}
                          className="flex items-center gap-1 text-xs font-medium text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Submissions {isExpanded ? "▲" : "▼"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-3">
                      {loadingSubmissions === entry.id ? (
                        <p className="text-xs text-gray-400 text-center py-4">Loading submissions...</p>
                      ) : subs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Is class mein koi student nahi mila</p>
                      ) : (
                        <div className="space-y-2">
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
  );
}

function SubmissionRow({ student, submission, saving, onApprove, onReject }: any) {
  const [remarks, setRemarks] = useState(submission?.teacher_remarks || "");
  const status = submission?.status || "pending";
  const meta = STATUS_META[status];

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{student.name}</span>
            <span className="text-xs text-gray-400">Roll #{student.roll_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${meta.cls}`}>
              {meta.label}
            </span>
          </div>
          {submission?.submission_file_url && (
            <a href={submission.submission_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
              📎 View submitted file
            </a>
          )}
          {submission?.submission_note && (
            <p className="text-xs text-gray-500 mt-1">"{submission.submission_note}"</p>
          )}
        </div>

        {submission && status === "submitted" && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="flex-1 md:w-40 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button onClick={() => onApprove(remarks)} disabled={saving}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50 transition-colors text-sm">✓</button>
            <button onClick={() => onReject(remarks)} disabled={saving}
              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors text-sm">✕</button>
          </div>
        )}

        {status === "pending" && (
          <span className="text-xs text-gray-400">⏰ Not submitted yet</span>
        )}

        {(status === "approved" || status === "rejected") && submission?.teacher_remarks && (
          <p className="text-xs text-gray-500 italic">"{submission.teacher_remarks}"</p>
        )}
      </div>
    </div>
  );
}
