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
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [papers, setPapers] = useState<any[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [marksMap, setMarksMap] = useState<Record<string, { theory: string; practical: string; is_absent: boolean; is_locked: boolean }>>({});
  const [teacher, setTeacher] = useState<any>(null);
  const [schoolId, setSchoolId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { fetchTeacherAndExams(); }, []);
  useEffect(() => { if (selectedExamId) fetchPapersForExam(); }, [selectedExamId]);
  useEffect(() => { if (selectedPaperId) fetchStudentsAndMarks(); }, [selectedPaperId]);

  async function fetchTeacherAndExams() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/'; return; }
    setTeacher(user);

    // Fetch school_id of teacher
    const { data: prof } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!prof?.school_id) {
      setMessage("Error: School assignment not found.");
      setLoading(false);
      return;
    }
    setSchoolId(prof.school_id);

    // Fetch active exams
    const { data: activeExams } = await supabase
      .from("exams")
      .select("*")
      .eq("school_id", prof.school_id)
      .order("created_at", { ascending: false });

    setExams(activeExams || []);
    if (activeExams && activeExams.length > 0) {
      setSelectedExamId(activeExams[0].id);
    }
    setLoading(false);
  }

  async function fetchPapersForExam() {
    setPapers([]);
    setSelectedPaperId("");
    setSelectedPaper(null);
    setStudents([]);

    const { data: examPapers } = await supabase
      .from("exam_papers")
      .select("*")
      .eq("exam_id", selectedExamId)
      .order("exam_date");

    setPapers(examPapers || []);
    if (examPapers && examPapers.length > 0) {
      setSelectedPaperId(examPapers[0].id);
      setSelectedPaper(examPapers[0]);
    }
  }

  async function fetchStudentsAndMarks() {
    const paper = papers.find(p => p.id === selectedPaperId);
    setSelectedPaper(paper);
    if (!paper) return;

    setStudents([]);
    // Fetch students matching the grade & section
    let query = supabase
      .from("students")
      .select("id, name, roll_number, auto_id")
      .eq("grade", paper.grade)
      .eq("branch_id", paper.school_id) // Wait, matching branch_id or school_id
      .eq("active", true)
      .order("roll_number");

    if (paper.section) {
      query = query.eq("section", paper.section);
    }

    const { data: studentsData } = await query;
    const roster = studentsData || [];
    setStudents(roster);

    if (roster.length === 0) return;

    // Fetch existing marks
    const studentIds = roster.map(s => s.id);
    const { data: marksData } = await supabase
      .from("student_marks")
      .select("student_id, theory_marks, practical_marks, is_absent, is_locked")
      .eq("exam_paper_id", selectedPaperId)
      .in("student_id", studentIds);

    const map: Record<string, { theory: string; practical: string; is_absent: boolean; is_locked: boolean }> = {};
    roster.forEach(s => {
      const match = (marksData || []).find(m => m.student_id === s.id);
      map[s.id] = {
        theory: match ? String(match.theory_marks) : "",
        practical: match ? String(match.practical_marks) : "",
        is_absent: match ? !!match.is_absent : false,
        is_locked: match ? !!match.is_locked : false
      };
    });
    setMarksMap(map);
  }

  function updateTheoryMark(studentId: string, value: string) {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], theory: value }
    }));
  }

  function updatePracticalMark(studentId: string, value: string) {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], practical: value }
    }));
  }

  function toggleAbsentStatus(studentId: string, isAbsent: boolean) {
    setMarksMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        is_absent: isAbsent,
        theory: isAbsent ? "0" : prev[studentId].theory,
        practical: isAbsent ? "0" : prev[studentId].practical
      }
    }));
  }

  async function handleSaveMarks() {
    if (!teacher || !selectedPaper) return;
    setSaving(true);
    setMessage("");

    let successCount = 0;
    let failedReason = "";

    try {
      for (const student of students) {
        const markObj = marksMap[student.id];
        if (!markObj || markObj.is_locked) continue;

        // Call the marks entry API route to validate & upsert
        const res = await fetch("/api/exams/enter-marks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_paper_id: selectedPaper.id,
            student_id: student.id,
            theory_marks: markObj.is_absent ? 0 : (parseFloat(markObj.theory || "0") || 0),
            practical_marks: markObj.is_absent ? 0 : (parseFloat(markObj.practical || "0") || 0),
            is_absent: markObj.is_absent,
            marked_by: teacher.id
          })
        });

        const result = await res.json();
        if (!res.ok) {
          failedReason = result.error || "Failed to save marks.";
        } else {
          successCount++;
        }
      }

      if (failedReason) {
        setMessage(`Error: ${failedReason} (Successfully saved ${successCount}/${students.length} records)`);
      } else {
        setMessage("✅ Examination marks saved successfully!");
        fetchStudentsAndMarks();
        setTimeout(() => setMessage(""), 3500);
      }
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
    setSaving(false);
  }

  return (
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher/marks"
      onRefresh={fetchStudentsAndMarks}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>✍️ Marks Ledger Command</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Enter theory and practical scores directly into the school ledger.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading marks sheet...</div>
      ) : (
        <>
          {/* Controls */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 11, color: 'var(--text-muted)' }}>Select Exam Cycle</label>
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                >
                  <option value="" disabled>Choose Exam</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title} ({ex.academic_year})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 11, color: 'var(--text-muted)' }}>Select Exam Paper</label>
                <select
                  value={selectedPaperId}
                  onChange={e => setSelectedPaperId(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                  disabled={papers.length === 0}
                >
                  <option value="" disabled>{papers.length === 0 ? 'No papers configured' : 'Choose Paper'}</option>
                  {papers.map(p => (
                    <option key={p.id} value={p.id}>Grade {p.grade} {p.section ? `(${p.section})` : ''} — {p.subject}</option>
                  ))}
                </select>
              </div>

              {selectedPaper && (
                <div style={{ display: 'flex', gap: 14, background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12.5 }}><span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>{selectedPaper.exam_date}</strong></div>
                  <div style={{ fontSize: 12.5 }}><span style={{ color: 'var(--text-muted)' }}>Max Marks:</span> <strong>{selectedPaper.total_marks}</strong></div>
                  <div style={{ fontSize: 12.5 }}><span style={{ color: 'var(--text-muted)' }}>Passing:</span> <strong>{selectedPaper.passing_marks}</strong></div>
                </div>
              )}

              <div style={{ flex: 1 }} />

              <button onClick={handleSaveMarks} disabled={saving || students.length === 0}
                style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--accent-purple)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: (saving || students.length === 0) ? 0.6 : 1 }}>
                <Save size={14} /> {saving ? "Saving Ledger..." : "Save Ledger Marks"}
              </button>
            </div>

            {message && (
              <div style={{ padding: 10, borderRadius: 8, marginTop: 14, fontSize: 12.5, fontWeight: 600, background: message.includes('Error') ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)', color: message.includes('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                {message}
              </div>
            )}
          </div>

          {/* Marks Entry Table */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
            {students.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <BookOpen style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {papers.length === 0 ? "No active papers scheduled for this exam cycle." : "No students found matching this class schedule."}
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Roll #</th>
                      <th>Student Info</th>
                      <th style={{ textAlign: 'center' }}>Absent?</th>
                      <th style={{ textAlign: 'center' }}>Theory Marks</th>
                      <th style={{ textAlign: 'center' }}>Practical Marks</th>
                      <th style={{ textAlign: 'center' }}>Obtained</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, i) => {
                      const entry = marksMap[student.id] || { theory: "", practical: "", is_absent: false, is_locked: false };
                      const obtained = entry.is_absent ? 0 : ((parseFloat(entry.theory || "0") || 0) + (parseFloat(entry.practical || "0") || 0));
                      const passing = selectedPaper ? obtained >= selectedPaper.passing_marks : false;

                      return (
                        <tr key={student.id} style={{ opacity: entry.is_locked ? 0.75 : 1 }}>
                          <td style={{ color: 'var(--text-muted)' }}>{student.roll_number || i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{student.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {student.auto_id}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={entry.is_absent}
                              disabled={entry.is_locked}
                              onChange={e => toggleAbsentStatus(student.id, e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              value={entry.theory}
                              disabled={entry.is_absent || entry.is_locked}
                              onChange={e => updateTheoryMark(student.id, e.target.value)}
                              placeholder="Theory"
                              style={{ width: 90, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', textAlign: 'center', fontSize: 13, outline: 'none' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              value={entry.practical}
                              disabled={entry.is_absent || entry.is_locked}
                              onChange={e => updatePracticalMark(student.id, e.target.value)}
                              placeholder="Practical"
                              style={{ width: 90, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', textAlign: 'center', fontSize: 13, outline: 'none' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: entry.is_absent ? 'var(--accent-rose)' : (passing ? 'var(--accent-emerald)' : 'var(--accent-rose)') }}>
                            {entry.is_absent ? 'ABSENT' : `${obtained} / ${selectedPaper?.total_marks || 100}`}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`status-badge ${entry.is_locked ? 'active' : 'inactive'}`}>
                              {entry.is_locked ? '🔒 Locked' : '✍️ Open'}
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
        </>
      )}
    </DashboardLayout>
  );
}
