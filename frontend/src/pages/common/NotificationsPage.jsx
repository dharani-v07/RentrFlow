import React, { useEffect, useMemo, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';
import { useAuth } from '../../state/AuthContext.jsx';
import { useNotifications } from '../../state/NotificationsContext.jsx';
import { prioritizeNotifications } from '../../services/aiService.js';

function priorityRank(p) {
  if (p === 'HIGH') return 3;
  if (p === 'MEDIUM') return 2;
  if (p === 'LOW') return 1;
  return 0;
}

function badgeClass(p) {
  if (p === 'HIGH') return 'bg-[#dc3545] text-white';
  if (p === 'MEDIUM') return 'bg-[#f0ad4e] text-white';
  if (p === 'LOW') return 'bg-slate-200 text-slate-800';
  return 'bg-slate-200 text-slate-800';
}

export default function NotificationsPage() {
  const { user } = useAuth();

  const {
    notifications: allNotifications,
    loading,
    error,
    refresh,
    markRead: markReadApi,
  } = useNotifications();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [priorityById, setPriorityById] = useState({});
  const [aiLoading, setAiLoading] = useState(false);

  const notifications = useMemo(() => {
    const arr = Array.isArray(allNotifications) ? allNotifications : [];
    const filtered = unreadOnly ? arr.filter((n) => !n.read) : arr;

    if (!sortByPriority) return filtered;

    return [...filtered].sort((a, b) => {
      const pa = priorityRank(priorityById[a._id]);
      const pb = priorityRank(priorityById[b._id]);
      if (pb !== pa) return pb - pa;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [allNotifications, unreadOnly, sortByPriority, priorityById]);

  useEffect(() => {
    refresh();
  }, [unreadOnly, user]);

  async function markRead(id) {
    try {
      await markReadApi(id);
    } catch (e) {
      
    }
  }

  async function runPrioritize() {
    setAiLoading(true);
    try {
      const data = await prioritizeNotifications(notifications);
      const pairs = Array.isArray(data?.result?.priorities) ? data.result.priorities : [];
      const map = {};
      pairs.forEach((p) => {
        if (p && p.notificationId) map[p.notificationId] = p.priority;
      });
      setPriorityById(map);
    } catch (e) {
      
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Notifications</div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={runPrioritize}
            disabled={aiLoading}
            className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs disabled:opacity-60"
          >
            {aiLoading ? 'AI...' : 'AI Prioritize'}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={sortByPriority} onChange={(e) => setSortByPriority(e.target.checked)} />
            Sort by priority
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
            Unread only
          </label>
        </div>
      </div>

      <CardBox title="Notification Center">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n._id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-800 truncate">{n.title}</div>
                    {!n.read ? <span className="text-xs bg-[#dc3545] text-white px-2 py-0.5 rounded">NEW</span> : null}
                    {priorityById[n._id] ? (
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${badgeClass(priorityById[n._id])}`}>
                        {priorityById[n._id]}
                      </span>
                    ) : null}
                  </div>
                  {n.body ? <div className="text-sm text-slate-600 mt-1">{n.body}</div> : null}
                  <div className="text-xs text-slate-400 mt-1">
                    {n.type} • {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>

                {!n.read ? (
                  <button
                    type="button"
                    onClick={() => markRead(n._id)}
                    className="px-3 py-2 rounded-md bg-[#1e5aa0] text-white text-xs"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            ))}

            {notifications.length === 0 ? <div className="text-slate-500 py-3">No notifications.</div> : null}
          </div>
        )}
      </CardBox>
    </div>
  );
}
