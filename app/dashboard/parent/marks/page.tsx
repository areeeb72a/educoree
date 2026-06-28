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
  const [results, setResults] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGuardianAndChildren(); }, []);
  useEffect(() => { if (selectedChild) fetchResults(); }, [selectedChild, year]);

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
      .select("id, name, grade, section, auto_id")
      .eq("guardian_id", guardianData.id)
      .order("name");

    setChildren(kids || []);
    if (kids && kids.length > 0) setSelectedChild(kids[0].id);
    setLoading(false);
  }

  async function fetchResults() {
    const { data } = await supabase
      .from("results")
      .select("subject, term, marks, total_marks, grade, year")
      .eq("student_id", selectedChild)
      .eq("year", year)
      .eq("status", "published")
      .order("term");

    setResults(data || []);
  }

  const currentChild = children.find(c => c.id === selectedChild);
  const termOrder = ["Term 1", "Term 2", "Term 3", "Final"];
  const byTerm: Record<string, any[]> = {};
  results.forEach(r => {
    if (!byTerm[r.term]) byTerm[r.term] = [];
    byTerm[r.term].push(r);
  });
  const terms = Object.keys(byTerm).sort((a, b) => termOrder.indexOf(a) - termOrder.indexOf(b));

  function termAverage(records: any[]) {
    if (!records.length) return 0;
    const pct = records.reduce((sum, r) => sum + (r.marks / r.total_marks) * 100, 0) / records.length;
    return Math.round(pct);
  }

  return (
    <DashboardLayout
      role="parent"
      activePath="/dashboard/parent/marks"
      onRefresh={fetchResults}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>🏆 Child Report Cards</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentChild ? `${currentChild.name} · Grade ${currentChild.grade} - Section ${currentChild.section}` : "Loading..."}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {children.length > 1 && (
            <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {[year, year - 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Loading grade reports...</div>
      ) : !guardian ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Guardian profile not found.</div>
      ) : children.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No student profiles linked to this parent account.</div>
      ) : terms.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, textAlign: 'center' }}>
          <Award style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No published report cards for this school year.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {terms.map(term => (
            <div key={term} className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{term}</span>
                <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent-purple)' }}>{termAverage(byTerm[term])}% Average</span>
              </div>
              <div className="table-wrap">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th style={{ textAlign: 'center' }}>Marks Obtained</th>
                      <th style={{ textAlign: 'center' }}>Percentage %</th>
                      <th style={{ textAlign: 'center' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTerm[term].map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.subject}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{r.marks} / {r.total_marks}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{Math.round((r.marks / r.total_marks) * 100)}%</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${gradeColor[r.grade]?.split(' ')[0] || "text-gray-400"} ${gradeColor[r.grade]?.split(' ')[1] || "bg-gray-500/10"}`}>{r.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
