"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function TeacherMessagesPage() {
  const [teacher, setTeacher] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [threads, setThreads] = useState<Record<string, any>>({}); // student_id -> thread
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchTeacherAndStudents(); }, []);
  useEffect(() => { if (selectedStudent) openThread(selectedStudent); }, [selectedStudent]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchTeacherAndStudents() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setTeacher(user);

    const { data: assigns } = await supabase
      .from("teacher_assignments")
      .select("grade, section, branch_id, school_id")
      .eq("teacher_id", user.id);

    const seen = new Set();
    const unique = (assigns || []).filter(a => {
      const key = `${a.grade}-${a.section}-${a.branch_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setAssignments(unique);

    let allStudents: any[] = [];
    for (const a of unique) {
      const { data } = await supabase
        .from("students")
        .select("id, name, grade, section, branch_id, school_id, guardian_id, auto_id")
        .eq("grade", a.grade)
        .eq("section", a.section)
        .eq("branch_id", a.branch_id)
        .eq("active", true)
        .order("roll_number");
      allStudents = [...allStudents, ...(data || [])];
    }
    setStudents(allStudents);

    const studentIds = allStudents.map(s => s.id);
    if (studentIds.length > 0) {
      const { data: existingThreads } = await supabase
        .from("message_threads")
        .select("*")
        .eq("teacher_id", user.id)
        .in("student_id", studentIds);

      const map: Record<string, any> = {};
      (existingThreads || []).forEach(t => { map[t.student_id] = t; });
      setThreads(map);
    }

    setLoading(false);
  }

  async function openThread(student: any) {
    if (!student.guardian_id) {
      setActiveThread(null);
      setMessages([]);
      return;
    }

    let thread = threads[student.id];

    if (!thread) {
      const { data: newThread, error } = await supabase
        .from("message_threads")
        .insert({
          school_id: student.school_id,
          branch_id: student.branch_id,
          teacher_id: teacher.id,
          student_id: student.id,
          guardian_id: student.guardian_id,
        })
        .select()
        .single();
      if (!error && newThread) {
        thread = newThread;
        setThreads(prev => ({ ...prev, [student.id]: newThread }));
      }
    }

    setActiveThread(thread);
    if (thread) {
      await loadMessages(thread.id);
      // mark teacher's unread as read
      await supabase.from("message_threads").update({ teacher_unread_count: 0 }).eq("id", thread.id);
    }
  }

  async function loadMessages(threadId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at");
    setMessages(data || []);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activeThread) return;
    setSending(true);

    const body = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      thread_id: activeThread.id,
      sender_role: "teacher",
      sender_id: teacher.id,
      body,
    });

    await supabase
      .from("message_threads")
      .update({
        last_message: body,
        last_message_at: new Date().toISOString(),
        parent_unread_count: (activeThread.parent_unread_count || 0) + 1,
      })
      .eq("id", activeThread.id);

    await loadMessages(activeThread.id);
    setSending(false);
  }

  const filteredStudents = students.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-pink-700 to-rose-800 px-4 md:px-6 pt-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <a href="/dashboard/teacher" className="inline-flex items-center gap-1 text-sm text-pink-200 hover:text-white mb-3 font-medium">
            <ArrowLeft size={14} /> Back to Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
            💬 Message Parents
          </h1>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-[180px]">
            <div className="text-xl mb-1">👨‍👩‍👧</div>
            <div className="text-2xl font-extrabold text-white">{students.length}</div>
            <div className="text-pink-200 text-xs mt-0.5">Students</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 -mt-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row" style={{ height: "calc(100vh - 280px)", minHeight: 420 }}>
          {/* Student list sidebar */}
          <div className="w-full md:w-72 border-r border-gray-100 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="🔍 Search student..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Koi student nahi mila.</div>
              ) : (
                filteredStudents.map(s => {
                  const thread = threads[s.id];
                  const isActive = selectedStudent?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full text-left px-3.5 py-3 border-b border-gray-50 transition-colors flex items-center gap-2.5 ${isActive ? "bg-pink-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-700 flex-shrink-0">
                        {(s.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {thread?.last_message || "Koi message nahi"}
                        </div>
                      </div>
                      {thread?.teacher_unread_count > 0 && (
                        <span className="bg-pink-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {thread.teacher_unread_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {!selectedStudent ? (
              <div className="flex-1 flex items-center justify-center flex-col text-gray-400">
                <MessageCircle size={40} className="mb-3 text-gray-300" />
                <p className="text-sm">Chat shuru karne ke liye student select karen</p>
              </div>
            ) : !selectedStudent.guardian_id ? (
              <div className="flex-1 flex items-center justify-center flex-col text-gray-400 p-6 text-center">
                <p className="text-sm">Is student ka guardian record nahi mila. Admin se contact karen.</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-700">
                    {(selectedStudent.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{selectedStudent.name}'s Parent</div>
                    <div className="text-xs text-gray-400">Grade {selectedStudent.grade}-{selectedStudent.section}</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-10">Abhi koi message nahi. Pehla message bhejen!</div>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender_role === "teacher" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.sender_role === "teacher" ? "bg-pink-600 text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                          {m.body}
                          <div className={`text-[10px] mt-1 ${m.sender_role === "teacher" ? "text-pink-100" : "text-gray-400"}`}>
                            {new Date(m.created_at).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-pink-600 text-white rounded-full p-2.5 hover:bg-pink-700 disabled:opacity-50 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
