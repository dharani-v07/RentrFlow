import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import CardBox from '../../components/CardBox.jsx';
import { useAuth } from '../../state/AuthContext.jsx';
import { useSocket } from '../../state/SocketContext.jsx';

import { listMessages, markMessagesRead } from '../../services/chatService.js';
import { summarizeChat } from '../../services/aiService.js';

function safeName(user) {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return user;
  return user.name || 'Unknown';
}

export default function JobChatPage() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const { socket, status } = useSocket();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const listRef = useRef(null);

  const myId = useMemo(() => String(user?.id || user?._id || ''), [user]);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    async function loadHistory() {
      setError('');
      try {
        const data = await listMessages(jobId);
        if (!cancelled) setMessages(data.messages || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load chat history');
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function onSummarize() {
    if (!jobId) return;
    setAiLoading(true);
    setError('');
    try {
      const data = await summarizeChat(jobId, 20);
      setAiSummary(data?.result?.summary || '');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to summarize chat');
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (!socket || !jobId) return;

    socket.emit('join_job_chat', { jobId });

    const onMessage = (msg) => {
      setMessages((prev) => prev.concat([msg]));
      const toId = String(msg?.toUser?._id || msg?.toUser || '');
      if (toId && myId && toId === myId) {
        markMessagesRead(jobId).catch(() => null);
      }
    };

    const onMessagesRead = (payload) => {
      const ids = Array.isArray(payload?.messageIds) ? payload.messageIds.map((x) => String(x)) : [];
      const readAt = payload?.readAt ? new Date(payload.readAt).toISOString() : null;
      if (!ids.length || !readAt) return;

      setMessages((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.map((m) => {
          if (!m || !m._id) return m;
          if (!ids.includes(String(m._id))) return m;
          return { ...m, readAt };
        });
      });
    };

    socket.on('message', onMessage);
    socket.on('messages_read', onMessagesRead);

    return () => {
      socket.off('message', onMessage);
      socket.off('messages_read', onMessagesRead);
    };
  }, [socket, jobId, myId]);

  useEffect(() => {
    if (!jobId || !myId) return;
    markMessagesRead(jobId).catch(() => null);
  }, [jobId, myId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send() {
    const content = text.trim();
    if (!content || !socket || status !== 'connected') return;
    socket.emit('send_message', { jobId, content });
    setText('');
  }

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Job Chat</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSummarize}
            disabled={aiLoading}
            className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs disabled:opacity-60"
          >
            {aiLoading ? 'AI...' : 'Summarize Chat'}
          </button>
          <div className="text-xs text-slate-500">{status}</div>
        </div>
      </div>

      <CardBox title={`Chat for Job: ${jobId}`}>
        {aiSummary ? (
          <div className="mb-3 p-3 rounded-md bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">AI Summary (advisory)</div>
            <div className="text-sm text-slate-800 mt-1">{aiSummary}</div>
          </div>
        ) : null}

        <div ref={listRef} className="h-[55vh] overflow-y-auto border border-slate-200 rounded-md p-3 bg-white">
          <div className="space-y-2">
            {messages.map((m) => {
              const mine = String(m.fromUser?._id || m.fromUser) === String(user?.id || user?._id);
              const seen = mine ? Boolean(m.readAt) : false;
              return (
                <div key={m._id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={mine ? 'max-w-[80%] bg-[#1e5aa0] text-white rounded-lg px-3 py-2' : 'max-w-[80%] bg-slate-100 text-slate-900 rounded-lg px-3 py-2'}>
                    <div className={mine ? 'text-[11px] opacity-90' : 'text-[11px] text-slate-500'}>
                      {safeName(m.fromUser)} ({m.senderRole}) • {new Date(m.createdAt).toLocaleTimeString()}
                      {mine ? ` • ${seen ? 'Seen' : 'Unseen'}` : ''}
                    </div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 ? <div className="text-slate-500 text-sm">No messages yet.</div> : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1 border border-slate-200 rounded-md px-3 py-2"
            placeholder="Type a message..."
          />
          <button
            type="button"
            onClick={send}
            disabled={!text.trim() || status !== 'connected'}
            className="px-4 py-2 rounded-md bg-[#1e5aa0] text-white text-sm disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </CardBox>
    </div>
  );
}
