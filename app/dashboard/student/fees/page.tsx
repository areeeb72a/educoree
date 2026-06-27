"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Wallet } from "lucide-react";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function StudentFeesPage() {
  const [student, setStudent] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: studentData } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setStudent(studentData);

    if (!studentData) { setLoading(false); return; }

    const { data } = await supabase
      .from("fee_records")
      .select("*")
      .eq("student_id", studentData.id)
      .order("month", { ascending: false });

    setRecords(data || []);
    setLoading(false);
  }

  const pending = records.filter(r => r.status === "pending");
  const paid = records.filter(r => r.status === "paid");
  const totalDue = pending.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);
  const totalPaid = paid.reduce((sum, r) => sum + (r.net_amount || r.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <a href="/dashboard/student" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium">
          <ArrowLeft size={14} /> Back to Dashboard
        </a>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Fee Status</h1>
          <p className="text-gray-500 text-sm mt-1">
            {student ? `${student.name} · Grade ${student.grade} - Section ${student.section}` : "Loading..."}
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Loading...</div>
        ) : !student ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">Student profile not found. Contact admin.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className={`rounded-xl border p-4 ${totalDue > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="text-xs text-gray-500 mb-1">Total Pending</div>
                <div className={`text-2xl font-bold ${totalDue > 0 ? "text-red-600" : "text-green-600"}`}>Rs {totalDue.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border bg-green-50 border-green-200 p-4">
                <div className="text-xs text-gray-500 mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-700">Rs {totalPaid.toLocaleString()}</div>
              </div>
            </div>

            {pending.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden mb-4">
                <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                  <span className="font-bold text-sm text-red-700">⏳ Pending Dues ({pending.length})</span>
                </div>
                <table className="w-full">
                  <tbody className="divide-y divide-gray-50">
                    {pending.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.month}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 capitalize">{r.fee_type}</td>
                        <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="font-bold text-sm text-gray-800">Payment History</span>
              </div>
              {paid.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Abhi tak koi payment record nahi hai.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Month", "Fee Type", "Amount", "Mode", "Receipt", "Paid On"].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paid.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.month}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 capitalize">{r.fee_type}</td>
                        <td className="px-4 py-3 text-sm font-bold text-green-600">Rs {(r.net_amount || r.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{r.payment_mode || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{r.receipt_no || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{r.paid_at ? new Date(r.paid_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
