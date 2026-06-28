"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Percent, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

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
    <DashboardLayout
      role="school-owner"
      activePath="/dashboard/school-owner/attendance-overview"
      onRefresh={fetchOverview}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📊 School Attendance Overview</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Daily metrics and monthly summaries across all branch locations.</p>
        </div>
        <input type="month" value={month} max={new Date().toISOString().slice(0,7)}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }} />
      </div>

      {/* Today glance container */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', borderRadius: 16, padding: 22, color: '#fff', marginBottom: 20 }}>
        <div style={{ fontSize: 12.5, opacity: 0.8, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase' }}>Today at a Glance</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: "Attendance Ratio", val: `${todayPct}%` },
            { label: "Present count", val: todayStats.present },
            { label: "Absent count",  val: todayStats.absent },
            { label: "Late count",    val: todayStats.late },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{val}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Stats row */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: "Monthly Ratio %", val: `${overallPct}%`, color: overallPct >= 75 ? "var(--accent-emerald)" : "var(--accent-rose)", icon: Percent, name: overallPct >= 75 ? "emerald" : "amber" },
          { label: "Total Present",   val: totals.present,   color: "var(--accent-emerald)", icon: CheckCircle2, name: "emerald" },
          { label: "Total Absent",    val: totals.absent,    color: "var(--accent-rose)", icon: XCircle, name: "amber" },
          { label: "Total Late",      val: totals.late,      color: "var(--accent-amber)", icon: AlertTriangle, name: "cyan" },
        ].map(({ label, val, color, icon, name }) => {
          const Icon = icon
          return (
            <div key={label} className={`kpi-card ${name}`} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '18px 20px',
              borderTop: `3px solid ${color}`,
              minHeight: 108, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3, fontWeight: "600", textTransform: "uppercase" }}>{label}</div>
                <Icon size={18} style={{ color: color, flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{val}</div>
            </div>
          )
        })}
      </div>

      {/* Branch wise Breakdown card */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 700 }}>Branch-wise Breakdown</h3>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{overview.length} BRANCHES</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : overview.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No attendance logs for this month.</div>
        ) : (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {overview.map((branch, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{branch.name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 8 }}>
                      ({branch.present} Present · {branch.absent} Absent · {branch.late} Late · {branch.total} Total logs)
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                    background: branch.pct >= 75 ? 'rgba(16,185,129,0.1)' : branch.pct >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)',
                    color: branch.pct >= 75 ? 'var(--accent-emerald)' : branch.pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                  }}>{branch.pct}%</span>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, overflow: 'hidden', height: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 10, width: `${branch.pct}%`,
                    background: branch.pct >= 75 ? 'var(--accent-emerald)' : branch.pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
