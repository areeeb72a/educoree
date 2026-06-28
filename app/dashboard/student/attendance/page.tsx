"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [month]);

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

    const startDate = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const endStr = endDate.toISOString().split("T")[0];

    const { data } = await supabase
      .from("attendance")
      .select("date, status, remarks, grade, section")
      .eq("student_id", studentData.id)
      .gte("date", startDate)
      .lt("date", endStr)
      .order("date", { ascending: false });

    setRecords(data || []);
    setLoading(false);
  }

  const total = records.length;
  const present = records.filter(r => r.status === "present").length;
  const absent = records.filter(r => r.status === "absent").length;
  const late = records.filter(r => r.status === "late").length;
  const pct = total ? Math.round((present / total) * 100) : 0;

  return (
    <DashboardLayout
      role="student"
      activePath="/dashboard/student/attendance"
      onRefresh={fetchData}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📊 My Attendance</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Month:</label>
          <input
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* KPI stats */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: pct >= 75 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{pct}%</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Attendance Ratio</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-emerald)' }}>{present}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Present Logs</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-rose)' }}>{absent}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Absent Logs</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-amber)' }}>{late}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>Late Logs</div>
        </div>
      </div>

      {total > 0 && (
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Attendance Progress bar</span>
            <span style={{ fontWeight: 800, color: pct >= 75 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{pct}%</span>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, overflow: 'hidden', height: 8 }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 10, background: pct >= 75 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)' }} />
          </div>
          {pct < 75 && (
            <p style={{ fontSize: 12, color: 'var(--accent-rose)', marginTop: 8, fontWeight: 600 }}>⚠️ Alert: Your attendance ratio is below the 75% system requirement threshold.</p>
          )}
        </div>
      )}

      {/* Table grid */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading logs...</div>
        ) : !student ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Student profile not found.</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded for this month.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const d = new Date(r.date);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {d.toLocaleDateString("en-PK", { weekday: "long" })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${r.status === "present" ? "active" : r.status === "absent" ? "inactive" : "pending"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{r.remarks || "—"}</td>
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
