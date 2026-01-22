import React, { useEffect, useMemo, useState } from 'react';

import CardBox from './CardBox.jsx';

import { getInvoiceHistory, getJobHistory, getWorkOrderHistory } from '../services/workflowHistoryService.js';

function safeActor(audit) {
  const u = audit?.performedBy?.user;
  if (!u) return '-';
  if (typeof u === 'string') return u;
  return u.name || '-';
}

export default function WorkflowHistoryPanel({ entityType, entityId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const api = useMemo(() => {
    if (entityType === 'JOB') return getJobHistory;
    if (entityType === 'WORK_ORDER') return getWorkOrderHistory;
    if (entityType === 'INVOICE') return getInvoiceHistory;
    return null;
  }, [entityType]);

  useEffect(() => {
    if (!api || !entityId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api(entityId);
        if (!cancelled) setHistory(Array.isArray(data.history) ? data.history : []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load workflow history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [api, entityId]);

  return (
    <CardBox title="Workflow History">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <div className="text-slate-600">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#f8f9fa] text-slate-500">
                <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">From</th>
                <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">To</th>
                <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Performed By</th>
                <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Role</th>
                <th className="text-left font-semibold px-3 py-3 whitespace-nowrap">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {(history || []).map((a) => (
                <tr key={a._id} className="border-b border-slate-100">
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{a.fromState}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{a.toState}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{safeActor(a)}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{a.performedBy?.role || '-'}</td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
              {(history || []).length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={5}>
                    No workflow history.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </CardBox>
  );
}
