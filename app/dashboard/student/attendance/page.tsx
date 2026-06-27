"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const STATUS_COLOR: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-yellow-100 text-yellow-700",
};

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <a href="/dashboard/student" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium">
          <span aria-hidden="true">←</span> Back to Dashboard
        </a>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-3">
          <label className="text-sm text-gray-500 font-medium">Month:</label>
          <input
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className={`rounded-xl border p-3 text-center ${pct >= 75 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className={`text-2xl font-bold ${pct >= 75 ? "text-green-700" : "text-red-700"}`}>{pct}%</div>
            <div className="text-xs text-gray-500">Attendance</div>
          </div>
          <div className="rounded-xl border bg-green-50 border-green-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{present}</div>
            <div className="text-xs text-gray-500">Present</div>
          </div>
          <div className="rounded-xl border bg-red-50 border-red-200 p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{absent}</div>
            <div className="text-xs text-gray-500">Absent</div>
          </div>
          <div className="rounded-xl border bg-yellow-50 border-yellow-200 p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{late}</div>
            <div className="text-xs text-gray-500">Late</div>
          </div>
        </div>

        {total > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Attendance Progress</span>
              <span className={`font-bold ${pct >= 75 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct < 75 && (
              <p className="text-xs text-red-500 mt-2">Warning: Attendance below 75%. Need {75 - pct}% more.</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : !student ? (
            <div className="p-8 text-center text-gray-400">Student profile not found. Contact admin.</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No records found for this month.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Day</th>
                  <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide hidden md:table-cell">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r, i) => {
                  const d = new Date(r.date);
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {d.toLocaleDateString("en-PK", { weekday: "short" })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLOR[r.status] || ""}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">
                        {r.remarks || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
