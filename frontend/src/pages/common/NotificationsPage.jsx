import React, { useEffect, useMemo, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';
import { useAuth } from '../../state/AuthContext.jsx';
import { useNotifications } from '../../state/NotificationsContext.jsx';

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
  const notifications = useMemo(() => {
    const arr = Array.isArray(allNotifications) ? allNotifications : [];
    return unreadOnly ? arr.filter((n) => !n.read) : arr;
  }, [allNotifications, unreadOnly]);

  useEffect(() => {
    refresh();
  }, [unreadOnly, user]);

  async function markRead(id) {
    try {
      await markReadApi(id);
    } catch (e) {
      
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Notifications</div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Unread only
        </label>
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
