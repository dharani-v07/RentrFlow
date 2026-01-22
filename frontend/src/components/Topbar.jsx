import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../state/AuthContext.jsx';
import { useNotifications } from '../state/NotificationsContext.jsx';
import NotificationBadge from './NotificationBadge.jsx';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const title = (() => {
    const p = location.pathname;
    if (p.includes('/agent/jobs')) return 'Job Listings';
    if (p.includes('/agent/work-orders')) return 'Work Orders';
    if (p.includes('/agent/invoices')) return 'Invoices';
    if (p.includes('/agent/contractors')) return 'Contractors';
    if (p.includes('/contractor/jobs/open')) return 'Open Jobs';
    if (p.includes('/contractor/jobs/assigned')) return 'My Jobs';
    if (p.includes('/contractor/work-orders')) return 'Work Orders';
    if (p.includes('/contractor/invoices')) return 'Invoices';
    if (p.includes('/tools')) return 'Tools Hub';
    if (p.includes('/notifications')) return 'Notifications';
    if (p.includes('/chat')) return 'Job Chat';
    if (p.includes('/profile')) return 'Profile';
    return user?.role === 'agent' ? 'Agent Job & Invoice Management' : 'Contractor Job & Invoice Management';
  })();

  return (
    <header className="bg-white h-[70px] flex items-center justify-between px-4 md:px-8 shadow-[0_2px_5px_rgba(0,0,0,0.05)] z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <i className={user?.role === 'contractor' ? 'fa-solid fa-house-chimney text-[1.8rem] text-[#e65100]' : 'fa-solid fa-house-chimney text-[1.8rem] text-[#e65100]'} />
          <div className="text-2xl font-extrabold text-slate-800">
            Rentr<span className="text-[#1e5aa0]">Flow</span>
          </div>
        </div>
        <div className="hidden md:block text-slate-500 text-sm border-l-2 border-slate-200 pl-5">
          {title}
        </div>
      </div>

      <div className="flex items-center gap-5 text-sm text-slate-500">
        <Link to="/app" className="hidden md:flex items-center gap-2 hover:text-slate-900">
          <i className="fa-solid fa-table-columns" />
          {user?.role === 'agent' ? 'Agent Dashboard' : 'Contractor Dashboard'}
        </Link>
        <Link to="/app/tools" className="flex items-center gap-2 hover:text-slate-900">
          <i className="fa-solid fa-screwdriver-wrench" />
          Tools
        </Link>
        <Link to="/app/notifications" className="flex items-center gap-2 hover:text-slate-900">
          <i className="fa-solid fa-bell" />
          Notifications
          <NotificationBadge count={unreadCount} />
        </Link>

        <div className="flex items-center gap-2 text-[#1e5aa0] font-bold">
          <i className="fa-solid fa-user-shield" />
          {user ? user.name : ''}
        </div>

        <button type="button" onClick={logout} className="px-3 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800">
          Logout
        </button>
      </div>
    </header>
  );
}
