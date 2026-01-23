import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CardBox from '../../components/CardBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import WorkflowHistoryPanel from '../../components/WorkflowHistoryPanel.jsx';

import { predictJobCost, suggestContractors as aiSuggestContractors } from '../../services/aiService.js';

import {
  assignContractor,
  createJob,
  listApplicants,
  listContractors,
  listJobs,
} from '../../services/agentService.js';

function safeName(user) {
  if (!user) return '-';
  if (typeof user === 'string') return user;
  return user.name || user.email || '-';
}

export default function AgentJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [creating, setCreating] = useState(false);

  const [aiBudget, setAiBudget] = useState(null);
  const [aiBudgetLoading, setAiBudgetLoading] = useState(false);

  const [panelJobId, setPanelJobId] = useState(null);
  const [panelJobTitle, setPanelJobTitle] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [assigningId, setAssigningId] = useState('');

  const [panelLocation, setPanelLocation] = useState('');
  const [panelSkills, setPanelSkills] = useState([]);
  const [matchMode, setMatchMode] = useState('none');

  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await listJobs({ status: status || undefined });
      setJobs(data.jobs || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  async function onAiSuggestContractors() {
    if (!panelJobId) return;
    setAiSuggestLoading(true);
    setError('');
    try {
      const data = await aiSuggestContractors(panelJobId);
      const suggestions = data?.result?.suggestions || [];
      setAiSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to get AI contractor suggestions');
    } finally {
      setAiSuggestLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [status]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [jobs]);

  async function onCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const skills = requiredSkills
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

      await createJob({ title, description, location, requiredSkills: skills, budgetAmount });
      setTitle('');
      setDescription('');
      setLocation('');
      setRequiredSkills('');
      setBudgetAmount('');
      setCreateOpen(false);
      setAiBudget(null);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  }

  async function onPredictBudget() {
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) {
      setError('Enter title and description to get AI suggested budget');
      return;
    }

    setAiBudgetLoading(true);
    setError('');
    try {
      const data = await predictJobCost({ title: t, description: d, location: location || undefined, currency: 'INR' });
      setAiBudget(data?.result?.estimate || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to predict budget');
    } finally {
      setAiBudgetLoading(false);
    }
  }

  async function openPanel(job) {
    setPanelJobId(job._id);
    setPanelJobTitle(job.title);
    setHistoryOpen(false);
    setApplicants([]);
    setContractors([]);
    setSearchQ('');
    setAssigningId('');
    setAiSuggestions([]);

    const loc = job.location || '';
    const skills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
    const initialMatchMode = loc && skills.length ? 'both' : loc ? 'location' : skills.length ? 'skills' : 'none';
    setPanelLocation(loc);
    setPanelSkills(skills);
    setMatchMode(initialMatchMode);

    const contractorParams = {
      q: '',
      location: initialMatchMode === 'location' || initialMatchMode === 'both' ? (loc || undefined) : undefined,
      skills:
        initialMatchMode === 'skills' || initialMatchMode === 'both'
          ? skills.length
            ? skills.join(',')
            : undefined
          : undefined,
    };

    try {
      const [app, cons] = await Promise.all([
        listApplicants(job._id),
        listContractors(contractorParams),
      ]);
      setApplicants(app.applicants || []);
      setContractors(cons.contractors || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load job details');
    }
  }

  async function onSearch(nextMode) {
    try {
      const mode = nextMode || matchMode;
      const cons = await listContractors({
        q: searchQ,
        location: mode === 'location' || mode === 'both' ? panelLocation || undefined : undefined,
        skills: mode === 'skills' || mode === 'both' ? (panelSkills.length ? panelSkills.join(',') : undefined) : undefined,
      });
      setContractors(cons.contractors || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to search contractors');
    }
  }

  async function onAssign(contractorId) {
    if (!panelJobId) return;
    setAssigningId(contractorId);
    setError('');
    try {
      await assignContractor(panelJobId, contractorId);
      setPanelJobId(null);
      setPanelJobTitle('');
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to assign contractor');
    } finally {
      setAssigningId('');
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-xl font-bold text-slate-800">Jobs</div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            className="px-4 py-2 rounded-md bg-[#1e5aa0] text-white text-sm"
          >
            Post Job
          </button>
        </div>
      </div>

      {createOpen ? (
        <CardBox title="Post a Job">
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-slate-600">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-600">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2"
                placeholder="e.g. Bengaluru"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-slate-600">Required Skills</label>
              <input
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2"
                placeholder="e.g. Electrical, HVAC"
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">Budget Amount</label>
              <input
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2"
                inputMode="decimal"
              />
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onPredictBudget}
                    disabled={aiBudgetLoading}
                    className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs disabled:opacity-60"
                  >
                    {aiBudgetLoading ? 'AI...' : 'AI Suggest Budget'}
                  </button>
                  {aiBudget ? (
                    <div className="text-xs text-slate-700">
                      AI Suggested: <span className="font-semibold">{aiBudget.min}–{aiBudget.max} {aiBudget.currency}</span>
                    </div>
                  ) : null}
                </div>
                {aiBudget?.note ? <div className="text-xs text-slate-500">{aiBudget.note}</div> : null}
              </div>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                disabled={creating}
                type="submit"
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm disabled:opacity-60"
              >
                {creating ? 'Posting...' : 'Create'}
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-sm text-slate-600">
                Cancel
              </button>
            </div>
          </form>
        </CardBox>
      ) : null}

      <CardBox title="Job Listings">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
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
                {sortedJobs.map((job) => (
                  <tr key={job._id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{job.title}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{job.location || '-'}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                      {job.assignedContractor ? safeName(job.assignedContractor) : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openPanel(job)}
                        className="inline-flex items-center justify-center px-2.5 py-1.5 rounded bg-[#1e5aa0] text-white text-xs mr-2"
                      >
                        Manage
                      </button>
                      <Link
                        to={`/app/chat/${job._id}`}
                        className="inline-flex items-center justify-center px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs"
                      >
                        Chat
                      </Link>
                    </td>
                  </tr>
                ))}
                {sortedJobs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={5}>
                      No jobs found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardBox>

      {panelJobId ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-slate-800">Manage: {panelJobTitle}</div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setHistoryOpen((v) => !v)} className="text-sm text-[#1e5aa0]">
                  {historyOpen ? 'Hide History' : 'View History'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelJobId(null);
                    setHistoryOpen(false);
                  }}
                  className="text-slate-600"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <div className="text-sm font-bold text-slate-700 mb-2">Applicants</div>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  {applicants.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No applications yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {applicants.map((a) => (
                        <div key={a.contractor?._id || a.contractor} className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{safeName(a.contractor)}</div>
                            <div className="text-xs text-slate-500">{a.status}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAssign(a.contractor?._id || a.contractor)}
                            disabled={assigningId === (a.contractor?._id || a.contractor)}
                            className="px-3 py-2 rounded-md bg-[#1e5aa0] text-white text-xs disabled:opacity-60"
                          >
                            {assigningId === (a.contractor?._id || a.contractor) ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-slate-700 mb-2">Search Contractors</div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-700">AI Suggestions (advisory)</div>
                    <button
                      type="button"
                      onClick={onAiSuggestContractors}
                      disabled={aiSuggestLoading}
                      className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs disabled:opacity-60"
                    >
                      {aiSuggestLoading ? 'Running...' : 'AI Suggest Contractors'}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-md overflow-hidden">
                    {aiSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">No AI suggestions yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {aiSuggestions.map((s) => (
                          <div key={s.contractorId} className="p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-800 truncate">
                                {s.name} <span className="text-xs text-slate-500">({s.score}/100)</span>
                              </div>
                              {s.explanation ? <div className="text-xs text-slate-500">{s.explanation}</div> : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => onAssign(s.contractorId)}
                              disabled={assigningId === s.contractorId}
                              className="px-3 py-2 rounded-md bg-[#1e5aa0] text-white text-xs disabled:opacity-60"
                            >
                              {assigningId === s.contractorId ? 'Assigning...' : 'Assign'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-xs text-slate-500">
                    Matching filters:
                    {matchMode === 'none'
                      ? ' none'
                      : matchMode === 'location' || matchMode === 'both'
                        ? ` area=${panelLocation || '-'}`
                        : ''}
                    {matchMode === 'both' ? ' · ' : ''}
                    {matchMode === 'skills' || matchMode === 'both' ? (panelSkills.length ? ` skills=${panelSkills.join(', ')}` : ' skills=-') : ''}
                  </div>
                  <select
                    value={matchMode}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMatchMode(next);
                      onSearch(next);
                    }}
                    className="border border-slate-200 rounded-md px-2 py-1 text-xs"
                  >
                    <option value="none">None</option>
                    <option value="location">Area</option>
                    <option value="skills">Skills</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm"
                    placeholder="Name or email"
                  />
                  <button type="button" onClick={onSearch} className="px-3 py-2 rounded-md bg-slate-900 text-white text-sm">
                    Search
                  </button>
                </div>

                <div className="border border-slate-200 rounded-md overflow-hidden">
                  {contractors.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No contractors found.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[340px] overflow-auto">
                      {contractors.map((c) => (
                        <div key={c._id} className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{c.name}</div>
                            <div className="text-xs text-slate-500 truncate">{c.email}</div>
                            <div className="text-xs text-slate-500 truncate">
                              {c.contractorProfile?.skills?.length ? `Skills: ${c.contractorProfile.skills.join(', ')}` : 'Skills: -'}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {c.contractorProfile?.serviceAreas?.length ? `Areas: ${c.contractorProfile.serviceAreas.join(', ')}` : 'Areas: -'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAssign(c._id)}
                            disabled={assigningId === c._id}
                            className="px-3 py-2 rounded-md bg-[#1e5aa0] text-white text-xs disabled:opacity-60"
                          >
                            {assigningId === c._id ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Link to="/app/tools" className="text-sm text-[#1e5aa0] hover:underline">
                    Tools Hub
                  </Link>
                </div>
              </div>
            </div>

            {historyOpen ? (
              <div className="mt-5">
                <WorkflowHistoryPanel entityType="JOB" entityId={panelJobId} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
