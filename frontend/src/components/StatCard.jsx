import React from 'react';

export default function StatCard({ label, value, tone = 'blue' }) {
  const toneMap = {
    blue: 'border-brand-200 bg-brand-50 text-brand-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${toneMap[tone] || toneMap.blue}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
