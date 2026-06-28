"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  School as SchoolIcon,
  CheckCircle2,
  Crown,
  DollarSign,
  Plus,
  TrendingUp
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import DashboardLayout from "../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const PLAN_TIERS: Record<string, { label: string; maxBranches: number; price: number }> = {
  basic: { label: "Basic", maxBranches: 1, price: 15000 },
  pro: { label: "Pro", maxBranches: 5, price: 20000 },
  premium: { label: "Premium", maxBranches: 10, price: 30000 },
  unlimited: { label: "Unlimited", maxBranches: 99, price: 50000 },
};

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboard, setShowOnboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [chartMode, setChartMode] = useState("mrr"); // 'mrr' or 'schools'
  const [mounted, setMounted] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState("space-navy");

  // Onboard Form State
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolCity, setSchoolCity] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [plan, setPlan] = useState("pro");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchSchools();
    const saved = localStorage.getItem("sa_dashboard_design");
    if (saved) setSelectedDesign(saved);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("sa_dashboard_design");
      if (saved) setSelectedDesign(saved);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  async function fetchSchools() {
    setLoading(true);
    const { data } = await supabase.from("schools").select("*").order("created_at", { ascending: false });
    setSchools(data || []);
    setLoading(false);
  }

  async function onboardSchool() {
    if (!schoolName || !schoolCode || !schoolCity || !ownerName || !ownerEmail || !ownerPassword) {
      setMsg("Error: Please fill all fields.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .insert({
          name: schoolName,
          code: schoolCode.toUpperCase(),
          plan,
          city: schoolCity,
          max_branches: PLAN_TIERS[plan].maxBranches,
          active: true,
        })
        .select()
        .single();
      if (schoolError) throw schoolError;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: ownerPassword,
      });
      if (authError) throw authError;

      await supabase.from("profiles").insert({
        id: authData.user!.id,
        school_id: school.id,
        role: "school_owner",
        auto_id: schoolCode.toUpperCase() + "-OWN-001",
        name: ownerName,
      });

      await supabase.from("schools").update({ owner_id: authData.user!.id }).eq("id", school.id);

      setMsg("Success: School onboarded successfully!");
      setSchoolName("");
      setSchoolCode("");
      setSchoolCity("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      fetchSchools();
      setTimeout(() => setShowOnboard(false), 1500);
    } catch (err: any) {
      setMsg("Error: " + err.message);
    }
    setSaving(false);
  }

  // Derived KPIs
  const totalSchoolsCount = schools.length;
  const activeSchoolsCount = schools.filter((s) => s.active).length;
  const proPlanCount = schools.filter((s) => s.plan === "pro").length;
  const totalMRR = schools
    .filter((s) => s.active)
    .reduce((sum, s) => sum + (PLAN_TIERS[s.plan]?.price || 0), 0);

  // Filter & Search logic
  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && s.active) ||
      (activeTab === "trial" && !s.active);

    return matchesSearch && matchesTab;
  });

  // Recharts/Donut segment calculations
  const basicCount = schools.filter((s) => s.plan === "basic").length;
  const proCount = schools.filter((s) => s.plan === "pro").length;
  const premiumCount = schools.filter((s) => s.plan === "premium").length;
  const unlimitedCount = schools.filter((s) => s.plan === "unlimited").length;

  const totalSegments = basicCount + proCount + premiumCount + unlimitedCount || 1;
  const segments = [
    { label: "Pro Plan", count: proCount, color: "#7C3AED" },
    { label: "Premium", count: premiumCount, color: selectedDesign === "clean-light" ? "#0891B2" : "#8B5CF6" },
    { label: "Basic", count: basicCount, color: selectedDesign === "clean-light" ? "#D1D5DB" : "#4B5563" },
    { label: "Unlimited", count: unlimitedCount, color: selectedDesign === "clean-light" ? "#059669" : "#06B6D4" },
  ].filter((s) => s.count > 0);

  // Cumulative offset calculator for SVG Donut slices
  let currentOffset = 0;
  const donutSegments = segments.map((s) => {
    const pct = s.count / totalSegments;
    const dashArray = `${pct * 339.29} ${339.29}`; // 2 * PI * 54 = 339.29
    const dashOffset = -currentOffset;
    currentOffset += pct * 339.29;
    return { ...s, pct, dashArray, dashOffset };
  });

  // Revenue/Schools trend data
  const trendData = [
    { month: "Nov", revenue: 42000, schools: 4 },
    { month: "Dec", revenue: 51000, schools: 6 },
    { month: "Jan", revenue: 55000, schools: 7 },
    { month: "Feb", revenue: 58000, schools: 8 },
    { month: "Mar", revenue: 63000, schools: 9 },
    { month: "Apr", revenue: 69000, schools: 10 },
    { month: "May", revenue: 71000, schools: 11 },
    { month: "Jun", revenue: totalMRR > 0 ? totalMRR : 84000, schools: totalSchoolsCount > 0 ? totalSchoolsCount : 12 },
  ];

  const maxVal = Math.max(...trendData.map((d) => (chartMode === "mrr" ? d.revenue : d.schools)));

  // Simulated Recent Activities
  const recentActivities = [
    {
      icon: "🏫",
      iconBg: selectedDesign === "clean-light" ? "rgba(124,58,237,0.1)" : "rgba(124,58,237,0.15)",
      text: "<strong>Beacon House Academy</strong> upgraded to Pro Plan",
      time: "2 hours ago",
    },
    {
      icon: "✅",
      iconBg: selectedDesign === "clean-light" ? "rgba(5,150,105,0.1)" : "rgba(16,185,129,0.15)",
      text: "<strong>New Era Academy</strong> completed email verification",
      time: "5 hours ago",
    },
    {
      icon: "💳",
      iconBg: selectedDesign === "clean-light" ? "rgba(8,145,178,0.1)" : "rgba(6,182,212,0.12)",
      text: "<strong>Roots International</strong> renewed subscription",
      time: "1 day ago",
    },
    {
      icon: "⚙️",
      iconBg: selectedDesign === "clean-light" ? "rgba(99,102,241,0.08)" : "rgba(245,158,11,0.12)",
      text: "Daily database backup completed successfully",
      time: "1 day ago",
    },
    {
      icon: "⚠️",
      iconBg: selectedDesign === "clean-light" ? "rgba(225,29,72,0.1)" : "rgba(244,63,94,0.12)",
      text: "Apex Grammar School reached 90% branch quota limit",
      time: "2 days ago",
    },
  ];

  const exportToCSV = () => {
    const headers = "Name,Code,City,Plan,Status,Max Branches\n";
    const rows = schools
      .map((s) => `"${s.name}","${s.code}","${s.city}","${s.plan}","${s.active ? "Active" : "Suspended"}",${s.max_branches}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `educore_schools_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  };

  return (
    <DashboardLayout
      role="super-admin"
      activePath="/dashboard/super-admin"
      onSearchChange={(val) => setSearchQuery(val)}
      onRefresh={fetchSchools}
    >
      {/* 1. Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "22px" }}>
        <div>
          <div className="page-header-title" style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>Platform Overview</div>
          <div className="page-header-sub" style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>Monitor all schools, revenue, and system health in real-time.</div>
        </div>
        <div className="live-indicator" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--text-muted)" }}>
          <div className="live-dot" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10B981" }}></div>
          Live · Updated just now
        </div>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "22px" }}>
        {/* Total Schools */}
        <div className="kpi-card violet">
          <div className="kpi-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
            <div className="kpi-icon-wrap" style={{ width: "42px", height: "42px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SchoolIcon size={20} style={{ color: "#7C3AED" }} />
            </div>
            <div className="kpi-trend up" style={{ fontSize: "11px", fontWeight: "700" }}>▲ 3 this month</div>
          </div>
          <div className="kpi-label">Total Schools</div>
          <div className="kpi-value">{totalSchoolsCount}</div>
          <div className="kpi-sub">+33% growth from last quarter</div>
        </div>

        {/* Active Schools */}
        <div className="kpi-card emerald">
          <div className="kpi-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
            <div className="kpi-icon-wrap" style={{ width: "42px", height: "42px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={20} style={{ color: "#059669" }} />
            </div>
            <div className="kpi-trend up" style={{ fontSize: "11px", fontWeight: "700" }}>▲ {((activeSchoolsCount / (totalSchoolsCount || 1)) * 100).toFixed(1)}%</div>
          </div>
          <div className="kpi-label">Active Schools</div>
          <div className="kpi-value">{activeSchoolsCount}</div>
          <div className="kpi-sub">1 on trial · 0 suspended</div>
        </div>

        {/* Pro Plan */}
        <div className="kpi-card amber">
          <div className="kpi-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
            <div className="kpi-icon-wrap" style={{ width: "42px", height: "42px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Crown size={20} style={{ color: "#D97706" }} />
            </div>
            <div className="kpi-trend up" style={{ fontSize: "11px", fontWeight: "700" }}>▲ 2 upgrades</div>
          </div>
          <div className="kpi-label">Pro Plan</div>
          <div className="kpi-value">{proPlanCount}</div>
          <div className="kpi-sub">{((proPlanCount / (totalSchoolsCount || 1)) * 100).toFixed(1)}% of all schools</div>
        </div>

        {/* MRR */}
        <div className="kpi-card cyan">
          <div className="kpi-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
            <div className="kpi-icon-wrap" style={{ width: "42px", height: "42px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={20} style={{ color: "#0891B2" }} />
            </div>
            <div className="kpi-trend up" style={{ fontSize: "11px", fontWeight: "700" }}>▲ 18.2%</div>
          </div>
          <div className="kpi-label">MRR (PKR)</div>
          <div className="kpi-value">₨{(totalMRR / 1000).toFixed(0)}K</div>
          <div className="kpi-sub">vs ₨71K last month</div>
        </div>
      </div>

      {/* 3. Charts Row */}
      <div className="charts-row" style={{ display: "grid", gridTemplateColumns: selectedDesign === "glow-grid" ? "1fr" : "1fr 320px", gap: "16px", marginBottom: "20px" }}>
        {/* Revenue Trend Chart */}
        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
          <div className="card-header" style={{ display: "flex", alignItems: "center", padding: "18px 22px 16px", borderBottom: "1px solid var(--border-subtle)", justifyContent: "space-between" }}>
            <div>
              <div className="card-title" style={{ fontSize: "13.5px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp size={15} style={{ color: "var(--accent-purple)" }} />
                {chartMode === "mrr" ? "Revenue Trend" : "Registered Institutions Growth"}
              </div>
              <div className="card-subtitle" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {chartMode === "mrr" ? "Monthly recurring revenue — last 8 months" : "Accumulated schools count — last 8 months"}
              </div>
            </div>
            <div className="tab-group" style={{ display: "flex", gap: "2px", background: "var(--bg-elevated)", borderRadius: "9px", padding: "3px", border: "1px solid var(--border-subtle)" }}>
              <div className={`tab ${chartMode === "mrr" ? "active" : ""}`} onClick={() => setChartMode("mrr")} style={{ fontSize: "11px", fontWeight: "600", padding: "4px 12px", borderRadius: "7px", cursor: "pointer" }}>MRR</div>
              <div className={`tab ${chartMode === "schools" ? "active" : ""}`} onClick={() => setChartMode("schools")} style={{ fontSize: "11px", fontWeight: "600", padding: "4px 12px", borderRadius: "7px", cursor: "pointer" }}>Schools</div>
            </div>
          </div>
          <div className="chart-body" style={{ padding: "20px 22px" }}>
            {selectedDesign === "glow-grid" ? (
              <div style={{ height: 180, width: "100%" }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip contentStyle={{ background: "#0D1526", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#F8FAFC" }} formatter={(v: any) => [`Rs. ${v.toLocaleString()}`, "MRR"]} />
                      <Bar dataKey="revenue" fill="url(#revGrad)" radius={[4, 4, 0, 0]} barSize={32}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#06B6D4" />
                          </linearGradient>
                        </defs>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <div className="bar-chart-wrap" style={{ position: "relative", height: "180px", display: "flex", alignItems: "flex-end", gap: "10px" }}>
                <div className="chart-x-lines" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                  <div className="x-line" style={{ borderTop: "1px dashed var(--border-subtle)", width: "100%" }}></div>
                  <div className="x-line" style={{ borderTop: "1px dashed var(--border-subtle)", width: "100%" }}></div>
                  <div className="x-line" style={{ borderTop: "1px dashed var(--border-subtle)", width: "100%" }}></div>
                  <div className="x-line" style={{ borderTop: "1px dashed var(--border-subtle)", width: "100%" }}></div>
                </div>
                {trendData.map((d, i) => {
                  const val = chartMode === "mrr" ? d.revenue : d.schools;
                  const pct = (val / (maxVal || 1)) * 100;
                  return (
                    <div key={i} className="bar-col" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div className="bar-track" style={{ width: "100%", position: "relative", display: "flex", alignItems: "flex-end", height: "150px" }}>
                        <div 
                          className={`bar-fill ${i === trendData.length - 1 ? "primary" : "light"}`} 
                          style={{ 
                            height: `${pct}%`,
                            width: "100%", borderRadius: "6px 6px 0 0",
                            cursor: "pointer", position: "relative",
                            background: i === trendData.length - 1 
                              ? "linear-gradient(180deg, var(--accent-purple), var(--accent-violet))" 
                              : "linear-gradient(180deg, rgba(124,58,237,0.2), rgba(124,58,237,0.05))"
                          }}
                          data-val={chartMode === "mrr" ? `₨${(d.revenue / 1000).toFixed(0)}K` : `${d.schools} Schools`}
                        ></div>
                      </div>
                      <div className="bar-label" style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "500" }}>{d.month}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Plan Distribution Donut */}
        {selectedDesign !== "glow-grid" && (
          <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
            <div className="card-header" style={{ display: "flex", alignItems: "center", padding: "18px 22px 16px", borderBottom: "1px solid var(--border-subtle)", justifyContent: "space-between" }}>
              <div>
                <div className="card-title" style={{ fontSize: "13.5px", fontWeight: "700" }}>Plan Distribution</div>
                <div className="card-subtitle" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Across all {totalSchoolsCount} schools</div>
              </div>
            </div>
            <div className="plan-chart-body" style={{ padding: "22px 22px 18px" }}>
              <div className="donut-wrap" style={{ display: "flex", alignItems: "center", marginBottom: "22px", position: "relative", justifyContent: "center" }}>
                <svg width="148" height="148" viewBox="0 0 148 148">
                  <circle cx="74" cy="74" r="54" fill="none" stroke="rgba(200,215,255,0.04)" strokeWidth="22"/>
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="74"
                      cy="74"
                      r="54"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="22"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="butt"
                      style={{ transition: "stroke-dashoffset 0.5s ease" }}
                    />
                  ))}
                </svg>
                <div className="donut-center" style={{ position: "absolute", textAlign: "center" }}>
                  <div className="donut-center-val" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{totalSchoolsCount}</div>
                  <div className="donut-center-lbl" style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>SCHOOLS</div>
                </div>
              </div>
              <div className="plan-legend" style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                {donutSegments.map((seg, idx) => (
                  <div key={idx} className="plan-legend-item" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="plan-dot" style={{ width: "10px", height: "10px", borderRadius: "3px", flexShrink: 0, backgroundColor: seg.color }}></div>
                    <span className="plan-legend-label" style={{ fontSize: "12px", color: "var(--text-secondary)", flex: 1, fontWeight: 500 }}>{seg.label}</span>
                    <span className="plan-legend-val" style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{seg.count}</span>
                    <span className="plan-legend-pct" style={{ fontSize: "10.5px", color: "var(--text-muted)", width: "38px", textAlign: "right" }}>{(seg.pct * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Table */}
      <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
        <div className="card-header" style={{ display: "flex", alignItems: "center", padding: "18px 22px 16px", borderBottom: "1px solid var(--border-subtle)", justifyContent: "space-between" }}>
          <div>
            <div className="card-title" style={{ fontSize: "13.5px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <SchoolIcon size={15} style={{ color: "var(--accent-purple)" }} />
              Registered Institutions
            </div>
            <div className="card-subtitle" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Full list of onboarded schools</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div className="tab-group" style={{ display: "flex", gap: "2px", background: "var(--bg-elevated)", borderRadius: "9px", padding: "3px", border: "1px solid var(--border-subtle)" }}>
              <div className={`tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")} style={{ fontSize: "11px", fontWeight: "600", padding: "4px 12px", borderRadius: "7px", cursor: "pointer" }}>All</div>
              <div className={`tab ${activeTab === "active" ? "active" : ""}`} onClick={() => setActiveTab("active")} style={{ fontSize: "11px", fontWeight: "600", padding: "4px 12px", borderRadius: "7px", cursor: "pointer" }}>Active</div>
              <div className={`tab ${activeTab === "trial" ? "active" : ""}`} onClick={() => setActiveTab("trial")} style={{ fontSize: "11px", fontWeight: "600", padding: "4px 12px", borderRadius: "7px", cursor: "pointer" }}>Suspended</div>
            </div>
            <div className="card-action" onClick={exportToCSV} style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-purple)", cursor: "pointer", padding: "5px 10px", borderRadius: "7px" }}>↓ Export</div>
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>Loading database...</div>
          ) : filteredSchools.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No schools found match search.</div>
          ) : (
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>School</th><th>Plan</th><th>Status</th>
                  <th>Max Branches</th><th>MRR</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => {
                  const initials = school.name ? school.name.split(" ").map((n: any) => n[0]).join("").slice(0, 2).toUpperCase() : "SC";
                  const schoolColor = school.plan === "pro" ? "#7C3AED" : school.plan === "basic" ? "#4B5563" : "#0891B2";
                  return (
                    <tr key={school.id}>
                      <td>
                        <div className="school-info" style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                          <div className="school-avatar" style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800", color: "#fff", background: schoolColor }}>{initials}</div>
                          <div>
                            <div className="school-name">{school.name}</div>
                            <div className="school-domain" style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{school.code?.toLowerCase()}.educore.io · {school.city}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`plan-tag ${school.plan === "pro" ? "pro" : school.plan === "basic" ? "basic" : "starter"}`}>
                          {school.plan[0].toUpperCase() + school.plan.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${school.active ? "active" : "inactive"}`}>
                          {school.active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td style={{ fontWeight: "600" }}>{school.max_branches}</td>
                      <td style={{ fontWeight: "700", color: school.active ? "#0891B2" : "var(--text-muted)" }}>
                        {school.active ? `₨${(PLAN_TIERS[school.plan]?.price || 0).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {school.created_at ? new Date(school.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "-"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <a href={`/dashboard/super-admin/school/${school.id}`} className="row-btn" style={{ textDecoration: "none" }}>Manage</a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. Bottom Row */}
      <div className="bottom-row" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px", marginTop: "20px" }}>
        {/* Activity Feed */}
        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
          <div className="card-header" style={{ display: "flex", alignItems: "center", padding: "18px 22px 16px", borderBottom: "1px solid var(--border-subtle)", justifyContent: "space-between" }}>
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Platform-wide events</div>
            </div>
          </div>
          <div className="activity-body" style={{ padding: "10px 0" }}>
            {recentActivities.map((act, idx) => (
              <div key={idx} className="activity-item" style={{ display: "flex", alignItems: "flex-start", gap: "13px", padding: "11px 22px" }}>
                <div className="activity-icon" style={{ width: "34px", height: "34px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "15px", background: act.iconBg }}>{act.icon}</div>
                <div className="activity-text" style={{ flex: 1 }}>
                  <div className="activity-main" style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.45" }} dangerouslySetInnerHTML={{ __html: act.text }}></div>
                  <div className="activity-time" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Platform Health */}
        <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
          <div className="card-header">
            <div>
              <div className="card-title">Quick Actions</div>
              <div className="card-subtitle">Common shortcuts</div>
            </div>
          </div>
          <div className="quick-actions-body" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="quick-btn" onClick={() => setShowOnboard(true)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "11px", cursor: "pointer", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
              <div className="quick-btn-icon" style={{ width: "34px", height: "34px", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.1)" }}>
                <SchoolIcon size={16} style={{ color: "#7C3AED" }} />
              </div>
              <div>
                <div className="quick-btn-label">Onboard School</div>
                <div className="quick-btn-sub">Add new school</div>
              </div>
              <div className="quick-btn-arrow">›</div>
            </div>
          </div>

          <div className="section-divider" style={{ height: "1px", background: "var(--border-subtle)", margin: "0 16px" }}></div>

          <div className="progress-section" style={{ padding: "16px 20px 18px" }}>
            <div className="progress-title" style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "14px" }}>Platform Health</div>
            <div className="prog-item" style={{ marginBottom: "12px" }}>
              <div className="prog-head" style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}><span className="prog-label">Server Uptime</span><span className="prog-val" style={{ color: "#059669" }}>99.97%</span></div>
              <div className="prog-track" style={{ height: "6px", background: "var(--bg-elevated)", borderRadius: "10px", overflow: "hidden" }}><div className="prog-fill" style={{ height: "100%", borderRadius: "10px", width: "99.97%", background: "linear-gradient(90deg,#059669,#34D399)" }}></div></div>
            </div>
            <div className="prog-item" style={{ marginBottom: 0 }}>
              <div className="prog-head" style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}><span className="prog-label">Storage Used</span><span className="prog-val">62%</span></div>
              <div className="prog-track" style={{ height: "6px", background: "var(--bg-elevated)", borderRadius: "10px", overflow: "hidden" }}><div className="prog-fill" style={{ height: "100%", borderRadius: "10px", width: "62%", background: "linear-gradient(90deg,#7C3AED,#A78BFA)" }}></div></div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Onboard School Modal Dialog */}
      {showOnboard && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,11,24,0.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", zIndex: 200, padding: "20px", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", border: "1px solid var(--border-subtle)", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowOnboard(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer" }}>✕</button>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "20px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>Onboard New School</div>
            
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>School Name *</div>
              <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Beacon House Academy" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>School Code *</div>
              <input type="text" value={schoolCode} onChange={e => setSchoolCode(e.target.value)} placeholder="e.g. BHA" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>City *</div>
              <input type="text" value={schoolCity} onChange={e => setSchoolCity(e.target.value)} placeholder="e.g. Lahore" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Plan *</div>
              <select value={plan} onChange={e => setPlan(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}>
                {Object.entries(PLAN_TIERS).map(([key, tier]) => (
                  <option key={key} value={key} style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>
                    {tier.label} — {tier.maxBranches} branch{tier.maxBranches !== 1 ? "es" : ""} — Rs. {tier.price.toLocaleString()}/mo
                  </option>
                ))}
              </select>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", marginTop: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-purple)", marginBottom: "12px" }}>School Owner Account Details</div>
              
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Owner Full Name *</div>
                <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="e.g. Ali Ahmed" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Owner Email *</div>
                <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="owner@school.com" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>Owner Secure Password *</div>
                <input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} placeholder="min 6 characters" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
              </div>
            </div>

            {msg && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", marginBottom: "16px", fontSize: "12px", fontWeight: "600", background: msg.startsWith("Error") ? "rgba(244,63,94,0.12)" : "rgba(16,185,129,0.12)", color: msg.startsWith("Error") ? "#F87171" : "#34D399", border: "1px solid " + (msg.startsWith("Error") ? "rgba(244,63,94,0.2)" : "rgba(16,185,129,0.2)") }}>
                {msg}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowOnboard(false)} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "10px", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Cancel</button>
              <button onClick={onboardSchool} disabled={saving} style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>
                {saving ? "Registering..." : "Onboard School"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
