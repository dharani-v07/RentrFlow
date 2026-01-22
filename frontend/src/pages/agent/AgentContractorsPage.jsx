import React, { useEffect, useMemo, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';

import { listContractors } from '../../services/agentService.js';

export default function AgentContractorsPage() {
  const [q, setQ] = useState('');
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(query) {
    setLoading(true);
    setError('');
    try {
      const data = await listContractors(query);
      setContractors(data.contractors || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load contractors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
  }, []);

  const sorted = useMemo(() => {
    return [...contractors].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [contractors]);

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-xl font-bold text-slate-800">Contractor Management</div>
        <div className="flex items-center gap-2 w-full md:w-[420px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm"
            placeholder="Search name or email"
          />
          <button type="button" onClick={() => load(q)} className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm">
            Search
          </button>
        </div>
      </div>

      <CardBox title="Contractors">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((c) => (
              <div key={c._id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{c.name}</div>
                    <div className="text-sm text-slate-600 truncate">{c.email}</div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-[#dfe6ed] text-[#1e5aa0] font-semibold">Contractor</div>
                </div>

                <div className="mt-3 text-sm text-slate-700">
                  <div className="flex gap-2">
                    <div className="text-slate-500 w-20">Skills:</div>
                    <div className="flex-1">
                      {c.contractorProfile?.skills?.length ? c.contractorProfile.skills.join(', ') : '-'}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <div className="text-slate-500 w-20">Areas:</div>
                    <div className="flex-1">
                      {c.contractorProfile?.serviceAreas?.length ? c.contractorProfile.serviceAreas.join(', ') : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={`mailto:${c.email}`}
                    className="text-xs px-3 py-2 rounded-md bg-[#1e5aa0] text-white"
                  >
                    Email
                  </a>
                </div>
              </div>
            ))}
            {sorted.length === 0 ? <div className="text-slate-500">No contractors found.</div> : null}
          </div>
        )}
      </CardBox>
    </div>
  );
}
