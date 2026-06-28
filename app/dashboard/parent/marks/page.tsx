"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Award } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const gradeColor: Record<string, string> = {
  "A+": "text-green-400 bg-green-500/10", "A": "text-green-400 bg-green-500/10",
  "B+": "text-blue-400 bg-blue-500/10", "B": "text-blue-400 bg-blue-500/10",
  "C": "text-yellow-400 bg-yellow-500/10", "D": "text-orange-400 bg-orange-500/10",
  "F": "text-red-400 bg-red-500/10",
};

export default function ParentMarksPage() {
  const [guardian, setGuardian] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [exams, setExams] = useState<any[]>([]);
  const [examTranscripts, setExamTranscripts] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGuardianAndChildren(); }, []);
  useEffect(() => { if (selectedChild) fetchExamsAndTranscripts(); }, [selectedChild]);

  async function fetchGuardianAndChildren() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: guardianData } = await supabase
      .from("guardians")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setGuardian(guardianData);

    if (!guardianData) { setLoading(false); return; }

    const { data: kids } = await supabase
      .from("students")
      .select("id, name, grade, section, auto_id, school_id")
      .eq("guardian_id", guardianData.id)
      .order("name");

    setChildren(kids || []);
    if (kids && kids.length > 0) setSelectedChild(kids[0].id);
    setLoading(false);
  }

  async function fetchExamsAndTranscripts() {
    const kid = children.find(c => c.id === selectedChild);
    if (!kid) return;

    // 1. Fetch published exams for the child's school
    const { data: publishedExams } = await supabase
      .from("exams")
      .select("*")
      .eq("school_id", kid.school_id)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    const examList = publishedExams || [];
    setExams(examList);

    // 2. Fetch child's transcript for all published exams
    const transcriptsMap: Record<string, any[]> = {};
    for (const exam of examList) {
      try {
        const res = await fetch(`/api/exams/transcript?student_id=${selectedChild}&exam_id=${exam.id}`);
        const result = await res.json();
        if (result.success) {
          transcriptsMap[exam.id] = result.transcript || [];
        }
      } catch (err) {
        console.error("Error fetching child transcript:", err);
      }
    }
    setExamTranscripts(transcriptsMap);
  }

  const currentChild = children.find(c => c.id === selectedChild);

  function calculateExamAverage(records: any[]) {
    if (!records || !records.length) return 0;
    const totalPercentage = records.reduce((sum, r) => sum + (r.percentage || 0), 0);
    return Math.round(totalPercentage / records.length);
  }

  return (
    <DashboardLayout
      role="parent"
      activePath="/dashboard/parent/marks"
      onRefresh={fetchExamsAndTranscripts}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>🏆 Child Academic Report Cards</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentChild ? `${currentChild.name} · Grade ${currentChild.grade} - Section ${currentChild.section || 'A'}` : "Loading..."}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {children.length > 1 && (
            <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Loading grade reports...</div>
      ) : !guardian ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Guardian profile not found.</div>
      ) : children.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No student profiles linked to this parent account.</div>
      ) : exams.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center' }}>
          <Award style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No published exam cycles found for this academic year.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {exams.map(exam => {
            const transcript = examTranscripts[exam.id] || [];
            const average = calculateExamAverage(transcript);
            return (
              <div key={exam.id} className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{exam.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>({exam.academic_year})</span>
                  </div>
                  {transcript.length > 0 && (
                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent-purple)' }}>{average}% Average Score</span>
                  )}
                </div>

                {transcript.length === 0 ? (
                  <p style={{ padding: 20, margin: 0, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Marks for this exam cycle have not been uploaded for this child yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ textAlign: 'center' }}>Theory Marks</th>
                          <th style={{ textAlign: 'center' }}>Practical Marks</th>
                          <th style={{ textAlign: 'center' }}>Total Marks</th>
                          <th style={{ textAlign: 'center' }}>Obtained</th>
                          <th style={{ textAlign: 'center' }}>Grade</th>
                          <th style={{ textAlign: 'center' }}>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transcript.map((r, i) => (
                          <tr key={i} style={{ opacity: r.is_absent ? 0.75 : 1 }}>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.subject}</td>
                            <td style={{ textAlign: 'center' }}>{r.is_absent ? '-' : r.theory_marks}</td>
                            <td style={{ textAlign: 'center' }}>{r.is_absent ? '-' : r.practical_marks}</td>
                            <td style={{ textAlign: 'center' }}>{r.total_marks}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {r.is_absent ? 'ABSENT' : `${r.total_obtained} / ${r.total_marks}`}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`text-xs px-3 py-1 rounded-full font-bold ${gradeColor[r.grade]?.split(' ')[0] || "text-gray-400"} ${gradeColor[r.grade]?.split(' ')[1] || "bg-gray-500/10"}`}>
                                {r.grade}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${r.status === 'Pass' ? 'active' : 'inactive'}`} style={{ color: r.is_absent ? 'var(--text-muted)' : '' }}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
