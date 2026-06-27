"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Save, ArrowLeft, BookOpen } from "lucide-react";

const supabase = createClient(
    "https://nmnfurisfmpqgzdwynvj.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const TERMS = ["Term 1", "Term 2", "Term 3", "Final"];
const SUBJECTS = ["Mathematics", "Science", "English", "Urdu", "Computer", "Islamiat", "Social Studies"];

function calcGrade(marks: number, total: number) {
    if (!total) return "-";
    const pct = (marks / total) * 100;
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    if (pct >= 40) return "D";
    return "F";
}

const gradeColor: Record<string, string> = {
    "A+": "text-green-700 bg-green-100", "A": "text-green-700 bg-green-100",
    "B+": "text-blue-700 bg-blue-100", "B": "text-blue-700 bg-blue-100",
    "C": "text-yellow-700 bg-yellow-100", "D": "text-orange-700 bg-orange-100",
    "F": "text-red-700 bg-red-100", "-": "text-gray-400 bg-gray-100",
};

export default function TeacherMarksPage() {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [subject, setSubject] = useState(SUBJECTS[0]);
    const [term, setTerm] = useState(TERMS[0]);
    const [totalMarks, setTotalMarks] = useState(100);
    const [students, setStudents] = useState<any[]>([]);
    const [marksMap, setMarksMap] = useState<Record<string, { marks: string; status: string }>>({});
    const [teacher, setTeacher] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => { fetchTeacherData(); }, []);
    useEffect(() => { if (selected) fetchStudentsAndResults(); }, [selected, subject, term]);

    async function fetchTeacherData() {
        const { data: { user } } = await supabase.auth.getUser();
        setTeacher(user);

        const { data: all } = await supabase
            .from("teacher_assignments")
            .select("grade, section, branch_id, school_id, subject")
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
        if (unique.length > 0) {
            setSelected(unique[0]);
            if (unique[0].subject) setSubject(unique[0].subject);
        }
    }

    async function fetchStudentsAndResults() {
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
            .from("results")
            .select("student_id, marks, total_marks, status")
            .in("student_id", studentIds.length ? studentIds : ["__none__"])
            .eq("subject", subject)
            .eq("term", term)
            .eq("year", new Date().getFullYear());

        const map: Record<string, { marks: string; status: string }> = {};
        (existing || []).forEach(r => {
            map[r.student_id] = { marks: String(r.marks), status: r.status };
            if (r.total_marks) setTotalMarks(r.total_marks);
        });
        (data || []).forEach(s => {
            if (!map[s.id]) map[s.id] = { marks: "", status: "draft" };
        });
        setMarksMap(map);
    }

    function setMark(studentId: string, marks: string) {
        setMarksMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], marks } }));
    }

    async function saveResults(publish: boolean) {
        if (!teacher || !selected || students.length === 0) return;
        setSaving(true);
        setMessage("");

        const records = students
            .filter(s => marksMap[s.id]?.marks !== "" && marksMap[s.id]?.marks !== undefined)
            .map(s => ({
                school_id: selected.school_id,
                student_id: s.id,
                subject,
                term,
                year: new Date().getFullYear(),
                marks: parseFloat(marksMap[s.id].marks),
                total_marks: totalMarks,
                grade: calcGrade(parseFloat(marksMap[s.id].marks), totalMarks),
                teacher_id: teacher.id,
                status: publish ? "published" : "draft",
            }));

        if (records.length === 0) {
            setMessage("Pehle kam az kam ek student ke marks enter karo");
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from("results")
            .upsert(records, { onConflict: "student_id,subject,term,year" });

        setSaving(false);
        if (error) {
            setMessage("Error: " + error.message);
        } else {
            setMessage(publish ? "✅ Results published! Students/parents ab dekh sakte hain." : "✅ Draft saved.");
            fetchStudentsAndResults();
            setTimeout(() => setMessage(""), 3500);
        }
    }

    const enteredCount = students.filter(s => marksMap[s.id]?.marks !== "" && marksMap[s.id]?.marks !== undefined).length;
    const publishedCount = students.filter(s => marksMap[s.id]?.status === "published").length;
    const classAvg = (() => {
        const valid = students
            .map(s => parseFloat(marksMap[s.id]?.marks))
            .filter(m => !isNaN(m));
        if (valid.length === 0) return 0;
        return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length / totalMarks) * 100);
    })();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Gradient header banner */}
            <div className="bg-gradient-to-r from-violet-700 to-purple-800 px-4 md:px-6 pt-6 pb-8">
                <div className="max-w-4xl mx-auto">
                    <a href="/dashboard/teacher" className="inline-flex items-center gap-1 text-sm text-violet-200 hover:text-white mb-3 font-medium">
                        <ArrowLeft size={14} /> Back to Dashboard
                    </a>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
                        📊 Enter Marks
                    </h1>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="text-xl mb-1">✏️</div>
                            <div className="text-2xl font-extrabold text-white">{enteredCount}/{students.length}</div>
                            <div className="text-violet-200 text-xs mt-0.5">Marks Entered</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="text-xl mb-1">✅</div>
                            <div className="text-2xl font-extrabold text-white">{publishedCount}</div>
                            <div className="text-violet-200 text-xs mt-0.5">Published</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="text-xl mb-1">📈</div>
                            <div className="text-2xl font-extrabold text-white">{classAvg}%</div>
                            <div className="text-violet-200 text-xs mt-0.5">Class Average</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-6 -mt-2">
                <p className="text-gray-500 text-sm mb-4">Class, subject aur term select karo, phir marks enter karo</p>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <select
                            value={selected ? `${selected.grade}__${selected.section}__${selected.branch_id}` : ""}
                            onChange={e => {
                                const [grade, section, branch_id] = e.target.value.split("__");
                                setSelected(assignments.find(a => a.grade === grade && a.section === section && a.branch_id === branch_id));
                            }}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            {assignments.map((a, i) => (
                                <option key={i} value={`${a.grade}__${a.section}__${a.branch_id}`}>
                                    Grade {a.grade} — Section {a.section}
                                </option>
                            ))}
                        </select>

                        <select value={subject} onChange={e => setSubject(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select value={term} onChange={e => setTerm(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-500">Total Marks:</label>
                            <input type="number" value={totalMarks} onChange={e => setTotalMarks(parseFloat(e.target.value) || 100)}
                                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>

                        <div className="flex-1" />

                        <button onClick={() => saveResults(false)} disabled={saving || students.length === 0}
                            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors">
                            <Save size={14} /> Save Draft
                        </button>
                        <button onClick={() => saveResults(true)} disabled={saving || students.length === 0}
                            className="flex items-center gap-2 bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-800 disabled:opacity-50 transition-colors">
                            <Save size={14} /> {saving ? "Saving..." : "Publish"}
                        </button>
                    </div>

                    {message && (
                        <p className={`text-xs mt-3 ${message.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{message}</p>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {students.length === 0 ? (
                        <div className="p-12 text-center">
                            <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
                            <p className="text-gray-400">
                                {assignments.length === 0 ? "Aapko koi class assign nahi ki gayi" : "Is class mein koi student nahi mila"}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide w-10">#</th>
                                    <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide">Student</th>
                                    <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wide">Marks Obtained</th>
                                    <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wide">Grade</th>
                                    <th className="px-4 py-3 text-center text-xs text-gray-500 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.map((student, i) => {
                                    const entry = marksMap[student.id] || { marks: "", status: "draft" };
                                    const marksNum = parseFloat(entry.marks);
                                    const grade = entry.marks !== "" && !isNaN(marksNum) ? calcGrade(marksNum, totalMarks) : "-";
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-400">{student.roll_number || i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-sm text-gray-900">{student.name}</div>
                                                <div className="text-xs text-gray-400">ID: {student.auto_id}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={totalMarks}
                                                    value={entry.marks}
                                                    onChange={e => setMark(student.id, e.target.value)}
                                                    placeholder={`/ ${totalMarks}`}
                                                    className="w-20 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${gradeColor[grade]}`}>{grade}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${entry.status === "published" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                                    {entry.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
