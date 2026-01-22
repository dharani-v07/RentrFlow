import React, { useEffect, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import WorkflowHistoryPanel from '../../components/WorkflowHistoryPanel.jsx';

import { listWorkOrders } from '../../services/contractorService.js';

function safeName(user) {
  if (!user) return '-';
  if (typeof user === 'string') return user;
  return user.name || user.email || '-';
}

export default function ContractorWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyWorkOrderId, setHistoryWorkOrderId] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listWorkOrders();
        if (!cancelled) setWorkOrders(data.workOrders || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load work orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Work Orders</div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <CardBox title="Work Orders">
        {loading ? (
          <div className="text-slate-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f8f9fa] text-slate-500">
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Work Order #</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Job</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Agent</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Created</th>
                  <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders
                  .filter((wo) => {
                    if (!status) return true;
                    const isClosed = wo.currentState === 'CLOSED' || wo.status === 'CLOSED';
                    return status === 'COMPLETED' ? isClosed : true;
                  })
                  .map((wo) => (
                  <tr key={wo._id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">{wo.workOrderNumber}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{wo.job?.title || '-'}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{safeName(wo.agent)}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={(wo.currentState === 'CLOSED' || wo.status === 'CLOSED') ? 'COMPLETED' : (wo.currentState || wo.status)} /></td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{new Date(wo.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setHistoryWorkOrderId(wo._id)}
                        className="px-2.5 py-1.5 rounded bg-[#1e5aa0] text-white text-xs"
                      >
                        History
                      </button>
                    </td>
                  </tr>
                ))}
                {workOrders.filter((wo) => {
                  if (!status) return true;
                  const isClosed = wo.currentState === 'CLOSED' || wo.status === 'CLOSED';
                  return status === 'COMPLETED' ? isClosed : true;
                }).length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-slate-500" colSpan={6}>
                      No work orders found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardBox>

      {historyWorkOrderId ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-slate-800">Workflow History</div>
              <button type="button" onClick={() => setHistoryWorkOrderId(null)} className="text-slate-600">
                Close
              </button>
            </div>
            <WorkflowHistoryPanel entityType="WORK_ORDER" entityId={historyWorkOrderId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
