"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" };

const subjectColor: Record<string, string> = {
  Mathematics: "rgba(59,130,246,0.1) rgba(59,130,246,0.3) #3b82f6",
  Science: "rgba(16,185,129,0.1) rgba(16,185,129,0.3) #10b981",
  English: "rgba(139,92,246,0.1) rgba(139,92,246,0.3) #8b5cf6",
  Urdu: "rgba(245,158,11,0.1) rgba(245,158,11,0.3) #f59e0b",
  Islamiat: "rgba(6,182,212,0.1) rgba(6,182,212,0.3) #06b6d4",
  "Social Studies": "rgba(236,72,153,0.1) rgba(236,72,153,0.3) #ec4899",
  Arts: "rgba(224,242,254,0.1) rgba(14,165,233,0.3) #0ea5e9",
  Computer: "rgba(99,102,241,0.1) rgba(99,102,241,0.3) #6366f1",
};

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function StudentTimetablePage() {
  const [student, setStudent] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: studentData } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setStudent(studentData);

    if (!studentData) { setLoading(false); return; }

    const { data } = await supabase
      .from("timetable")
      .select("*")
      .eq("grade", studentData.grade)
      .eq("section", studentData.section)
      .eq("branch_id", studentData.branch_id)
      .order("period_no");

    setEntries(data || []);
    setLoading(false);
  }

  const periods = Array.from(new Set(entries.map(e => e.period_no))).sort((a, b) => a - b);
  const grid: Record<number, Record<string, any>> = {};
  entries.forEach(e => {
    if (!grid[e.period_no]) grid[e.period_no] = {};
    grid[e.period_no][e.day_of_week] = e;
  });

  return (
    <DashboardLayout
      role="student"
      activePath="/dashboard/student/timetable"
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>🗓️ Weekly Class Timetable</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>
      </div>

      {/* Timetable grid card */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading weekly timetable...</div>
        ) : !student ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Student profile not found.</div>
        ) : periods.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Calendar style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Weekly timetable schedule not published yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Period</th>
                  {DAYS.map(d => (
                    <th key={d} style={{ textAlign: 'center' }}>{DAY_LABELS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(p => {
                  const sample = Object.values(grid[p])[0] as any;
                  return (
                    <tr key={p}>
                      <td style={{ verticalAlign: 'top', padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14.5 }}>Period {p}</div>
                        {sample && (
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap' }}>
                            {fmtTime(sample.start_time)} – {fmtTime(sample.end_time)}
                          </div>
                        )}
                      </td>
                      {DAYS.map(d => {
                        const entry = grid[p]?.[d];
                        let bg = 'var(--bg-elevated)';
                        let border = '1px solid var(--border-subtle)';
                        let color = 'var(--text-primary)';
                        if (entry && subjectColor[entry.subject]) {
                          const parts = subjectColor[entry.subject].split(' ');
                          bg = parts[0];
                          border = `1px solid ${parts[1]}`;
                          color = parts[2];
                        }
                        return (
                          <td key={d} style={{ verticalAlign: 'top', padding: '8px 10px' }}>
                            {entry ? (
                              <div style={{ background: bg, border: border, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: color }}>{entry.subject}</div>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}>—</div>
                            )}
                          </td>
                        );
                      })}
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
