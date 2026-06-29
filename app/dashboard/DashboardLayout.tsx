"use client";

import { useState, useEffect, ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  School as SchoolIcon,
  CheckCircle2,
  Crown,
  DollarSign,
  Search,
  RefreshCw,
  Plus,
  LogOut,
  LayoutDashboard,
  BarChart3,
  Layers,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Activity,
  Menu,
  X,
  Database,
  ArrowRight,
  Download,
  Palette,
  ClipboardList,
  BookOpen,
  Calendar,
  MessageSquare,
  Award
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string | number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: "super-admin" | "school-owner" | "principal" | "admin" | "accounts" | "teacher" | "student" | "parent";
  activePath: string;
  onSearchChange?: (val: string) => void;
  onRefresh?: () => void;
}

export default function DashboardLayout({
  children,
  role,
  activePath,
  onSearchChange,
  onRefresh
}: DashboardLayoutProps) {
  const [selectedDesign, setSelectedDesign] = useState<string>("space-navy");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolLogo, setSchoolLogo] = useState("");
  const [ticker, setTicker] = useState<any>(null);

  // Voluntary password change states
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  async function handleSelfChangePassword() {
    if (newPw.length < 6) {
      setPwError("Error: Password kam az kam 6 characters ka ho");
      return;
    }
    setChangingPw(true);
    setPwSuccess("");
    setPwError("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
      }
      setPwSuccess("Password successfully updated!");
      setNewPw("");
    } catch (err: any) {
      setPwError(err.message || "Password change failed.");
    }
    setChangingPw(false);
  }

  useEffect(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem("sa_dashboard_design");
    if (saved === "glow-grid" || saved === "space-navy" || saved === "clean-light") {
      setSelectedDesign(saved === "glow-grid" ? "space-navy" : saved);
    }
    fetchUserSession();
  }, []);

  async function fetchUserSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("*, schools(name, logo_url)")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserName(profile.name || "");
          if (profile.schools) {
            setSchoolName(profile.schools.name || "");
            setSchoolLogo(profile.schools.logo_url || "");
          }
          if (profile.school_id) {
            const { data: tickerData } = await supabase
              .from('school_tickers')
              .select('*')
              .eq('school_id', profile.school_id)
              .eq('active', true)
              .maybeSingle()
            if (tickerData) setTicker(tickerData)
          }
        }
      }
    } catch (err) {
      console.error("Session error:", err);
    }
  }

  const handleDesignChange = (design: string) => {
    setSelectedDesign(design);
    localStorage.setItem("sa_dashboard_design", design);
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // Navigation Items Config
  const roleNavs: Record<string, { section: string; items: NavItem[] }[]> = {
    "super-admin": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/super-admin", icon: LayoutDashboard }
        ]
      },
      {
        section: "System",
        items: [
          { label: "Settings", href: "#settings", icon: Settings }
        ]
      }
    ],
    "school-owner": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/school-owner", icon: LayoutDashboard },
          { label: "Reports & Analytics", href: "/dashboard/school-owner/analytics", icon: BarChart3 }
        ]
      },
      {
        section: "Management",
        items: [
          { label: "Branches", href: "/dashboard/school-owner/branches", icon: SchoolIcon },
          { label: "Teachers", href: "/dashboard/school-owner/teachers", icon: Users },
          { label: "Students", href: "/dashboard/school-owner/students", icon: Users },
          { label: "Fee Overview", href: "/dashboard/school-owner/fees", icon: DollarSign },
          { label: "Attendance Overview", href: "/dashboard/school-owner/attendance-overview", icon: ClipboardList },
          { label: "Emergency Backup", href: "/dashboard/school-owner/backup", icon: Database }
        ]
      }
    ],
    "principal": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/principal", icon: LayoutDashboard },
          { label: "Attendance Report", href: "/dashboard/principal/attendance-report", icon: ClipboardList }
        ]
      }
    ],
    "admin": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
          { label: "CSV Import / Export", href: "/dashboard/admin?tab=import-export", icon: Database }
        ]
      }
    ],
    "accounts": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/accounts", icon: LayoutDashboard }
        ]
      }
    ],
    "teacher": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/teacher", icon: LayoutDashboard }
        ]
      },
      {
        section: "Academic",
        items: [
          { label: "Attendance", href: "/dashboard/teacher/attendance", icon: ClipboardList },
          { label: "Diary & Homework", href: "/dashboard/teacher/diary", icon: BookOpen },
          { label: "Enter Marks", href: "/dashboard/teacher/marks", icon: Award },
          { label: "Timetable", href: "/dashboard/teacher/timetable", icon: Calendar },
          { label: "Messages", href: "/dashboard/teacher/messages", icon: MessageSquare }
        ]
      }
    ],
    "student": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/student", icon: LayoutDashboard }
        ]
      },
      {
        section: "Academic",
        items: [
          { label: "Attendance", href: "/dashboard/student/attendance", icon: ClipboardList },
          { label: "Diary", href: "/dashboard/student/diary", icon: BookOpen },
          { label: "Fees Status", href: "/dashboard/student/fees", icon: DollarSign },
          { label: "Marks Sheet", href: "/dashboard/student/marks", icon: Award },
          { label: "Timetable", href: "/dashboard/student/timetable", icon: Calendar }
        ]
      }
    ],
    "parent": [
      {
        section: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard/parent", icon: LayoutDashboard }
        ]
      },
      {
        section: "Academic",
        items: [
          { label: "Diary & Tasks", href: "/dashboard/parent/diary", icon: BookOpen },
          { label: "Report Cards", href: "/dashboard/parent/marks", icon: Award },
          { label: "Messages", href: "/dashboard/parent/messages", icon: MessageSquare }
        ]
      }
    ]
  };

  const navGroups = roleNavs[role] || [];
  const displayRoleName = role.split("-").map(w => w.toUpperCase()).join(" ");
  const initials = userName ? userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "SA";
  const finalSchoolName = schoolName || "EduCore";

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (onSearchChange) onSearchChange(val);
  };

  return (
    <>
      {/* ════════════════════════════════════════════════════════════ */}
      {/* STYLE TAGS CONDITIONAL MOUNTING                             */}
      {/* ════════════════════════════════════════════════════════════ */}
      {selectedDesign === "space-navy" && (
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          :root {
            --bg-base:        #060B18;
            --bg-surface:     #0D1526;
            --bg-elevated:    #121E35;
            --bg-card:        #0F1B30;
            --border-subtle:  rgba(99, 130, 255, 0.08);
            --border-glow:    rgba(124, 58, 237, 0.25);
            --text-primary:   #F0F4FF;
            --text-secondary: rgba(200, 215, 255, 0.55);
            --text-muted:     rgba(200, 215, 255, 0.3);
            --accent-purple:  #7C3AED;
            --accent-violet:  #8B5CF6;
            --accent-indigo:  #6366F1;
            --accent-cyan:    #06B6D4;
            --accent-emerald: #10B981;
            --accent-amber:   #F59E0B;
            --accent-rose:    #F43F5E;
            --sidebar-w:      240px;
          }

          @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); transition: transform 0.3s ease; }
            .sidebar.open { transform: translateX(0); }
            .main { margin-left: 0 !important; }
            .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
            .charts-row, .bottom-row { grid-template-columns: 1fr !important; }
            .topbar { padding: 0 16px !important; }
            .page-content { padding: 16px 16px 40px !important; }
          }
          @media (max-width: 480px) {
            .kpi-grid { grid-template-columns: 1fr !important; }
            .search-box { display: none !important; }
          }

           ::-webkit-scrollbar { width: 6px; height: 6px; }
           ::-webkit-scrollbar-track { background: transparent; }
           ::-webkit-scrollbar-thumb { background: rgba(200, 215, 255, 0.1); border-radius: 10px; }
           ::-webkit-scrollbar-thumb:hover { background: rgba(200, 215, 255, 0.2); }

           /* ─── CARD ─────────────────────────────────────────────────────── */
           .card {
             background: var(--bg-card);
             border: 1px solid var(--border-subtle);
             border-radius: 16px;
             overflow: hidden;
           }
           .card-header {
             display: flex; align-items: center; justify-content: space-between;
             padding: 18px 22px 16px;
             border-bottom: 1px solid var(--border-subtle);
           }
           .card-title {
             font-size: 13.5px; font-weight: 700;
             display: flex; align-items: center; gap: 8px;
             color: var(--text-primary);
           }
           .card-subtitle { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

           /* ─── KPI CARDS ────────────────────────────────────────────────── */
           .kpi-grid {
             display: grid;
             grid-template-columns: repeat(4, 1fr);
             gap: 16px;
             margin-bottom: 22px;
           }
           .kpi-card {
             background: var(--bg-card);
             border: 1px solid var(--border-subtle);
             border-radius: 16px;
             padding: 20px 22px;
             position: relative;
             overflow: hidden;
             transition: transform 0.2s, box-shadow 0.2s;
             cursor: default;
           }
           .kpi-card:hover {
             transform: translateY(-2px);
             border-color: rgba(124,58,237,0.25);
           }
           .kpi-card::before {
             content: '';
             position: absolute;
             top: 0; left: 0;
             width: 100%; height: 3px;
             border-radius: 16px 16px 0 0;
           }
           .kpi-card.violet::before  { background: linear-gradient(90deg, #7C3AED, #8B5CF6); }
           .kpi-card.emerald::before { background: linear-gradient(90deg, #10B981, #34D399); }
           .kpi-card.amber::before   { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
           .kpi-card.cyan::before    { background: linear-gradient(90deg, #06B6D4, #22D3EE); }

           .kpi-card::after {
             content: '';
             position: absolute;
             bottom: -16px; right: -16px;
             width: 88px; height: 88px;
             border-radius: 50%;
             opacity: 0.05;
           }
           .kpi-card.violet::after  { background: #7C3AED; }
           .kpi-card.emerald::after { background: #10B981; }
           .kpi-card.amber::after   { background: #F59E0B; }
           .kpi-card.cyan::after    { background: #06B6D4; }

           .kpi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
           .kpi-icon-wrap {
             width: 40px; height: 40px; border-radius: 11px;
             display: flex; align-items: center; justify-content: center;
           }
           .kpi-card.violet  .kpi-icon-wrap { background: rgba(124,58,237,0.15); }
           .kpi-card.emerald .kpi-icon-wrap { background: rgba(16,185,129,0.15); }
           .kpi-card.amber   .kpi-icon-wrap { background: rgba(245,158,11,0.15); }
           .kpi-card.cyan    .kpi-icon-wrap { background: rgba(6,182,212,0.15); }

           .kpi-trend {
             display: flex; align-items: center; gap: 4px;
             font-size: 11px; font-weight: 600;
             padding: 3px 8px; border-radius: 20px;
           }
           .kpi-trend.up   { background: rgba(16,185,129,0.12); color: #34D399; }
           .kpi-trend.down { background: rgba(244,63,94,0.12);  color: #F87171; }

           .kpi-label {
             font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
             text-transform: uppercase; color: var(--text-secondary);
             margin-bottom: 6px;
           }
           .kpi-value {
             font-size: 28px; font-weight: 800; letter-spacing: -0.03em;
             line-height: 1;
             color: var(--text-primary);
           }
           .kpi-sub {
             margin-top: 6px; font-size: 11.5px; color: var(--text-muted);
           }

           /* ─── DATA TABLE ───────────────────────────────────────────────── */
           .table-wrap { overflow-x: auto; }
           .data-table {
             width: 100%; border-collapse: collapse;
             text-align: left;
           }
           .data-table th {
             padding: 11px 18px;
             font-size: 10.5px; font-weight: 700; letter-spacing: 0.07em;
             text-transform: uppercase; color: var(--text-muted);
             border-bottom: 1px solid var(--border-subtle);
             white-space: nowrap;
           }
           .data-table td {
             padding: 13px 18px;
             font-size: 13px;
             border-bottom: 1px solid rgba(99,130,255,0.04);
             vertical-align: middle;
             color: var(--text-primary);
           }
           .data-table tr:hover td { background: rgba(124,58,237,0.04); }
           .data-table tr:last-child td { border-bottom: none; }

           .school-info { display: flex; align-items: center; gap: 11px; }
           .school-avatar {
             width: 36px; height: 36px; border-radius: 10px;
             display: flex; align-items: center; justify-content: center;
             font-size: 13px; font-weight: 800; color: #fff;
             flex-shrink: 0;
           }
           .school-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
           .school-domain { font-size: 11px; color: var(--text-muted); }

           /* ─── BADGES ───────────────────────────────────────────────────── */
           .status-badge {
             display: inline-flex; align-items: center; gap: 5px;
             padding: 4px 11px; border-radius: 20px; font-size: 11px; font-weight: 600;
             border: 1px solid;
           }
           .status-badge::before {
             content: ''; width: 6px; height: 6px; border-radius: 50%;
           }
           .status-badge.active   { background: rgba(16,185,129,0.12); color: #34D399; border-color: rgba(16,185,129,0.25); }
           .status-badge.active::before { background: #34D399; }
           .status-badge.inactive { background: rgba(200,215,255,0.06); color: var(--text-muted); border-color: var(--border-subtle); }
           .status-badge.inactive::before { background: var(--text-muted); }

           .plan-tag {
             display: inline-flex; align-items: center; gap: 5px;
             padding: 4px 11px; border-radius: 20px; font-size: 11px; font-weight: 600;
             border: 1px solid;
           }
           .plan-tag.pro     { background: rgba(124,58,237,0.1); color: #A78BFA; border-color: rgba(124,58,237,0.25); }
           .plan-tag.starter { background: rgba(6,182,212,0.1);  color: #22D3EE; border-color: rgba(6,182,212,0.25); }
           .plan-tag.basic   { background: rgba(200,215,255,0.06); color: var(--text-secondary); border-color: var(--border-subtle); }

           .row-actions { display: flex; align-items: center; gap: 6px; }
           .row-btn {
             padding: 5px 11px; border-radius: 7px; font-size: 11.5px; font-weight: 600;
             border: 1px solid var(--border-subtle); cursor: pointer;
             transition: all 0.18s; font-family: 'Inter', sans-serif;
             background: transparent; color: var(--text-secondary);
           }
           .row-btn:hover { background: rgba(124,58,237,0.1); border-color: rgba(124,58,237,0.3); color: var(--text-primary); }

           /* ─── BOTTOM ROW ────────────────────────────────────────────────── */
           .bottom-row {
             display: grid;
             grid-template-columns: 1fr 320px;
             gap: 16px;
             margin-top: 24px;
           }

           /* ─── ACTIVITY FEED ─────────────────────────────────────────────── */
          .activity-body { padding: 14px 0; }
          .activity-item {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 10px 20px; transition: background 0.15s; cursor: default;
          }
          .activity-item:hover { background: rgba(124,58,237,0.04); }
          .activity-icon {
            width: 32px; height: 32px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-top: 1px;
          }
          .activity-text { flex: 1; }
          .activity-main { font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; }
          .activity-main strong { color: var(--text-primary); font-weight: 600; }
          .activity-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

          /* ─── QUICK ACTIONS ─────────────────────────────────────────────── */
          .quick-actions-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
          .quick-btn {
            display: flex; align-items: center; gap: 12px;
            padding: 12px 14px; border-radius: 11px;
            cursor: pointer; transition: all 0.18s;
            border: 1px solid var(--border-subtle);
            background: var(--bg-elevated);
          }
          .quick-btn:hover {
            background: rgba(124,58,237,0.08);
            border-color: rgba(124,58,237,0.25);
            transform: translateX(2px);
          }
          .quick-btn-icon {
            width: 34px; height: 34px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .quick-btn-label { font-size: 12.5px; font-weight: 600; color: var(--text-primary); }
          .quick-btn-sub { font-size: 10.5px; color: var(--text-muted); }
          .quick-btn-arrow { margin-left: auto; color: var(--text-muted); font-size: 16px; }

          /* ─── PROGRESS BAR ──────────────────────────────────────────────── */
          .progress-section {
            padding: 16px 20px 18px;
          }
          .progress-title {
            font-size: 10.5px; font-weight: 700; letter-spacing: 0.07em;
            text-transform: uppercase; color: var(--text-muted);
            margin-bottom: 14px;
          }
          .prog-item { margin-bottom: 12px; }
          .prog-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .prog-label { font-size: 12px; color: var(--text-secondary); }
          .prog-val { font-size: 12px; font-weight: 700; color: var(--text-primary); }
          .prog-track {
            height: 5px; background: rgba(200,215,255,0.07); border-radius: 10px; overflow: hidden;
          }
          .prog-fill { height: 100%; border-radius: 10px; }

          /* ─── ANIMATIONS ────────────────────────────────────────────────── */
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .kpi-card { animation: fadeInUp 0.35s ease both; }
          .kpi-card:nth-child(1) { animation-delay: 0.05s; }
          .kpi-card:nth-child(2) { animation-delay: 0.10s; }
          .kpi-card:nth-child(3) { animation-delay: 0.15s; }
          .kpi-card:nth-child(4) { animation-delay: 0.20s; }

          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .status-badge.active::before { animation: pulse-dot 2s ease-in-out infinite; }
        ` }} />
      )}

      {selectedDesign === "clean-light" && (
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          :root {
            --bg-base:        #F4F6FB;
            --bg-surface:     #FFFFFF;
            --bg-elevated:    #EEF0F8;
            --bg-card:        #FFFFFF;
            --border-subtle:  rgba(99, 102, 241, 0.1);
            --text-primary:   #111827;
            --text-secondary: #4B5563;
            --text-muted:     #9CA3AF;
            --accent-purple:  #7C3AED;
            --accent-violet:  #6D28D9;
            --accent-indigo:  #6366F1;
            --accent-cyan:    #0891B2;
            --accent-emerald: #059669;
            --accent-amber:   #D97706;
            --accent-rose:    #E11D48;
            --sidebar-w:      248px;
            --shadow-card:    0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(99,102,241,0.06);
            --shadow-hover:   0 4px 24px rgba(99,102,241,0.14), 0 1px 4px rgba(0,0,0,0.06);
          }

          @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); transition: transform 0.3s ease; }
            .sidebar.open { transform: translateX(0); }
            .main { margin-left: 0 !important; }
            .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
            .charts-row, .bottom-row { grid-template-columns: 1fr !important; }
            .topbar { padding: 0 16px !important; }
            .page-content { padding: 16px 16px 40px !important; }
          }
          @media (max-width: 480px) {
            .kpi-grid { grid-template-columns: 1fr !important; }
            .search-box { display: none !important; }
          }

          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.15); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }

          /* ─── CARD ─────────────────────────────────────────────────────── */
          .card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: var(--shadow-card);
          }
          .card-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 18px 22px 16px;
            border-bottom: 1px solid var(--border-subtle);
          }
          .card-title {
            font-size: 13.5px; font-weight: 700;
            display: flex; align-items: center; gap: 8px;
            color: var(--text-primary);
          }
          .card-subtitle { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }

          /* ─── KPI CARDS ────────────────────────────────────────────────── */
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 22px;
          }
          .kpi-card {
            background: var(--bg-card);
            border: 1px solid rgba(99,102,241,0.09);
            border-radius: 16px;
            padding: 20px 22px;
            position: relative;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: default;
            box-shadow: var(--shadow-card);
          }
          .kpi-card:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-hover);
          }
          .kpi-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 3px;
            border-radius: 16px 16px 0 0;
          }
          .kpi-card.violet::before  { background: linear-gradient(90deg, #7C3AED, #8B5CF6); }
          .kpi-card.emerald::before { background: linear-gradient(90deg, #059669, #10B981); }
          .kpi-card.amber::before   { background: linear-gradient(90deg, #D97706, #F59E0B); }
          .kpi-card.cyan::before    { background: linear-gradient(90deg, #0891B2, #06B6D4); }

          .kpi-card::after {
            content: '';
            position: absolute;
            bottom: -16px; right: -16px;
            width: 88px; height: 88px;
            border-radius: 50%;
            opacity: 0.05;
          }
          .kpi-card.violet::after  { background: #7C3AED; }
          .kpi-card.emerald::after { background: #059669; }
          .kpi-card.amber::after   { background: #D97706; }
          .kpi-card.cyan::after    { background: #0891B2; }

          .kpi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
          .kpi-icon-wrap {
            width: 40px; height: 40px; border-radius: 11px;
            display: flex; align-items: center; justify-content: center;
          }
          .kpi-card.violet  .kpi-icon-wrap { background: rgba(124,58,237,0.1); }
          .kpi-card.emerald .kpi-icon-wrap { background: rgba(5,150,105,0.1); }
          .kpi-card.amber   .kpi-icon-wrap { background: rgba(217,119,6,0.1); }
          .kpi-card.cyan    .kpi-icon-wrap { background: rgba(8,145,178,0.1); }

          .kpi-trend {
            display: flex; align-items: center; gap: 4px;
            font-size: 11px; font-weight: 600;
            padding: 3px 8px; border-radius: 20px;
          }
          .kpi-trend.up   { background: rgba(16,185,129,0.12); color: #059669; }
          .kpi-trend.down { background: rgba(244,63,94,0.12);  color: #E11D48; }

          .kpi-label {
            font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
            text-transform: uppercase; color: var(--text-secondary);
            margin-bottom: 6px;
          }
          .kpi-value {
            font-size: 28px; font-weight: 800; letter-spacing: -0.03em;
            line-height: 1;
            color: var(--text-primary);
          }
          .kpi-sub {
            margin-top: 6px; font-size: 11.5px; color: var(--text-muted);
          }

          /* ─── DATA TABLE ───────────────────────────────────────────────── */
          .table-wrap { overflow-x: auto; }
          .data-table {
            width: 100%; border-collapse: collapse;
            text-align: left;
          }
          .data-table th {
            padding: 11px 18px;
            font-size: 10.5px; font-weight: 700; letter-spacing: 0.07em;
            text-transform: uppercase; color: var(--text-muted);
            border-bottom: 1px solid var(--border-subtle);
            white-space: nowrap;
          }
          .data-table td {
            padding: 13px 18px;
            font-size: 13px;
            border-bottom: 1px solid rgba(99,102,241,0.05);
            vertical-align: middle;
            color: var(--text-primary);
          }
          .data-table tr:hover td { background: rgba(124,58,237,0.025); }
          .data-table tr:last-child td { border-bottom: none; }

          .school-info { display: flex; align-items: center; gap: 11px; }
          .school-avatar {
            width: 36px; height: 36px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; font-weight: 800; color: #fff;
            flex-shrink: 0;
          }
          .school-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
          .school-domain { font-size: 11px; color: var(--text-muted); }

          /* ─── BADGES ───────────────────────────────────────────────────── */
          .status-badge {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 4px 11px; border-radius: 20px; font-size: 11px; font-weight: 600;
            border: 1px solid;
          }
          .status-badge::before {
            content: ''; width: 6px; height: 6px; border-radius: 50%;
          }
          .status-badge.active   { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
          .status-badge.active::before { background: #10B981; }
          .status-badge.inactive { background: #F9FAFB; color: var(--text-muted); border-color: #E5E7EB; }
          .status-badge.inactive::before { background: #D1D5DB; }

          .plan-tag {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 4px 11px; border-radius: 20px; font-size: 11px; font-weight: 600;
            border: 1px solid;
          }
          .plan-tag.pro     { background: #F5F3FF; color: #5B21B6; border-color: #C4B5FD; }
          .plan-tag.starter { background: #E0F2FE; color: #075985; border-color: #BAE6FD; }
          .plan-tag.basic   { background: #F3F4F6; color: #4B5563; border-color: #E5E7EB; }

          .row-actions { display: flex; align-items: center; gap: 6px; }
          .row-btn {
            padding: 5px 11px; border-radius: 7px; font-size: 11.5px; font-weight: 600;
            border: 1px solid var(--border-subtle); cursor: pointer;
            transition: all 0.18s; font-family: 'Inter', sans-serif;
            background: transparent; color: var(--text-secondary);
          }
          .row-btn:hover { background: rgba(124,58,237,0.06); border-color: rgba(124,58,237,0.2); color: var(--accent-purple); }

          /* ─── BOTTOM ROW ────────────────────────────────────────────────── */
          .bottom-row {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 16px;
            margin-top: 24px;
          }

          /* ─── ACTIVITY FEED ─────────────────────────────────────────────── */
          .activity-body { padding: 14px 0; }
          .activity-item {
            display: flex; align-items: flex-start; gap: 12px;
            padding: 10px 20px; transition: background 0.15s; cursor: default;
          }
          .activity-item:hover { background: rgba(124,58,237,0.02); }
          .activity-icon {
            width: 32px; height: 32px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-top: 1px;
          }
          .activity-text { flex: 1; }
          .activity-main { font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; }
          .activity-main strong { color: var(--text-primary); font-weight: 600; }
          .activity-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

          /* ─── QUICK ACTIONS ─────────────────────────────────────────────── */
          .quick-actions-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
          .quick-btn {
            display: flex; align-items: center; gap: 12px;
            padding: 12px 14px; border-radius: 11px;
            cursor: pointer; transition: all 0.18s;
            border: 1px solid var(--border-subtle);
            background: var(--bg-elevated);
          }
          .quick-btn:hover {
            background: rgba(124,58,237,0.06);
            border-color: rgba(124,58,237,0.2);
            transform: translateX(2px);
          }
          .quick-btn-icon {
            width: 34px; height: 34px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .quick-btn-label { font-size: 12.5px; font-weight: 600; color: var(--text-primary); }
          .quick-btn-sub { font-size: 10.5px; color: var(--text-muted); }
          .quick-btn-arrow { margin-left: auto; color: var(--text-muted); font-size: 16px; }

          /* ─── PROGRESS BAR ──────────────────────────────────────────────── */
          .progress-section {
            padding: 16px 20px 18px;
          }
          .progress-title {
            font-size: 10.5px; font-weight: 700; letter-spacing: 0.07em;
            text-transform: uppercase; color: var(--text-muted);
            margin-bottom: 14px;
          }
          .prog-item { margin-bottom: 12px; }
          .prog-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .prog-label { font-size: 12px; color: var(--text-secondary); }
          .prog-val { font-size: 12px; font-weight: 700; color: var(--text-primary); }
          .prog-track {
            height: 5px; background: rgba(200,215,255,0.07); border-radius: 10px; overflow: hidden;
          }
          .prog-fill { height: 100%; border-radius: 10px; }

          /* ─── ANIMATIONS ────────────────────────────────────────────────── */
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .kpi-card { animation: fadeInUp 0.35s ease both; }
          .kpi-card:nth-child(1) { animation-delay: 0.05s; }
          .kpi-card:nth-child(2) { animation-delay: 0.10s; }
          .kpi-card:nth-child(3) { animation-delay: 0.15s; }
          .kpi-card:nth-child(4) { animation-delay: 0.20s; }

          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .status-badge.active::before { animation: pulse-dot 2s ease-in-out infinite; }
        ` }} />
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* RENDER THE LAYOUT ACCORDING TO SELECTED DESIGN STYLE        */}
      {/* ════════════════════════════════════════════════════════════ */}
        <div style={{
          display: "flex",
          width: "100%",
          minHeight: "100vh",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          fontFamily: "'Inter', sans-serif"
        }}>
          {/* Sidebar */}
          <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} style={{
            width: "var(--sidebar-w)",
            minHeight: "100vh",
            background: "var(--bg-surface)",
            borderRight: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            top: 0, left: 0, bottom: 0,
            zIndex: 100,
            overflow: "hidden",
            boxShadow: selectedDesign === "clean-light" ? "2px 0 24px rgba(99,102,241,0.07)" : "none"
          }}>
            {/* Logo */}
            <div className="sidebar-logo" style={{
              padding: "22px 20px 18px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderBottom: "1px solid var(--border-subtle)"
            }}>
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt="School Logo"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    objectFit: "contain",
                    background: "#fff",
                    padding: "2px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                    flexShrink: 0
                  }}
                />
              ) : (
                <div className="logo-icon" style={{
                  width: "36px", height: "36px",
                  background: "linear-gradient(135deg, #7C3AED, #6366F1)",
                  borderRadius: "10px",
                  display: "flex", alignItems: "center",
                  fontSize: "18px",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
                  flexShrink: 0,
                  justifyContent: "center",
                  color: "#fff"
                }}>🎓</div>
              )}
              <div>
                <div className="logo-text" style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{finalSchoolName}</div>
                <div className="logo-badge" style={{
                  fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em",
                  color: "var(--accent-purple)",
                  background: selectedDesign === "clean-light" ? "rgba(124,58,237,0.08)" : "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  padding: "2px 7px", borderRadius: "30px", marginTop: "2px",
                  textTransform: "uppercase",
                  width: "fit-content"
                }}>{displayRoleName}</div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                className="md-hide"
              >✕</button>
            </div>

            {/* Nav Groups */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
              {navGroups.map((g, idx) => (
                <div className="sidebar-section" key={idx} style={{ padding: "14px 12px 4px" }}>
                  <div className="sidebar-section-label" style={{
                    fontSize: "9.5px", fontWeight: "700", letterSpacing: "0.1em",
                    color: "var(--text-muted)", textTransform: "uppercase",
                    padding: "0 8px", marginBottom: "6px"
                  }}>{g.section}</div>
                  {g.items.map((item) => {
                    const isSettings = item.href === "#settings";
                    const isActive = activePath === item.href;
                    const Icon = item.icon;
                    
                    const handleLinkClick = (e: any) => {
                      if (isSettings) {
                        e.preventDefault();
                        setSettingsOpen(true);
                      }
                    };

                    return (
                      <Link 
                        key={item.label}
                        href={isSettings ? "#" : item.href}
                        onClick={handleLinkClick}
                        className={`nav-item ${isActive ? "active" : ""}`}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "9px 12px", borderRadius: "10px",
                          cursor: "pointer", transition: "all 0.18s ease",
                          color: isActive ? "var(--accent-purple)" : "var(--text-secondary)",
                          fontSize: "13px", fontWeight: isActive ? "600" : "500",
                          marginBottom: "2px",
                          position: "relative", textDecoration: "none",
                          background: isActive 
                            ? (selectedDesign === "clean-light" ? "linear-gradient(90deg, rgba(124,58,237,0.1), rgba(99,102,241,0.03))" : "linear-gradient(90deg, rgba(124,58,237,0.2), rgba(99,102,241,0.08))")
                            : "transparent"
                        }}
                      >
                        {isActive && selectedDesign === "clean-light" && (
                          <span style={{
                            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                            width: "3px", height: "60%", minHeight: "18px",
                            background: "linear-gradient(180deg,#7C3AED,#6366F1)",
                            borderRadius: "0 3px 3px 0"
                          }} />
                        )}
                        <Icon size={18} style={{ color: isActive ? "var(--accent-purple)" : "var(--text-muted)", flexShrink: 0 }} />
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="nav-badge" style={{
                            marginLeft: "auto",
                            background: "var(--accent-purple)",
                            color: "#fff", fontSize: "10px", fontWeight: "700",
                            padding: "1px 7px", borderRadius: "20px"
                          }}>{item.badge}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Sidebar Bottom Profile Card */}
            <div className="sidebar-bottom" style={{ padding: "14px 12px", borderTop: "1px solid var(--border-subtle)" }}>
              <div className="user-card" style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "11px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer", transition: "all 0.18s"
              }}>
                <div className="user-avatar" style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
                  display: "flex", alignItems: "center",
                  fontSize: "12px", fontWeight: "800", color: "#fff",
                  flexShrink: 0,
                  justifyContent: "center"
                }}>{initials}</div>
                <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="user-name" style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName || displayRoleName}</div>
                  <div className="user-role" style={{ fontSize: "10.5px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
                </div>
                <button 
                  onClick={handleSignOut}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "6px",
                    borderRadius: "8px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--accent-rose, #f43f5e)";
                    e.currentTarget.style.background = "rgba(244,63,94,0.08)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "none";
                  }}
                  title="Sign Out"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ transition: "transform 0.2s" }}
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Main Content Container */}
          <main className="main" style={{
            marginLeft: "var(--sidebar-w)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            overflowY: "auto",
            maxHeight: "100vh"
          }}>
            {/* Global Notice Ticker */}
            {ticker && (
              <div style={{
                background: ticker.bg_color || '#DC2626',
                color: ticker.color || '#ffffff',
                padding: '8px 16px',
                fontSize: ticker.font_size || '14px',
                fontFamily: ticker.font_family || 'system-ui',
                direction: ticker.direction === 'rtl' ? 'rtl' : 'ltr',
                overflow: 'hidden',
                position: 'relative',
                whiteSpace: 'nowrap',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                flexShrink: 0,
                zIndex: 60
              }}>
                <style>{`
                  @keyframes marquee {
                    0% { transform: translate3d(${ticker.direction === 'rtl' ? '-100%' : '100%'}, 0, 0); }
                    100% { transform: translate3d(${ticker.direction === 'rtl' ? '100%' : '-100%'}, 0, 0); }
                  }
                  .marquee-content {
                    display: inline-block;
                    padding-left: ${ticker.direction === 'rtl' ? '0' : '20px'};
                    padding-right: ${ticker.direction === 'rtl' ? '20px' : '0'};
                    animation: marquee 20s linear infinite;
                  }
                  .marquee-content:hover {
                    animation-play-state: paused;
                  }
                `}</style>
                <div className="marquee-content">
                  {ticker.text}
                </div>
              </div>
            )}

            {/* Top Header Bar */}
            <header className="topbar" style={{
              position: "sticky", top: 0, zIndex: 50,
              background: selectedDesign === "clean-light" ? "rgba(255,255,255,0.92)" : "rgba(6,11,24,0.85)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid var(--border-subtle)",
              padding: "0 28px",
              height: "62px",
              display: "flex", gap: "16px",
              alignItems: "center",
              boxShadow: selectedDesign === "clean-light" ? "0 1px 0 rgba(99,102,241,0.06)" : "none"
            }}>
              <button 
                onClick={() => setSidebarOpen(true)}
                style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "18px", cursor: "pointer", marginRight: "8px" }}
                className="md-show"
              >
                ☰
              </button>

              <div className="topbar-title" style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "-0.01em", flex: 1 }}>
                Dashboard <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "13px" }}>/ {displayRoleName}</span>
              </div>

              {onSearchChange && (
                <div className="search-box" style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px", padding: "8px 14px",
                  width: "220px", transition: "all 0.2s"
                }}>
                  <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchVal}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{
                      background: "none", border: "none", outline: "none",
                      color: "var(--text-primary)", fontSize: "13px", width: "100%",
                      fontFamily: "'Inter', sans-serif"
                    }}
                  />
                </div>
              )}

              <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Theme Switcher Quick Toggle */}
                <div className="icon-btn" style={{
                  width: "36px", height: "36px", borderRadius: "9px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex", alignItems: "center",
                  cursor: "pointer", transition: "all 0.18s",
                  color: "var(--text-secondary)",
                  position: "relative",
                  justifyContent: "center"
                }} title="Switch Design Theme" onClick={() => setSettingsOpen(true)}>
                  <Palette size={16} className="text-purple-500" />
                </div>

                {onRefresh && (
                  <div className="icon-btn" style={{
                    width: "36px", height: "36px", borderRadius: "9px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex", alignItems: "center",
                    cursor: "pointer", transition: "all 0.18s",
                    color: "var(--text-secondary)",
                    position: "relative",
                    justifyContent: "center"
                  }} title="Refresh Data" onClick={onRefresh}>
                    <RefreshCw size={15} />
                  </div>
                )}
              </div>
            </header>

            {/* Dashboard Inner Children Content */}
            <div className="page-content" style={{ padding: "24px 28px 48px" }}>
              {children}
            </div>
          </main>
        </div>


      {/* Settings Drawer switcher */}
      {settingsOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6,11,24,0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "flex-end",
          zIndex: 300
        }}>
          <div style={{
            background: "var(--bg-surface, #0D1526)",
            width: "100%",
            maxWidth: "360px",
            height: "100vh",
            borderLeft: "1px solid var(--border-subtle, rgba(99, 130, 255, 0.08))",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "-10px 0 30px rgba(0,0,0,0.5)"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Palette size={18} style={{ color: "var(--accent-violet, #8B5CF6)" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>Theme Customization</h3>
                </div>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>
                Choose your layout interface design. Switching will affect all portals globally.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Space Navy */}
                <div 
                  onClick={() => handleDesignChange("space-navy")}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: selectedDesign === "space-navy" ? "rgba(124, 58, 237, 0.12)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedDesign === "space-navy" ? "var(--accent-purple, #7C3AED)" : "var(--border-subtle)"}`,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Space Navy Command (Dark)</span>
                    <span style={{
                      width: "16px", height: "16px", borderRadius: "50%",
                      border: "2px solid #7C3AED", display: "flex", alignItems: "center", justifyContent: "center",
                      background: selectedDesign === "space-navy" ? "#7C3AED" : "transparent"
                    }}>
                      {selectedDesign === "space-navy" && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }}></span>}
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "rgba(128,128,128,0.7)" }}>
                    Deep space dark colors, glowing borders, custom progress meters, audit activity feed.
                  </p>
                </div>

                {/* Clean Light */}
                <div 
                  onClick={() => handleDesignChange("clean-light")}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: selectedDesign === "clean-light" ? "rgba(124, 58, 237, 0.12)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedDesign === "clean-light" ? "var(--accent-purple, #7C3AED)" : "var(--border-subtle)"}`,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Clean Light Dashboard (Light)</span>
                    <span style={{
                      width: "16px", height: "16px", borderRadius: "50%",
                      border: "2px solid #7C3AED", display: "flex", alignItems: "center", justifyContent: "center",
                      background: selectedDesign === "clean-light" ? "#7C3AED" : "transparent"
                    }}>
                      {selectedDesign === "clean-light" && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }}></span>}
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "rgba(128,128,128,0.7)" }}>
                    Modern, professional light theme, crisp grey-blue background, soft borders, and shadows.
                  </p>
                </div>

              {/* Divider & Change Password Section */}
              <div style={{ margin: "24px 0 16px", borderTop: "1px solid var(--border-subtle)" }}></div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <ShieldCheck size={18} style={{ color: "var(--accent-violet, #8B5CF6)" }} />
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>Account Security</h3>
              </div>
              <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                Apna login password voluntary change karne ke liye naya password enter karen.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  type="password"
                  placeholder="Naya password (min 6 characters)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px", fontSize: "12.5px",
                    color: "var(--text-primary)", outline: "none",
                    boxSizing: "border-box"
                  }}
                />

                {pwError && <div style={{ fontSize: "11px", color: "#F87171" }}>{pwError}</div>}
                {pwSuccess && <div style={{ fontSize: "11px", color: "#34D399" }}>{pwSuccess}</div>}

                <button
                  onClick={handleSelfChangePassword}
                  disabled={changingPw}
                  style={{
                    width: "100%", padding: "10px",
                    borderRadius: "8px", border: "none",
                    background: "linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))",
                    color: "#fff", fontWeight: "700",
                    fontSize: "12.5px", cursor: "pointer",
                    transition: "opacity 0.15s",
                    opacity: changingPw ? 0.6 : 1
                  }}
                >
                  {changingPw ? "Updating..." : "Change Password"}
                </button>
              </div>

              </div>
            </div>

            <button 
              onClick={() => setSettingsOpen(false)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "none",
                color: selectedDesign === "clean-light" ? "#111827" : "#fff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
