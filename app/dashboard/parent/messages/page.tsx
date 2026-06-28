"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, MessageCircle } from "lucide-react";
import DashboardLayout from "../../DashboardLayout";

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
    <DashboardLayout
      role="parent"
      activePath="/dashboard/parent/messages"
      onRefresh={fetchGuardianAndTeachers}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>💬 Message Teachers</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Direct real-time communications channel with student class instructors.</p>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', display: 'flex', height: "calc(100vh - 240px)", minHeight: 460 }}>
        {/* Sidebar list */}
        <div style={{ width: 280, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>Teacher Contacts</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Loading...</div>
            ) : !guardian ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Parent account not linked.</div>
            ) : teacherLinks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>No instructors found.</div>
            ) : (
              teacherLinks.map((link, i) => {
                const isActive = selectedLink?.teacher.id === link.teacher.id && selectedLink?.student.id === link.student.id;
                return (
                  <button
                    key={i}
                    onClick={() => openThread(link)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--border-subtle)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      background: isActive ? 'var(--bg-elevated)' : 'transparent'
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent-purple)', flexShrink: 0 }}>
                      {(link.teacher.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.teacher.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {link.isIncharge ? "Class Incharge" : link.subject} · {link.student.name}
                      </div>
                    </div>
                    {link.thread?.parent_unread_count > 0 && (
                      <span style={{ background: 'var(--accent-purple)', color: '#fff', fontSize: 9.5, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
          {!selectedLink ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <MessageCircle size={40} style={{ marginBottom: 12, color: 'var(--text-muted)', opacity: 0.5 }} />
              <p style={{ fontSize: 13 }}>Select a teacher contact from the sidebar to start chat</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent-purple)' }}>
                  {(selectedLink.teacher.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLink.teacher.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {selectedLink.isIncharge ? "Class Incharge" : selectedLink.subject} · About {selectedLink.student.name}
                  </div>
                </div>
              </div>

              {/* Message bubbles wrapper */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, padding: '40px 0' }}>No message ledger history. Start chat below!</div>
                ) : (
                  messages.map(m => {
                    const isSelf = m.sender_role === "parent";
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
