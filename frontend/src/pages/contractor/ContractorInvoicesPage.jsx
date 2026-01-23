import React, { useEffect, useMemo, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import WorkflowHistoryPanel from '../../components/WorkflowHistoryPanel.jsx';

import { formatMoney } from '../../utils/format.js';
import { createInvoice, listAssignedJobs, listInvoices } from '../../services/contractorService.js';
import { suggestInvoiceItems } from '../../services/aiService.js';

function computeTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
}

export default function ContractorInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyInvoiceId, setHistoryInvoiceId] = useState(null);

  const [jobId, setJobId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: 'Service', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [inv, j] = await Promise.all([listInvoices({ status: status || undefined }), listAssignedJobs()]);
      setInvoices(inv.invoices || []);
      setJobs(j.jobs || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [status]);

  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [invoices]);

  const total = useMemo(() => computeTotal(items), [items]);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => prev.concat([{ description: 'Item', quantity: 1, unitPrice: 0 }]));
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onAiAssist() {
    if (!jobId) {
      setError('Select a job to use AI Assist');
      return;
    }

    setAiLoading(true);
    setError('');
    try {
      const data = await suggestInvoiceItems(jobId);
      const next = (data?.result?.items || []).map((it) => ({
        description: it.description,
        quantity: Number(it.quantity || 1),
        unitPrice: 0,
      }));
      if (next.length) setItems(next);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to get AI invoice suggestions');
    } finally {
      setAiLoading(false);
    }
  }

  async function onSubmitInvoice(e) {
    e.preventDefault();
    if (!jobId) {
      setError('Select a job to submit invoice');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createInvoice(jobId, { items, notes });
      setNotes('');
      setItems([{ description: 'Service', quantity: 1, unitPrice: 0 }]);
      await refresh();
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to submit invoice');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Invoices</div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      <CardBox title="Invoice Generator">
        <form onSubmit={onSubmitInvoice} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Job</label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select job</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title} ({j.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-slate-700">Line Items</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onAiAssist}
                  disabled={aiLoading}
                  className="text-sm text-slate-900 font-semibold hover:underline disabled:opacity-60"
                >
                  {aiLoading ? 'AI...' : 'AI Assist'}
                </button>
                <button type="button" onClick={addItem} className="text-sm text-[#1e5aa0] hover:underline">
                  Add Item
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 mb-2">AI suggestions are advisory. Review and edit before submitting.</div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <input
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    className="md:col-span-6 border border-slate-200 rounded-md px-3 py-2"
                    placeholder="Description"
                    required
                  />
                  <input
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    className="md:col-span-2 border border-slate-200 rounded-md px-3 py-2"
                    inputMode="decimal"
                    required
                  />
                  <input
                    value={it.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                    className="md:col-span-3 border border-slate-200 rounded-md px-3 py-2"
                    inputMode="decimal"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="md:col-span-1 text-sm text-slate-600 hover:text-slate-900"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-lg font-bold text-slate-900">{formatMoney(total, 'INR')}</div>
          </div>

          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md bg-[#1e5aa0] text-white text-sm disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit Invoice'}
          </button>
        </form>
      </CardBox>

      <CardBox title="Invoice History">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f8f9fa] text-slate-500">
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Invoice #</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Job</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Amount</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Created</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{inv.job?.title || '-'}</td>
                    <td className="px-3 py-3 font-bold whitespace-nowrap">{formatMoney(inv.totalAmount, inv.currency)}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={inv.status} /></td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setHistoryInvoiceId(inv._id)}
                        className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs"
                      >
                        History
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedInvoices.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={6}>
                      No invoices found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardBox>

      {historyInvoiceId ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-slate-800">Workflow History</div>
              <button type="button" onClick={() => setHistoryInvoiceId(null)} className="text-slate-600">
                Close
              </button>
            </div>
            <WorkflowHistoryPanel entityType="INVOICE" entityId={historyInvoiceId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
