"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Hourglass, BarChart3, GraduationCap, Wallet, FileText, ChevronRight } from "lucide-react";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const months = (() => {
  const arr = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(d.toISOString().slice(0, 7));
  }
  return arr;
})();

export default function AccountsDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  // shared data
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { window.location.href = "/"; return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*, schools(*)")
      .eq("id", user.id)
      .single();
    setProfile(prof);

    const schoolId = prof?.school_id;

    const [{ data: fr }, { data: st }, { data: fs }, { data: br }] = await Promise.all([
      supabase.from("fee_records").select("*").eq("school_id", schoolId),
      supabase.from("students").select("id, name, grade, section, branch_id, auto_id").eq("school_id", schoolId),
      supabase.from("fee_structures").select("*").eq("school_id", schoolId).order("grade"),
      supabase.from("branches").select("id, name").eq("school_id", schoolId),
    ]);

    setFeeRecords(fr || []);
    setStudents(st || []);
    setFeeStructures(fs || []);
    setBranches(br || []);
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));

  const thisMonthRecords = feeRecords.filter(r => r.month === currentMonth);
  const collected = thisMonthRecords.filter(r => r.status === "paid").reduce((sum, r) => sum + (r.net_amount || 0), 0);
  const pendingRecords = feeRecords.filter(r => r.status === "pending");
  const pendingThisMonth = thisMonthRecords.filter(r => r.status === "pending");
  const pendingAmount = pendingThisMonth.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);
  const paidCount = thisMonthRecords.filter(r => r.status === "paid").length;
  const collectionPct = thisMonthRecords.length ? Math.round((paidCount / thisMonthRecords.length) * 100) : 0;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "structures", label: "Fee Structures" },
    { key: "dues", label: "Pending Dues" },
    { key: "record", label: "Record Payment" },
    { key: "salary", label: "Staff Salary" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#07050F", fontFamily: "sans-serif", color: "#fff" }}>
      {/* Header */}
      <div style={{ background: "#12102A", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>💰</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{profile?.schools?.name || "EduCore"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              Accounts / Finance Dashboard{profile?.name ? ` · ${profile.name}` : ""}
            </div>
          </div>
        </div>
        <button onClick={handleSignOut} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", fontSize: 13, cursor: "pointer" }}>
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: "#12102A", padding: "0 24px", display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "12px 18px",
            background: activeTab === t.key ? "rgba(124,58,237,0.12)" : "none",
            border: "none",
            borderRadius: activeTab === t.key ? "10px 10px 0 0" : 0,
            color: activeTab === t.key ? "#C4B5FD" : "rgba(255,255,255,0.55)",
            fontSize: 13,
            fontWeight: activeTab === t.key ? 700 : 500,
            cursor: "pointer",
            position: "relative",
            whiteSpace: "nowrap",
            transition: "background 0.15s, color 0.15s",
          }}>
            {t.label}
            {activeTab === t.key && (
              <span style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, background: "#A78BFA", borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "rgba(255,255,255,0.4)" }}>Loading...</div>
      ) : (
        <div style={{ padding: "20px 24px" }}>
          {activeTab === "overview" && (
            <OverviewTab
              currentMonth={currentMonth} setCurrentMonth={setCurrentMonth}
              collected={collected} pendingAmount={pendingAmount}
              pendingThisMonth={pendingThisMonth} collectionPct={collectionPct}
              totalStudents={students.length} studentMap={studentMap}
              branchMap={branchMap} setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "structures" && (
            <StructuresTab
              feeStructures={feeStructures} branchMap={branchMap}
              profile={profile} refresh={fetchAll}
            />
          )}
          {activeTab === "dues" && (
            <DuesTab
              pendingRecords={pendingRecords} studentMap={studentMap}
              branchMap={branchMap} setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "record" && (
            <RecordTab
              students={students} branchMap={branchMap}
              feeStructures={feeStructures} profile={profile}
              refresh={fetchAll} currentMonth={currentMonth}
            />
          )}
          {activeTab === "salary" && (
            <SalaryTab profile={profile} />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ currentMonth, setCurrentMonth, collected, pendingAmount, pendingThisMonth, collectionPct, totalStudents, studentMap, branchMap, setActiveTab }: any) {
  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Month:</label>
        <input type="month" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)}
          className="[color-scheme:dark]"
          style={{ background: "#12102A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 13 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Collected This Month", value: `Rs ${collected.toLocaleString()}`, color: "#34D399", icon: CheckCircle2 },
          { label: "Pending This Month", value: `Rs ${pendingAmount.toLocaleString()}`, color: "#FB7185", icon: Hourglass },
          { label: "Collection Rate", value: `${collectionPct}%`, color: "#A78BFA", icon: BarChart3 },
          { label: "Total Students", value: totalStudents, color: "#60A5FA", icon: GraduationCap },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} style={{ background: "#12102A", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.07)", borderTop: `3px solid ${k.color}`, boxShadow: `0 0 16px -4px ${k.color}66`, minHeight: 116, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${k.color}1E`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={17} style={{ color: k.color }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.03em" }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: k.color, letterSpacing: "-0.02em" }}>{k.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#12102A", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Record Payment", icon: Wallet, color: "#4ADE80", tab: "record" },
            { label: "Pending Dues", icon: Hourglass, color: "#FB7185", tab: "dues" },
            { label: "Fee Structures", icon: FileText, color: "#A78BFA", tab: "structures" },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(action.tab)}
                style={{
                  padding: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, color: "#fff", cursor: "pointer", textAlign: "left",
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${action.color}1E`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={17} style={{ color: action.color }} />
                  </div>
                  <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.25)" }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{action.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#12102A", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 8 }}>
        <div style={{ padding: "16px 20px", fontSize: 14, fontWeight: 800, borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#FB7185" }}>
          Pending Dues — This Month ({pendingThisMonth.length})
        </div>
        {pendingThisMonth.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No pending dues for this month 🎉</div>
        ) : (
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["Student", "Branch", "Amount", "Fee Type"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingThisMonth.slice(0, 8).map((r: any, idx: number) => {
                const s = studentMap[r.student_id];
                const isLast = idx === Math.min(pendingThisMonth.length, 8) - 1;
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: isLast ? "10px 16px 18px" : "10px 16px" }}>{s?.name || "Unknown"}</td>
                    <td style={{ padding: isLast ? "10px 16px 18px" : "10px 16px", color: "rgba(255,255,255,0.5)" }}>{s ? branchMap[s.branch_id] : "-"}</td>
                    <td style={{ padding: isLast ? "10px 16px 18px" : "10px 16px", color: "#FB7185", fontWeight: 700 }}>Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                    <td style={{ padding: isLast ? "10px 16px 18px" : "10px 16px", color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{r.fee_type}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ---------------- Fee Structures ---------------- */
function StructuresTab({ feeStructures, branchMap, profile, refresh }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function saveAmount(id: string, amount: number) {
    setSaving(true);
    await supabase.from("fee_structures").update({ amount }).eq("id", id);
    setSaving(false);
    setEditing(null);
    refresh();
  }

  return (
    <div style={{ margin: "-20px -24px", minHeight: "calc(100vh - 113px)" }} className="bg-gray-50 text-gray-900">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-purple-800 to-violet-900 px-6 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">🧾 Fee Structures</h2>
        <p className="text-purple-200 text-sm">Grade-wise fee amounts by branch</p>
      </div>

      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-extrabold text-gray-800">Fee Structures by Grade</span>
          </div>
          {feeStructures.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No fee structures configured yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {["Branch", "Grade", "Fee Type", "Amount (Rs)", "Effective From", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feeStructures.map((f: any) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2.5 text-gray-700">{branchMap[f.branch_id] || "-"}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">Grade {f.grade}</td>
                    <td className="px-4 py-2.5 text-gray-500 capitalize">{f.fee_type}</td>
                    <td className="px-4 py-2.5 font-bold text-gray-900">
                      {editing === f.id ? (
                        <input
                          type="number"
                          defaultValue={f.amount}
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter") saveAmount(f.id, parseFloat((e.target as HTMLInputElement).value)); if (e.key === "Escape") setEditing(null); }}
                          onBlur={e => saveAmount(f.id, parseFloat(e.target.value))}
                          className="w-24 border border-purple-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      ) : (
                        <span>Rs {f.amount.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{f.effective_from}</td>
                    <td className="px-4 py-2.5">
                      {editing === f.id ? (
                        saving ? <span className="text-xs text-gray-400">Saving...</span> : null
                      ) : (
                        <button onClick={() => setEditing(f.id)} className="bg-purple-50 border border-purple-200 rounded-md text-purple-700 px-2.5 py-1 text-xs font-medium hover:bg-purple-100 transition-colors">
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Pending Dues (full list) ---------------- */
function DuesTab({ pendingRecords, studentMap, branchMap, setActiveTab }: any) {
  const [branchFilter, setBranchFilter] = useState("all");
  const filtered = branchFilter === "all" ? pendingRecords : pendingRecords.filter((r: any) => studentMap[r.student_id]?.branch_id === branchFilter);
  const totalDue = filtered.reduce((sum: number, r: any) => sum + (r.net_amount || r.amount || 0), 0);

  return (
    <div style={{ margin: "-20px -24px", minHeight: "calc(100vh - 113px)" }} className="bg-gray-50 text-gray-900">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-amber-700 to-orange-800 px-6 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-5">⏳ Pending Dues</h2>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-[220px]">
          <div className="text-xl mb-1">💰</div>
          <div className="text-2xl font-extrabold text-white">Rs {totalDue.toLocaleString()}</div>
          <div className="text-amber-100 text-xs mt-0.5">Total Outstanding</div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="flex justify-end mb-4">
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-sm">
            <option value="all">All Branches</option>
            {Object.entries(branchMap).map(([id, name]: any) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No pending dues 🎉</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {["Student", "ID", "Grade", "Branch", "Month", "Amount", "Fee Type"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r: any) => {
                  const s = studentMap[r.student_id];
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{s?.name || "Unknown"}</td>
                      <td className="px-4 py-2.5 text-gray-400">{s?.auto_id || "-"}</td>
                      <td className="px-4 py-2.5 text-gray-700">{s ? `${s.grade}-${s.section}` : "-"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{s ? branchMap[s.branch_id] : "-"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{r.month}</td>
                      <td className="px-4 py-2.5 font-bold text-amber-700">Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{r.fee_type}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          To mark a due as paid, go to <button onClick={() => setActiveTab("record")} className="text-amber-700 underline hover:text-amber-800">Record Payment</button>.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Record Payment ---------------- */
function RecordTab({ students, branchMap, feeStructures, profile, refresh, currentMonth }: any) {
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [feeType, setFeeType] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [receiptNo, setReceiptNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedStudent = students.find((s: any) => s.id === studentId);

  useEffect(() => {
    if (!selectedStudent) return;
    const match = feeStructures.find((f: any) => f.branch_id === selectedStudent.branch_id && String(f.grade) === String(selectedStudent.grade) && f.fee_type === feeType);
    if (match) setAmount(String(match.amount));
  }, [selectedStudent, feeType, feeStructures]);

  const netAmount = amount ? Math.round(parseFloat(amount) * (1 - discountPct / 100)) : 0;

  async function handleSave() {
    if (!studentId || !amount) { setMessage("Student aur amount select karo"); return; }
    setSaving(true);
    setMessage("");

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    const { error } = await supabase.from("fee_records").upsert({
      school_id: profile?.school_id,
      student_id: studentId,
      month,
      fee_type: feeType,
      amount: parseFloat(amount),
      discount_pct: discountPct,
      discount_amt: Math.round(parseFloat(amount) * (discountPct / 100)),
      net_amount: netAmount,
      payment_mode: paymentMode,
      receipt_no: receiptNo || `RCP-${Math.floor(10000 + Math.random() * 89999)}`,
      paid_at: new Date().toISOString(),
      collected_by: user?.id,
      status: "paid",
    }, { onConflict: "student_id,month,fee_type" });

    setSaving(false);
    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("✅ Payment recorded successfully!");
      setStudentId(""); setAmount(""); setDiscountPct(0); setReceiptNo("");
      refresh();
      setTimeout(() => setMessage(""), 3000);
    }
  }

  return (
    <div style={{ margin: "-20px -24px", minHeight: "calc(100vh - 113px)" }} className="bg-gray-50 text-gray-900">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 pt-6 pb-8 mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">💵 Record Payment</h2>
        <p className="text-blue-200 text-sm">Manually record a fee payment</p>
      </div>

      <div className="px-6 pb-6 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-800 mb-5">Record a Fee Payment</h3>

          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Student</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select student —</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} — Grade {s.grade}{s.section} ({branchMap[s.branch_id] || "Unknown branch"})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Month</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Fee Type</label>
              <select value={feeType} onChange={e => setFeeType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="monthly">Monthly</option>
                <option value="admission">Admission</option>
                <option value="exam">Exam</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Amount (Rs)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Discount %</label>
              <input type="number" value={discountPct} onChange={e => setDiscountPct(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Payment Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Cash">Cash</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Easypaisa">Easypaisa</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">Receipt No. (optional)</label>
              <input type="text" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} placeholder="Auto-generated if blank"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {amount && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 flex justify-between items-center">
              <span className="text-sm text-gray-600">Net Amount Payable</span>
              <span className="text-lg font-extrabold text-blue-700">Rs {netAmount.toLocaleString()}</span>
            </div>
          )}

          {message && (
            <div className={`mb-4 text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{message}</div>
          )}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Saving..." : "💵 Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Staff Salary (disbursement) ---------------- */
function SalaryTab({ profile }: any) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState<any[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "paid" | "all">("pending");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentModes, setPaymentModes] = useState<Record<string, string>>({});

  useEffect(() => { fetchRecords(); }, [month]);

  async function fetchRecords() {
    setLoading(true);
    const { data: payroll } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("school_id", profile?.school_id)
      .eq("month", month)
      .order("net", { ascending: false });

    const staffIds = Array.from(new Set((payroll || []).map((r: any) => r.staff_id)));
    let sMap: Record<string, any> = {};
    if (staffIds.length > 0) {
      const { data: staff } = await supabase
        .from("profiles")
        .select("id, name, role, auto_id")
        .in("id", staffIds);
      (staff || []).forEach((s: any) => { sMap[s.id] = s; });
    }

    setStaffMap(sMap);
    setRecords(payroll || []);
    setLoading(false);
  }

  async function markAsPaid(recordId: string) {
    setPayingId(recordId);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    await supabase
      .from("payroll_records")
      .update({
        status: "paid",
        paid_by: user?.id,
        paid_at: new Date().toISOString(),
        payment_mode: paymentModes[recordId] || "Bank Transfer",
      })
      .eq("id", recordId);

    await fetchRecords();
    setPayingId(null);
  }

  const filtered = records.filter(r => filter === "all" || r.status === filter || (!r.status && filter === "pending"));
  const totalPending = records.filter(r => r.status !== "paid").reduce((sum, r) => sum + (r.net || 0), 0);
  const totalPaid = records.filter(r => r.status === "paid").reduce((sum, r) => sum + (r.net || 0), 0);

  return (
    <div style={{ margin: "-20px -24px", minHeight: "calc(100vh - 113px)" }} className="bg-gray-50 text-gray-900">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-rose-700 to-pink-800 px-6 pt-6 pb-8 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">👥 Staff Salary</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-rose-100">Month:</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-xl mb-1">⏳</div>
            <div className="text-xl font-extrabold text-white">Rs {totalPending.toLocaleString()}</div>
            <div className="text-rose-100 text-xs mt-0.5">Pending Disbursement</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-xl mb-1">✅</div>
            <div className="text-xl font-extrabold text-white">Rs {totalPaid.toLocaleString()}</div>
            <div className="text-rose-100 text-xs mt-0.5">Paid This Month</div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="flex justify-end mb-4">
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
            {(["pending", "paid", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-rose-600 text-white" : "text-gray-500"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-gray-400 text-sm">
              {records.length === 0
                ? "Is mahine ka koi payroll process nahi hua Admin/HR se."
                : "Koi record nahi mila is filter ke liye."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const staff = staffMap[r.staff_id];
              const isPaid = r.status === "paid";
              return (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-base">
                      {{ teacher: "👨‍🏫", admin: "🧑‍💼", accounts: "💰", principal: "🏫", school_owner: "👑" }[(staff?.role || "") as "teacher" | "admin" | "accounts" | "principal" | "school_owner"] || "👤"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{staff?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-400 capitalize">{staff?.role?.replace("_", " ")} · {staff?.auto_id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-gray-900">Rs {r.net.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">Gross: {r.gross.toLocaleString()} · Ded: {r.deductions.toLocaleString()}</div>
                    </div>

                    {isPaid ? (
                      <div className="text-right">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">✓ Paid</span>
                        <div className="text-xs text-gray-400 mt-1">{r.payment_mode}</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={paymentModes[r.id] || "Bank Transfer"}
                          onChange={e => setPaymentModes(prev => ({ ...prev, [r.id]: e.target.value }))}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="JazzCash">JazzCash</option>
                          <option value="Easypaisa">Easypaisa</option>
                        </select>
                        <button
                          onClick={() => markAsPaid(r.id)}
                          disabled={payingId === r.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50 transition-colors"
                        >
                          {payingId === r.id ? "Processing..." : "Mark Paid"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
