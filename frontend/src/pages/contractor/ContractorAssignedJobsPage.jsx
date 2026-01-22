import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CardBox from '../../components/CardBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import WorkflowHistoryPanel from '../../components/WorkflowHistoryPanel.jsx';

import { listAssignedJobs, updateJobStatus } from '../../services/contractorService.js';

function nextStatus(current) {
  if (current === 'ASSIGNED') return 'IN_PROGRESS';
  if (current === 'IN_PROGRESS') return 'COMPLETED';
  return null;
}

export default function ContractorAssignedJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [historyJobId, setHistoryJobId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await listAssignedJobs({ status: status || undefined });
      setJobs(data.jobs || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [status]);

  const sorted = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [jobs]);

  async function onUpdate(job) {
    const next = nextStatus(job.status);
    if (!next) return;
    setUpdatingId(job._id);
    setError('');
    try {
      await updateJobStatus(job._id, next);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">My Jobs</div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <CardBox title="Assigned Jobs">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f8f9fa] text-slate-500">
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Job</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Location</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((job) => {
                  const next = nextStatus(job.status);
                  return (
                    <tr key={job._id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{job.title}</td>
                      <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{job.location || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={job.status} /></td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {next ? (
                          <button
                            type="button"
                            disabled={updatingId === job._id}
                            onClick={() => onUpdate(job)}
                            className="px-2.5 py-1.5 rounded bg-[#1e5aa0] text-white text-xs mr-2 disabled:opacity-60"
                          >
                            {updatingId === job._id ? 'Updating...' : `Mark ${next.replace('_', ' ')}`}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setHistoryJobId(job._id)}
                          className="px-2.5 py-1.5 rounded bg-[#1e5aa0] text-white text-xs mr-2"
                        >
                          History
                        </button>
                        <Link to={`/app/chat/${job._id}`} className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs">
                          Chat
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={4}>
                      No jobs found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardBox>

      {historyJobId ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-slate-800">Workflow History</div>
              <button type="button" onClick={() => setHistoryJobId(null)} className="text-slate-600">
                Close
              </button>
            </div>
            <WorkflowHistoryPanel entityType="JOB" entityId={historyJobId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
