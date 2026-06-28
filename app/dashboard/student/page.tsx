"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ClipboardList, BarChart3, BookOpen, Wallet, CalendarDays, ChevronRight } from "lucide-react";
import DashboardLayout from "../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { window.location.href = "/"; return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*, schools(*)")
      .eq("id", user.id)
      .single();
    setProfile(prof);

    const { data: stu } = await supabase
      .from("students")
      .select("name, grade, section, auto_id")
      .eq("user_id", user.id)
      .single();
    setStudent(stu);

    setLoading(false);
  }

  const quickActions = [
    { label: "My Attendance", icon: ClipboardList, color: "var(--accent-emerald, #34D399)", href: "/dashboard/student/attendance" },
    { label: "My Marks", icon: BarChart3, color: "var(--accent-purple, #A78BFA)", href: "/dashboard/student/marks" },
    { label: "Diary & Homework", icon: BookOpen, color: "var(--accent-indigo, #F472B6)", href: "/dashboard/student/diary" },
    { label: "Fee Status", icon: Wallet, color: "var(--accent-amber, #FBBF24)", href: "/dashboard/student/fees" },
    { label: "Timetable", icon: CalendarDays, color: "var(--accent-cyan, #60A5FA)", href: "/dashboard/student/timetable" },
  ];

  return (
    <DashboardLayout
      role="student"
      activePath="/dashboard/student"
      onRefresh={fetchData}
    >
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>Welcome, {student?.name || "Student"} 👋</h2>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Here is your dashboard overview and academic shortcuts.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>Loading student portal...</div>
      ) : (
        <>
          {student && (
            <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20, marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>Name</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{student.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>Class Level</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Grade {student.grade} - {student.section}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>Enrollment ID</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-purple)" }}>
                  {student.auto_id || "Not assigned"}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: "var(--text-primary)" }}>Quick Actions Panel</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="student-quick-grid">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <a
                    key={i}
                    href={action.href}
                    style={{
                      padding: "20px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                      borderRadius: 14, color: "var(--text-primary)", cursor: "pointer", textAlign: "left", textDecoration: "none",
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                      transition: "all 0.18s ease",
                      minHeight: 110
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = action.color;
                      e.currentTarget.style.boxShadow = `0 8px 24px -8px ${action.color}33`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${action.color}1E`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={18} style={{ color: action.color }} />
                      </div>
                      <ChevronRight size={15} style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)" }}>{action.label}</div>
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
