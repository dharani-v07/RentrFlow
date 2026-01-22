import React, { useEffect, useMemo, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import WorkflowHistoryPanel from '../../components/WorkflowHistoryPanel.jsx';

import { formatMoney } from '../../utils/format.js';
import { approveInvoice, listInvoices, markInvoicePaid, rejectInvoice } from '../../services/agentService.js';

function safeName(user) {
  if (!user) return '-';
  if (typeof user === 'string') return user;
  return user.name || user.email || '-';
}

export default function AgentInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyInvoiceId, setHistoryInvoiceId] = useState(null);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await listInvoices({ status: status || undefined });
      setInvoices(data.invoices || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [status]);

  const sorted = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [invoices]);

  async function onApprove(id) {
    try {
      await approveInvoice(id);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to approve');
    }
  }

  async function onReject(id) {
    const reason = window.prompt('Reason for rejection?') || '';
    try {
      await rejectInvoice(id, reason);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to reject');
    }
  }

  async function onPaid(id) {
    try {
      await markInvoicePaid(id);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to mark paid');
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

      <CardBox title="Invoice Overview">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f8f9fa] text-slate-500">
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Invoice #</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Job</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Contractor</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Amount</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv) => (
                  <tr key={inv._id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{inv.job?.title || '-'}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{safeName(inv.contractor)}</td>
                    <td className="px-3 py-3 font-bold whitespace-nowrap">{formatMoney(inv.totalAmount, inv.currency)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setHistoryInvoiceId(inv._id)}
                        className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs mr-2"
                      >
                        History
                      </button>
                      {inv.status === 'SUBMITTED' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onApprove(inv._id)}
                            className="px-2.5 py-1.5 rounded bg-[#1e5aa0] text-white text-xs mr-2"
                          >
                            Approve
                          </button>
                          <button type="button" onClick={() => onReject(inv._id)} className="px-2.5 py-1.5 rounded bg-slate-900 text-white text-xs">
                            Reject
                          </button>
                        </>
                      ) : null}
                      {inv.status === 'APPROVED' ? (
                        <button type="button" onClick={() => onPaid(inv._id)} className="px-2.5 py-1.5 rounded bg-[#198754] text-white text-xs">
                          Mark Paid
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 ? (
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
