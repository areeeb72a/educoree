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
  pending: { label: "Not Submitted", cls: "bg-gray-100 text-gray-500" },
  submitted: { label: "Submitted — Pending Review", cls: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected — Resubmit", cls: "bg-red-100 text-red-700" },
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <a href="/dashboard/student" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium">
          <span aria-hidden="true">←</span> Back to Dashboard
        </a>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Diary / Homework</h1>
          <p className="text-gray-500 text-sm mt-1">
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: "all", label: "All" },
            { value: "homework", label: "📔 Homework" },
            { value: "classwork", label: "✏️ Classwork" },
            { value: "notice", label: "📌 Notice" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.value
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : !student ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            Student profile nahi mila. Contact admin.
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            Abhi tak koi entry nahi hai
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const typeMeta = TYPE_META[entry.type] || TYPE_META.notice;
              const submission = submissions[entry.id];
              const status = submission?.status || "pending";
              const statusMeta = STATUS_META[status];
              const isExpanded = expandedEntry === entry.id;

              return (
                <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4">
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
                        📎 Teacher's attachment
                      </a>
                    )}

                    {entry.type === "homework" && (
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                        <button
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                          className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
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
      </div>
    </div>
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
      setError("File upload karen ya note likhen");
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
      setError(err.message || "Submit nahi ho saka, dobara koshish karen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50 p-4">
      {isLocked ? (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Aapne submit kar diya hai — review ke baad result yahan aayega.
          </p>
          {submission?.submission_file_url && (
            <a href={submission.submission_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
              📎 Apni submitted file dekhen
            </a>
          )}
          {submission?.submission_note && (
            <p className="text-xs text-gray-500 mt-2">Note: "{submission.submission_note}"</p>
          )}
        </div>
      ) : (
        <>
          {status === "rejected" && submission?.teacher_remarks && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
              Teacher ka remark: "{submission.teacher_remarks}" — dobara submit karen.
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-white transition-colors mb-3">
            📎 {file ? file.name : "Apna kaam upload karen (PDF/JPEG/DOC)"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <textarea
            placeholder="Note (optional)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Submitting..." : "Submit"}
          </button>
        </>
      )}
    </div>
  );
}
