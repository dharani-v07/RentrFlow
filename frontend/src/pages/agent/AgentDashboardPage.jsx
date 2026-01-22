import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CardBox from '../../components/CardBox.jsx';
import DashboardStatCard from '../../components/DashboardStatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

import { formatMoney } from '../../utils/format.js';
import { getStats, listInvoices, listJobs, listWorkOrders } from '../../services/agentService.js';

function safeName(user) {
  if (!user) return '-';
  if (typeof user === 'string') return user;
  return user.name || user.email || '-';
}

export default function AgentDashboardPage() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [s, j, inv, wo] = await Promise.all([getStats(), listJobs(), listInvoices(), listWorkOrders()]);
        if (cancelled) return;
        setStats(s.stats);
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

  const topStats = useMemo(() => {
    const open = stats?.open || 0;
    const assigned = stats?.assigned || 0;
    const inProgress = stats?.inProgress || 0;
    const completed = stats?.completed || 0;
    const invoicesPending = stats?.invoicesPending || 0;

    return {
      activeJobs: open + assigned + inProgress,
      inProgress,
      invoicesPending,
      completed,
    };
  }, [stats]);

  const filteredJobs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      return String(j.title || '').toLowerCase().includes(q) || String(j.location || '').toLowerCase().includes(q);
    });
  }, [jobs, filter]);

  const jobRows = filteredJobs.slice(0, 8);
  const recentInvoices = invoices.slice(0, 5);
  const featuredWorkOrder = workOrders[0];

  if (loading) return <div className="text-slate-600">Loading...</div>;

  return (
    <div className="space-y-7">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <DashboardStatCard color="blue" icon="fa-briefcase" number={topStats.activeJobs} label="Active Jobs" />
        <DashboardStatCard color="navy" icon="fa-bars-progress" number={topStats.inProgress} label="In Progress" />
        <DashboardStatCard color="orange" icon="fa-file-invoice" number={topStats.invoicesPending} label="Pending Invoices" />
        <DashboardStatCard color="teal" icon="fa-check-circle" number={topStats.completed} label="Completed Jobs" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          <CardBox title="Job Listings" right={<Link to="/app/agent/jobs" className="text-sm text-[#1e5aa0] hover:underline">View All &gt;</Link>}>
            <div className="bg-[#f1f3f5] rounded-md px-3 py-2 flex items-center gap-2 mb-4">
              <i className="fa-solid fa-magnifying-glass text-slate-400" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent outline-none flex-1 text-sm"
                placeholder="Job Title"
              />
              <button type="button" onClick={() => setFilter('')} className="text-sm text-slate-600 hover:text-slate-900">
                Clear
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-500">
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Job Title</th>
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Location</th>
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Contractor</th>
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Status</th>
                    <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map((job) => (
                    <tr key={job._id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{job.title}</td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{job.location || '-'}</td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                        {job.assignedContractor ? (
                          <span className="inline-flex items-center gap-2">
                            <i className="fa-solid fa-helmet-safety text-teal-600" />
                            {safeName(job.assignedContractor)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Link
                          to={`/app/chat/${job._id}`}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded bg-[#1e5aa0] text-white text-xs mr-2"
                        >
                          View
                        </Link>
                        <Link
                          to="/app/agent/jobs"
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded bg-[#1e5aa0] text-white text-xs"
                        >
                          Update
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {jobRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-slate-500" colSpan={5}>
                        No jobs found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardBox>
        </div>

        <div className="space-y-6">
          <CardBox
            title="Recent Invoices"
            right={<Link to="/app/agent/invoices" className="text-sm text-[#1e5aa0] hover:underline">View All &gt;</Link>}
          >
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
                  <span className="w-[20%] text-right">
                    <StatusBadge status={inv.status} />
                  </span>
                </div>
              ))}
              {recentInvoices.length === 0 ? <div className="text-sm text-slate-500 py-2">No invoices yet.</div> : null}
            </div>
          </CardBox>

          <CardBox title="Work Order Details">
            {featuredWorkOrder ? (
              <div className="space-y-3 text-sm">
                <div className="flex">
                  <div className="w-28 font-semibold text-slate-600">Job Title:</div>
                  <div className="flex-1 text-slate-800">{featuredWorkOrder.job?.title || '-'}</div>
                </div>
                <div className="flex">
                  <div className="w-28 font-semibold text-slate-600">Location:</div>
                  <div className="flex-1 text-slate-800">{featuredWorkOrder.job?.location || '-'}</div>
                </div>
                <div className="flex">
                  <div className="w-28 font-semibold text-slate-600">Contractor:</div>
                  <div className="flex-1 text-slate-800">{safeName(featuredWorkOrder.contractor)}</div>
                </div>
                <div className="flex items-center">
                  <div className="w-28 font-semibold text-slate-600">Status:</div>
                  <div className="flex-1">
                    <StatusBadge status={featuredWorkOrder.job?.status || 'ASSIGNED'} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link
                    to="/app/tools"
                    className="block w-full text-center bg-[#1e5aa0] text-white rounded-md py-2 hover:opacity-95"
                  >
                    Update Status
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
