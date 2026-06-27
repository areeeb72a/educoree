"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Calendar } from "lucide-react";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS: Record<string, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" };

const subjectColor: Record<string, string> = {
  Mathematics: "bg-blue-50 border-blue-200 text-blue-800",
  Science: "bg-green-50 border-green-200 text-green-800",
  English: "bg-purple-50 border-purple-200 text-purple-800",
  Urdu: "bg-orange-50 border-orange-200 text-orange-800",
  Islamiat: "bg-teal-50 border-teal-200 text-teal-800",
  "Social Studies": "bg-pink-50 border-pink-200 text-pink-800",
  Arts: "bg-yellow-50 border-yellow-200 text-yellow-800",
  Computer: "bg-indigo-50 border-indigo-200 text-indigo-800",
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <a href="/dashboard/student" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium">
          <ArrowLeft size={14} /> Back to Dashboard
        </a>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-500 text-sm mt-1">
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : !student ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Student profile not found. Contact admin.</div>
        ) : periods.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">Abhi timetable set nahi hua.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-3 text-left text-xs text-gray-500 uppercase tracking-wide w-20">Period</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-3 py-3 text-center text-xs text-gray-500 uppercase tracking-wide">{DAY_LABELS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {periods.map(p => {
                  const sample = Object.values(grid[p])[0] as any;
                  return (
                    <tr key={p}>
                      <td className="px-3 py-2 text-sm text-gray-500 align-top">
                        <div className="font-bold text-gray-700">P{p}</div>
                        {sample && <div className="text-[11px] text-gray-400 whitespace-nowrap">{fmtTime(sample.start_time)}–{fmtTime(sample.end_time)}</div>}
                      </td>
                      {DAYS.map(d => {
                        const entry = grid[p]?.[d];
                        return (
                          <td key={d} className="px-2 py-2 align-top">
                            {entry ? (
                              <div className={`rounded-lg border px-2 py-2 text-center ${subjectColor[entry.subject] || "bg-gray-50 border-gray-200 text-gray-700"}`}>
                                <div className="text-xs font-bold">{entry.subject}</div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-300 text-xs py-2">—</div>
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
    </div>
  );
}
