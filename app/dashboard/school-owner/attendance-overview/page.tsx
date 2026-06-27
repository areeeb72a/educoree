"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function OwnerAttendanceOverview() {
  const [overview, setOverview] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

  useEffect(() => { fetchOverview(); }, [month]);
  useEffect(() => { fetchToday(); }, []);

  async function fetchToday() {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("attendance").select("status").eq("date", today);
    const stats = { present: 0, absent: 0, late: 0, total: 0 };
    (data || []).forEach((r: any) => { stats[r.status as keyof typeof stats]++; stats.total++; });
    setTodayStats(stats);
  }

  async function fetchOverview() {
    setLoading(true);
    const startDate = `${month}-01`;
    const endDate = new Date(month + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const endStr = endDate.toISOString().split("T")[0];

    const { data } = await supabase
      .from("attendance")
      .select("branch_id, status, branches(name)")
      .gte("date", startDate)
      .lt("date", endStr);

    const grouped: Record<string, any> = {};
    (data || []).forEach((r: any) => {
      const bid = r.branch_id;
      if (!grouped[bid]) {
        grouped[bid] = { name: r.branches?.name || bid, present: 0, absent: 0, late: 0, total: 0 };
      }
      grouped[bid][r.status]++;
      grouped[bid].total++;
    });

    const rows = Object.values(grouped).map((b: any) => ({
      ...b,
      pct: b.total ? Math.round((b.present / b.total) * 100) : 0
    }));
    rows.sort((a: any, b: any) => b.pct - a.pct);
    setOverview(rows);
    setLoading(false);
  }

  const totals = overview.reduce(
    (acc, b) => ({ present: acc.present+b.present, absent: acc.absent+b.absent, late: acc.late+b.late, total: acc.total+b.total }),
    { present: 0, absent: 0, late: 0, total: 0 }
  );
  const overallPct = totals.total ? Math.round((totals.present/totals.total)*100) : 0;
  const todayPct   = todayStats.total ? Math.round((todayStats.present/todayStats.total)*100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        <a href="/dashboard/school-owner" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium">
          <span aria-hidden="true">←</span> Back to Dashboard
        </a>

        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">School Attendance Overview</h1>
            <p className="text-gray-500 text-sm mt-1">All branches monthly summary</p>
          </div>
          <input type="month" value={month} max={new Date().toISOString().slice(0,7)}
            onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 mb-5 text-white">
          <div className="text-sm opacity-80 mb-3 font-medium">Today at a Glance</div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Attendance %", val: `${todayPct}%` },
              { label: "Present", val: todayStats.present },
              { label: "Absent",  val: todayStats.absent },
              { label: "Late",    val: todayStats.late },
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="text-2xl font-bold">{val}</div>
                <div className="text-xs opacity-70">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Monthly %", val: `${overallPct}%`, color: overallPct >= 75 ? "text-green-600" : "text-red-600" },
            { label: "Present",   val: totals.present,   color: "text-green-600" },
            { label: "Absent",    val: totals.absent,    color: "text-red-600" },
            { label: "Late",      val: totals.late,      color: "text-yellow-600" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Branch-wise Breakdown</h2>
            <span className="text-xs text-gray-400">{overview.length} branches</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : overview.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No data for this month.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {overview.map((branch, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-medium text-gray-900">{branch.name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {branch.present}P &middot; {branch.absent}A &middot; {branch.late}L &middot; {branch.total} total
                      </span>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      branch.pct >= 75 ? "bg-green-100 text-green-700" :
                      branch.pct >= 50 ? "bg-yellow-100 text-yellow-700" :
                                         "bg-red-100 text-red-700"
                    }`}>{branch.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${
                      branch.pct >= 75 ? "bg-green-500" :
                      branch.pct >= 50 ? "bg-yellow-500" : "bg-red-500"
                    }`} style={{ width: `${branch.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
