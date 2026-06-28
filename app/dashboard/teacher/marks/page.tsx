"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Save, BookOpen } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const TERMS = ["Term 1", "Term 2", "Term 3", "Final"];
const SUBJECTS = ["Mathematics", "Science", "English", "Urdu", "Computer", "Islamiat", "Social Studies"];

function calcGrade(marks: number, total: number) {
  if (!total) return "-";
  const pct = (marks / total) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

const gradeColor: Record<string, string> = {
  "A+": "text-green-400 bg-green-500/10", "A": "text-green-400 bg-green-500/10",
  "B+": "text-blue-400 bg-blue-500/10", "B": "text-blue-400 bg-blue-500/10",
  "C": "text-yellow-400 bg-yellow-500/10", "D": "text-orange-400 bg-orange-500/10",
  "F": "text-red-400 bg-red-500/10", "-": "text-gray-400 bg-gray-500/10",
};

export default function TeacherMarksPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [term, setTerm] = useState(TERMS[0]);
  const [totalMarks, setTotalMarks] = useState(100);
  const [students, setStudents] = useState<any[]>([]);
  const [marksMap, setMarksMap] = useState<Record<string, { marks: string; status: string }>>({});
  const [teacher, setTeacher] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { fetchTeacherData(); }, []);
  useEffect(() => { if (selected) fetchStudentsAndResults(); }, [selected, subject, term]);

  async function fetchTeacherData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setTeacher(user);

    const { data: all } = await supabase
      .from("teacher_assignments")
      .select("grade, section, branch_id, school_id, subject")
      .eq("teacher_id", user.id)
      .order("grade");

    const seen = new Set();
    const unique = (all || []).filter(a => {
      const key = `${a.grade}-${a.section}-${a.branch_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setAssignments(unique);
    if (unique.length > 0) {
      setSelected(unique[0]);
      if (unique[0].subject) setSubject(unique[0].subject);
    }
  }

  async function fetchStudentsAndResults() {
    const { data } = await supabase
      .from("students")
      .select("id, name, roll_number, auto_id")
      .eq("grade", selected.grade)
      .eq("section", selected.section)
      .eq("branch_id", selected.branch_id)
      .eq("active", true)
      .order("roll_number");

    setStudents(data || []);

    const studentIds = (data || []).map(s => s.id);
    const { data: existing } = await supabase
      .from("results")
      .select("student_id, marks, total_marks, status")
      .in("student_id", studentIds.length ? studentIds : ["__none__"])
      .eq("subject", subject)
      .eq("term", term)
      .eq("year", new Date().getFullYear());

    const map: Record<string, { marks: string; status: string }> = {};
    (existing || []).forEach(r => {
      map[r.student_id] = { marks: String(r.marks), status: r.status };
      if (r.total_marks) setTotalMarks(r.total_marks);
    });
    (data || []).forEach(s => {
      if (!map[s.id]) map[s.id] = { marks: "", status: "draft" };
    });
    setMarksMap(map);
  }

  function setMark(studentId: string, marks: string) {
    setMarksMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], marks } }));
  }

  async function saveResults(publish: boolean) {
    if (!teacher || !selected || students.length === 0) return;
    setSaving(true);
    setMessage("");

    const records = students
      .filter(s => marksMap[s.id]?.marks !== "" && marksMap[s.id]?.marks !== undefined)
      .map(s => ({
        school_id: selected.school_id,
        student_id: s.id,
        subject,
        term,
        year: new Date().getFullYear(),
        marks: parseFloat(marksMap[s.id].marks),
        total_marks: totalMarks,
        grade: calcGrade(parseFloat(marksMap[s.id].marks), totalMarks),
        teacher_id: teacher.id,
        status: publish ? "published" : "draft",
      }));

    if (records.length === 0) {
      setMessage("Error: Enter marks for at least one student.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("results")
      .upsert(records, { onConflict: "student_id,subject,term,year" });

    setSaving(false);
    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage(publish ? "✅ Results published! Students and parents can now view them." : "✅ Draft saved successfully.");
      fetchStudentsAndResults();
      setTimeout(() => setMessage(""), 3500);
    }
  }

  const enteredCount = students.filter(s => marksMap[s.id]?.marks !== "" && marksMap[s.id]?.marks !== undefined).length;
  const publishedCount = students.filter(s => marksMap[s.id]?.status === "published").length;

  return (
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher/marks"
      onRefresh={fetchStudentsAndResults}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>✍️ Enter Grade / Marks</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Add or publish term marks for student report cards.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Students</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{students.length}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Entered Records</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-purple)', marginTop: 4 }}>{enteredCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Published Records</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 4 }}>{publishedCount}</div>
        </div>
      </div>

      {/* Control Board */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <select
            value={selected ? `${selected.grade}__${selected.section}__${selected.branch_id}` : ""}
            onChange={e => {
              const [grade, section, branch_id] = e.target.value.split("__");
              setSelected(assignments.find(a => a.grade === grade && a.section === section && a.branch_id === branch_id));
            }}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          >
            {assignments.map((a, i) => (
              <option key={i} value={`${a.grade}__${a.section}__${a.branch_id}`}>
                Grade {a.grade} — Section {a.section}
              </option>
            ))}
          </select>

          <select value={subject} onChange={e => setSubject(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={term} onChange={e => setTerm(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Marks:</label>
            <input type="number" value={totalMarks} onChange={e => setTotalMarks(parseFloat(e.target.value) || 100)}
              style={{ width: 80, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={() => saveResults(false)} disabled={saving || students.length === 0}
            style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> Save Draft
          </button>
          <button onClick={() => saveResults(true)} disabled={saving || students.length === 0}
            style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--accent-purple)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> {saving ? "Saving..." : "Publish"}
          </button>
        </div>

        {message && (
          <div style={{ padding: 10, borderRadius: 8, marginTop: 14, fontSize: 12.5, fontWeight: 600, background: message.includes('Error') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', color: message.includes('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
            {message}
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {students.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <BookOpen style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {assignments.length === 0 ? "No classes assigned to you." : "No active students found in this class."}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Roll #</th>
                  <th>Student Info</th>
                  <th style={{ textAlign: 'center' }}>Marks Obtained</th>
                  <th style={{ textAlign: 'center' }}>Grade</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => {
                  const entry = marksMap[student.id] || { marks: "", status: "draft" };
                  const marksNum = parseFloat(entry.marks);
                  const grade = entry.marks !== "" && !isNaN(marksNum) ? calcGrade(marksNum, totalMarks) : "-";
                  return (
                    <tr key={student.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{student.roll_number || i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{student.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {student.auto_id}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={totalMarks}
                          value={entry.marks}
                          onChange={e => setMark(student.id, e.target.value)}
                          placeholder={`/ ${totalMarks}`}
                          style={{ width: 90, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', textAlign: 'center', fontSize: 13, outline: 'none' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${gradeColor[grade].split(' ')[0]} ${gradeColor[grade].split(' ')[1]}`}>
                          {grade}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${entry.status === "published" ? "active" : "inactive"}`}>
                          {entry.status}
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
    </DashboardLayout>
  );
}
