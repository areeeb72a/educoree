"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nmnfurisfmpqgzdwynvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbmZ1cmlzZm1wcWd6ZHd5bnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTcwMjIsImV4cCI6MjA5MzIzMzAyMn0.JIfnsxAG0pqkFED5zWmzd_ZwprnO31t14Vt1FjdmeWM"
);

export default function ParentMessagesPage() {
  const [guardian, setGuardian] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [teacherLinks, setTeacherLinks] = useState<any[]>([]); // {student, teacher, thread}
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchGuardianAndTeachers(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchGuardianAndTeachers() {
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
      .select("id, name, grade, section, branch_id, school_id")
      .eq("guardian_id", guardianData.id)
      .order("name");
    setChildren(kids || []);

    if (!kids || kids.length === 0) { setLoading(false); return; }

    // For each child, find their teachers (via teacher_assignments matching grade/section/branch)
    let links: any[] = [];
    for (const child of kids) {
      const { data: assigns } = await supabase
        .from("teacher_assignments")
        .select("teacher_id, subject, is_incharge")
        .eq("grade", child.grade)
        .eq("section", child.section)
        .eq("branch_id", child.branch_id);

      const teacherIds = Array.from(new Set((assigns || []).map((a: any) => a.teacher_id)));
      if (teacherIds.length === 0) continue;

      const { data: teachers } = await supabase
        .from("profiles")
        .select("id, name, auto_id")
        .in("id", teacherIds);

      (teachers || []).forEach((t: any) => {
        const assignment = assigns?.find((a: any) => a.teacher_id === t.id);
        links.push({ student: child, teacher: t, subject: assignment?.subject, isIncharge: assignment?.is_incharge });
      });
    }

    // sort: class incharge first
    links.sort((a, b) => (b.isIncharge ? 1 : 0) - (a.isIncharge ? 1 : 0));

    const studentIds = kids.map(k => k.id);
    const teacherIds = Array.from(new Set(links.map(l => l.teacher.id)));
    const { data: threads } = await supabase
      .from("message_threads")
      .select("*")
      .eq("guardian_id", guardianData.id)
      .in("student_id", studentIds)
      .in("teacher_id", teacherIds);

    links = links.map(l => ({
      ...l,
      thread: (threads || []).find((t: any) => t.teacher_id === l.teacher.id && t.student_id === l.student.id) || null,
    }));

    setTeacherLinks(links);
    setLoading(false);
  }

  async function openThread(link: any) {
    setSelectedLink(link);
    let thread = link.thread;

    if (!thread) {
      const { data: newThread, error } = await supabase
        .from("message_threads")
        .insert({
          school_id: link.student.school_id,
          branch_id: link.student.branch_id,
          teacher_id: link.teacher.id,
          student_id: link.student.id,
          guardian_id: guardian.id,
        })
        .select()
        .single();
      if (!error && newThread) {
        thread = newThread;
        setTeacherLinks(prev => prev.map(l => (l.teacher.id === link.teacher.id && l.student.id === link.student.id ? { ...l, thread } : l)));
      }
    }

    if (thread) {
      await loadMessages(thread.id);
      await supabase.from("message_threads").update({ parent_unread_count: 0 }).eq("id", thread.id);
      setSelectedLink((prev: any) => ({ ...prev, thread }));
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
    if (!newMessage.trim() || !selectedLink?.thread) return;
    setSending(true);

    const body = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      thread_id: selectedLink.thread.id,
      sender_role: "parent",
      sender_id: guardian.id,
      body,
    });

    await supabase
      .from("message_threads")
      .update({
        last_message: body,
        last_message_at: new Date().toISOString(),
        teacher_unread_count: (selectedLink.thread.teacher_unread_count || 0) + 1,
      })
      .eq("id", selectedLink.thread.id);

    await loadMessages(selectedLink.thread.id);
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient header banner */}
      <div className="bg-gradient-to-r from-pink-700 to-rose-800 px-4 md:px-6 pt-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <a href="/dashboard/parent" className="inline-flex items-center gap-1 text-sm text-pink-200 hover:text-white mb-3 font-medium">
            <span aria-hidden="true">←</span> Back to Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 mb-5">
            💬 Message Teachers
          </h1>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-[180px]">
            <div className="text-xl mb-1">👨‍🏫</div>
            <div className="text-2xl font-extrabold text-white">{teacherLinks.length}</div>
            <div className="text-pink-200 text-xs mt-0.5">Teachers</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 -mt-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row" style={{ height: "calc(100vh - 280px)", minHeight: 420 }}>
          {/* Teacher list sidebar */}
          <div className="w-full md:w-72 border-r border-gray-100 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">Teachers</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
              ) : !guardian ? (
                <div className="p-6 text-center text-gray-400 text-sm">Guardian profile nahi mila.</div>
              ) : teacherLinks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Koi teacher nahi mila.</div>
              ) : (
                teacherLinks.map((link, i) => {
                  const isActive = selectedLink?.teacher.id === link.teacher.id && selectedLink?.student.id === link.student.id;
                  return (
                    <button
                      key={i}
                      onClick={() => openThread(link)}
                      className={`w-full text-left px-3.5 py-3 border-b border-gray-50 transition-colors flex items-center gap-2.5 ${isActive ? "bg-pink-50" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-700 flex-shrink-0">
                        {(link.teacher.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{link.teacher.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {link.isIncharge ? "Class Incharge" : link.subject} · {link.student.name}
                        </div>
                      </div>
                      {link.thread?.parent_unread_count > 0 && (
                        <span className="bg-pink-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {link.thread.parent_unread_count}
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
            {!selectedLink ? (
              <div className="flex-1 flex items-center justify-center flex-col text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">Chat shuru karne ke liye teacher select karen</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-700">
                    {(selectedLink.teacher.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{selectedLink.teacher.name}</div>
                    <div className="text-xs text-gray-400">
                      {selectedLink.isIncharge ? "Class Incharge" : selectedLink.subject} · About {selectedLink.student.name}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-10">Abhi koi message nahi. Pehla message bhejen!</div>
                  ) : (
                    messages.map(m => (
                      <div key={m.id} className={`flex ${m.sender_role === "parent" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.sender_role === "parent" ? "bg-pink-600 text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                          {m.body}
                          <div className={`text-[10px] mt-1 ${m.sender_role === "parent" ? "text-pink-100" : "text-gray-400"}`}>
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
                    ➤
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
