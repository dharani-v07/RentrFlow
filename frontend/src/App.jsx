import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './state/AuthContext.jsx';

import RequireAuth from './routes/RequireAuth.jsx';
import RequireRole from './routes/RequireRole.jsx';
import RoleHomeRedirect from './routes/RoleHomeRedirect.jsx';

import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

import AgentDashboardPage from './pages/agent/AgentDashboardPage.jsx';
import AgentJobsPage from './pages/agent/AgentJobsPage.jsx';
import AgentWorkOrdersPage from './pages/agent/AgentWorkOrdersPage.jsx';
import AgentInvoicesPage from './pages/agent/AgentInvoicesPage.jsx';
import AgentContractorsPage from './pages/agent/AgentContractorsPage.jsx';

import ContractorDashboardPage from './pages/contractor/ContractorDashboardPage.jsx';
import ContractorOpenJobsPage from './pages/contractor/ContractorOpenJobsPage.jsx';
import ContractorAssignedJobsPage from './pages/contractor/ContractorAssignedJobsPage.jsx';
import ContractorWorkOrdersPage from './pages/contractor/ContractorWorkOrdersPage.jsx';
import ContractorInvoicesPage from './pages/contractor/ContractorInvoicesPage.jsx';

import ToolsHubPage from './pages/common/ToolsHubPage.jsx';
import NotificationsPage from './pages/common/NotificationsPage.jsx';
import JobChatPage from './pages/common/JobChatPage.jsx';
import ProfileViewPage from './pages/common/ProfileViewPage.jsx';
import ProfileEditPage from './pages/common/ProfileEditPage.jsx';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="h-full grid place-items-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/:role" element={<LoginPage />} />
        <Route path="/register/:role" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}
      >
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<RoleHomeRedirect />} />

          <Route element={<RequireRole role="agent" />}>
            <Route path="agent/dashboard" element={<AgentDashboardPage />} />
            <Route path="agent/jobs" element={<AgentJobsPage />} />
            <Route path="agent/work-orders" element={<AgentWorkOrdersPage />} />
            <Route path="agent/invoices" element={<AgentInvoicesPage />} />
            <Route path="agent/contractors" element={<AgentContractorsPage />} />
          </Route>

          <Route element={<RequireRole role="contractor" />}>
            <Route path="contractor/dashboard" element={<ContractorDashboardPage />} />
            <Route path="contractor/jobs/open" element={<ContractorOpenJobsPage />} />
            <Route path="contractor/jobs/assigned" element={<ContractorAssignedJobsPage />} />
            <Route path="contractor/work-orders" element={<ContractorWorkOrdersPage />} />
            <Route path="contractor/invoices" element={<ContractorInvoicesPage />} />
          </Route>

          <Route path="tools" element={<ToolsHubPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="chat/:jobId" element={<JobChatPage />} />
          <Route path="profile" element={<ProfileViewPage />} />
          <Route path="profile/edit" element={<ProfileEditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
