"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
            <p className="text-gray-500 text-sm mt-1">Class and branch wise summary</p>
          </div>
          <button onClick={exportCSV} disabled={report.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
          <input type="month" value={month} max={new Date().toISOString().slice(0,7)}
            onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Grades</option>
            {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Sections</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: "Overall %", val: `${overallPct}%`, color: overallPct >= 75 ? "text-green-600" : "text-red-600" },
            { label: "Present",   val: totalPresent,     color: "text-green-600" },
            { label: "Absent",    val: totalAbsent,      color: "text-red-600" },
            { label: "Late",      val: totalLate,        color: "text-yellow-600" },
            { label: "Low Att.",  val: lowAtt,           color: "text-red-600" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : report.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Name","Roll","Grade","Section","Branch","Present","Absent","Late","Total","%"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.map((r, i) => (
                    <tr key={i} className={`hover:bg-gray-50 transition-colors ${r.pct < 75 ? "bg-red-50/40" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-500">{r.roll}</td>
                      <td className="px-4 py-3">{r.grade}</td>
                      <td className="px-4 py-3">{r.section}</td>
                      <td className="px-4 py-3 text-gray-500">{r.branch}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{r.present}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{r.absent}</td>
                      <td className="px-4 py-3 text-yellow-600 font-medium">{r.late}</td>
                      <td className="px-4 py-3">{r.total}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.pct >= 75 ? "bg-green-100 text-green-700" : r.pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
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
      </div>
    </div>
  );
}
