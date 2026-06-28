"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ClipboardEdit, BarChart3, BookOpen, CalendarDays, MessageCircle, ChevronRight } from "lucide-react";
import DashboardLayout from "../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function TeacherDashboard() {
  const [profile, setProfile] = useState<any>(null);
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
    setLoading(false);
  }

  const quickActions = [
    { label: "Mark Attendance", icon: ClipboardEdit, color: "var(--accent-emerald, #10B981)", href: "/dashboard/teacher/attendance" },
    { label: "Enter Marks", icon: BarChart3, color: "var(--accent-purple, #7C3AED)", href: "/dashboard/teacher/marks" },
    { label: "Diary & Homework", icon: BookOpen, color: "var(--accent-indigo, #6366F1)", href: "/dashboard/teacher/diary" },
    { label: "View Timetable", icon: CalendarDays, color: "var(--accent-cyan, #06B6D4)", href: "/dashboard/teacher/timetable" },
    { label: "Message Parents", icon: MessageCircle, color: "var(--accent-amber, #F59E0B)", href: "/dashboard/teacher/messages" },
  ];

  return (
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher"
      onRefresh={fetchData}
    >
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>Welcome back{profile?.name ? `, ${profile.name}` : ""} 👋</h2>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Here are your academic controls and quick action tools.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>Loading academic portal...</div>
      ) : (
        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: "var(--text-primary)" }}>Quick Actions Panel</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="teacher-quick-grid">
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
      )}
    </DashboardLayout>
  );
}
