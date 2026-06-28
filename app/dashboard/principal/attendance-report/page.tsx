"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function AttendanceReportPage() {
  const [report, setReport] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const grades = ["1","2","3","4","5","6","7","8","9","10"];
  const sections = ["A","B","C","D"];

  useEffect(() => { fetchBranches(); }, []);
  useEffect(() => { fetchReport(); }, [selectedBranch, selectedGrade, selectedSection, month]);

  async function fetchBranches() {
    const { data } = await supabase.from("branches").select("id, name").order("name");
    setBranches(data || []);
  }

  async function fetchReport() {
    setLoading(true);
    const startDate = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const endStr = endDate.toISOString().split("T")[0];

    let query = supabase
      .from("attendance")
      .select("student_id, status, date, grade, section, branch_id, branches(name), students(name, roll_number, auto_id)")
      .gte("date", startDate)
      .lt("date", endStr);

    if (selectedBranch !== "all") query = query.eq("branch_id", selectedBranch);
    if (selectedGrade !== "all") query = query.eq("grade", selectedGrade);
    if (selectedSection !== "all") query = query.eq("section", selectedSection);

    const { data } = await query;

    const grouped: Record<string, any> = {};
    (data || []).forEach((r: any) => {
      const key = r.student_id;
      if (!grouped[key]) {
        grouped[key] = {
          name: r.students?.name || "Unknown",
          roll: r.students?.roll_number || "-",
          auto_id: r.students?.auto_id || "-",
          grade: r.grade,
          section: r.section,
          branch: r.branches?.name || "-",
          present: 0, absent: 0, late: 0, total: 0
        };
      }
      grouped[key][r.status]++;
      grouped[key].total++;
    });

    const rows = Object.values(grouped).map((r: any) => ({
      ...r,
      pct: r.total ? Math.round((r.present / r.total) * 100) : 0
    }));
    rows.sort((a: any, b: any) => a.grade.localeCompare(b.grade) || a.section.localeCompare(b.section));
    setReport(rows);
    setLoading(false);
  }

  function exportCSV() {
    const headers = ["Name","Roll","Grade","Section","Branch","Present","Absent","Late","Total","%"];
    const rows = report.map(r => [r.name,r.roll,r.grade,r.section,r.branch,r.present,r.absent,r.late,r.total,r.pct+"%"]);
    const csv = [headers,...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance_${month}.csv`; a.click();
  }

  const totalPresent = report.reduce((s,r) => s+r.present, 0);
  const totalAbsent  = report.reduce((s,r) => s+r.absent, 0);
  const totalLate    = report.reduce((s,r) => s+r.late, 0);
  const totalAll     = report.reduce((s,r) => s+r.total, 0);
  const overallPct   = totalAll ? Math.round((totalPresent/totalAll)*100) : 0;
  const lowAtt       = report.filter(r => r.pct < 75).length;

  return (
    <DashboardLayout
      role="principal"
      activePath="/dashboard/principal/attendance-report"
      onRefresh={fetchReport}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📊 Detailed Attendance Report</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Filter and analyze student daily attendance across branches and classrooms.</p>
        </div>
        <button onClick={exportCSV} disabled={report.length === 0}
          style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--accent-emerald)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', opacity: report.length === 0 ? 0.5 : 1 }}>
          Export Excel/CSV
        </button>
      </div>

      {/* Filter panel */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <input type="month" value={month} max={new Date().toISOString().slice(0,7)}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }} />
          
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Grades</option>
            {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>

          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Sections</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: "Overall Ratio", val: `${overallPct}%`, color: overallPct >= 75 ? "var(--accent-emerald)" : "var(--accent-rose)" },
          { label: "Total Present", val: totalPresent, color: "var(--accent-emerald)" },
          { label: "Total Absent", val: totalAbsent, color: "var(--accent-rose)" },
          { label: "Total Late", val: totalLate, color: "var(--accent-amber)" },
          { label: "Low Attendance count", val: lowAtt, color: "var(--accent-rose)" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: color }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Students list table */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading student ledger...</div>
        ) : report.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No student records found.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Branch Location</th>
                  <th style={{ textAlign: 'center' }}>Present</th>
                  <th style={{ textAlign: 'center' }}>Absent</th>
                  <th style={{ textAlign: 'center' }}>Late</th>
                  <th style={{ textAlign: 'center' }}>Total logs</th>
                  <th style={{ textAlign: 'center' }}>Ratio %</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r, i) => (
                  <tr key={i} style={{ background: r.pct < 75 ? 'rgba(244,63,94,0.02)' : 'transparent' }}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</td>
                    <td style={{ color: 'var(--accent-purple)', fontFamily: 'monospace' }}>{r.roll}</td>
                    <td>{r.grade}</td>
                    <td>{r.section}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.branch}</td>
                    <td style={{ textAlign: 'center', color: 'var(--accent-emerald)', fontWeight: 700 }}>{r.present}</td>
                    <td style={{ textAlign: 'center', color: 'var(--accent-rose)', fontWeight: 700 }}>{r.absent}</td>
                    <td style={{ textAlign: 'center', color: 'var(--accent-amber)', fontWeight: 700 }}>{r.late}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{r.total}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${r.pct >= 75 ? "active" : r.pct >= 50 ? "pending" : "inactive"}`}>
                        {r.pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
