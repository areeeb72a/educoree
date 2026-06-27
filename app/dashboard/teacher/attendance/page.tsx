"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Users } from "lucide-react";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const STATUS_OPTS = [
  { value: "present", label: "Present", color: "bg-green-100 text-green-700", activeColor: "bg-green-600 text-white" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700", activeColor: "bg-red-600 text-white" },
  { value: "late", label: "Late", color: "bg-yellow-100 text-yellow-700", activeColor: "bg-yellow-600 text-white" },
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
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-teal-700 to-cyan-800 px-4 md:px-6 pt-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <a href="/dashboard/teacher" className="inline-flex items-center gap-1 text-sm text-teal-200 hover:text-white mb-3 font-medium">
            <ArrowLeft size={14} /> Back to Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
            📋 Mark Attendance
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">👥</div>
              <div className="text-2xl font-extrabold text-white">{markedCount}/{students.length}</div>
              <div className="text-teal-100 text-xs mt-0.5">Marked</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">✅</div>
              <div className="text-2xl font-extrabold text-white">{presentCount}</div>
              <div className="text-teal-100 text-xs mt-0.5">Present</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">❌</div>
              <div className="text-2xl font-extrabold text-white">{absentCount}</div>
              <div className="text-teal-100 text-xs mt-0.5">Absent</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-xl mb-1">⏰</div>
              <div className="text-2xl font-extrabold text-white">{lateCount}</div>
              <div className="text-teal-100 text-xs mt-0.5">Late</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 -mt-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={selected ? `${selected.grade}__${selected.section}__${selected.branch_id}` : ""}
              onChange={e => {
                const [grade, section, branch_id] = e.target.value.split("__");
                setSelected(assignments.find(a => a.grade === grade && a.section === section && a.branch_id === branch_id));
              }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <div className="flex-1" />

            <button
              onClick={markAllPresent}
              className="bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-800 transition-colors"
            >
              ✅ Mark All Present
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-400">
                {assignments.length === 0 ? "Aapko koi class assign nahi ki gayi" : "Is class mein koi student nahi mila"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {students.map((student, i) => {
                const currentStatus = attendanceMap[student.id];
                return (
                  <div key={student.id} className="p-3.5 flex justify-between items-center flex-wrap gap-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700">
                        {(student.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-400">Roll #{student.roll_number || i + 1} · {student.auto_id}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {STATUS_OPTS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => markStatus(student.id, opt.value)}
                          disabled={saving === student.id}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${currentStatus === opt.value ? opt.activeColor : opt.color + " hover:opacity-80"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
