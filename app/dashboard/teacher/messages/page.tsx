"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, MessageCircle } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

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
    if (!user) { setLoading(false); return; }
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
    <DashboardLayout
      role="teacher"
      activePath="/dashboard/teacher/messages"
      onRefresh={fetchTeacherAndStudents}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>💬 Message Parents</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Direct real-time communications channel with student guardians.</p>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', display: 'flex', height: "calc(100vh - 240px)", minHeight: 460 }}>
        {/* Sidebar list */}
        <div style={{ width: 280, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              type="text"
              placeholder="🔍 Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Loading...</div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>No student records.</div>
            ) : (
              filteredStudents.map(s => {
                const thread = threads[s.id];
                const isActive = selectedStudent?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--border-subtle)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      background: isActive ? 'var(--bg-elevated)' : 'transparent'
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent-purple)', flexShrink: 0 }}>
                      {(s.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {thread?.last_message || "No messages yet"}
                      </div>
                    </div>
                    {thread?.teacher_unread_count > 0 && (
                      <span style={{ background: 'var(--accent-purple)', color: '#fff', fontSize: 9.5, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
          {!selectedStudent ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <MessageCircle size={40} style={{ marginBottom: 12, color: 'var(--text-muted)', opacity: 0.5 }} />
              <p style={{ fontSize: 13 }}>Select a student guardian from the sidebar to start chat</p>
            </div>
          ) : !selectedStudent.guardian_id ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 13 }}>Guardian profile not linked for this student. Please contact system admin.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent-purple)' }}>
                  {(selectedStudent.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedStudent.name}'s Guardian</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Grade {selectedStudent.grade}-{selectedStudent.section}</div>
                </div>
              </div>

              {/* Message bubbles wrapper */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, padding: '40px 0' }}>No message ledger history. Start chat below!</div>
                ) : (
                  messages.map(m => {
                    const isSelf = m.sender_role === "teacher";
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: isSelf ? "flex-end" : "flex-start" }}>
                        <div style={{
                          maxWidth: '75%', borderRadius: 14, padding: '10px 14px', fontSize: 13,
                          background: isSelf ? 'var(--accent-purple)' : 'var(--bg-card)',
                          color: isSelf ? '#fff' : 'var(--text-primary)',
                          border: isSelf ? 'none' : '1px solid var(--border-subtle)'
                        }}>
                          <div>{m.body}</div>
                          <div style={{ fontSize: 10, marginTop: 4, color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', textAlign: 'right' }}>
                            {new Date(m.created_at).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Text input area */}
              <div style={{ padding: 12, background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Type a message here..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  style={{ flex: 1, border: '1px solid var(--border-subtle)', borderRadius: 20, padding: '10px 16px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  style={{ background: 'var(--accent-purple)', border: 'none', color: '#fff', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: (sending || !newMessage.trim()) ? 0.5 : 1 }}
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
