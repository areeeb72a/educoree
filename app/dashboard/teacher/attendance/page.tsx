"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Users } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const STATUS_OPTS = [
  { value: "present", label: "Present", color: "rgba(16,185,129,0.1)", activeColor: "var(--accent-emerald)" },
  { value: "absent", label: "Absent", color: "rgba(244,63,94,0.1)", activeColor: "var(--accent-rose)" },
  { value: "late", label: "Late", color: "rgba(245,158,11,0.1)", activeColor: "var(--accent-amber)" },
];

export default function TeacherAttendancePage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetchTeacherData(); }, []);
  useEffect(() => { if (selected) fetchStudentsAndAttendance(); }, [selected, date]);

  async function fetchTeacherData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setTeacher(user);

    const { data: all } = await supabase
      .from("teacher_assignments")
      .select("grade, section, branch_id, school_id, is_incharge")
      .eq("teacher_id", user.id)
      .order("grade");

    const seen = new Set();
    const unique = (all || []).filter(a => {
      const key = `${a.grade}-${a.section}-${a.branch_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setAssignments(unique);
    if (unique.length > 0) setSelected(unique[0]);
  }

  async function fetchStudentsAndAttendance() {
    setLoading(true);
    const { data } = await supabase
      .from("students")
      .select("id, name, roll_number, auto_id")
      .eq("grade", selected.grade)
      .eq("section", selected.section)
      .eq("branch_id", selected.branch_id)
      .eq("active", true)
      .order("roll_number");

    setStudents(data || []);

    const studentIds = (data || []).map(s => s.id);
    const { data: existing } = await supabase
      .from("attendance")
      .select("student_id, status")
      .in("student_id", studentIds.length ? studentIds : ["__none__"])
      .eq("date", date);

    const map: Record<string, string> = {};
    (existing || []).forEach(r => { map[r.student_id] = r.status; });
    setAttendanceMap(map);
    setLoading(false);
  }

  async function markStatus(studentId: string, status: string) {
    setSaving(studentId);
    await supabase.from("attendance").upsert({
      school_id: selected.school_id,
      branch_id: selected.branch_id,
      student_id: studentId,
      grade: selected.grade,
      section: selected.section,
      date,
      status,
    }, { onConflict: "student_id,date" });

    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
    setSaving(null);
  }

  async function markAllPresent() {
    const unmarked = students.filter(s => !attendanceMap[s.id]);
    for (const s of unmarked) {
      await markStatus(s.id, "present");
    }
  }

  const presentCount = students.filter(s => attendanceMap[s.id] === "present").length;
  const absentCount = students.filter(s => attendanceMap[s.id] === "absent").length;
  const lateCount = students.filter(s => attendanceMap[s.id] === "late").length;
  const markedCount = presentCount + absentCount + lateCount;

  return (
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher/attendance"
      onRefresh={fetchStudentsAndAttendance}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>📋 Mark Attendance</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Record and submit class attendance logs.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: "Marked/Total", val: `${markedCount}/${students.length}`, color: "var(--accent-purple)" },
          { label: "Present Today", val: presentCount, color: "var(--accent-emerald)" },
          { label: "Absent Today", val: absentCount, color: "var(--accent-rose)" },
          { label: "Late Today", val: lateCount, color: "var(--accent-amber)" },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Select Control Board */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <select
            value={selected ? `${selected.grade}__${selected.section}__${selected.branch_id}` : ""}
            onChange={e => {
              const [grade, section, branch_id] = e.target.value.split("__");
              setSelected(assignments.find(a => a.grade === grade && a.section === section && a.branch_id === branch_id));
            }}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          >
            {assignments.map((a, i) => (
              <option key={i} value={`${a.grade}__${a.section}__${a.branch_id}`}>
                Grade {a.grade} — Section {a.section}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setDate(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          />

          <div style={{ flex: 1 }} />

          <button
            onClick={markAllPresent}
            style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--accent-emerald)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            ✅ Mark All Present
          </button>
        </div>
      </div>

      {/* Student List cards container */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading student profiles...</div>
        ) : students.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Users style={{ color: 'var(--text-muted)', marginBottom: 12 }} size={40} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {assignments.length === 0 ? "No classes assigned to you." : "No active students found in this class."}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {students.map((student, i) => {
              const currentStatus = attendanceMap[student.id];
              return (
                <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < students.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent-purple)' }}>
                      {(student.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{student.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Roll #{student.roll_number || i + 1} · {student.auto_id}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {STATUS_OPTS.map(opt => {
                      const isActive = currentStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => markStatus(student.id, opt.value)}
                          disabled={saving === student.id}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: isActive ? opt.activeColor : opt.color,
                            color: isActive ? '#fff' : 'var(--text-secondary)'
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
