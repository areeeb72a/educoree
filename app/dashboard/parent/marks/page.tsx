"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Award } from "lucide-react";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

const gradeColor: Record<string, string> = {
  "A+": "text-green-700 bg-green-100", "A": "text-green-700 bg-green-100",
  "B+": "text-blue-700 bg-blue-100", "B": "text-blue-700 bg-blue-100",
  "C": "text-yellow-700 bg-yellow-100", "D": "text-orange-700 bg-orange-100",
  "F": "text-red-700 bg-red-100",
};

export default function ParentMarksPage() {
  const [guardian, setGuardian] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGuardianAndChildren(); }, []);
  useEffect(() => { if (selectedChild) fetchResults(); }, [selectedChild, year]);

  async function fetchGuardianAndChildren() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: guardianData } = await supabase
      .from("guardians")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setGuardian(guardianData);

    if (!guardianData) { setLoading(false); return; }

    const { data: kids } = await supabase
      .from("students")
      .select("id, name, grade, section, auto_id")
      .eq("guardian_id", guardianData.id)
      .order("name");

    setChildren(kids || []);
    if (kids && kids.length > 0) setSelectedChild(kids[0].id);
    setLoading(false);
  }

  async function fetchResults() {
    const { data } = await supabase
      .from("results")
      .select("subject, term, marks, total_marks, grade, year")
      .eq("student_id", selectedChild)
      .eq("year", year)
      .eq("status", "published")
      .order("term");

    setResults(data || []);
  }

  const currentChild = children.find(c => c.id === selectedChild);
  const termOrder = ["Term 1", "Term 2", "Term 3", "Final"];
  const byTerm: Record<string, any[]> = {};
  results.forEach(r => {
    if (!byTerm[r.term]) byTerm[r.term] = [];
    byTerm[r.term].push(r);
  });
  const terms = Object.keys(byTerm).sort((a, b) => termOrder.indexOf(a) - termOrder.indexOf(b));

  function termAverage(records: any[]) {
    if (!records.length) return 0;
    const pct = records.reduce((sum, r) => sum + (r.marks / r.total_marks) * 100, 0) / records.length;
    return Math.round(pct);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <a href="/dashboard/parent" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium">
          <ArrowLeft size={14} /> Back to Dashboard
        </a>

        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marks</h1>
            <p className="text-gray-500 text-sm mt-1">
              {currentChild ? `${currentChild.name} · Grade ${currentChild.grade} - Section ${currentChild.section}` : "Loading..."}
            </p>
          </div>
          <div className="flex gap-2">
            {children.length > 1 && (
              <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[year, year - 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : !guardian ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Guardian profile not found. Contact admin.</div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Koi student aapke account se linked nahi hai. Contact admin.</div>
        ) : terms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Award className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">Abhi tak koi result published nahi hua.</p>
          </div>
        ) : (
          terms.map(term => (
            <div key={term} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className="font-bold text-sm text-gray-800">{term}</span>
                <span className="text-sm font-bold text-blue-600">{termAverage(byTerm[term])}% average</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase tracking-wide">Subject</th>
                    <th className="px-4 py-2 text-center text-xs text-gray-500 uppercase tracking-wide">Marks</th>
                    <th className="px-4 py-2 text-center text-xs text-gray-500 uppercase tracking-wide">%</th>
                    <th className="px-4 py-2 text-center text-xs text-gray-500 uppercase tracking-wide">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byTerm[term].map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.subject}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{r.marks} / {r.total_marks}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">{Math.round((r.marks / r.total_marks) * 100)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${gradeColor[r.grade] || "text-gray-500 bg-gray-100"}`}>{r.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
