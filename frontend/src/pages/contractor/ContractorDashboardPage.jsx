import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CardBox from '../../components/CardBox.jsx';
import DashboardStatCard from '../../components/DashboardStatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

import { formatMoney } from '../../utils/format.js';
import { listAssignedJobs, listInvoices, listWorkOrders } from '../../services/contractorService.js';

export default function ContractorDashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [j, inv, wo] = await Promise.all([listAssignedJobs(), listInvoices(), listWorkOrders()]);
        if (cancelled) return;
        setJobs(j.jobs || []);
        setInvoices(inv.invoices || []);
        setWorkOrders(wo.workOrders || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = jobs.length;
    const inProgress = jobs.filter((j) => j.status === 'IN_PROGRESS').length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const pendingInvoices = invoices.filter((i) => i.status === 'SUBMITTED').length;

    return { active, inProgress, pendingInvoices, completed };
  }, [jobs, invoices]);

  const recentJobs = jobs.slice(0, 8);
  const recentInvoices = invoices.slice(0, 5);
  const featuredWorkOrder = workOrders[0];

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="space-y-7">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <DashboardStatCard color="blue" icon="fa-briefcase" number={stats.active} label="Active Jobs" />
        <DashboardStatCard color="navy" icon="fa-bars-progress" number={stats.inProgress} label="In Progress" />
        <DashboardStatCard color="orange" icon="fa-file-invoice" number={stats.pendingInvoices} label="Pending Invoices" />
        <DashboardStatCard color="teal" icon="fa-check-circle" number={stats.completed} label="Completed Jobs" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          <CardBox title="My Jobs" right={<Link to="/app/contractor/jobs/assigned" className="text-sm text-[#1e5aa0] hover:underline">View All &gt;</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-500">
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Job</th>
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Location</th>
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Status</th>
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Chat</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => (
                    <tr key={job._id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{job.title}</td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{job.location || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={job.status} /></td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Link to={`/app/chat/${job._id}`} className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {recentJobs.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-slate-500" colSpan={4}>
                        No assigned jobs.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardBox>
        </div>

        <div className="space-y-6">
          <CardBox title="Recent Invoices" right={<Link to="/app/contractor/invoices" className="text-sm text-[#1e5aa0] hover:underline">View All &gt;</Link>}>
            <div className="bg-[#f8f9fa] px-3 py-2 text-xs font-semibold text-slate-600 flex justify-between mb-3">
              <span className="w-[25%]">Invoice #</span>
              <span className="w-[35%]">Job</span>
              <span className="w-[20%]">Amount</span>
              <span className="w-[20%] text-right">Status</span>
            </div>

            <div className="divide-y divide-slate-100">
              {recentInvoices.map((inv) => (
                <div key={inv._id} className="py-2 flex items-center justify-between text-sm">
                  <span className="w-[25%] text-slate-600 truncate">{inv.invoiceNumber}</span>
                  <span className="w-[35%] truncate">{inv.job?.title || '-'}</span>
                  <span className="w-[20%] font-bold">{formatMoney(inv.totalAmount, inv.currency)}</span>
                  <span className="w-[20%] text-right"><StatusBadge status={inv.status} /></span>
                </div>
              ))}
              {recentInvoices.length === 0 ? <div className="text-sm text-slate-500 py-2">No invoices yet.</div> : null}
            </div>
          </CardBox>

          <CardBox title="Work Order Details">
            {featuredWorkOrder ? (
              <div className="space-y-3 text-sm">
                <div className="flex">
                  <div className="w-28 font-semibold text-slate-600">WorkOrder:</div>
                  <div className="flex-1 text-slate-800">{featuredWorkOrder.workOrderNumber}</div>
                </div>
                <div className="flex">
                  <div className="w-28 font-semibold text-slate-600">Job Title:</div>
                  <div className="flex-1 text-slate-800">{featuredWorkOrder.job?.title || '-'}</div>
                </div>
                <div className="flex">
                  <div className="w-28 font-semibold text-slate-600">Location:</div>
                  <div className="flex-1 text-slate-800">{featuredWorkOrder.job?.location || '-'}</div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link to="/app/contractor/work-orders" className="block w-full text-center bg-[#1e5aa0] text-white rounded-md py-2 hover:opacity-95">
                    View Work Orders
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No work orders yet.</div>
            )}
          </CardBox>
        </div>
      </div>
    </div>
  );
}
