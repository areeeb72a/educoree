"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ClipboardEdit, BarChart3, BookOpen, CalendarDays, MessageCircle, ChevronRight } from "lucide-react";

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const quickActions = [
    { label: "Mark Attendance", icon: ClipboardEdit, color: "#34D399", href: "/dashboard/teacher/attendance" },
    { label: "Enter Marks", icon: BarChart3, color: "#A78BFA", href: "/dashboard/teacher/marks" },
    { label: "Diary / Homework", icon: BookOpen, color: "#F472B6", href: "/dashboard/teacher/diary" },
    { label: "View Timetable", icon: CalendarDays, color: "#60A5FA", href: "/dashboard/teacher/timetable" },
    { label: "Message Parents", icon: MessageCircle, color: "#FB923C", href: "/dashboard/teacher/messages" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#07050F", fontFamily: "sans-serif", color: "#fff" }}>
      {/* Header */}
      <div style={{ background: "#12102A", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>📚</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{profile?.schools?.name || "EduCore"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              Teacher Dashboard{profile?.name ? ` · ${profile.name}` : ""}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{ padding: "8px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 13, cursor: "pointer" }}
        >
          Sign Out
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.4)" }}>Loading...</div>
      ) : (
        <div style={{ padding: "20px 24px 48px" }}>
          {/* Quick Actions */}
          <div style={{ background: "#12102A", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Quick Actions</div>
            <style>{`
              .teacher-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
              @media (max-width: 900px) {
                .teacher-quick-grid { grid-template-columns: repeat(2, 1fr) !important; }
              }
              @media (max-width: 560px) {
                .teacher-quick-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
            <div className="teacher-quick-grid">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <a
                    key={i}
                    href={action.href}
                    style={{
                      padding: "18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12, color: "#fff", cursor: "pointer", textAlign: "left", textDecoration: "none",
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                      transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.border = `1px solid ${action.color}99`;
                      e.currentTarget.style.boxShadow = `0 8px 20px -8px ${action.color}55`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${action.color}1E`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={18} style={{ color: action.color }} />
                      </div>
                      <ChevronRight size={15} style={{ color: "rgba(255,255,255,0.25)" }} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{action.label}</div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
