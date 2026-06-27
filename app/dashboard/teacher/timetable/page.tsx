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

export default function TeacherTimetablePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("timetable")
      .select("*")
      .eq("teacher_id", user.id)
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

  const subjectsCount = new Set(entries.map(e => e.subject)).size;
  const classesCount = new Set(entries.map(e => `${e.grade}-${e.section}`)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-800 px-4 md:px-6 pt-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <a href="/dashboard/teacher" className="inline-flex items-center gap-1 text-sm text-indigo-200 hover:text-white mb-3 font-medium">
            <ArrowLeft size={14} /> Back to Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
            🗓️ My Timetable
          </h1>
          <div className="grid grid-cols-3 gap-3 max-w-lg">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">📚</div>
              <div className="text-2xl font-extrabold text-white">{entries.length}</div>
              <div className="text-indigo-200 text-xs mt-0.5">Total Periods</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">📘</div>
              <div className="text-2xl font-extrabold text-white">{subjectsCount}</div>
              <div className="text-indigo-200 text-xs mt-0.5">Subjects</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">🏫</div>
              <div className="text-2xl font-extrabold text-white">{classesCount}</div>
              <div className="text-indigo-200 text-xs mt-0.5">Classes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 -mt-2">
        <p className="text-gray-500 text-sm mb-4">Aapka weekly teaching schedule</p>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : periods.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Calendar className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">Abhi koi period assign nahi hua.</p>
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
                                <div className="text-[11px] mt-0.5 opacity-75">Grade {entry.grade}-{entry.section}</div>
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
