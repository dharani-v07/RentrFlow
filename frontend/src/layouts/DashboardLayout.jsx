import React from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

export default function DashboardLayout() {
  return (
    <div className="min-h-full bg-[#f4f7fa] text-slate-900">
      <Topbar />
      <div className="flex min-h-[calc(100vh-70px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
