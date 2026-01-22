import React, { useEffect, useMemo, useState } from 'react';

import CardBox from '../../components/CardBox.jsx';
import { useAuth } from '../../state/AuthContext.jsx';

import { estimate, listTools } from '../../services/toolsService.js';

export default function ToolsHubPage() {
  const { user } = useAuth();

  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [estimateItems, setEstimateItems] = useState([{ label: 'Labor', quantity: 1, unitCost: 0 }]);
  const [estimateTotal, setEstimateTotal] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await listTools();
        if (!cancelled) setTools(data.tools || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'Failed to load tools');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toolKeys = useMemo(() => new Set(tools.map((t) => t.key)), [tools]);

  function updateEstimateItem(idx, patch) {
    setEstimateItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addEstimateItem() {
    setEstimateItems((prev) => prev.concat([{ label: 'Item', quantity: 1, unitCost: 0 }]));
  }

  function removeEstimateItem(idx) {
    setEstimateItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function runEstimate() {
    setError('');
    setEstimateTotal(null);
    try {
      const payload = estimateItems.map((x) => ({
        label: x.label,
        quantity: Number(x.quantity || 0),
        unitCost: Number(x.unitCost || 0),
      }));
      const data = await estimate(payload);
      setEstimateTotal(data.estimate.total);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to estimate');
    }
  }


  return (
    <div className="space-y-6">
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-slate-800">Tools Hub</div>
        <div className="text-xs text-slate-500">
          {loading ? 'Loading tools...' : `${tools.length} tools available`}
        </div>
      </div>

      {toolKeys.has('COST_ESTIMATION') ? (
        <CardBox title="Cost Estimation Tool">
          <div className="space-y-2">
            {estimateItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <input
                  value={it.label}
                  onChange={(e) => updateEstimateItem(idx, { label: e.target.value })}
                  className="md:col-span-6 border border-slate-200 rounded-md px-3 py-2"
                  placeholder="Label"
                />
                <input
                  value={it.quantity}
                  onChange={(e) => updateEstimateItem(idx, { quantity: Number(e.target.value) })}
                  className="md:col-span-2 border border-slate-200 rounded-md px-3 py-2"
                  inputMode="decimal"
                />
                <input
                  value={it.unitCost}
                  onChange={(e) => updateEstimateItem(idx, { unitCost: Number(e.target.value) })}
                  className="md:col-span-3 border border-slate-200 rounded-md px-3 py-2"
                  inputMode="decimal"
                />
                <button type="button" onClick={() => removeEstimateItem(idx)} className="md:col-span-1 text-sm text-slate-600 hover:text-slate-900">
                  X
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button type="button" onClick={addEstimateItem} className="text-sm text-[#1e5aa0] hover:underline">
                Add line
              </button>
              <button type="button" onClick={runEstimate} className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm">
                Calculate
              </button>
            </div>

            {estimateTotal != null ? (
              <div className="text-sm text-slate-700">
                Total estimate: <span className="font-bold text-slate-900">{estimateTotal}</span>
              </div>
            ) : null}
          </div>
        </CardBox>
      ) : null}
    </div>
  );
}
