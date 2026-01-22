import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../state/AuthContext.jsx';
import { useNotifications } from '../state/NotificationsContext.jsx';
import NotificationBadge from './NotificationBadge.jsx';

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

export default function Sidebar() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const nav = useMemo(() => {
    if (!user) return [];

    const common = [
      { to: '/app/tools', label: 'Tools' },
      { to: '/app/notifications', label: 'Notifications' },
      { to: '/app/profile', label: 'Profile' },
    ];

    const agent = [
      { to: '/app/agent/dashboard', label: 'Dashboard' },
      { to: '/app/agent/jobs', label: 'Jobs' },
      { to: '/app/agent/work-orders', label: 'Work Orders' },
      { to: '/app/agent/invoices', label: 'Invoices' },
      { to: '/app/agent/contractors', label: 'Contractors' },
    ];

    const contractor = [
      { to: '/app/contractor/dashboard', label: 'Dashboard' },
      { to: '/app/contractor/jobs/open', label: 'Open Jobs' },
      { to: '/app/contractor/jobs/assigned', label: 'My Jobs' },
      { to: '/app/contractor/work-orders', label: 'Work Orders' },
      { to: '/app/contractor/invoices', label: 'Invoices' },
    ];

    return (user.role === 'agent' ? agent : contractor).concat(common);
  }, [user]);

  const iconByLabel = {
    Dashboard: 'fa-gauge',
    Jobs: 'fa-list-check',
    'Open Jobs': 'fa-list-check',
    'My Jobs': 'fa-list-check',
    'Work Orders': 'fa-clipboard-list',
    Invoices: 'fa-file-invoice-dollar',
    Contractors: 'fa-users-gear',
    Tools: 'fa-screwdriver-wrench',
    Notifications: 'fa-bell',
    Profile: 'fa-id-card',
  };

  return (
    <aside className="hidden lg:flex w-[250px] flex-col gap-2 p-5 bg-[#f4f7fa] flex-shrink-0">
      <nav className="space-y-2">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 px-5 py-3 rounded-lg text-sm font-medium transition',
                isActive
                  ? 'bg-[#dfe6ed] text-[#1e5aa0] font-bold border-l-4 border-[#1e5aa0]'
                  : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-900'
              )
            }
          >
            <i className={classNames('fa-solid', iconByLabel[item.label] || 'fa-circle')} />
            <span className="flex items-center">
              {item.label}
              {item.label === 'Notifications' ? <NotificationBadge count={unreadCount} /> : null}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
