"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  homework: { label: "Homework", bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
  classwork: { label: "Classwork", bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  notice: { label: "Notice", bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Not Submitted", bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" },
  submitted: { label: "Submitted — Pending Review", bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  approved: { label: "Approved", bg: "rgba(34,197,94,0.15)", color: "#4ade80" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,0.15)", color: "#f87171" },
};

const card: React.CSSProperties = {
  background: "#12102A",
  borderRadius: 16,
  padding: 20,
  border: "1px solid rgba(255,255,255,0.07)",
};

export default function ParentDiaryPage() {
  const [guardian, setGuardian] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [entries, setEntries] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<"all" | "homework" | "classwork" | "notice">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGuardianAndChildren(); }, []);
  useEffect(() => { if (selectedChild) fetchDiaryData(); }, [selectedChild]);

  async function fetchGuardianAndChildren() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }

    const { data: guardianData } = await supabase
      .from("guardians")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setGuardian(guardianData);

    if (!guardianData) { setLoading(false); return; }

    const { data: kids } = await supabase
      .from("students")
      .select("id, name, grade, section, branch_id")
      .eq("guardian_id", guardianData.id)
      .order("name");

    setChildren(kids || []);
    if (kids && kids.length > 0) setSelectedChild(kids[0].id);
    else setLoading(false);
  }

  async function fetchDiaryData() {
    setLoading(true);
    const child = children.find((c) => c.id === selectedChild);
    if (!child) { setLoading(false); return; }

    const { data: diaryEntries } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("grade", child.grade)
      .eq("section", child.section)
      .eq("branch_id", child.branch_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setEntries(diaryEntries || []);

    const { data: subs } = await supabase
      .from("diary_submissions")
      .select("*")
      .eq("student_id", child.id);

    const subMap: Record<string, any> = {};
    (subs || []).forEach((s) => { subMap[s.diary_entry_id] = s; });
    setSubmissions(subMap);

    setLoading(false);
  }

  const currentChild = children.find((c) => c.id === selectedChild);
  const filteredEntries = entries.filter((e) => filter === "all" || e.type === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#07050F", fontFamily: "sans-serif", color: "#fff" }}>
      <div style={{ background: "#12102A", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/dashboard/parent" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>← Back</a>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>📔 Diary / Homework</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {currentChild ? `${currentChild.name} · Grade ${currentChild.grade}-${currentChild.section}` : "Loading..."}
            </div>
          </div>
        </div>
        {children.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 13 }}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id} style={{ background: "#12102A" }}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 760, margin: "0 auto" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { value: "all", label: "All" },
            { value: "homework", label: "📔 Homework" },
            { value: "classwork", label: "✏️ Classwork" },
            { value: "notice", label: "📌 Notice" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              style={{
                padding: "6px 14px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid",
                cursor: "pointer",
                background: filter === f.value ? "#7c3aed" : "rgba(255,255,255,0.05)",
                borderColor: filter === f.value ? "#7c3aed" : "rgba(255,255,255,0.1)",
                color: filter === f.value ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ ...card, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading...</div>
        ) : !guardian ? (
          <div style={{ ...card, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            Guardian profile not found. Contact admin.
          </div>
        ) : children.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
            Koi student aapke account se linked nahi hai. Contact admin.
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: 50 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Abhi tak koi entry nahi hai</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredEntries.map((entry) => {
              const typeMeta = TYPE_META[entry.type] || TYPE_META.notice;
              const submission = submissions[entry.id];
              const status = submission?.status || "pending";
              const statusMeta = STATUS_META[status];

              return (
                <div key={entry.id} style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: typeMeta.bg, color: typeMeta.color }}>
                      {typeMeta.label}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{entry.subject} · {entry.date}</span>
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600 }}>{entry.title}</div>
                  {entry.body && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{entry.body}</div>}

                  {entry.attachment_url && (
                    <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#60a5fa", display: "inline-block", marginTop: 6 }}>
                      📎 Teacher's attachment
                    </a>
                  )}

                  {entry.type === "homework" && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: statusMeta.bg, color: statusMeta.color }}>
                        {statusMeta.label}
                      </span>

                      {submission?.submission_file_url && (
                        <div style={{ marginTop: 8 }}>
                          <a href={submission.submission_file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#60a5fa" }}>
                            📎 Bachay ki submitted file dekhen
                          </a>
                        </div>
                      )}

                      {submission?.submission_note && (
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Note: "{submission.submission_note}"</div>
                      )}

                      {(status === "approved" || status === "rejected") && submission?.teacher_remarks && (
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6, fontStyle: "italic" }}>
                          Teacher remark: "{submission.teacher_remarks}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
