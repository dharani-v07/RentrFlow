import React, { useEffect, useMemo, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

import { applyToJob, listOpenJobs } from '../../services/contractorService.js';

export default function ContractorOpenJobsPage() {
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState('');

  async function load(query) {
    setLoading(true);
    setError('');
    try {
      const data = await listOpenJobs(query);
      setJobs(data.jobs || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
  }, []);

  const sorted = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [jobs]);

  async function onApply(jobId) {
    const note = window.prompt('Application note (optional):') || '';
    setApplyingId(jobId);
    try {
      await applyToJob(jobId, note);
      await load(q);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to apply');
    } finally {
      setApplyingId('');
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-xl font-bold text-slate-800">Open Jobs</div>
        <div className="flex items-center gap-2 w-full md:w-[420px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm"
            placeholder="Search title, description, location"
          />
          <button type="button" onClick={() => load(q)} className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm">
            Search
          </button>
        </div>
      </div>

      <CardBox title="Available Jobs">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map((job) => (
              <div key={job._id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{job.title}</div>
                    <div className="text-sm text-slate-600 truncate">{job.location || '-'}</div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                <div className="mt-3 text-sm text-slate-700">
                  {job.description}
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    disabled={applyingId === job._id}
                    onClick={() => onApply(job._id)}
                    className="px-3 py-2 rounded-md bg-[#1e5aa0] text-white text-sm disabled:opacity-60"
                  >
                    {applyingId === job._id ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              </div>
            ))}
            {sorted.length === 0 ? <div className="text-slate-500">No open jobs found.</div> : null}
          </div>
        )}
      </CardBox>
    </div>
  );
}
